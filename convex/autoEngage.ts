import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { internalAction, internalMutation, mutation } from "./_generated/server"

const sixHoursMs = 6 * 60 * 60 * 1000
const retryBufferMs = 60 * 60 * 1000
const firstMinuteMs = 60 * 1000
const maxSelectedAttempts = 50
const reservationLeaseMs = 2 * 60 * 1000
const requiredXScopes = ["tweet.read", "users.read", "like.write"] as const
const terminalAttemptStatuses = new Set<Doc<"engagementAttempts">["status"]>([
  "liked",
  "already_liked",
  "skipped_no_x",
  "skipped_ineligible",
  "skipped_not_selected",
  "skipped_cap_exceeded",
  "skipped_post_unavailable",
  "skipped_canceled",
  "failed_final",
])

type SelectedAttempt = Doc<"engagementAttempts"> & {
  accountId: Id<"accounts">
  providerAccountId: string
}

type XLikeResult =
  | { outcome: "liked" | "already_liked" }
  | {
      outcome: "failed_retryable" | "failed_final" | "post_unavailable"
      code: string
      message: string
      retryAt?: number
      httpStatus?: number
    }

type EncryptedToken = {
  ciphertext: string
  iv: string
}

type ReserveAttemptResult =
  | {
      status:
        | "noop"
        | "paused"
        | "stopped"
        | "expired"
        | "account_unavailable"
    }
  | {
      status: "reserved"
      attemptId: Id<"engagementAttempts">
      requestId: Id<"engagementRequests">
      providerPostId: string
      accountId: Id<"accounts">
      providerAccountId: string
      encryptedAccessToken: EncryptedToken
      deadlineAt: number
      attemptCount: number
    }

function hasRequiredScopes(account: { scopes: string[] }) {
  return requiredXScopes.every((scope) => account.scopes.includes(scope))
}

function isRetryableStatus(status: Doc<"engagementAttempts">["status"]) {
  return status === "pending" || status === "failed_retryable"
}

function isTerminalStatus(status: Doc<"engagementAttempts">["status"]) {
  return terminalAttemptStatuses.has(status)
}

function isSkippedStatus(status: Doc<"engagementAttempts">["status"]) {
  return (
    status === "skipped_no_x" ||
    status === "skipped_ineligible" ||
    status === "skipped_not_selected" ||
    status === "skipped_cap_exceeded" ||
    status === "skipped_post_unavailable" ||
    status === "skipped_canceled"
  )
}

function hashString(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function seededFloat(seed: string, label: string) {
  return hashString(`${seed}:${label}`) / 0xffffffff
}

function seededInt(seed: string, label: string, min: number, max: number) {
  if (max <= min) return min
  return min + Math.floor(seededFloat(seed, label) * (max - min + 1))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function selectionSeed(request: Doc<"engagementRequests">) {
  return (
    request.selectionSeed ??
    `${request._id}:${request.farmId}:${request.providerPostId}`
  )
}

function selectionPlan(eligibleCount: number, seed: string) {
  if (eligibleCount <= 0) {
    return { selectedCount: 0, effectiveCap: maxSelectedAttempts }
  }

  if (eligibleCount <= 3) {
    return { selectedCount: eligibleCount, effectiveCap: maxSelectedAttempts }
  }

  if (eligibleCount <= 10) {
    const dropped = seededInt(seed, "small-farm-drop", 0, 1)
    return {
      selectedCount: eligibleCount - dropped,
      effectiveCap: maxSelectedAttempts,
    }
  }

  const ratio = 0.84 + seededFloat(seed, "cohort-ratio") * 0.1
  const variableCap =
    eligibleCount > maxSelectedAttempts
      ? seededInt(seed, "effective-cap", 35, maxSelectedAttempts)
      : maxSelectedAttempts
  const cohortCount = Math.max(1, Math.round(eligibleCount * ratio))

  return {
    selectedCount: Math.min(cohortCount, variableCap, maxSelectedAttempts),
    effectiveCap: variableCap,
  }
}

function scheduledDelayMs({
  deadlineAt,
  index,
  now,
  seed,
  total,
}: {
  deadlineAt: number
  index: number
  now: number
  seed: string
  total: number
}) {
  const latestDelay = Math.max(0, deadlineAt - now - retryBufferMs)
  const immediateCount = Math.min(
    total,
    Math.max(1, Math.min(3, Math.ceil(total * 0.08)))
  )

  if (index < immediateCount) {
    return seededInt(seed, `immediate-${index}`, 0, firstMinuteMs)
  }

  if (latestDelay <= firstMinuteMs || total <= immediateCount) {
    return seededInt(
      seed,
      `fallback-${index}`,
      0,
      Math.min(firstMinuteMs, latestDelay)
    )
  }

  const remainingSlots = Math.max(1, total - immediateCount)
  const slot = index - immediateCount + 1
  const baseDelay =
    firstMinuteMs + ((latestDelay - firstMinuteMs) * slot) / remainingSlots
  const slotWidth = Math.max(1, (latestDelay - firstMinuteMs) / remainingSlots)
  const jitterWidth = Math.min(10 * 60 * 1000, slotWidth * 0.45)
  const jitter = seededInt(
    seed,
    `schedule-jitter-${index}`,
    -Math.floor(jitterWidth),
    Math.floor(jitterWidth)
  )

  return Math.floor(clamp(baseDelay + jitter, firstMinuteMs, latestDelay))
}

function engagementDeadline(request: Doc<"engagementRequests">) {
  return request.engagementDeadlineAt ?? request.createdAt + sixHoursMs
}

async function attemptsForRequest(
  ctx: QueryCtx | MutationCtx,
  requestId: Id<"engagementRequests">
) {
  const attempts = []
  for await (const attempt of ctx.db
    .query("engagementAttempts")
    .withIndex("by_requestId_and_membershipId", (q) =>
      q.eq("requestId", requestId)
    )) {
    attempts.push(attempt)
  }
  return attempts
}

async function recalculateRequest(
  ctx: MutationCtx,
  requestId: Id<"engagementRequests">
) {
  const request = await ctx.db.get(requestId)
  if (!request) return null

  const attempts = await attemptsForRequest(ctx, requestId)
  const likedCount = attempts.filter(
    (attempt) =>
      attempt.status === "liked" || attempt.status === "already_liked"
  ).length
  const pendingCount = attempts.filter((attempt) =>
    isRetryableStatus(attempt.status)
  ).length
  const skippedCount = attempts.filter((attempt) =>
    isSkippedStatus(attempt.status)
  ).length
  const failedCount = attempts.filter(
    (attempt) => attempt.status === "failed_final"
  ).length
  const now = Date.now()
  let status = request.status
  let autoEngageStatus = request.autoEngageStatus

  if (request.status !== "canceled") {
    if (pendingCount > 0) {
      status = "active"
      if (autoEngageStatus !== "paused" && autoEngageStatus !== "stopped") {
        autoEngageStatus = "active"
      }
    } else if (failedCount > 0 && likedCount === 0 && skippedCount === 0) {
      status = "failed"
      if (autoEngageStatus !== "stopped") autoEngageStatus = "completed"
    } else if (failedCount > 0) {
      status = "partial"
      if (autoEngageStatus !== "stopped") autoEngageStatus = "completed"
    } else {
      status = "completed"
      if (autoEngageStatus !== "stopped") autoEngageStatus = "completed"
    }
  }

  await ctx.db.patch(request._id, {
    likedCount,
    pendingCount,
    skippedCount,
    failedCount,
    status,
    ...(autoEngageStatus ? { autoEngageStatus } : {}),
    updatedAt: now,
    ...(status !== "active" && !request.completedAt
      ? { completedAt: now }
      : {}),
    ...(status !== "active" && !request.autoEngageCompletedAt
      ? { autoEngageCompletedAt: now }
      : {}),
  })

  return {
    likedCount,
    pendingCount,
    skippedCount,
    failedCount,
    status,
    autoEngageStatus,
  }
}

async function scheduleDeadline(
  ctx: MutationCtx,
  request: Doc<"engagementRequests">,
  now: number
) {
  const deadlineAt = engagementDeadline(request)
  await ctx.scheduler.runAfter(
    Math.max(0, deadlineAt - now),
    internal.autoEngage.finalizeExpiredRequest,
    { requestId: request._id }
  )
}

async function scheduleSelectedAttempts(
  ctx: MutationCtx,
  request: Doc<"engagementRequests">,
  attempts: Doc<"engagementAttempts">[],
  now: number
) {
  const deadlineAt = engagementDeadline(request)

  if (request.autoEngageStatus === "paused") {
    await scheduleDeadline(ctx, request, now)
    return
  }

  for (const attempt of attempts) {
    if (!isRetryableStatus(attempt.status)) continue
    if (attempt.selectionStatus !== "selected") continue

    const dueAt = Math.max(
      now,
      attempt.nextRetryAt ?? attempt.scheduledAt ?? now
    )
    if (dueAt >= deadlineAt) continue

    await ctx.scheduler.runAfter(
      Math.max(0, dueAt - now),
      internal.autoEngage.performLike,
      { attemptId: attempt._id }
    )
  }

  await scheduleDeadline(ctx, request, now)
}

export const enqueueRequest = internalMutation({
  args: { requestId: v.id("engagementRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request || request.status === "canceled") return null
    if (request.autoEngageStatus === "stopped")
      return { status: "stopped" as const }

    const now = Date.now()
    const deadlineAt = engagementDeadline(request)
    if (now >= deadlineAt) {
      await finalizeExpiredRequestHandler(ctx, args.requestId)
      return { status: "expired" as const }
    }

    const attempts = await attemptsForRequest(ctx, args.requestId)
    const alreadySelected = attempts.filter(
      (attempt) => attempt.selectionStatus === "selected"
    )
    if (alreadySelected.length > 0 || (request.selectedAttemptCount ?? 0) > 0) {
      await scheduleSelectedAttempts(ctx, request, attempts, now)
      return { status: "scheduled" as const }
    }

    const seed = selectionSeed(request)
    const eligible = attempts
      .filter(
        (attempt): attempt is SelectedAttempt =>
          attempt.status === "pending" &&
          Boolean(attempt.accountId) &&
          Boolean(attempt.providerAccountId)
      )
      .map((attempt) => ({
        attempt,
        rank: hashString(`${seed}:rank:${attempt._id}`),
      }))
      .sort((a, b) => a.rank - b.rank)
    const plan = selectionPlan(eligible.length, seed)
    const selectedIds = new Set(
      eligible.slice(0, plan.selectedCount).map(({ attempt }) => attempt._id)
    )

    await ctx.db.patch(request._id, {
      engagementDeadlineAt: deadlineAt,
      autoEngageStatus:
        request.autoEngageStatus === "paused"
          ? "paused"
          : plan.selectedCount > 0
            ? "active"
            : "completed",
      maxSelectedAttempts,
      effectiveSelectedAttemptCap: plan.effectiveCap,
      selectedAttemptCount: plan.selectedCount,
      selectionSeed: seed,
      autoEngageStartedAt: request.autoEngageStartedAt ?? now,
      updatedAt: now,
    })

    const selectedForScheduling: Doc<"engagementAttempts">[] = []

    for (let index = 0; index < eligible.length; index += 1) {
      const { attempt } = eligible[index]
      const isSelected = selectedIds.has(attempt._id)

      if (isSelected) {
        const selectedIndex = selectedForScheduling.length
        const scheduledAt =
          now +
          scheduledDelayMs({
            deadlineAt,
            index: selectedIndex,
            now,
            seed,
            total: plan.selectedCount,
          })

        await ctx.db.patch(attempt._id, {
          selectionStatus: "selected",
          selectionRank: index,
          scheduledAt,
          updatedAt: now,
        })
        selectedForScheduling.push({
          ...attempt,
          selectionStatus: "selected",
          selectionRank: index,
          scheduledAt,
          updatedAt: now,
        })
      } else {
        const capExceeded =
          plan.effectiveCap < eligible.length && index >= plan.effectiveCap
        await ctx.db.patch(attempt._id, {
          status: capExceeded ? "skipped_cap_exceeded" : "skipped_not_selected",
          selectionStatus: capExceeded ? "cap_exceeded" : "not_selected",
          selectionRank: index,
          skipReason: capExceeded ? "cap_exceeded" : "not_selected",
          completedAt: now,
          updatedAt: now,
        })
      }
    }

    await recalculateRequest(ctx, args.requestId)
    const refreshedRequest = await ctx.db.get(args.requestId)
    if (refreshedRequest) {
      await scheduleSelectedAttempts(
        ctx,
        refreshedRequest,
        selectedForScheduling,
        now
      )
    }

    return {
      status: "scheduled" as const,
      selectedAttemptCount: plan.selectedCount,
      effectiveSelectedAttemptCap: plan.effectiveCap,
    }
  },
})

export const enqueueDueAttempts = internalMutation({
  args: { requestId: v.id("engagementRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) return null
    if (request.autoEngageStatus === "paused")
      return { status: "paused" as const }
    if (request.autoEngageStatus === "stopped")
      return { status: "stopped" as const }

    const now = Date.now()
    if (now >= engagementDeadline(request)) {
      await finalizeExpiredRequestHandler(ctx, args.requestId)
      return { status: "expired" as const }
    }

    const attempts = await attemptsForRequest(ctx, args.requestId)
    await scheduleSelectedAttempts(ctx, request, attempts, now)
    return { status: "scheduled" as const }
  },
})

export const reserveAttempt = internalMutation({
  args: { attemptId: v.id("engagementAttempts") },
  handler: async (ctx, args): Promise<ReserveAttemptResult> => {
    const attempt = await ctx.db.get(args.attemptId)
    if (!attempt || !isRetryableStatus(attempt.status)) {
      return { status: "noop" as const }
    }

    const request = await ctx.db.get(attempt.requestId)
    if (!request || request.status === "canceled") {
      return { status: "noop" as const }
    }
    if (request.autoEngageStatus === "paused") {
      return { status: "paused" as const }
    }
    if (request.autoEngageStatus === "stopped") {
      return { status: "stopped" as const }
    }

    const now = Date.now()
    const deadlineAt = engagementDeadline(request)
    if (now >= deadlineAt) {
      await markAttemptFinalFailure(ctx, attempt, {
        code: "engagement_window_expired",
        message: "Engagement window expired.",
        now,
      })
      await recalculateRequest(ctx, request._id)
      return { status: "expired" as const }
    }

    if (attempt.selectionStatus !== "selected") {
      return { status: "noop" as const }
    }
    if (
      attempt.reservationExpiresAt !== undefined &&
      attempt.reservationExpiresAt > now
    ) {
      return { status: "noop" as const }
    }

    const account = attempt.accountId
      ? await ctx.db.get(attempt.accountId)
      : null
    if (
      !account ||
      account.provider !== "x" ||
      account.status !== "linked" ||
      !account.encryptedAccessToken ||
      !hasRequiredScopes(account) ||
      (account.expiresAt !== undefined && account.expiresAt <= now)
    ) {
      if (account && account.provider === "x" && account.status === "linked") {
        await ctx.db.patch(account._id, {
          status: "needs_reconnect",
          updatedAt: now,
        })
      }
      await markAttemptFinalFailure(ctx, attempt, {
        code: "x_account_unavailable",
        message: "X account needs reconnect.",
        now,
      })
      await recalculateRequest(ctx, request._id)
      return { status: "account_unavailable" as const }
    }

    await ctx.db.patch(attempt._id, {
      startedAt: now,
      reservationExpiresAt: now + reservationLeaseMs,
      lastTriedAt: now,
      updatedAt: now,
    })

    return {
      status: "reserved" as const,
      attemptId: attempt._id,
      requestId: request._id,
      providerPostId: request.providerPostId,
      accountId: account._id,
      providerAccountId: account.providerAccountId,
      encryptedAccessToken: account.encryptedAccessToken,
      deadlineAt,
      attemptCount: attempt.attemptCount,
    }
  },
})

export const confirmReservedAttemptForCall = internalMutation({
  args: { attemptId: v.id("engagementAttempts") },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId)
    if (!attempt || !isRetryableStatus(attempt.status)) {
      return { status: "noop" as const }
    }

    const request = await ctx.db.get(attempt.requestId)
    if (!request || request.status === "canceled") {
      return { status: "noop" as const }
    }

    if (request.autoEngageStatus === "paused") {
      await ctx.db.patch(attempt._id, {
        reservationExpiresAt: undefined,
        updatedAt: Date.now(),
      })
      return { status: "paused" as const }
    }
    if (request.autoEngageStatus === "stopped") {
      await ctx.db.patch(attempt._id, {
        reservationExpiresAt: undefined,
        updatedAt: Date.now(),
      })
      return { status: "stopped" as const }
    }

    const now = Date.now()
    if (now >= engagementDeadline(request)) {
      await markAttemptFinalFailure(ctx, attempt, {
        code: "engagement_window_expired",
        message: "Engagement window expired.",
        now,
      })
      await recalculateRequest(ctx, request._id)
      return { status: "expired" as const }
    }

    if (
      attempt.selectionStatus !== "selected" ||
      attempt.reservationExpiresAt === undefined ||
      attempt.reservationExpiresAt <= now
    ) {
      return { status: "noop" as const }
    }

    return { status: "ok" as const }
  },
})

export const performLike = internalAction({
  args: { attemptId: v.id("engagementAttempts") },
  handler: async (ctx, args): Promise<{ status: string }> => {
    const reservation: ReserveAttemptResult = await ctx.runMutation(
      internal.autoEngage.reserveAttempt,
      { attemptId: args.attemptId }
    )

    if (reservation.status !== "reserved") {
      return { status: reservation.status }
    }

    const accessToken = await decryptToken(reservation.encryptedAccessToken)
    const preflight = await ctx.runMutation(
      internal.autoEngage.confirmReservedAttemptForCall,
      { attemptId: args.attemptId }
    )
    if (preflight.status !== "ok") {
      return { status: preflight.status }
    }

    const result = await likeXPost({
      accessToken,
      postId: reservation.providerPostId,
      userId: reservation.providerAccountId,
    })

    if (result.outcome === "post_unavailable") {
      await ctx.runMutation(internal.autoEngage.stopUnavailablePost, {
        requestId: reservation.requestId,
        sourceAttemptId: reservation.attemptId,
        code: result.code,
        message: result.message,
      })
      return { status: "post_unavailable" as const }
    }

    if (result.outcome === "failed_retryable") {
      await ctx.runMutation(internal.autoEngage.recordAttemptOutcome, {
        attemptId: reservation.attemptId,
        outcome: "failed_retryable",
        code: result.code,
        message: result.message,
        nextRetryAt: nextRetryAt({
          attemptCount: reservation.attemptCount,
          deadlineAt: reservation.deadlineAt,
          retryAt: result.retryAt,
        }),
      })
      return { status: "retry_scheduled" as const }
    }

    if (result.outcome === "failed_final") {
      if (result.httpStatus === 401) {
        await ctx.runMutation(internal.accounts.markXNeedsReconnect, {
          accountId: reservation.accountId,
        })
      }
      await ctx.runMutation(internal.autoEngage.recordAttemptOutcome, {
        attemptId: reservation.attemptId,
        outcome: "failed_final",
        code: result.code,
        message: result.message,
      })
      return { status: "failed" as const }
    }

    await ctx.runMutation(internal.autoEngage.recordAttemptOutcome, {
      attemptId: reservation.attemptId,
      outcome: result.outcome,
    })

    return { status: result.outcome }
  },
})

export const recordAttemptOutcome = internalMutation({
  args: {
    attemptId: v.id("engagementAttempts"),
    outcome: v.union(
      v.literal("liked"),
      v.literal("already_liked"),
      v.literal("failed_retryable"),
      v.literal("failed_final")
    ),
    code: v.optional(v.string()),
    message: v.optional(v.string()),
    nextRetryAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = await ctx.db.get(args.attemptId)
    if (!attempt || isTerminalStatus(attempt.status)) {
      return { status: "noop" as const }
    }

    const request = await ctx.db.get(attempt.requestId)
    if (!request) return { status: "noop" as const }

    const now = Date.now()
    const deadlineAt = engagementDeadline(request)
    const canRetry =
      args.outcome === "failed_retryable" &&
      args.nextRetryAt !== undefined &&
      args.nextRetryAt < deadlineAt

    if (canRetry) {
      await ctx.db.patch(attempt._id, {
        status: "failed_retryable",
        attemptCount: attempt.attemptCount + 1,
        lastErrorCode: args.code ?? "x_retryable_error",
        lastErrorMessage: args.message ?? "X returned a retryable error.",
        lastTriedAt: now,
        nextRetryAt: args.nextRetryAt,
        reservationExpiresAt: undefined,
        updatedAt: now,
      })
    } else {
      const status =
        args.outcome === "failed_retryable" ? "failed_final" : args.outcome
      await ctx.db.patch(attempt._id, {
        status,
        attemptCount: attempt.attemptCount + 1,
        lastErrorCode:
          status === "failed_final"
            ? (args.code ?? "x_final_error")
            : undefined,
        lastErrorMessage:
          status === "failed_final"
            ? (args.message ?? "X returned a final error.")
            : undefined,
        lastTriedAt: now,
        nextRetryAt: undefined,
        reservationExpiresAt: undefined,
        completedAt: now,
        updatedAt: now,
      })
    }

    await recalculateRequest(ctx, attempt.requestId)

    if (canRetry && args.nextRetryAt !== undefined) {
      await ctx.scheduler.runAfter(
        Math.max(0, args.nextRetryAt - now),
        internal.autoEngage.performLike,
        { attemptId: attempt._id }
      )
    }

    return { status: "recorded" as const }
  },
})

export const finalizeExpiredRequest = internalMutation({
  args: { requestId: v.id("engagementRequests") },
  handler: async (ctx, args) => {
    return await finalizeExpiredRequestHandler(ctx, args.requestId)
  },
})

async function finalizeExpiredRequestHandler(
  ctx: MutationCtx,
  requestId: Id<"engagementRequests">
) {
  const request = await ctx.db.get(requestId)
  if (!request) return null

  const now = Date.now()
  const deadlineAt = engagementDeadline(request)
  if (now < deadlineAt) {
    await ctx.scheduler.runAfter(
      deadlineAt - now,
      internal.autoEngage.finalizeExpiredRequest,
      { requestId }
    )
    return { status: "rescheduled" as const }
  }

  const attempts = await attemptsForRequest(ctx, requestId)
  for (const attempt of attempts) {
    if (!isRetryableStatus(attempt.status)) continue
    await markAttemptFinalFailure(ctx, attempt, {
      code: "engagement_window_expired",
      message: "Engagement window expired.",
      now,
    })
  }

  await ctx.db.patch(request._id, {
    autoEngageStatus:
      request.autoEngageStatus === "stopped" ? "stopped" : "completed",
    stopReason:
      request.autoEngageStatus === "stopped"
        ? request.stopReason
        : "engagement_window_expired",
    updatedAt: now,
  })

  await recalculateRequest(ctx, requestId)
  return { status: "finalized" as const }
}

export const stopUnavailablePost = internalMutation({
  args: {
    requestId: v.id("engagementRequests"),
    sourceAttemptId: v.optional(v.id("engagementAttempts")),
    code: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId)
    if (!request) return null

    const now = Date.now()
    const attempts = await attemptsForRequest(ctx, args.requestId)

    for (const attempt of attempts) {
      if (!isRetryableStatus(attempt.status)) continue
      if (args.sourceAttemptId && attempt._id === args.sourceAttemptId) {
        await markAttemptFinalFailure(ctx, attempt, {
          code: args.code ?? "post_unavailable",
          message: args.message ?? "X post is unavailable.",
          now,
        })
        continue
      }

      await ctx.db.patch(attempt._id, {
        status: "skipped_post_unavailable",
        skipReason: "post_unavailable",
        lastErrorCode: "post_unavailable",
        lastErrorMessage: "X post is unavailable.",
        completedAt: now,
        updatedAt: now,
      })
    }

    await ctx.db.patch(request._id, {
      autoEngageStatus: "stopped",
      stoppedAt: now,
      stopReason: "post_unavailable",
      updatedAt: now,
    })

    await recalculateRequest(ctx, args.requestId)
    return { status: "stopped" as const }
  },
})

export const pauseRequest = mutation({
  args: { requestId: v.id("engagementRequests") },
  handler: async (ctx, args) => {
    const { request, userId } = await requireRequestManager(ctx, args.requestId)
    if (request.autoEngageStatus === "stopped") return { status: "ok" as const }
    if (request.status !== "active") return { status: "ok" as const }

    await ctx.db.patch(request._id, {
      autoEngageStatus: "paused",
      pausedAt: Date.now(),
      pausedByUserId: userId,
      updatedAt: Date.now(),
    })

    return { status: "ok" as const }
  },
})

export const resumeRequest = mutation({
  args: { requestId: v.id("engagementRequests") },
  handler: async (ctx, args) => {
    const { request } = await requireRequestManager(ctx, args.requestId)
    const now = Date.now()
    if (request.autoEngageStatus === "stopped") return { status: "ok" as const }
    if (request.status !== "active") return { status: "ok" as const }

    if (now >= engagementDeadline(request)) {
      await finalizeExpiredRequestHandler(ctx, request._id)
      return { status: "ok" as const }
    }

    await ctx.db.patch(request._id, {
      autoEngageStatus: "active",
      pausedAt: undefined,
      pausedByUserId: undefined,
      resumedAt: now,
      updatedAt: now,
    })

    await ctx.scheduler.runAfter(0, internal.autoEngage.enqueueRequest, {
      requestId: request._id,
    })

    return { status: "ok" as const }
  },
})

async function requireRequestManager(
  ctx: MutationCtx,
  requestId: Id<"engagementRequests">
) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new ConvexError("Not authenticated.")

  const request = await ctx.db.get(requestId)
  if (!request) throw new ConvexError("Request not found.")

  const membership = await ctx.db
    .query("farmMemberships")
    .withIndex("by_farmId_and_userId", (q) =>
      q.eq("farmId", request.farmId).eq("userId", userId)
    )
    .unique()
  if (!membership || membership.status !== "active") {
    throw new ConvexError("You do not have access to this Farm.")
  }
  if (request.requesterUserId !== userId && membership.role !== "admin") {
    throw new ConvexError(
      "Only the requester or Farm admin can manage this post."
    )
  }

  return { request, membership, userId }
}

async function markAttemptFinalFailure(
  ctx: MutationCtx,
  attempt: Doc<"engagementAttempts">,
  {
    code,
    message,
    now,
  }: {
    code: string
    message: string
    now: number
  }
) {
  await ctx.db.patch(attempt._id, {
    status: "failed_final",
    lastErrorCode: code,
    lastErrorMessage: message,
    lastTriedAt: now,
    nextRetryAt: undefined,
    reservationExpiresAt: undefined,
    completedAt: now,
    updatedAt: now,
  })
}

function nextRetryAt({
  attemptCount,
  deadlineAt,
  retryAt,
}: {
  attemptCount: number
  deadlineAt: number
  retryAt?: number
}) {
  const now = Date.now()
  const exponentialDelay = Math.min(
    45 * 60 * 1000,
    2 ** Math.min(5, attemptCount) * 60 * 1000
  )
  const jitter = seededInt(
    `${deadlineAt}:${attemptCount}`,
    "retry-jitter",
    5 * 1000,
    90 * 1000
  )
  const fallback = now + exponentialDelay + jitter
  const resetRetryAt =
    retryAt !== undefined && retryAt > now + 5 * 1000 ? retryAt : undefined
  return Math.min(resetRetryAt ?? fallback, deadlineAt)
}

async function likeXPost({
  accessToken,
  postId,
  userId,
}: {
  accessToken: string
  postId: string
  userId: string
}): Promise<XLikeResult> {
  const response = await fetch(`https://api.x.com/2/users/${userId}/likes`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tweet_id: postId }),
  })

  if (response.ok) return { outcome: "liked" }

  const resetHeader = response.headers.get("x-rate-limit-reset")
  const retryAt = resetHeader ? Number(resetHeader) * 1000 : undefined
  const error = await parseXError(response)

  if (isAlreadyLiked(error)) {
    return { outcome: "already_liked" }
  }

  if (response.status === 404 || isPostUnavailable(error)) {
    return {
      outcome: "post_unavailable",
      code: error.code ?? "post_unavailable",
      message: error.message ?? "X post is unavailable.",
      httpStatus: response.status,
    }
  }

  if (response.status === 429 || response.status >= 500) {
    return {
      outcome: "failed_retryable",
      code: error.code ?? `x_${response.status}`,
      message: error.message ?? "X returned a retryable error.",
      retryAt,
      httpStatus: response.status,
    }
  }

  return {
    outcome: "failed_final",
    code: error.code ?? `x_${response.status}`,
    message: error.message ?? "X could not like this post.",
    httpStatus: response.status,
  }
}

async function parseXError(response: Response) {
  const text = await response.text()
  let code: string | undefined
  let message: string | undefined

  try {
    const body = JSON.parse(text) as Record<string, unknown>
    const errors = Array.isArray(body.errors) ? body.errors : []
    const firstError =
      errors.length > 0 && typeof errors[0] === "object" && errors[0] !== null
        ? (errors[0] as Record<string, unknown>)
        : undefined

    code =
      maybeString(firstError?.code) ??
      maybeString(firstError?.type) ??
      maybeString(body.title) ??
      maybeString(body.type)
    message =
      maybeString(firstError?.message) ??
      maybeString(firstError?.detail) ??
      maybeString(body.detail) ??
      maybeString(body.title)
  } catch {
    message = text.slice(0, 240)
  }

  return {
    code: code ? normalizeCode(code) : undefined,
    message: message ? message.slice(0, 500) : undefined,
  }
}

function maybeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function normalizeCode(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80)
}

function isAlreadyLiked(error: { code?: string; message?: string }) {
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase()
  return text.includes("already") && text.includes("like")
}

function isPostUnavailable(error: { code?: string; message?: string }) {
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase()
  return (
    text.includes("not_found") ||
    text.includes("not found") ||
    text.includes("deleted") ||
    text.includes("unavailable") ||
    text.includes("private") ||
    text.includes("protected")
  )
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new ConvexError("X token encryption is not configured correctly.")
  }
  return value
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/")
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "="
  )
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

async function decryptToken(encryptedToken: EncryptedToken) {
  const rawKey = base64UrlDecode(getRequiredEnv("X_TOKEN_ENCRYPTION_KEY"))
  if (rawKey.byteLength !== 32) {
    throw new ConvexError("X token encryption is not configured correctly.")
  }

  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  )
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlDecode(encryptedToken.iv) },
    key,
    base64UrlDecode(encryptedToken.ciphertext)
  )

  return new TextDecoder().decode(plaintext)
}
