import { readFileSync } from "node:fs"
import { spawnSync } from "node:child_process"

const localRequired = [
  "CONVEX_DEPLOYMENT",
  "CONVEX_SITE_URL",
  "NEXT_PUBLIC_CONVEX_URL",
  "NEXT_PUBLIC_APP_URL",
]

const vercelProductionRequired = [
  "CONVEX_SITE_URL",
  "CONVEX_DEPLOY_KEY",
  "NEXT_PUBLIC_APP_URL",
]

const vercelDevelopmentRequired = [
  "CONVEX_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CONVEX_URL",
]

const vercelForbidden = [
  "NEXT_PUBLIC_CONVEX_SITE_URL",
  "X_CLIENT_ID",
  "X_CLIENT_SECRET",
  "X_REDIRECT_URI",
  "X_OAUTH_SCOPES",
  "X_APP_ID",
  "X_ENROLLED_ACCOUNT_ID",
  "X_TOKEN_ENCRYPTION_KEY",
  "X_BEARER_TOKEN",
  "X_API_BEARER_TOKEN",
]

const vercelInjectedByConvexBuild = ["NEXT_PUBLIC_CONVEX_URL"]

const convexRuntimeRequired = [
  "NEXT_PUBLIC_APP_URL",
  "X_CLIENT_ID",
  "X_REDIRECT_URI",
  "X_OAUTH_SCOPES",
  "X_TOKEN_ENCRYPTION_KEY",
]

const convexProductionRequired = [
  ...convexRuntimeRequired,
  "X_APP_ID",
  "X_ENROLLED_ACCOUNT_ID",
]

const convexForbidden = [
  "NEXT_PUBLIC_CONVEX_SITE_URL",
  "CONVEX_DEPLOY_KEY",
  "NEXT_PUBLIC_CONVEX_URL",
]

let hasFailure = false

function readEnvFile(path) {
  try {
    return new Map(
      readFileSync(path, "utf8")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => {
          const index = line.indexOf("=")
          if (index === -1) return null
          return [line.slice(0, index), line.slice(index + 1)]
        })
        .filter(Boolean)
    )
  } catch {
    return new Map()
  }
}

function shell(args) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: process.cwd(),
    encoding: "utf8",
  })

  if (result.status !== 0) {
    return {
      ok: false,
      output: [result.stdout, result.stderr].filter(Boolean).join("\n").trim(),
    }
  }

  return { ok: true, output: result.stdout.trim() }
}

function checkList(label, present, required) {
  const missing = required.filter((key) => !present.has(key))

  if (missing.length > 0) {
    hasFailure = true
    console.error(`${label}: missing ${missing.join(", ")}`)
    return
  }

  console.log(`${label}: ok`)
}

function checkAbsent(label, present, forbidden) {
  const unexpected = forbidden.filter((key) => present.has(key))

  if (unexpected.length > 0) {
    hasFailure = true
    console.error(`${label}: unexpected ${unexpected.join(", ")}`)
  }
}

function checkLocal() {
  const env = readEnvFile(".env.local")
  const present = new Set(
    [...env.entries()]
      .filter(([, value]) => value.trim().length > 0)
      .map(([key]) => key)
  )

  checkList(".env.local", present, localRequired)
}

function checkVercel(environment, required) {
  const result = shell(["pnpm", "exec", "vercel", "env", "ls", environment])

  if (!result.ok) {
    hasFailure = true
    console.error(`Vercel ${environment}: could not list env names`)
    if (result.output) console.error(result.output)
    return
  }

  const present = new Set(
    result.output
      .split(/\r?\n/)
      .map((line) => line.trim().split(/\s+/)[0])
      .filter((key) => /^[A-Z][A-Z0-9_]*$/.test(key))
  )

  checkList(`Vercel ${environment}`, present, required)
  checkAbsent(`Vercel ${environment}`, present, vercelForbidden)

  for (const key of vercelInjectedByConvexBuild) {
    if (present.has(key)) {
      console.log(`Vercel ${environment}: ${key}=SET`)
    } else {
      console.log(
        `Vercel ${environment}: ${key}=injected by convex deploy build command`
      )
    }
  }
}

function checkConvex(label, args) {
  const result = shell(["pnpm", "exec", "convex", "env", "list", ...args])

  if (!result.ok) {
    hasFailure = true
    console.error(`${label}: could not list env names`)
    if (result.output) console.error(result.output)
    return
  }

  const present = new Set(
    result.output
      .split(/\r?\n/)
      .map((line) => line.trim().split("=")[0])
      .filter((key) => /^[A-Z][A-Z0-9_]*$/.test(key))
  )

  const required =
    label === "Convex prod" ? convexProductionRequired : convexRuntimeRequired

  checkList(label, present, required)
  checkAbsent(label, present, convexForbidden)
}

checkLocal()
checkVercel("production", vercelProductionRequired)
checkVercel("development", vercelDevelopmentRequired)
checkVercel("preview", [])
checkConvex("Convex prod", ["--prod"])
checkConvex("Convex dev", [])

if (hasFailure) {
  process.exitCode = 1
}
