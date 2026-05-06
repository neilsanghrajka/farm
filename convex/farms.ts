import { getAuthUserId } from "@convex-dev/auth/server"
import { ConvexError, v } from "convex/values"

import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { mutation, query } from "./_generated/server"

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"

type Viewer = {
  userId: Id<"users">
  profile: Doc<"profiles">
}

function normalizeName(value: string) {
  const name = value.trim().replace(/\s+/g, " ")
  if (!name) throw new ConvexError("Enter a Farm name.")
  if (name.length > 48) throw new ConvexError("Use 48 characters or fewer.")
  return name
}

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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? "F"}${parts.at(-1)?.[0] ?? ""}`.toUpperCase()
}

function code() {
  let value = ""
  for (let i = 0; i < 8; i += 1) {
    value += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return value
}

async function createLink(
  ctx: MutationCtx,
  farmId: Id<"farms">,
  userId: Id<"users">,
  now: number
) {
  for (let i = 0; i < 8; i += 1) {
    const inviteCode = code()
    const existing = await ctx.db
      .query("farmInviteLinks")
      .withIndex("by_code", (q) => q.eq("code", inviteCode))
      .unique()
    if (!existing) {
      await ctx.db.insert("farmInviteLinks", {
        farmId,
        code: inviteCode,
        status: "active",
        createdByUserId: userId,
        createdAt: now,
        updatedAt: now,
      })
      return inviteCode
    }
  }
  throw new ConvexError("Could not create a join link. Try again.")
}

async function activeLink(ctx: QueryCtx | MutationCtx, farmId: Id<"farms">) {
  return await ctx.db
    .query("farmInviteLinks")
    .withIndex("by_farmId_and_status", (q) =>
      q.eq("farmId", farmId).eq("status", "active")
    )
    .unique()
}

async function membership(
  ctx: QueryCtx | MutationCtx,
  farmId: Id<"farms">,
  userId: Id<"users">
) {
  return await ctx.db
    .query("farmMemberships")
    .withIndex("by_farmId_and_userId", (q) =>
      q.eq("farmId", farmId).eq("userId", userId)
    )
    .unique()
}

async function requireMembership(ctx: QueryCtx | MutationCtx, farmId: Id<"farms">) {
  const current = await viewer(ctx)
  const row = await membership(ctx, farmId, current.userId)
  if (!row || row.status !== "active") {
    throw new ConvexError("You are not a member of this Farm.")
  }
  return { current, row }
}

async function members(ctx: QueryCtx | MutationCtx, farmId: Id<"farms">) {
  const rows = await ctx.db
    .query("farmMemberships")
    .withIndex("by_farmId_and_status", (q) =>
      q.eq("farmId", farmId).eq("status", "active")
    )
    .take(100)
  const result = []
  for (const row of rows) {
    const profile = await ctx.db.get(row.profileId)
    if (profile) {
      result.push({
        membershipId: row._id,
        name: profile.name,
        initials: initials(profile.name),
        role: row.role,
      })
    }
  }
  return result
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const current = await viewer(ctx)
    const rows = await ctx.db
      .query("farmMemberships")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", current.userId).eq("status", "active")
      )
      .take(100)
    const result = []
    for (const row of rows) {
      const farm = await ctx.db.get(row.farmId)
      if (farm && farm.status === "active") {
        result.push({
          id: farm._id,
          name: farm.name,
          memberCount: farm.memberCount,
          role: row.role,
        })
      }
    }
    return result
  },
})

export const get = query({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    const current = await viewer(ctx)
    const row = await membership(ctx, args.farmId, current.userId)
    const farm = await ctx.db.get(args.farmId)
    if (!row || row.status !== "active") {
      return { status: "unavailable" as const }
    }
    if (!farm || farm.status !== "active") {
      return { status: "unavailable" as const }
    }
    const link = row.role === "admin" ? await activeLink(ctx, farm._id) : null
    return {
      status: "ok" as const,
      farm: {
        id: farm._id,
        name: farm.name,
        memberCount: farm.memberCount,
        role: row.role,
        inviteCode: link?.code ?? null,
      },
      viewer: { name: current.profile.name, role: row.role },
      members: await members(ctx, farm._id),
    }
  },
})

export const resolveInvite = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const link = await ctx.db
      .query("farmInviteLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim()))
      .unique()
    if (!link || link.status !== "active") return { status: "invalid" as const }
    const farm = await ctx.db.get(link.farmId)
    if (!farm || farm.status !== "active") return { status: "invalid" as const }
    const creator = await ctx.db.get(farm.createdByProfileId)
    const userId = await getAuthUserId(ctx)
    const row = userId ? await membership(ctx, farm._id, userId) : null
    return {
      status: "ok" as const,
      farm: {
        id: farm._id,
        name: farm.name,
        memberCount: farm.memberCount,
        creatorName: creator?.name ?? "the Farm admin",
        isMember: row?.status === "active",
      },
    }
  },
})

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const current = await viewer(ctx)
    const now = Date.now()
    const farmId = await ctx.db.insert("farms", {
      name: normalizeName(args.name),
      createdByUserId: current.userId,
      createdByProfileId: current.profile._id,
      status: "active",
      memberCount: 1,
      createdAt: now,
      updatedAt: now,
    })
    await ctx.db.insert("farmMemberships", {
      farmId,
      userId: current.userId,
      profileId: current.profile._id,
      role: "admin",
      status: "active",
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    return { farmId, inviteCode: await createLink(ctx, farmId, current.userId, now) }
  },
})

export const joinByInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const current = await viewer(ctx)
    const link = await ctx.db
      .query("farmInviteLinks")
      .withIndex("by_code", (q) => q.eq("code", args.code.trim()))
      .unique()
    if (!link || link.status !== "active") {
      throw new ConvexError("This Farm link is not available.")
    }
    const farm = await ctx.db.get(link.farmId)
    if (!farm || farm.status !== "active") {
      throw new ConvexError("This Farm link is not available.")
    }
    const now = Date.now()
    const existing = await membership(ctx, farm._id, current.userId)
    if (existing?.status === "active") {
      return { farmId: farm._id, alreadyMember: true }
    }
    if (existing) {
      await ctx.db.replace(existing._id, {
        farmId: existing.farmId,
        userId: existing.userId,
        profileId: current.profile._id,
        role: "member",
        status: "active",
        joinedAt: now,
        createdAt: existing.createdAt,
        updatedAt: now,
      })
    } else {
      await ctx.db.insert("farmMemberships", {
        farmId: farm._id,
        userId: current.userId,
        profileId: current.profile._id,
        role: "member",
        status: "active",
        joinedAt: now,
        createdAt: now,
        updatedAt: now,
      })
    }
    await ctx.db.patch(farm._id, {
      memberCount: farm.memberCount + 1,
      updatedAt: now,
    })
    return { farmId: farm._id, alreadyMember: false }
  },
})

export const leave = mutation({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    const { row } = await requireMembership(ctx, args.farmId)
    if (row.role === "admin") {
      throw new ConvexError("Admins delete the Farm instead of leaving.")
    }
    const farm = await ctx.db.get(args.farmId)
    if (!farm || farm.status !== "active") {
      throw new ConvexError("This Farm is not available.")
    }
    const now = Date.now()
    await ctx.db.patch(row._id, { status: "left", leftAt: now, updatedAt: now })
    await ctx.db.patch(farm._id, {
      memberCount: Math.max(0, farm.memberCount - 1),
      updatedAt: now,
    })
    return { farmId: args.farmId }
  },
})

export const remove = mutation({
  args: { farmId: v.id("farms") },
  handler: async (ctx, args) => {
    const { row } = await requireMembership(ctx, args.farmId)
    if (row.role !== "admin") {
      throw new ConvexError("Only admins can delete this Farm.")
    }
    const farm = await ctx.db.get(args.farmId)
    if (!farm || farm.status !== "active") {
      throw new ConvexError("This Farm is not available.")
    }
    const now = Date.now()
    await ctx.db.patch(farm._id, {
      status: "deleted",
      updatedAt: now,
      deletedAt: now,
    })
    const link = await activeLink(ctx, farm._id)
    if (link) {
      await ctx.db.patch(link._id, {
        status: "disabled",
        updatedAt: now,
        disabledAt: now,
      })
    }
    return { farmId: args.farmId }
  },
})
