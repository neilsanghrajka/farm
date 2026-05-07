import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"

import { mutation, query } from "./_generated/server"

function normalizeName(value: string | undefined) {
  const name = value?.trim()
  return name && name.length > 0 ? name : null
}

function normalizeEmail(value: string | undefined) {
  const email = value?.trim().toLowerCase()

  if (!email) {
    throw new ConvexError("Authenticated account is missing an email.")
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ConvexError("Authenticated account has an invalid email.")
  }

  return email
}

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return null
    }

    const [authUser, profile] = await Promise.all([
      ctx.db.get(userId),
      ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique(),
    ])

    return {
      authUser,
      profile,
    }
  },
})

export const hasAuthAccount = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email)
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first()

    return { exists: Boolean(user) }
  },
})

export const ensureProfile = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    const userId = await getAuthUserId(ctx)

    if (!identity || !userId) {
      throw new ConvexError("Not authenticated.")
    }

    const authUser = await ctx.db.get(userId)
    const email = normalizeEmail(identity.email ?? authUser?.email)
    const name = normalizeName(args.name) ?? normalizeName(authUser?.name)

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique()

    const existingByToken = await ctx.db
      .query("profiles")
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique()

    if (existingByToken && existing && existingByToken._id !== existing._id) {
      throw new ConvexError("Authenticated profile is already linked.")
    }

    const now = Date.now()

    const profile = existing ?? existingByToken

    if (profile) {
      await ctx.db.patch(profile._id, {
        userId,
        email,
        name: name ?? profile.name,
        tokenIdentifier: identity.tokenIdentifier,
        updatedAt: now,
      })

      return await ctx.db.get(profile._id)
    }

    if (!name) {
      throw new ConvexError("Enter your name to create your Farm profile.")
    }

    const profileId = await ctx.db.insert("profiles", {
      userId,
      tokenIdentifier: identity.tokenIdentifier,
      email,
      name,
      createdAt: now,
      updatedAt: now,
    })

    return await ctx.db.get(profileId)
  },
})
