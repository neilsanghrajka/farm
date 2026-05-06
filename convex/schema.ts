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
})
