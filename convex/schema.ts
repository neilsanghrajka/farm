import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,
  profiles: defineTable({
    userId: v.id("users"),
    tokenIdentifier: v.string(),
    email: v.string(),
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_tokenIdentifier", ["tokenIdentifier"])
    .index("by_email", ["email"]),
  accounts: defineTable({
    userId: v.id("users"),
    profileId: v.id("profiles"),
    provider: v.literal("x"),
    providerAccountId: v.string(),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    status: v.union(
      v.literal("linked"),
      v.literal("needs_reconnect"),
      v.literal("disconnected")
    ),
    scopes: v.array(v.string()),
    encryptedAccessToken: v.optional(
      v.object({
        ciphertext: v.string(),
        iv: v.string(),
      })
    ),
    encryptedRefreshToken: v.optional(
      v.object({
        ciphertext: v.string(),
        iv: v.string(),
      })
    ),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    disconnectedAt: v.optional(v.number()),
  })
    .index("by_userId_and_provider", ["userId", "provider"])
    .index("by_userId_and_provider_and_status", [
      "userId",
      "provider",
      "status",
    ])
    .index("by_provider_and_providerAccountId", [
      "provider",
      "providerAccountId",
    ])
    .index("by_status", ["status"]),
  xOAuthStates: defineTable({
    state: v.string(),
    userId: v.id("users"),
    profileId: v.id("profiles"),
    tokenIdentifier: v.string(),
    codeVerifier: v.string(),
    codeChallenge: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("failed")
    ),
    returnTo: v.string(),
    error: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(),
    completedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_state", ["state"])
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_status", ["status"]),
  farms: defineTable({
    name: v.string(),
    createdByUserId: v.id("users"),
    createdByProfileId: v.id("profiles"),
    status: v.union(v.literal("active"), v.literal("deleted")),
    memberCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    deletedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_createdByUserId_and_status", ["createdByUserId", "status"]),
  farmMemberships: defineTable({
    farmId: v.id("farms"),
    userId: v.id("users"),
    profileId: v.id("profiles"),
    role: v.union(v.literal("admin"), v.literal("member")),
    status: v.union(v.literal("active"), v.literal("left")),
    joinedAt: v.number(),
    leftAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId_and_status", ["userId", "status"])
    .index("by_farmId_and_status", ["farmId", "status"])
    .index("by_farmId_and_userId", ["farmId", "userId"])
    .index("by_farmId_and_role_and_status", ["farmId", "role", "status"]),
  farmInviteLinks: defineTable({
    farmId: v.id("farms"),
    code: v.string(),
    status: v.union(v.literal("active"), v.literal("disabled")),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    disabledAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_farmId_and_status", ["farmId", "status"]),
  engagementRequests: defineTable({
    farmId: v.id("farms"),
    requesterUserId: v.id("users"),
    requesterProfileId: v.id("profiles"),
    provider: v.literal("x"),
    providerPostId: v.string(),
    postUrl: v.string(),
    postTitle: v.optional(v.string()),
    postTextPreview: v.optional(v.string()),
    postAuthorUsername: v.optional(v.string()),
    postAuthorDisplayName: v.optional(v.string()),
    postCreatedAt: v.optional(v.number()),
    action: v.literal("like"),
    status: v.union(
      v.literal("active"),
      v.literal("completed"),
      v.literal("partial"),
      v.literal("failed"),
      v.literal("canceled")
    ),
    engagementDeadlineAt: v.optional(v.number()),
    autoEngageStatus: v.optional(
      v.union(
        v.literal("active"),
        v.literal("paused"),
        v.literal("stopped"),
        v.literal("completed")
      )
    ),
    pausedAt: v.optional(v.number()),
    pausedByUserId: v.optional(v.id("users")),
    resumedAt: v.optional(v.number()),
    stoppedAt: v.optional(v.number()),
    stopReason: v.optional(
      v.union(
        v.literal("post_unavailable"),
        v.literal("engagement_window_expired"),
        v.literal("canceled")
      )
    ),
    selectedAttemptCount: v.optional(v.number()),
    maxSelectedAttempts: v.optional(v.number()),
    effectiveSelectedAttemptCap: v.optional(v.number()),
    selectionSeed: v.optional(v.string()),
    autoEngageStartedAt: v.optional(v.number()),
    autoEngageCompletedAt: v.optional(v.number()),
    targetMemberCount: v.number(),
    likedCount: v.number(),
    pendingCount: v.number(),
    skippedCount: v.number(),
    failedCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
  })
    .index("by_farmId_and_createdAt", ["farmId", "createdAt"])
    .index("by_farmId_and_status_and_createdAt", [
      "farmId",
      "status",
      "createdAt",
    ])
    .index("by_requesterUserId_and_createdAt", ["requesterUserId", "createdAt"])
    .index("by_farmId_and_provider_and_providerPostId", [
      "farmId",
      "provider",
      "providerPostId",
    ])
    .index("by_farmId_and_provider_and_providerPostId_and_status", [
      "farmId",
      "provider",
      "providerPostId",
      "status",
    ])
    .index("by_provider_and_providerPostId", ["provider", "providerPostId"]),
  engagementAttempts: defineTable({
    requestId: v.id("engagementRequests"),
    farmId: v.id("farms"),
    membershipId: v.id("farmMemberships"),
    userId: v.id("users"),
    profileId: v.id("profiles"),
    accountId: v.optional(v.id("accounts")),
    provider: v.literal("x"),
    providerAccountId: v.optional(v.string()),
    providerUsername: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("liked"),
      v.literal("already_liked"),
      v.literal("skipped_no_x"),
      v.literal("skipped_ineligible"),
      v.literal("skipped_not_selected"),
      v.literal("skipped_cap_exceeded"),
      v.literal("skipped_post_unavailable"),
      v.literal("skipped_canceled"),
      v.literal("failed_retryable"),
      v.literal("failed_final")
    ),
    attemptCount: v.number(),
    lastErrorCode: v.optional(v.string()),
    lastErrorMessage: v.optional(v.string()),
    lastTriedAt: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    startedAt: v.optional(v.number()),
    reservationExpiresAt: v.optional(v.number()),
    selectionStatus: v.optional(
      v.union(
        v.literal("selected"),
        v.literal("not_selected"),
        v.literal("cap_exceeded"),
        v.literal("missing_x"),
        v.literal("ineligible")
      )
    ),
    selectionRank: v.optional(v.number()),
    skipReason: v.optional(
      v.union(
        v.literal("no_x"),
        v.literal("ineligible"),
        v.literal("not_selected"),
        v.literal("cap_exceeded"),
        v.literal("engagement_window_expired"),
        v.literal("post_unavailable"),
        v.literal("canceled")
      )
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_requestId_and_status", ["requestId", "status"])
    .index("by_requestId_and_membershipId", ["requestId", "membershipId"])
    .index("by_farmId_and_userId", ["farmId", "userId"])
    .index("by_accountId_and_status", ["accountId", "status"]),
})
