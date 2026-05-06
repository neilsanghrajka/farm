"use client"

import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react"
import { useMutation, useQuery } from "convex/react"
import { LockKeyhole, Mail, Sprout, UserRound } from "lucide-react"
import {
  FormEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"

type LoginForm = {
  email: string
  password: string
  name: string
}

const initialForm: LoginForm = {
  email: "",
  password: "",
  name: "",
}

function getValidationError(form: LoginForm) {
  const email = form.email.trim()
  const name = form.name.trim()

  if (!email) {
    return "Enter your email to continue."
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address."
  }

  if (!form.password) {
    return "Enter your password to continue."
  }

  if (name && form.password.length < 8) {
    return "Use at least 8 characters for a new password."
  }

  return null
}

export function LoginScreen({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signIn, signOut } = useAuthActions()
  const viewer = useQuery(api.users.current)
  const ensureProfile = useMutation(api.users.ensureProfile)
  const emailId = useId()
  const passwordId = useId()
  const nameId = useId()
  const errorId = useId()
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingProfileName, setPendingProfileName] = useState<string | null>(
    null
  )
  const ensuredProfileForSession = useRef(false)

  useEffect(() => {
    if (!isAuthenticated || ensuredProfileForSession.current) {
      return
    }

    ensuredProfileForSession.current = true

    void ensureProfile({
      name: pendingProfileName ?? undefined,
    })
      .catch((cause: unknown) => {
        ensuredProfileForSession.current = false
        setError(
          getErrorMessage(cause, "Could not finish setting up your profile.")
        )
      })
      .finally(() => {
        setIsSubmitting(false)
      })
  }, [ensureProfile, isAuthenticated, pendingProfileName])

  function updateField(field: keyof LoginForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError = getValidationError(form)

    if (validationError) {
      setError(validationError)
      return
    }

    const email = form.email.trim().toLowerCase()
    const password = form.password
    const name = form.name.trim()

    setIsSubmitting(true)
    setError(null)
    setPendingProfileName(name || null)

    try {
      if (name) {
        await signIn("password", {
          email,
          password,
          name,
          flow: "signUp",
        })

        return
      }

      await signIn("password", {
        email,
        password,
        flow: "signIn",
      })
    } catch (cause) {
      setError(
        getErrorMessage(
          cause,
          "Could not continue. Check your email and password, then try again."
        )
      )
      setIsSubmitting(false)
    }
  }

  async function handleSignOut() {
    ensuredProfileForSession.current = false
    setPendingProfileName(null)
    await signOut()
  }

  if (isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-6 py-8 text-foreground">
        <p className="text-sm text-muted-foreground">Loading Farm...</p>
      </main>
    )
  }

  if (isAuthenticated) {
    if (viewer?.profile && children) {
      return <>{children}</>
    }

    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-6 py-8 text-foreground">
        <section className="flex w-full max-w-[22rem] flex-col gap-6">
          <div>
            <p className="text-sm font-medium text-primary">Farm</p>
            <h1 className="mt-3 text-4xl leading-tight font-semibold">
              You&apos;re in.
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              {viewer?.profile
                ? `Welcome back, ${viewer.profile.name}.`
                : "Finishing your Farm profile..."}
            </p>
          </div>

          {error ? (
            <p className="text-sm font-medium text-destructive">{error}</p>
          ) : null}

          <Button
            className="h-12 w-full rounded-lg"
            onClick={() => void handleSignOut()}
            type="button"
            variant="outline"
          >
            Sign out
          </Button>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-6 py-8 text-foreground">
      <section className="flex w-full max-w-[22rem] flex-col items-center">
        <div className="mb-10 flex items-end gap-1 text-primary">
          <span className="text-5xl leading-none font-semibold tracking-normal">
            Farm
          </span>
          <Sprout
            aria-hidden="true"
            className="mb-6 size-8"
            strokeWidth={2.4}
          />
        </div>

        <div className="w-full text-center">
          <h1 className="text-[2rem] leading-tight font-semibold tracking-normal text-foreground">
            Continue to Farm
          </h1>
          <p className="mx-auto mt-4 max-w-[18rem] text-lg leading-7 text-muted-foreground">
            Enter your email to sign in or create your account.
          </p>
        </div>

        <form
          className="mt-8 flex w-full flex-col gap-4"
          noValidate
          onSubmit={handleSubmit}
        >
          <div className="flex flex-col gap-3">
            <label
              className="text-sm leading-none font-semibold text-foreground"
              htmlFor={emailId}
            >
              Email
            </label>
            <div className="flex h-14 items-center gap-4 rounded-xl border border-input bg-background px-4 text-muted-foreground transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <Mail aria-hidden="true" className="size-6 shrink-0" />
              <input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={Boolean(error)}
                autoComplete="email"
                className="min-w-0 flex-1 bg-transparent text-lg leading-none text-foreground outline-none placeholder:text-muted-foreground"
                id={emailId}
                inputMode="email"
                name="email"
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
                type="email"
                value={form.email}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label
              className="text-sm leading-none font-semibold text-foreground"
              htmlFor={passwordId}
            >
              Password
            </label>
            <div className="flex h-14 items-center gap-4 rounded-xl border border-input bg-background px-4 text-muted-foreground transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <LockKeyhole aria-hidden="true" className="size-6 shrink-0" />
              <input
                aria-describedby={error ? errorId : undefined}
                aria-invalid={Boolean(error)}
                autoComplete="current-password"
                className="min-w-0 flex-1 bg-transparent text-lg leading-none text-foreground outline-none placeholder:text-muted-foreground"
                id={passwordId}
                name="password"
                onChange={(event) =>
                  updateField("password", event.target.value)
                }
                placeholder="Your password"
                type="password"
                value={form.password}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <label
              className="text-sm leading-none font-semibold text-foreground"
              htmlFor={nameId}
            >
              Name
            </label>
            <div className="flex h-14 items-center gap-4 rounded-xl border border-input bg-background px-4 text-muted-foreground transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
              <UserRound aria-hidden="true" className="size-6 shrink-0" />
              <input
                autoComplete="name"
                className="min-w-0 flex-1 bg-transparent text-lg leading-none text-foreground outline-none placeholder:text-muted-foreground"
                id={nameId}
                name="name"
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Your name (optional)"
                type="text"
                value={form.name}
              />
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              We will ask only if this is your first time.
            </p>
          </div>

          <div className="min-h-5">
            {error ? (
              <p
                aria-live="polite"
                className="text-sm font-medium text-destructive"
                id={errorId}
              >
                {error}
              </p>
            ) : null}
          </div>

          <Button
            className="h-14 w-full rounded-xl text-lg font-semibold"
            disabled={isSubmitting}
            size="lg"
            type="submit"
          >
            {isSubmitting ? "Continuing..." : "Continue"}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm leading-6 text-muted-foreground">
          Use the same email when returning to Farm.
        </p>
      </section>
    </main>
  )
}

function getErrorMessage(cause: unknown, fallback: string) {
  if (cause instanceof Error && cause.message) {
    if (cause.message.includes("Invalid credentials")) {
      return "Could not continue. Check your details and try again."
    }

    if (cause.message.includes("Invalid password")) {
      return "Use at least 8 characters for your password."
    }

    if (cause.message.includes("InvalidAccountId")) {
      return "Could not continue. Check your details and try again."
    }

    return cause.message
  }

  return fallback
}
