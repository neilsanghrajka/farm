import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import type { Doc, Id } from "./_generated/dataModel"
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server"
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server"

type Viewer = {
  userId: Id<"users">
  profile: Doc<"profiles">
}

type ParsedXPost = {
  providerPostId: string
  postUrl: string
  username?: string
}

type VerifiedXPost = {
  providerPostId: string
  postUrl: string
  postTitle?: string
  postTextPreview?: string
  postAuthorUsername?: string
  postAuthorDisplayName?: string
  postCreatedAt?: number
}

type XEligibility =
  | { status: "eligible"; account: Doc<"accounts"> }
  | { status: "missing" }
  | { status: "ineligible"; account: Doc<"accounts"> }

type AttemptSnapshot = {
  membership: Doc<"farmMemberships">
  eligibility: XEligibility
  status: Doc<"engagementAttempts">["status"]
}

const requiredXScopes = ["tweet.read", "users.read", "like.write"] as const
const reusableRequestStatuses = [
  "active",
  "completed",
  "partial",
  "failed",
] as const

async function viewer(ctx: QueryCtx | MutationCtx): Promise<Viewer> {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new ConvexError("Not authenticated.")
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()
  if (!profile) throw new ConvexError("Finish setting up your Farm profile.")
  return { userId, profile }
}

async function activeMembership(
  ctx: QueryCtx | MutationCtx,
  farmId: Id<"farms">,
  userId: Id<"users">
) {
  const row = await ctx.db
    .query("farmMemberships")
    .withIndex("by_farmId_and_userId", (q) =>
      q.eq("farmId", farmId).eq("userId", userId)
    )
    .unique()
  return row?.status === "active" ? row : null
}

function hasRequiredScopes(account: Doc<"accounts">) {
  return requiredXScopes.every((scope) => account.scopes.includes(scope))
}

function hasUsableTokenMaterial(account: Doc<"accounts">, now: number) {
  if (!account.accessToken) return false
  return !(account.expiresAt && account.expiresAt <= now)
}

function isEligibleXAccount(account: Doc<"accounts">, now: number) {
  return (
    account.provider === "x" &&
    account.status === "linked" &&
    !account.disconnectedAt &&
    hasRequiredScopes(account) &&
    hasUsableTokenMaterial(account, now)
  )
}

async function xAccountsForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">
) {
  return await ctx.db
    .query("accounts")
    .withIndex("by_userId_and_provider", (q) =>
      q.eq("userId", userId).eq("provider", "x")
    )
    .take(10)
}

async function xEligibilityForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  now: number
): Promise<XEligibility> {
  const accounts = await xAccountsForUser(ctx, userId)
  const eligible = accounts.find((account) => isEligibleXAccount(account, now))

  if (eligible) return { status: "eligible", account: eligible }
  if (accounts.length === 0) return { status: "missing" }

  return { status: "ineligible", account: accounts[0] }
}

async function activeMembers(ctx: QueryCtx | MutationCtx, farmId: Id<"farms">) {
  return await ctx.db
    .query("farmMemberships")
    .withIndex("by_farmId_and_status", (q) =>
      q.eq("farmId", farmId).eq("status", "active")
    )
    .take(100)
}

function parseXPostUrl(value: string): ParsedXPost {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new ConvexError("Paste an X post URL.")
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    throw new ConvexError("Enter a valid X post URL.")
  }

  const host = url.hostname.toLowerCase().replace(/^(www\.|mobile\.)/, "")
  if (host !== "x.com" && host !== "twitter.com") {
    throw new ConvexError("Enter an x.com post URL.")
  }

  const parts = url.pathname.split("/").filter(Boolean)
  const statusIndex = parts.findIndex((part) => part.toLowerCase() === "status")
  const postId = statusIndex >= 0 ? parts[statusIndex + 1] : null

  if (!postId || !/^\d+$/.test(postId)) {
    throw new ConvexError("Enter an X post URL with a status id.")
  }

  const rawUsername = statusIndex > 0 ? parts[statusIndex - 1] : undefined
  const username =
    rawUsername && /^[A-Za-z0-9_]{1,15}$/.test(rawUsername)
      ? rawUsername
      : undefined
  const postUrl = username
    ? `https://x.com/${username}/status/${postId}`
    : `https://x.com/i/status/${postId}`

  return {
    providerPostId: postId,
    postUrl,
    username,
  }
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? "F"}${parts.at(-1)?.[0] ?? ""}`.toUpperCase()
}

function truncate(value: string, maxLength: number) {
  const text = value.trim().replace(/\s+/g, " ")
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text
}

function maybeString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

function maybeRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function maybeNumberDate(value: unknown) {
  if (typeof value !== "string") return undefined
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function displayTitle(post: VerifiedXPost) {
  if (post.postTextPreview) return truncate(post.postTextPreview, 96)
  return post.postAuthorUsername
    ? `@${post.postAuthorUsername}'s X post`
    : "X post"
}

function xBearerToken(accountAccessToken?: string | null) {
  return (
    process.env.X_BEARER_TOKEN ??
    process.env.X_API_BEARER_TOKEN ??
    accountAccessToken ??
    null
  )
}

function xVerificationError(): never {
  throw new ConvexError("Could not verify this X post.")
}

async function verifyXPost(
  parsed: ParsedXPost,
  accountAccessToken?: string | null
): Promise<VerifiedXPost> {
  const bearerToken = xBearerToken(accountAccessToken)
  if (!bearerToken) xVerificationError()

  const params = new URLSearchParams({
    "tweet.fields": "author_id,created_at,text",
    expansions: "author_id",
    "user.fields": "name,username",
  })
  const response = await fetch(
    `https://api.x.com/2/tweets/${parsed.providerPostId}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    }
  )

  if (!response.ok) xVerificationError()

  const body = maybeRecord(await response.json())
  const data = maybeRecord(body?.data)
  if (maybeString(data?.id) !== parsed.providerPostId) xVerificationError()

  const includes = maybeRecord(body?.includes)
  const users = Array.isArray(includes?.users) ? includes.users : []
  const authorId = maybeString(data?.author_id)
  const author = users
    .map((user) => maybeRecord(user))
    .find((user) => maybeString(user?.id) === authorId)
  const username = maybeString(author?.username) ?? parsed.username
  const displayName = maybeString(author?.name)
  const text = maybeString(data?.text)
  const postTextPreview = text ? truncate(text, 180) : undefined
  const postUrl = username
    ? `https://x.com/${username}/status/${parsed.providerPostId}`
    : parsed.postUrl
  const postCreatedAt = maybeNumberDate(data?.created_at)

  return {
    providerPostId: parsed.providerPostId,
    postUrl,
    ...(postTextPreview
      ? {
          postTitle: truncate(postTextPreview, 96),
          postTextPreview,
        }
      : {}),
    ...(username ? { postAuthorUsername: username } : {}),
    ...(displayName ? { postAuthorDisplayName: displayName } : {}),
    ...(postCreatedAt ? { postCreatedAt } : {}),
  }
}

function visibleStatus(status: Doc<"engagementAttempts">["status"]) {
  if (status === "failed_retryable" || status === "failed_final") {
    return "failed" as const
  }
  if (status === "skipped_no_x" || status === "skipped_ineligible") {
    return "skipped" as const
  }
  return status
}

const createArgs = {
  farmId: v.id("farms"),
  postUrl: v.string(),
}

const verifiedPostValidator = v.object({
  providerPostId: v.string(),
  postUrl: v.string(),
  postTitle: v.optional(v.string()),
  postTextPreview: v.optional(v.string()),
  postAuthorUsername: v.optional(v.string()),
  postAuthorDisplayName: v.optional(v.string()),
  postCreatedAt: v.optional(v.number()),
})

async function requireCreatePrereqs(
  ctx: QueryCtx | MutationCtx,
  farmId: Id<"farms">
) {
  const current = await viewer(ctx)
  const farm = await ctx.db.get(farmId)
  if (!farm || farm.status !== "active") {
    throw new ConvexError("Choose an available Farm.")
  }
  const row = await activeMembership(ctx, farm._id, current.userId)
  if (!row) {
    throw new ConvexError("You are not a member of this Farm.")
  }

  const eligibility = await xEligibilityForUser(ctx, current.userId, Date.now())
  if (eligibility.status !== "eligible") {
    throw new ConvexError("Connect your X account before requesting likes.")
  }

  return { current, farm, membership: row, account: eligibility.account }
}

async function reusableRequest(
  ctx: QueryCtx | MutationCtx,
  farmId: Id<"farms">,
  providerPostId: string
) {
  for (const status of reusableRequestStatuses) {
    const [request] = await ctx.db
      .query("engagementRequests")
      .withIndex("by_farmId_and_provider_and_providerPostId_and_status", (q) =>
        q
          .eq("farmId", farmId)
          .eq("provider", "x")
          .eq("providerPostId", providerPostId)
          .eq("status", status)
      )
      .order("desc")
      .take(1)
    if (request) return request
  }

  return null
}

function maybeAccountSnapshot(eligibility: XEligibility) {
  if (eligibility.status === "missing") return {}

  return {
    accountId: eligibility.account._id,
    providerAccountId: eligibility.account.providerAccountId,
    providerUsername: eligibility.account.username,
  }
}

async function createFromHomeHandler(ctx: ActionCtx, args: CreateFromHomeArgs) {
  const parsed = parseXPostUrl(args.postUrl)
  const preflight: { accessToken: string | null } = await ctx.runQuery(
    internal.requests.preflightCreateFromHome,
    { farmId: args.farmId }
  )
  const verifiedPost = await verifyXPost(parsed, preflight.accessToken)
  const result: {
    requestId: Id<"engagementRequests">
    reusedExisting: boolean
  } = await ctx.runMutation(internal.requests.createVerifiedFromHome, {
    farmId: args.farmId,
    post: verifiedPost,
  })
  return result
}

type CreateFromHomeArgs = {
  farmId: Id<"farms">
  postUrl: string
}

export const preflightCreateFromHome = internalQuery({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    const { account } = await requireCreatePrereqs(ctx, args.farmId)
    return { accessToken: account.accessToken ?? null }
  },
})

export const createVerifiedFromHome = internalMutation({
  args: {
    farmId: v.id("farms"),
    post: verifiedPostValidator,
  },
  handler: async (ctx, args) => {
    const { current, farm } = await requireCreatePrereqs(ctx, args.farmId)
    const existing = await reusableRequest(
      ctx,
      farm._id,
      args.post.providerPostId
    )
    if (existing) {
      return { requestId: existing._id, reusedExisting: true }
    }

    const members = await activeMembers(ctx, farm._id)
    const now = Date.now()
    const attempts: AttemptSnapshot[] = []
    let pendingCount = 0
    let skippedCount = 0

    for (const member of members) {
      const eligibility = await xEligibilityForUser(ctx, member.userId, now)
      let status: AttemptSnapshot["status"]
      if (eligibility.status === "eligible") {
        status = "pending"
      } else if (eligibility.status === "missing") {
        status = "skipped_no_x"
      } else {
        status = "skipped_ineligible"
      }

      if (status === "pending") pendingCount += 1
      else skippedCount += 1

      attempts.push({
        membership: member,
        eligibility,
        status,
      })
    }

    const requestId = await ctx.db.insert("engagementRequests", {
      farmId: farm._id,
      requesterUserId: current.userId,
      requesterProfileId: current.profile._id,
      provider: "x",
      providerPostId: args.post.providerPostId,
      postUrl: args.post.postUrl,
      postTitle: args.post.postTitle ?? displayTitle(args.post),
      ...(args.post.postTextPreview
        ? { postTextPreview: args.post.postTextPreview }
        : {}),
      ...(args.post.postAuthorUsername
        ? { postAuthorUsername: args.post.postAuthorUsername }
        : {}),
      ...(args.post.postAuthorDisplayName
        ? { postAuthorDisplayName: args.post.postAuthorDisplayName }
        : {}),
      ...(args.post.postCreatedAt
        ? { postCreatedAt: args.post.postCreatedAt }
        : {}),
      action: "like",
      status: pendingCount > 0 ? "active" : "completed",
      targetMemberCount: members.length,
      likedCount: 0,
      pendingCount,
      skippedCount,
      failedCount: 0,
      createdAt: now,
      updatedAt: now,
      ...(pendingCount === 0 ? { completedAt: now } : {}),
    })

    for (const attempt of attempts) {
      await ctx.db.insert("engagementAttempts", {
        requestId,
        farmId: farm._id,
        membershipId: attempt.membership._id,
        userId: attempt.membership.userId,
        profileId: attempt.membership.profileId,
        ...maybeAccountSnapshot(attempt.eligibility),
        provider: "x",
        status: attempt.status,
        attemptCount: 0,
        createdAt: now,
        updatedAt: now,
        ...(attempt.status === "pending" ? {} : { completedAt: now }),
      })
    }

    return { requestId, reusedExisting: false }
  },
})

export const createFromHome = action({
  args: createArgs,
  handler: createFromHomeHandler,
})

export const create = action({
  args: createArgs,
  handler: createFromHomeHandler,
})

export const getLinkedXStatus = query({
  args: { farmId: v.optional(v.id("farms")) },
  handler: async (ctx, args) => {
    let current: Viewer
    try {
      current = await viewer(ctx)
    } catch {
      return {
        status: "missing" as const,
        eligible: false,
        eligibleAccountCount: 0,
      }
    }

    const now = Date.now()
    const accounts = await xAccountsForUser(ctx, current.userId)
    const eligible = accounts.find((account) =>
      isEligibleXAccount(account, now)
    )
    let eligibleAccountCount = eligible ? 1 : 0

    if (args.farmId) {
      const membership = await activeMembership(
        ctx,
        args.farmId,
        current.userId
      )
      if (membership) {
        const members = await activeMembers(ctx, args.farmId)
        eligibleAccountCount = 0
        for (const member of members) {
          const memberEligibility = await xEligibilityForUser(
            ctx,
            member.userId,
            now
          )
          if (memberEligibility.status === "eligible") {
            eligibleAccountCount += 1
          }
        }
      }
    }

    if (eligible) {
      return {
        status: "eligible" as const,
        eligible: true,
        eligibleAccountCount,
        username: eligible.username,
        handle: `@${eligible.username}`,
        account: {
          id: eligible._id,
          username: eligible.username,
          displayName: eligible.displayName ?? null,
          providerAccountId: eligible.providerAccountId,
        },
      }
    }

    if (accounts.length === 0) {
      return {
        status: "missing" as const,
        eligible: false,
        eligibleAccountCount,
      }
    }

    const account = accounts[0]
    const status =
      account.status === "linked" ? "needs_reconnect" : account.status
    return {
      status,
      eligible: false,
      eligibleAccountCount,
      username: account.username,
      handle: `@${account.username}`,
      account: {
        id: account._id,
        username: account.username,
        displayName: account.displayName ?? null,
        providerAccountId: account.providerAccountId,
        accountStatus: account.status,
      },
    }
  },
})

export const get = query({
  args: { requestId: v.id("engagementRequests") },
  handler: async (ctx, args) => {
    let current: Viewer
    try {
      current = await viewer(ctx)
    } catch {
      return { status: "unavailable" as const }
    }

    const request = await ctx.db.get(args.requestId)
    if (!request) return { status: "unavailable" as const }
    const farm = await ctx.db.get(request.farmId)
    if (!farm || farm.status !== "active") {
      return { status: "unavailable" as const }
    }
    const viewerMembership = await activeMembership(
      ctx,
      farm._id,
      current.userId
    )
    if (!viewerMembership) return { status: "unavailable" as const }

    const requester = await ctx.db.get(request.requesterProfileId)
    const attempts = await ctx.db
      .query("engagementAttempts")
      .withIndex("by_requestId_and_status", (q) =>
        q.eq("requestId", request._id)
      )
      .take(100)

    const outcomes = []
    for (const attempt of attempts) {
      const profile = await ctx.db.get(attempt.profileId)
      if (!profile) continue
      outcomes.push({
        id: attempt._id,
        name: profile.name,
        initials: initials(profile.name),
        providerUsername: attempt.providerUsername ?? null,
        status: attempt.status,
        visibleStatus: visibleStatus(attempt.status),
      })
    }

    outcomes.sort((a, b) => {
      const statusRank = {
        liked: 0,
        already_liked: 1,
        pending: 2,
        skipped: 3,
        failed: 4,
      } as const
      const rankA = statusRank[a.visibleStatus]
      const rankB = statusRank[b.visibleStatus]
      if (rankA !== rankB) return rankA - rankB
      return a.name.localeCompare(b.name)
    })

    return {
      status: "ok" as const,
      request: {
        id: request._id,
        postUrl: request.postUrl,
        postTitle: request.postTitle ?? "X post",
        postAuthorUsername: request.postAuthorUsername ?? null,
        action: request.action,
        status: request.status,
        targetMemberCount: request.targetMemberCount,
        likedCount: request.likedCount,
        pendingCount: request.pendingCount,
        skippedCount: request.skippedCount,
        failedCount: request.failedCount,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt,
      },
      farm: {
        id: farm._id,
        name: farm.name,
        memberCount: farm.memberCount,
      },
      requester: {
        name: requester?.name ?? "A Farm member",
      },
      viewer: {
        role: viewerMembership.role,
      },
      outcomes,
    }
  },
})

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    let current: Viewer
    try {
      current = await viewer(ctx)
    } catch {
      return []
    }

    const memberships = await ctx.db
      .query("farmMemberships")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", current.userId).eq("status", "active")
      )
      .take(100)

    const summaries = []
    for (const membership of memberships) {
      const farm = await ctx.db.get(membership.farmId)
      if (!farm || farm.status !== "active") continue
      const requests = await ctx.db
        .query("engagementRequests")
        .withIndex("by_farmId_and_createdAt", (q) =>
          q.eq("farmId", membership.farmId)
        )
        .order("desc")
        .take(3)

      for (const request of requests) {
        summaries.push({
          id: request._id,
          farmId: farm._id,
          farmName: farm.name,
          postTitle: request.postTitle ?? "X post",
          postUrl: request.postUrl,
          status: request.status,
          likedCount: request.likedCount,
          pendingCount: request.pendingCount,
          targetMemberCount: request.targetMemberCount,
          createdAt: request.createdAt,
        })
      }
    }

    summaries.sort((a, b) => b.createdAt - a.createdAt)
    return summaries.slice(0, 5)
  },
})

export const listForFarm = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    const current = await viewer(ctx)
    const membership = await activeMembership(ctx, args.farmId, current.userId)
    if (!membership) return []

    const requests = await ctx.db
      .query("engagementRequests")
      .withIndex("by_farmId_and_createdAt", (q) => q.eq("farmId", args.farmId))
      .order("desc")
      .take(50)

    return requests.map((request) => ({
      id: request._id,
      postTitle: request.postTitle ?? "X post",
      postUrl: request.postUrl,
      status: request.status,
      likedCount: request.likedCount,
      pendingCount: request.pendingCount,
      targetMemberCount: request.targetMemberCount,
      createdAt: request.createdAt,
    }))
  },
})
