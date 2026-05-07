import { ConvexError, v } from "convex/values"

import { internal } from "./_generated/api"
import { action, httpAction } from "./_generated/server"

const X_AUTHORIZE_URL = "https://x.com/i/oauth2/authorize"
const X_TOKEN_URL = "https://api.x.com/2/oauth2/token"
const X_ME_URL = "https://api.x.com/2/users/me"
const DEFAULT_SCOPES = "tweet.read users.read like.write offline.access"
const STATE_TTL_MS = 10 * 60 * 1000

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  user_id?: string
}

type MeResponse = {
  data?: {
    id?: string
  }
}

type EncryptedToken = {
  ciphertext: string
  iv: string
}

type CompleteXOAuthArgs = {
  state: string
  providerAccountId?: string
  username?: string
  displayName?: string
  scopes: string[]
  encryptedAccessToken: EncryptedToken
  encryptedRefreshToken?: EncryptedToken
  expiresAt?: number
}

export const start = action({
  args: {
    returnTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clientId = getRequiredEnv("X_CLIENT_ID")
    const redirectUri = getRequiredEnv("X_REDIRECT_URI")
    const scopes = normalizeScopes(process.env.X_OAUTH_SCOPES ?? DEFAULT_SCOPES)

    const viewer = await ctx.runQuery(internal.accounts.getViewerForXOAuth, {})
    const state = randomUrlSafeString(32)
    const codeVerifier = randomUrlSafeString(64)
    const codeChallenge = await pkceChallenge(codeVerifier)
    const returnTo = normalizeReturnTo(args.returnTo)

    await ctx.runMutation(internal.accounts.createXOAuthState, {
      state,
      userId: viewer.userId,
      profileId: viewer.profileId,
      tokenIdentifier: viewer.tokenIdentifier,
      codeVerifier,
      codeChallenge,
      returnTo,
      expiresAt: Date.now() + STATE_TTL_MS,
    })

    const authorizeUrl = new URL(X_AUTHORIZE_URL)
    authorizeUrl.searchParams.set("response_type", "code")
    authorizeUrl.searchParams.set("client_id", clientId)
    authorizeUrl.searchParams.set("redirect_uri", redirectUri)
    authorizeUrl.searchParams.set("scope", scopes.join(" "))
    authorizeUrl.searchParams.set("state", state)
    authorizeUrl.searchParams.set("code_challenge", codeChallenge)
    authorizeUrl.searchParams.set("code_challenge_method", "S256")

    return { authorizationUrl: authorizeUrl.toString() }
  },
})

export const handleXOAuthCallback = httpAction(async (ctx, request) => {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const state = requestUrl.searchParams.get("state")
  const deniedError =
    requestUrl.searchParams.get("error_description") ??
    requestUrl.searchParams.get("error")

  if (!state) {
    return redirectToAppSettings("missing_state")
  }

  const pendingState = await ctx.runQuery(
    internal.accounts.getPendingXOAuthState,
    { state }
  )

  const returnTo =
    pendingState && isSafeReturnTo(pendingState.returnTo)
      ? pendingState.returnTo
      : "/settings"

  if (!pendingState || pendingState.status !== "pending") {
    return redirectToApp(returnTo, { x_error: "expired" })
  }

  if (pendingState.expiresAt <= Date.now()) {
    await ctx.runMutation(internal.accounts.failXOAuthState, {
      state,
      error: "expired",
    })
    return redirectToApp(returnTo, { x_error: "expired" })
  }

  if (deniedError) {
    await ctx.runMutation(internal.accounts.failXOAuthState, {
      state,
      error: "denied",
    })
    return redirectToApp(returnTo, { x_error: "denied" })
  }

  if (!code) {
    await ctx.runMutation(internal.accounts.failXOAuthState, {
      state,
      error: "missing_code",
    })
    return redirectToApp(returnTo, { x_error: "missing_code" })
  }

  try {
    const token = await exchangeCodeForToken(code, pendingState.codeVerifier)
    let providerAccountId = providerAccountIdFromToken(token)

    if (!providerAccountId) {
      providerAccountId = await fetchAuthenticatedUserId(
        token.access_token,
        token.scope
      )
    }

    const completeArgs: CompleteXOAuthArgs = {
      state,
      scopes: normalizeScopes(token.scope ?? process.env.X_OAUTH_SCOPES),
      encryptedAccessToken: await encryptToken(token.access_token),
    }

    if (providerAccountId) {
      completeArgs.providerAccountId = providerAccountId
    }

    if (token.refresh_token) {
      completeArgs.encryptedRefreshToken = await encryptToken(
        token.refresh_token
      )
    }

    if (typeof token.expires_in === "number") {
      completeArgs.expiresAt = Date.now() + token.expires_in * 1000
    }

    await ctx.runMutation(internal.accounts.completeXOAuth, completeArgs)

    return redirectToApp(returnTo, { x_account: "connected" })
  } catch (error) {
    console.warn(
      "X OAuth callback failed",
      error instanceof Error ? error.message : "Unknown error"
    )

    await ctx.runMutation(internal.accounts.failXOAuthState, {
      state,
      error: "exchange_failed",
    })

    return redirectToApp(returnTo, { x_error: "connect_failed" })
  }
})

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new ConvexError("X account linking is not configured yet.")
  }

  return value
}

function normalizeScopes(value: string | undefined) {
  return (value ?? DEFAULT_SCOPES)
    .split(/\s+/)
    .map((scope) => scope.trim())
    .filter(Boolean)
}

function normalizeReturnTo(value: string | undefined) {
  if (!value || !isSafeReturnTo(value)) {
    return "/settings"
  }

  return value
}

function isSafeReturnTo(value: string) {
  return value.startsWith("/") && !value.startsWith("//")
}

function randomUrlSafeString(byteLength: number) {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)

  return base64UrlEncode(bytes)
}

async function pkceChallenge(codeVerifier: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  )

  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
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

async function encryptToken(token: string): Promise<EncryptedToken> {
  const rawKey = base64UrlDecode(getRequiredEnv("X_TOKEN_ENCRYPTION_KEY"))

  if (rawKey.byteLength !== 32) {
    throw new ConvexError("X token encryption is not configured correctly.")
  }

  const key = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  )
  const iv = new Uint8Array(12)
  crypto.getRandomValues(iv)
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  )

  return {
    ciphertext: base64UrlEncode(new Uint8Array(ciphertext)),
    iv: base64UrlEncode(iv),
  }
}

async function exchangeCodeForToken(code: string, codeVerifier: string) {
  const clientId = getRequiredEnv("X_CLIENT_ID")
  const clientSecret = process.env.X_CLIENT_SECRET?.trim()
  const redirectUri = getRequiredEnv("X_REDIRECT_URI")
  const body = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  })
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  }

  if (clientSecret) {
    headers.Authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`
  } else {
    body.set("client_id", clientId)
  }

  const response = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers,
    body,
  })

  if (!response.ok) {
    throw new ConvexError("X authorization failed. Try again.")
  }

  const token = (await response.json()) as Partial<TokenResponse>

  if (!token.access_token) {
    throw new ConvexError("X authorization failed. Try again.")
  }

  return token as TokenResponse
}

async function fetchAuthenticatedUserId(
  accessToken: string,
  grantedScope: string | undefined
) {
  const response = await fetch(X_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    console.warn("X /2/users/me failed", {
      status: response.status,
      grantedScope,
      body: await safeErrorBody(response),
    })
    throw new ConvexError("X did not return the linked account id.")
  }

  const me = (await response.json()) as MeResponse
  const providerAccountId = maybeNumericId(me.data?.id)

  if (!providerAccountId) {
    console.warn("X /2/users/me returned no numeric id", {
      grantedScope,
      hasData: Boolean(me.data),
    })
    throw new ConvexError("X did not return the linked account id.")
  }

  return providerAccountId
}

async function safeErrorBody(response: Response) {
  const text = await response.text()

  return text.slice(0, 500)
}

function providerAccountIdFromToken(token: TokenResponse) {
  return (
    maybeNumericId(token.user_id) ??
    providerAccountIdFromJwt(token.access_token) ??
    providerAccountIdFromAccessToken(token.access_token)
  )
}

function maybeNumericId(value: unknown) {
  return typeof value === "string" && /^\d+$/.test(value) ? value : undefined
}

function providerAccountIdFromJwt(accessToken: string) {
  const [, payload] = accessToken.split(".")
  if (!payload) {
    return undefined
  }

  try {
    const decoded = new TextDecoder().decode(base64UrlDecode(payload))
    const claims = JSON.parse(decoded) as Record<string, unknown>
    return maybeNumericId(claims.sub) ?? maybeNumericId(claims.user_id)
  } catch {
    return undefined
  }
}

function providerAccountIdFromAccessToken(accessToken: string) {
  const [prefix] = accessToken.split(/[^0-9]/)

  return maybeNumericId(prefix)
}

function appBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()

  if (appUrl) {
    return appUrl
  }

  const redirectUri = process.env.X_REDIRECT_URI?.trim()

  if (redirectUri) {
    return new URL(redirectUri).origin
  }

  return "https://spcfarm.vercel.app"
}

function redirectToAppSettings(error: string) {
  return redirectToApp("/settings", { x_error: error })
}

function redirectToApp(path: string, params: Record<string, string>) {
  const target = new URL(path, appBaseUrl())

  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value)
  }

  return Response.redirect(target)
}
