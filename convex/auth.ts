import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"
import { ConvexError } from "convex/values"
import type { DataModel } from "./_generated/dataModel"

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    throw new ConvexError("Email is required.")
  }

  const email = value.trim().toLowerCase()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ConvexError("Enter a valid email address.")
  }

  return email
}

function normalizeName(value: unknown) {
  return typeof value === "string" ? value.trim() : undefined
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password<DataModel>({
      profile(params) {
        const email = normalizeEmail(params.email)
        const name = normalizeName(params.name)

        return name ? { email, name } : { email }
      },
      validatePasswordRequirements(password) {
        if (password.length < 8) {
          throw new ConvexError("Password must be at least 8 characters.")
        }
      },
    }),
  ],
})
