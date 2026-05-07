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
import {
  FarmExplainerDialog,
  FarmSafetyDialog,
} from "@/components/farm-explainer-dialog"
import { InstallPrompt } from "@/components/install-prompt"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/convex/_generated/api"
import { cn } from "@/lib/utils"

type LoginStep = "credentials" | "profile"

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

function getCredentialsValidationError(form: LoginForm) {
  const email = form.email.trim()

  if (!email) {
    return "Enter your email to continue."
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address."
  }

  if (!form.password) {
    return "Enter your password to continue."
  }

  return null
}

function getProfileValidationError(form: LoginForm) {
  const name = form.name.trim()

  if (!name) {
    return "Enter your name to create your Farm profile."
  }

  if (form.password.length < 8) {
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
  const [step, setStep] = useState<LoginStep>("credentials")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingProfileName, setPendingProfileName] = useState<string | null>(
    null
  )
  const pendingProfileNameRef = useRef<string | null>(null)
  const ensuredProfileForSession = useRef(false)

  useEffect(() => {
    if (!isAuthenticated) {
      ensuredProfileForSession.current = false
      return
    }

    if (ensuredProfileForSession.current) {
      return
    }

    ensuredProfileForSession.current = true

    void ensureProfile({
      name: pendingProfileNameRef.current ?? pendingProfileName ?? undefined,
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

    if (field === "email" || field === "password") {
      setStep("credentials")
    }
  }

  function returnToCredentials() {
    setStep("credentials")
    setError(null)
    setPendingProfileName(null)
    pendingProfileNameRef.current = null
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationError =
      step === "credentials"
        ? getCredentialsValidationError(form)
        : getProfileValidationError(form)

    if (validationError) {
      setError(validationError)
      return
    }

    const email = form.email.trim().toLowerCase()
    const password = form.password
    const name = form.name.trim()

    setIsSubmitting(true)
    setError(null)

    try {
      if (step === "profile") {
        pendingProfileNameRef.current = name
        setPendingProfileName(name)
        await signIn("password", {
          email,
          password,
          name,
          flow: "signUp",
        })

        return
      }

      setPendingProfileName(null)
      pendingProfileNameRef.current = null
      await signIn("password", {
        email,
        password,
        flow: "signIn",
      })
    } catch (cause) {
      if (step === "credentials" && isUnknownAccountError(cause)) {
        setStep("profile")
        setError(null)
        setIsSubmitting(false)
        return
      }

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
    pendingProfileNameRef.current = null
    await signOut()
  }

  const isProfileStep = step === "profile"

  if (isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-6 py-8 text-foreground">
        <p className="text-sm text-muted-foreground">Loading Farm...</p>
      </main>
    )
  }

  if (isAuthenticated) {
    if (viewer === undefined) {
      return (
        <main className="flex min-h-svh items-center justify-center bg-background px-6 py-8 text-foreground">
          <p className="text-sm text-muted-foreground">Loading Farm...</p>
        </main>
      )
    }

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
          {!isProfileStep ? (
            <div className="flex flex-col items-center gap-2">
              <FarmExplainerDialog />
              <FarmSafetyDialog />
            </div>
          ) : null}
          <h1
            className={cn(
              "text-[2rem] leading-tight font-semibold tracking-normal text-foreground",
              !isProfileStep && "mt-5"
            )}
          >
            {isProfileStep ? "Create your profile" : "Sign up or log in"}
          </h1>
          {isProfileStep ? (
            <p className="mx-auto mt-4 max-w-[18rem] text-lg leading-7 text-muted-foreground">
              We do not recognize this email yet. Add your name to finish.
            </p>
          ) : null}
        </div>

        <div className="mt-6 w-full">
          <InstallPrompt />
        </div>

        <form
          className="mt-8 flex w-full flex-col gap-4"
          noValidate
          onSubmit={handleSubmit}
        >
          {isProfileStep ? (
            <>
              <div className="flex flex-col gap-3">
                <Label
                  className="font-semibold text-foreground"
                  htmlFor={nameId}
                >
                  Name
                </Label>
                <div className="relative">
                  <UserRound
                    aria-hidden="true"
                    className="absolute top-1/2 left-4 size-6 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={Boolean(error)}
                    autoComplete="name"
                    className="h-14 rounded-xl px-12 text-lg"
                    id={nameId}
                    name="name"
                    onChange={(event) =>
                      updateField("name", event.target.value)
                    }
                    placeholder="Your name"
                    type="text"
                    value={form.name}
                  />
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  Signing up with {form.email.trim().toLowerCase()}.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-3">
                <Label
                  className="font-semibold text-foreground"
                  htmlFor={emailId}
                >
                  Email
                </Label>
                <div className="relative">
                  <Mail
                    aria-hidden="true"
                    className="absolute top-1/2 left-4 size-6 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={Boolean(error)}
                    autoComplete="email"
                    className="h-14 rounded-xl px-12 text-lg"
                    id={emailId}
                    inputMode="email"
                    name="email"
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="you@example.com"
                    type="email"
                    value={form.email}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Label
                  className="font-semibold text-foreground"
                  htmlFor={passwordId}
                >
                  Password
                </Label>
                <div className="relative">
                  <LockKeyhole
                    aria-hidden="true"
                    className="absolute top-1/2 left-4 size-6 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    aria-describedby={error ? errorId : undefined}
                    aria-invalid={Boolean(error)}
                    autoComplete="current-password"
                    className="h-14 rounded-xl px-12 text-lg"
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
            </>
          )}

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
            {isSubmitting
              ? "Continuing..."
              : isProfileStep
                ? "Create account"
                : "Continue"}
          </Button>

          {isProfileStep ? (
            <Button
              className="h-12 w-full rounded-xl"
              disabled={isSubmitting}
              onClick={returnToCredentials}
              type="button"
              variant="outline"
            >
              Back
            </Button>
          ) : null}
        </form>

        {isProfileStep ? (
          <p className="mt-8 text-center text-sm leading-6 text-muted-foreground">
            Use this email and password when returning to Farm.
          </p>
        ) : null}
      </section>
    </main>
  )
}

function isUnknownAccountError(cause: unknown) {
  return getCauseMessage(cause).includes("InvalidAccountId")
}

function getCauseMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : ""
}

function getErrorMessage(cause: unknown, fallback: string) {
  const message = getCauseMessage(cause)

  if (message) {
    if (message.includes("Invalid credentials")) {
      return "Could not continue. Check your details and try again."
    }

    if (message.includes("Invalid password")) {
      return "Use at least 8 characters for your password."
    }

    if (message.includes("InvalidAccountId")) {
      return "Could not continue. Check your details and try again."
    }

    if (message.includes("InvalidSecret")) {
      return "Could not continue. Check your details and try again."
    }

    return message
  }

  return fallback
}
