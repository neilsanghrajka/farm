import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server"

type AuthenticatedViewer = {
  userId: Id<"users">
  profile: Doc<"profiles">
  tokenIdentifier: string
}

async function getAuthenticatedViewer(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedViewer> {
  const identity = await ctx.auth.getUserIdentity()
  const userId = await getAuthUserId(ctx)

  if (!identity || !userId) {
    throw new ConvexError("Not authenticated.")
  }

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique()

  if (!profile) {
    throw new ConvexError("Finish setting up your Farm profile.")
  }

  return {
    userId,
    profile,
    tokenIdentifier: identity.tokenIdentifier,
  }
}

function publicAccountState(account: Doc<"accounts"> | null) {
  if (!account || account.status === "disconnected") {
    return { status: "unlinked" as const }
  }

  const hasExpired =
    account.status === "linked" &&
    typeof account.expiresAt === "number" &&
    account.expiresAt <= Date.now() &&
    !account.encryptedRefreshToken

  const status = hasExpired ? "needs_reconnect" : account.status

  return {
    status,
    username: account.username ?? null,
    displayName: account.displayName ?? null,
  }
}

export const currentX = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getAuthenticatedViewer(ctx)
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_userId_and_provider", (q) =>
        q.eq("userId", viewer.userId).eq("provider", "x")
      )
      .unique()

    return publicAccountState(account)
  },
})

export const disconnectX = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await getAuthenticatedViewer(ctx)
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_userId_and_provider", (q) =>
        q.eq("userId", viewer.userId).eq("provider", "x")
      )
      .unique()

    if (!account) {
      return { status: "unlinked" as const }
    }

    const now = Date.now()

    await ctx.db.replace(account._id, {
      userId: account.userId,
      profileId: account.profileId,
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      status: "disconnected",
      scopes: account.scopes,
      createdAt: account.createdAt,
      updatedAt: now,
      disconnectedAt: now,
      ...(account.username ? { username: account.username } : {}),
      ...(account.displayName ? { displayName: account.displayName } : {}),
      ...(account.expiresAt ? { expiresAt: account.expiresAt } : {}),
    })

    return { status: "unlinked" as const }
  },
})

export const syncCurrentXStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await getAuthenticatedViewer(ctx)
    const account = await ctx.db
      .query("accounts")
      .withIndex("by_userId_and_provider", (q) =>
        q.eq("userId", viewer.userId).eq("provider", "x")
      )
      .unique()

    if (
      account &&
      account.status === "linked" &&
      typeof account.expiresAt === "number" &&
      account.expiresAt <= Date.now() &&
      !account.encryptedRefreshToken
    ) {
      await ctx.db.patch(account._id, {
        status: "needs_reconnect",
        updatedAt: Date.now(),
      })

      return {
        status: "needs_reconnect" as const,
        username: account.username ?? null,
        displayName: account.displayName ?? null,
      }
    }

    return publicAccountState(account)
  },
})

export const markXNeedsReconnect = internalMutation({
  args: {
    accountId: v.id("accounts"),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId)

    if (!account || account.provider !== "x") {
      return null
    }

    await ctx.db.patch(account._id, {
      status: "needs_reconnect",
      updatedAt: Date.now(),
    })

    return { status: "needs_reconnect" as const }
  },
})

export const updateXTokenAfterRefresh = internalMutation({
  args: {
    accountId: v.id("accounts"),
    encryptedAccessToken: v.object({
      ciphertext: v.string(),
      iv: v.string(),
    }),
    encryptedRefreshToken: v.optional(
      v.object({
        ciphertext: v.string(),
        iv: v.string(),
      })
    ),
    expiresAt: v.optional(v.number()),
    scopes: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const account = await ctx.db.get(args.accountId)

    if (!account || account.provider !== "x") {
      return null
    }

    await ctx.db.patch(account._id, {
      encryptedAccessToken: args.encryptedAccessToken,
      ...(args.encryptedRefreshToken
        ? { encryptedRefreshToken: args.encryptedRefreshToken }
        : {}),
      ...(typeof args.expiresAt === "number"
        ? { expiresAt: args.expiresAt }
        : {}),
      ...(args.scopes ? { scopes: args.scopes } : {}),
      status: "linked",
      updatedAt: Date.now(),
    })

    return { status: "linked" as const }
  },
})

export const getViewerForXOAuth = internalQuery({
  args: {},
  handler: async (ctx) => {
    const viewer = await getAuthenticatedViewer(ctx)

    return {
      userId: viewer.userId,
      profileId: viewer.profile._id,
      tokenIdentifier: viewer.tokenIdentifier,
    }
  },
})

export const createXOAuthState = internalMutation({
  args: {
    state: v.string(),
    userId: v.id("users"),
    profileId: v.id("profiles"),
    tokenIdentifier: v.string(),
    codeVerifier: v.string(),
    codeChallenge: v.string(),
    returnTo: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const pendingStates = await ctx.db
      .query("xOAuthStates")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", args.userId).eq("status", "pending")
      )
      .take(20)

    for (const pendingState of pendingStates) {
      await ctx.db.patch(pendingState._id, {
        status: "expired",
        updatedAt: now,
      })
    }

    await ctx.db.insert("xOAuthStates", {
      state: args.state,
      userId: args.userId,
      profileId: args.profileId,
      tokenIdentifier: args.tokenIdentifier,
      codeVerifier: args.codeVerifier,
      codeChallenge: args.codeChallenge,
      status: "pending",
      returnTo: args.returnTo,
      createdAt: now,
      expiresAt: args.expiresAt,
      updatedAt: now,
    })

    return { state: args.state }
  },
})

export const getPendingXOAuthState = internalQuery({
  args: {
    state: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("xOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique()
  },
})

export const failXOAuthState = internalMutation({
  args: {
    state: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("xOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique()

    if (!state || state.status === "completed") {
      return null
    }

    await ctx.db.patch(state._id, {
      status: "failed",
      error: args.error,
      updatedAt: Date.now(),
    })

    return { status: "failed" as const }
  },
})

export const completeXOAuth = internalMutation({
  args: {
    state: v.string(),
    providerAccountId: v.optional(v.string()),
    username: v.optional(v.string()),
    displayName: v.optional(v.string()),
    scopes: v.array(v.string()),
    encryptedAccessToken: v.object({
      ciphertext: v.string(),
      iv: v.string(),
    }),
    encryptedRefreshToken: v.optional(
      v.object({
        ciphertext: v.string(),
        iv: v.string(),
      })
    ),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query("xOAuthStates")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .unique()

    if (!state || state.status !== "pending") {
      throw new ConvexError("X authorization expired. Try again.")
    }

    if (state.expiresAt <= Date.now()) {
      await ctx.db.patch(state._id, {
        status: "expired",
        updatedAt: Date.now(),
      })
      throw new ConvexError("X authorization expired. Try again.")
    }

    const existingForUser = await ctx.db
      .query("accounts")
      .withIndex("by_userId_and_provider", (q) =>
        q.eq("userId", state.userId).eq("provider", "x")
      )
      .unique()
    const reusableExistingForUser =
      existingForUser?.status === "disconnected" ? null : existingForUser
    const providerAccountId =
      args.providerAccountId ?? reusableExistingForUser?.providerAccountId

    if (!providerAccountId) {
      throw new ConvexError(
        "X did not return an account id with the requested scopes."
      )
    }

    const existingForXAccount = await ctx.db
      .query("accounts")
      .withIndex("by_provider_and_providerAccountId", (q) =>
        q.eq("provider", "x").eq("providerAccountId", providerAccountId)
      )
      .unique()

    if (
      existingForXAccount &&
      existingForXAccount.userId !== state.userId &&
      existingForXAccount.status !== "disconnected"
    ) {
      throw new ConvexError(
        "This X account is already connected to another Farm account."
      )
    }

    const now = Date.now()
    const existingRefreshToken =
      existingForUser?.encryptedRefreshToken ??
      existingForXAccount?.encryptedRefreshToken
    const account = {
      userId: state.userId,
      profileId: state.profileId,
      provider: "x" as const,
      providerAccountId,
      status: "linked" as const,
      scopes: args.scopes,
      encryptedAccessToken: args.encryptedAccessToken,
      createdAt:
        existingForUser?.createdAt ?? existingForXAccount?.createdAt ?? now,
      updatedAt: now,
      ...(args.username ? { username: args.username } : {}),
      ...(args.displayName ? { displayName: args.displayName } : {}),
      ...(args.encryptedRefreshToken
        ? { encryptedRefreshToken: args.encryptedRefreshToken }
        : existingRefreshToken
          ? { encryptedRefreshToken: existingRefreshToken }
          : {}),
      ...(typeof args.expiresAt === "number"
        ? { expiresAt: args.expiresAt }
        : {}),
    }

    const targetAccountId =
      existingForXAccount?.status === "disconnected"
        ? existingForXAccount._id
        : (existingForUser?._id ?? existingForXAccount?._id)

    if (targetAccountId) {
      await ctx.db.replace(targetAccountId, account)
    } else {
      await ctx.db.insert("accounts", account)
    }

    if (
      existingForUser &&
      existingForUser._id !== targetAccountId &&
      existingForUser.userId === state.userId
    ) {
      await ctx.db.delete(existingForUser._id)
    }

    await ctx.db.patch(state._id, {
      status: "completed",
      completedAt: now,
      updatedAt: now,
    })

    return {
      status: "linked" as const,
      providerAccountId,
      username: args.username ?? null,
      displayName: args.displayName ?? null,
    }
  },
})
