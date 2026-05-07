"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useAction, useMutation, useQuery } from "convex/react"
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Home,
  Link as LinkIcon,
  LockKeyhole,
  LogOut,
  MoreHorizontal,
  Settings,
  Sparkles,
  Sprout,
  Trash2,
  TriangleAlert,
  UserRound,
  UsersRound,
} from "lucide-react"
import NextLink from "next/link"
import type * as React from "react"
import { FormEvent, useEffect, useId, useMemo, useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

type Role = "admin" | "member"
type FarmSummary = {
  id: Id<"farms">
  name: string
  memberCount: number
  role: Role
}

type XAccountState =
  | { status: "unlinked" }
  | {
      status: "linked" | "needs_reconnect"
      username: string | null
      displayName: string | null
    }

type FarmAppProps =
  | { view: "home" }
  | { view: "settings" }
  | { view: "farms" }
  | { view: "new" }
  | { view: "detail"; farmId: Id<"farms"> }
  | { view: "join"; inviteCode: string }
  | { view: "delete"; farmId: Id<"farms"> }
  | { view: "leave"; farmId: Id<"farms"> }

export function FarmApp(props: FarmAppProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-[28rem] flex-col px-5 py-8">
        {props.view === "home" ? <HomeScreen /> : null}
        {props.view === "settings" ? <SettingsScreen /> : null}
        {props.view === "farms" ? <MyFarmsScreen /> : null}
        {props.view === "new" ? <CreateFarmScreen /> : null}
        {props.view === "detail" ? (
          <FarmDetailScreen farmId={props.farmId} />
        ) : null}
        {props.view === "join" ? (
          <JoinFarmScreen inviteCode={props.inviteCode} />
        ) : null}
        {props.view === "delete" ? (
          <DeleteFarmScreen farmId={props.farmId} />
        ) : null}
        {props.view === "leave" ? (
          <LeaveFarmScreen farmId={props.farmId} />
        ) : null}
      </div>
    </main>
  )
}

function HomeScreen() {
  const farms = useQuery(api.farms.listMine)
  const xAccount = useQuery(api.accounts.currentX)
  const firstFarmHref =
    farms && farms.length > 0 ? `/farms/${farms[0].id}` : "/farms"
  const isXLoading = xAccount === undefined
  const isXLinked = xAccount?.status === "linked"
  const needsReconnect = xAccount?.status === "needs_reconnect"
  const engagementDisabled = isXLoading || !isXLinked
  const setupActionLabel = needsReconnect
    ? "Reconnect X account"
    : "Connect X account"

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col gap-8">
      <header className="flex items-center justify-between pt-2">
        <NextLink
          className="inline-flex items-center gap-2 text-primary"
          href="/"
          aria-label="Farm Home"
        >
          <Sprout className="size-7" aria-hidden="true" />
          <span className="text-4xl leading-none font-semibold tracking-normal">
            Farm
          </span>
        </NextLink>
        <IconLink href="/settings" label="Settings">
          <Settings className="size-8" aria-hidden="true" />
        </IconLink>
      </header>

      {engagementDisabled ? (
        <Card className="py-0">
          <CardContent className="flex items-center gap-4 px-4 py-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
              <XLogoMark className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold">X account</h2>
                <Badge variant="secondary">
                  {isXLoading
                    ? "Checking"
                    : needsReconnect
                      ? "Reconnect"
                      : "Required"}
                </Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Link your X account before requesting likes from a Farm.
              </p>
            </div>
            <Button
              className="h-10 shrink-0 rounded-xl"
              disabled={isXLoading}
              asChild={!isXLoading}
            >
              {isXLoading ? (
                "Checking"
              ) : (
                <NextLink href="/settings">{setupActionLabel}</NextLink>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-5">
        <div>
          <h1 className="text-[2.9rem] leading-[1.05] font-semibold tracking-normal">
            Ask for engagement
          </h1>
          <p className="mt-5 max-w-[22rem] text-xl leading-8 text-muted-foreground">
            Paste an X post URL, choose a Farm, and request likes from your
            community.
          </p>
        </div>

        <Card
          className={cn(
            "h-16 justify-center py-0",
            engagementDisabled && "opacity-60"
          )}
        >
          <CardContent className="flex items-center gap-4 px-5 text-lg text-muted-foreground">
            <LinkIcon className="size-6 shrink-0" aria-hidden="true" />
            <span>Paste X post URL</span>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "h-16 justify-center py-0",
            engagementDisabled && "opacity-60"
          )}
        >
          <CardContent className="px-4">
            <NextLink
              className={cn(
                "flex items-center justify-between text-lg font-semibold",
                engagementDisabled && "pointer-events-none"
              )}
              aria-disabled={engagementDisabled}
              href={firstFarmHref}
            >
              <span className="flex min-w-0 items-center gap-4">
                <FarmGlyph className="size-11 shrink-0" />
                <span className="truncate">
                  {farms && farms.length > 0 ? farms[0].name : "Choose a Farm"}
                </span>
              </span>
              <ChevronRight
                className="size-6 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
            </NextLink>
          </CardContent>
        </Card>

        <Button
          aria-describedby={engagementDisabled ? "x-link-required" : undefined}
          className="h-16 w-full rounded-xl text-lg font-semibold"
          disabled={engagementDisabled}
        >
          Request likes
        </Button>

        {engagementDisabled ? (
          <p
            className="text-sm leading-6 text-muted-foreground"
            id="x-link-required"
          >
            Connect X in Settings to unlock engagement requests.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-normal">My Farms</h2>
          <NextLink className="text-sm font-medium text-primary" href="/farms">
            View all
          </NextLink>
        </div>
        <FarmList farms={farms} emptyAction />
      </section>
    </div>
  )
}

function SettingsScreen() {
  const viewer = useQuery(api.users.current)
  const xAccount = useQuery(api.accounts.currentX)
  const startXOAuth = useAction(api.xOAuth.start)
  const disconnectX = useMutation(api.accounts.disconnectX)
  const { signOut } = useAuthActions()
  const [initialXCallbackState] = useState(getInitialXCallbackState)
  const [isConnectingX, setIsConnectingX] = useState(false)
  const [isDisconnectingX, setIsDisconnectingX] = useState(false)
  const [xError, setXError] = useState<string | null>(
    initialXCallbackState.hasError ? "Could not connect X. Try again." : null
  )
  const [xNotice, setXNotice] = useState<string | null>(
    initialXCallbackState.isConnected ? "X account connected." : null
  )

  useEffect(() => {
    if (initialXCallbackState.shouldCleanUrl) {
      window.history.replaceState(null, "", "/settings")
    }
  }, [initialXCallbackState.shouldCleanUrl])

  async function handleConnectX() {
    setIsConnectingX(true)
    setXError(null)
    setXNotice(null)

    try {
      const result = await startXOAuth({ returnTo: "/settings" })
      window.location.href = result.authorizationUrl
    } catch (cause) {
      setXError(message(cause, "Could not start X account linking."))
      setIsConnectingX(false)
    }
  }

  async function handleDisconnectX() {
    setIsDisconnectingX(true)
    setXError(null)
    setXNotice(null)

    try {
      await disconnectX()
      setXNotice("X account disconnected.")
    } catch (cause) {
      setXError(message(cause, "Could not disconnect X."))
    } finally {
      setIsDisconnectingX(false)
    }
  }

  return (
    <div className="space-y-8">
      <TopNav title="Settings" backHref="/" />
      <section className="space-y-3">
        <SectionLabel>Profile</SectionLabel>
        <Card>
          <CardContent className="px-4">
            <div className="flex items-center justify-between">
              <span className="flex min-w-0 items-center gap-4">
                <InitialsAvatar name={viewer?.profile?.name ?? "Farm"} />
                <span className="min-w-0">
                  <span className="block truncate text-xl font-semibold">
                    {viewer?.profile?.name ?? "Farm user"}
                  </span>
                  <span className="block truncate text-base text-muted-foreground">
                    {viewer?.profile?.email ?? "Signed in"}
                  </span>
                </span>
              </span>
              <ChevronRight className="size-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionLabel>Farms</SectionLabel>
        <Card className="py-0">
          <LinkRow
            href="/farms"
            icon={<FarmGlyph className="size-11" />}
            title="Manage my Farms"
            subtitle="View and manage your Farms"
          />
        </Card>
      </section>

      <section className="space-y-3">
        <SectionLabel>Connected accounts</SectionLabel>
        <Card className="py-0">
          <CardContent className="px-4 py-4">
            <div className="flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                <XLogoMark className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">X account</h2>
                  <XAccountBadge status={xAccount?.status} />
                </div>
                <p className="mt-1 truncate text-base text-muted-foreground">
                  {getXAccountSubtitle(xAccount)}
                </p>
              </div>
              {xAccount?.status === "linked" ? (
                <Button
                  className="h-10 shrink-0 rounded-xl border-destructive text-destructive hover:bg-destructive/10"
                  disabled={isDisconnectingX}
                  onClick={() => void handleDisconnectX()}
                  type="button"
                  variant="outline"
                >
                  {isDisconnectingX ? "Disconnecting" : "Disconnect"}
                </Button>
              ) : (
                <Button
                  className="h-10 shrink-0 rounded-xl"
                  disabled={xAccount === undefined || isConnectingX}
                  onClick={() => void handleConnectX()}
                  type="button"
                >
                  {isConnectingX
                    ? "Connecting"
                    : xAccount?.status === "needs_reconnect"
                      ? "Reconnect"
                      : "Connect"}
                </Button>
              )}
            </div>
            {xNotice ? (
              <Alert className="mt-3 border-primary/20 bg-primary/5 text-primary">
                <AlertDescription className="text-primary">
                  {xNotice}
                </AlertDescription>
              </Alert>
            ) : null}
            {xError ? (
              <Alert className="mt-3" variant="destructive">
                <AlertDescription>{xError}</AlertDescription>
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <Button
        className="h-13 w-full rounded-xl"
        onClick={() => void signOut()}
        type="button"
        variant="outline"
      >
        <LogOut className="size-5" aria-hidden="true" />
        Sign out
      </Button>
    </div>
  )
}

function MyFarmsScreen() {
  const farms = useQuery(api.farms.listMine)
  const showBottomCreate = Boolean(farms && farms.length > 0)
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col">
      <TopNav title="My Farms" backHref="/" />
      <section className="mt-8 flex-1">
        <FarmList farms={farms} emptyAction />
      </section>
      {showBottomCreate ? (
        <Button className="mt-6 h-14 w-full rounded-xl text-base" asChild>
          <NextLink href="/farms/new">Create Farm</NextLink>
        </Button>
      ) : null}
    </div>
  )
}

function FarmList({
  farms,
  emptyAction = false,
}: {
  farms: FarmSummary[] | undefined
  emptyAction?: boolean
}) {
  if (farms === undefined) {
    return (
      <Card>
        <CardContent className="px-5 text-muted-foreground">
          Loading Farms...
        </CardContent>
      </Card>
    )
  }
  if (farms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Farms yet</CardTitle>
          <CardDescription>
            Create your first Farm and share one join link.
          </CardDescription>
        </CardHeader>
        {emptyAction ? (
          <CardContent>
            <Button className="h-12 rounded-xl" asChild>
              <NextLink href="/farms/new">Create Farm</NextLink>
            </Button>
          </CardContent>
        ) : null}
      </Card>
    )
  }
  return (
    <Card className="gap-0 py-0">
      {farms.map((farm) => (
        <NextLink
          className="flex min-h-20 items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
          href={`/farms/${farm.id}`}
          key={farm.id}
        >
          <span className="flex min-w-0 items-center gap-4">
            <FarmGlyph className="size-12 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold">
                {farm.name}
              </span>
              <span className="block text-sm text-muted-foreground">
                {farm.memberCount}{" "}
                {farm.memberCount === 1 ? "member" : "members"}
              </span>
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <RoleBadge role={farm.role} />
            <ChevronRight className="size-5 text-muted-foreground" />
          </span>
        </NextLink>
      ))}
    </Card>
  )
}

function CreateFarmScreen() {
  const createFarm = useMutation(api.farms.create)
  const nameId = useId()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError("Enter a Farm name.")
    if (trimmed.length > 48) return setError("Use 48 characters or fewer.")
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await createFarm({ name: trimmed })
      window.location.href = `/farms/${result.farmId}?created=1`
    } catch (cause) {
      setError(message(cause, "Could not create the Farm."))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <TopNav title="Create Farm" backHref="/farms" />
      <form className="space-y-5" noValidate onSubmit={handleSubmit}>
        <div className="space-y-3">
          <Label htmlFor={nameId}>Farm name</Label>
          <Input
            aria-invalid={Boolean(error)}
            className="h-14 rounded-xl px-4 text-lg"
            id={nameId}
            maxLength={48}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            placeholder="SPC Founders"
            value={name}
          />
          <p className="text-sm leading-6 text-muted-foreground">
            Pick a name your members will recognize.
          </p>
          {error ? <ErrorText>{error}</ErrorText> : null}
        </div>
        <Button
          className="h-14 w-full rounded-xl text-base font-semibold"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Creating..." : "Create Farm"}
        </Button>
      </form>
    </div>
  )
}

function FarmDetailScreen({ farmId }: { farmId: Id<"farms"> }) {
  const detail = useQuery(api.farms.get, { farmId })
  const [copied, setCopied] = useState(false)
  const joinUrl = useMemo(() => {
    if (detail?.status !== "ok" || !detail.farm.inviteCode) return null
    return `${window.location.origin}/join/${detail.farm.inviteCode}`
  }, [detail])

  async function copyLink() {
    if (!joinUrl) return
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  if (detail === undefined) return <LoadingScreen title="SPC Founders" />
  if (detail.status === "unavailable") return <UnavailableFarmScreen />

  return (
    <div className="space-y-8">
      <TopNav title={detail.farm.name} backHref="/" trailing={<MoreButton />} />
      <FarmHeader
        name={detail.farm.name}
        memberCount={detail.farm.memberCount}
        role={detail.farm.role}
      />
      {detail.farm.role === "admin" && joinUrl ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Share join link</h2>
          <p className="text-base leading-7 text-muted-foreground">
            Anyone with this link can join this Farm.
          </p>
          <Card className="min-h-14 justify-center py-0">
            <CardContent className="flex items-center gap-3 px-4">
              <LinkIcon className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{joinUrl}</span>
            </CardContent>
          </Card>
          <Button className="h-12 w-full rounded-xl" onClick={copyLink}>
            <Copy className="size-5" />
            {copied ? "Copied" : "Copy link"}
          </Button>
        </section>
      ) : null}
      <MemberList members={detail.members} />
      {detail.farm.role === "admin" ? (
        <DestructiveLink href={`/farms/${farmId}/delete`} icon={<Trash2 />}>
          Delete Farm
        </DestructiveLink>
      ) : (
        <DestructiveLink href={`/farms/${farmId}/leave`} icon={<LogOut />}>
          Leave Farm
        </DestructiveLink>
      )}
      <Button className="h-14 w-full rounded-xl text-base" asChild>
        <NextLink href="/">
          <Sparkles className="size-5" />
          Request engagement
        </NextLink>
      </Button>
    </div>
  )
}

function JoinFarmScreen({ inviteCode }: { inviteCode: string }) {
  const invite = useQuery(api.farms.resolveInvite, { code: inviteCode })
  const viewer = useQuery(api.users.current)
  const joinFarm = useMutation(api.farms.joinByInvite)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleJoin() {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await joinFarm({ code: inviteCode })
      window.location.href = `/farms/${result.farmId}?joined=1`
    } catch (cause) {
      setError(message(cause, "Could not join this Farm."))
      setIsSubmitting(false)
    }
  }

  if (invite === undefined) return <LoadingScreen title="Join Farm" />
  if (invite.status === "invalid") return <InvalidJoinLinkScreen />
  if (invite.farm.isMember) {
    return (
      <StateShell title={invite.farm.name} heading="You are already a member.">
        <Button className="h-14 w-full rounded-xl" asChild>
          <NextLink href={`/farms/${invite.farm.id}`}>Go to Farm</NextLink>
        </Button>
      </StateShell>
    )
  }

  return (
    <div className="space-y-8">
      <TopNav title="Join Farm" backHref="/" />
      <section className="space-y-6 text-center">
        <FarmGlyph className="mx-auto size-20" />
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">
            Join {invite.farm.name}?
          </h1>
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            Private Farm • {invite.farm.memberCount}{" "}
            {invite.farm.memberCount === 1 ? "member" : "members"}
            <br />
            Created by {invite.farm.creatorName}
          </p>
        </div>
        <Separator />
        <p className="text-base leading-7">
          You are signed in as
          <br />
          <span className="font-semibold">
            {viewer?.profile?.name ?? "this Farm account"}.
          </span>
        </p>
        {error ? <ErrorText>{error}</ErrorText> : null}
        <div className="space-y-3">
          <Button
            className="h-14 w-full rounded-xl text-base"
            disabled={isSubmitting}
            onClick={handleJoin}
            type="button"
          >
            {isSubmitting ? "Joining..." : "Join Farm"}
          </Button>
          <Button
            className="h-14 w-full rounded-xl text-base"
            variant="outline"
            asChild
          >
            <NextLink href="/farms">Not now</NextLink>
          </Button>
        </div>
      </section>
    </div>
  )
}

function DeleteFarmScreen({ farmId }: { farmId: Id<"farms"> }) {
  const detail = useQuery(api.farms.get, { farmId })
  const removeFarm = useMutation(api.farms.remove)
  if (detail === undefined) return <LoadingScreen title="Delete Farm" />
  if (detail.status === "unavailable") return <UnavailableFarmScreen />
  return (
    <ConfirmScreen
      title="Delete Farm"
      heading="Delete this Farm?"
      body="Members will no longer be able to use this Farm link."
      action="Delete Farm"
      backHref={`/farms/${farmId}`}
      disabled={detail?.farm.role !== "admin"}
      filled
      mutate={async () => {
        await removeFarm({ farmId })
        window.location.href = "/farms"
      }}
    />
  )
}

function LeaveFarmScreen({ farmId }: { farmId: Id<"farms"> }) {
  const detail = useQuery(api.farms.get, { farmId })
  const leaveFarm = useMutation(api.farms.leave)
  if (detail === undefined) return <LoadingScreen title="Leave Farm" />
  if (detail.status === "unavailable") return <UnavailableFarmScreen />
  return (
    <ConfirmScreen
      title="Leave Farm"
      heading="Leave this Farm?"
      body={`You will need the join link to rejoin ${detail.farm.name}.`}
      action="Leave Farm"
      backHref={`/farms/${farmId}`}
      disabled={detail?.farm.role === "admin"}
      mutate={async () => {
        await leaveFarm({ farmId })
        window.location.href = "/farms"
      }}
    />
  )
}

function ConfirmScreen({
  title,
  heading,
  body,
  action,
  backHref,
  disabled,
  filled = false,
  mutate,
}: {
  title: string
  heading: string
  body: string
  action: string
  backHref: string
  disabled: boolean
  filled?: boolean
  mutate: () => Promise<void>
}) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  async function confirm() {
    setPending(true)
    setError(null)
    try {
      await mutate()
    } catch (cause) {
      setError(message(cause, `Could not ${action.toLowerCase()}.`))
      setPending(false)
    }
  }
  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col">
      <TopNav title={title} backHref={backHref} />
      <section className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
        <div className="flex size-28 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <TriangleAlert className="size-14" aria-hidden="true" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">{heading}</h1>
          <p className="mx-auto mt-5 max-w-[18rem] text-lg leading-8 text-muted-foreground">
            {body}
          </p>
        </div>
        {error ? <ErrorText>{error}</ErrorText> : null}
      </section>
      <div className="space-y-3">
        <Button
          className={cn(
            "h-14 w-full rounded-xl text-base",
            !filled &&
              "border-destructive text-destructive hover:bg-destructive/10"
          )}
          disabled={disabled || pending}
          onClick={confirm}
          type="button"
          variant={filled ? "destructive" : "outline"}
        >
          {filled ? (
            <Trash2 className="size-5" />
          ) : (
            <LogOut className="size-5" />
          )}
          {pending ? "Working..." : action}
        </Button>
        <Button
          className="h-14 w-full rounded-xl text-base"
          variant="outline"
          asChild
        >
          <NextLink href={backHref}>Cancel</NextLink>
        </Button>
      </div>
    </div>
  )
}

function InvalidJoinLinkScreen() {
  return (
    <StateShell
      title="Farm link"
      heading="This Farm link is not available"
      icon={<LinkIcon className="size-12 text-muted-foreground" />}
    >
      <p className="mx-auto max-w-[18rem] text-center text-base leading-7 text-muted-foreground">
        The Farm may have been deleted or the link is no longer active.
      </p>
      <Button className="h-14 w-full rounded-xl text-base" asChild>
        <NextLink href="/farms">
          <Home className="size-5" />
          Go to my Farms
        </NextLink>
      </Button>
    </StateShell>
  )
}

function UnavailableFarmScreen() {
  return (
    <StateShell
      title="Farm"
      heading="This Farm is not available"
      icon={<TriangleAlert className="size-12 text-muted-foreground" />}
    >
      <p className="mx-auto max-w-[18rem] text-center text-base leading-7 text-muted-foreground">
        The Farm may have been deleted, or you may no longer be a member.
      </p>
      <Button className="h-14 w-full rounded-xl text-base" asChild>
        <NextLink href="/farms">
          <Home className="size-5" />
          Go to my Farms
        </NextLink>
      </Button>
    </StateShell>
  )
}

function StateShell({
  title,
  heading,
  icon,
  children,
}: {
  title: string
  heading: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="space-y-16">
      <TopNav title={title} backHref="/" />
      <section className="flex min-h-[32rem] flex-col items-center justify-center gap-7 text-center">
        <div className="flex size-24 items-center justify-center rounded-3xl bg-muted">
          {icon ?? <FarmGlyph className="size-20" />}
        </div>
        <h1 className="max-w-[18rem] text-3xl leading-tight font-semibold tracking-normal">
          {heading}
        </h1>
        <div className="w-full space-y-5">{children}</div>
      </section>
    </div>
  )
}

function FarmHeader({
  name,
  memberCount,
  role,
}: {
  name: string
  memberCount: number
  role: Role
}) {
  return (
    <section className="flex items-start gap-5">
      <FarmGlyph className="size-24 shrink-0 rounded-3xl" />
      <div className="min-w-0 pt-2">
        <h1 className="truncate text-3xl font-semibold tracking-normal">
          {name}
        </h1>
        <dl className="mt-4 space-y-2 text-base text-muted-foreground">
          <Meta icon={<LockKeyhole />} label="Privacy" value="Private Farm" />
          <Meta
            icon={<UsersRound />}
            label="Members"
            value={`${memberCount} ${memberCount === 1 ? "member" : "members"}`}
          />
          <Meta icon={<UserRound />} label="Role" value={role} />
        </dl>
      </div>
    </section>
  )
}

function Meta({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="[&>svg]:size-5 [&>svg]:text-primary">{icon}</span>
      <dt className="sr-only">{label}</dt>
      <dd className="capitalize">{value}</dd>
    </div>
  )
}

function MemberList({
  members,
}: {
  members: Array<{
    membershipId: Id<"farmMemberships">
    name: string
    initials: string
    role: Role
  }>
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Members ({members.length})</h2>
      <Card className="gap-0 py-0">
        {members.map((member) => (
          <div
            className="flex min-h-18 items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            key={member.membershipId}
          >
            <span className="flex min-w-0 items-center gap-4">
              <InitialsAvatar name={member.name} initials={member.initials} />
              <span className="truncate text-base font-semibold">
                {member.name}
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <RoleBadge role={member.role} />
              <ChevronRight className="size-5 text-muted-foreground" />
            </span>
          </div>
        ))}
      </Card>
    </section>
  )
}

function TopNav({
  title,
  backHref,
  trailing,
}: {
  title: string
  backHref: string
  trailing?: React.ReactNode
}) {
  return (
    <header className="grid h-14 grid-cols-[3rem_1fr_3rem] items-center border-b border-border">
      <IconLink href={backHref} label="Back">
        <ArrowLeft className="size-7" aria-hidden="true" />
      </IconLink>
      <h1 className="truncate text-center text-lg font-semibold tracking-normal">
        {title}
      </h1>
      <div className="flex justify-end">{trailing}</div>
    </header>
  )
}

function LinkRow({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string
  icon: React.ReactNode
  title: string
  subtitle: string
}) {
  return (
    <NextLink
      className="flex min-h-20 items-center justify-between gap-4 px-4 py-4"
      href={href}
    >
      <span className="flex min-w-0 items-center gap-4">
        {icon}
        <span className="min-w-0">
          <span className="block truncate text-lg font-semibold">{title}</span>
          <span className="block truncate text-base text-muted-foreground">
            {subtitle}
          </span>
        </span>
      </span>
      <ChevronRight className="size-6 shrink-0 text-muted-foreground" />
    </NextLink>
  )
}

function DestructiveLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Button
      className="h-14 w-full rounded-xl text-base"
      variant="outline"
      asChild
    >
      <NextLink
        className="border-destructive text-destructive hover:bg-destructive/10"
        href={href}
      >
        {icon}
        {children}
      </NextLink>
    </Button>
  )
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string
  label: string
  children: React.ReactNode
}) {
  return (
    <Button size="icon-lg" variant="ghost" asChild>
      <NextLink href={href} aria-label={label}>
        {children}
      </NextLink>
    </Button>
  )
}

function MoreButton() {
  return (
    <Button size="icon-lg" variant="ghost" type="button" aria-label="More">
      <MoreHorizontal className="size-7" aria-hidden="true" />
    </Button>
  )
}

function FarmGlyph({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-primary/10 text-primary",
        className
      )}
      aria-hidden="true"
    >
      <UsersRound className="size-1/2" strokeWidth={2.3} />
    </span>
  )
}

function InitialsAvatar({
  name,
  initials,
}: {
  name: string
  initials?: string
}) {
  return (
    <Avatar className="size-11 bg-primary/10" size="lg">
      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
        {initials ?? makeInitials(name)}
      </AvatarFallback>
    </Avatar>
  )
}

function XAccountBadge({
  status,
}: {
  status: XAccountState["status"] | undefined
}) {
  if (status === undefined) {
    return <Badge variant="secondary">Checking</Badge>
  }

  if (status === "linked") {
    return <Badge variant="secondary">Connected</Badge>
  }

  if (status === "needs_reconnect") {
    return <Badge variant="secondary">Reconnect</Badge>
  }

  return <Badge variant="outline">Not connected</Badge>
}

function getXAccountSubtitle(account: XAccountState | undefined) {
  if (account === undefined) {
    return "Checking connection"
  }

  if (account.status === "linked") {
    return account.username ? `@${account.username}` : "Connected"
  }

  if (account.status === "needs_reconnect") {
    return "Reconnect your X account"
  }

  return "Link your X account"
}

function getInitialXCallbackState() {
  if (typeof window === "undefined") {
    return {
      hasError: false,
      isConnected: false,
      shouldCleanUrl: false,
    }
  }

  const params = new URLSearchParams(window.location.search)
  const hasError = params.has("x_error")
  const isConnected = params.get("x_account") === "connected"

  return {
    hasError,
    isConnected,
    shouldCleanUrl: hasError || isConnected,
  }
}

function XLogoMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("fill-current text-foreground", className)}
      viewBox="0 0 24 24"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.966 6.817H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge
      className={cn(
        "capitalize",
        role === "admin" && "bg-primary/10 text-primary"
      )}
      variant={role === "admin" ? "secondary" : "outline"}
    >
      {role}
    </Badge>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-medium tracking-normal text-muted-foreground">
      {children}
    </h2>
  )
}

function LoadingScreen({ title }: { title: string }) {
  return (
    <div className="space-y-8">
      <TopNav title={title} backHref="/" />
      <p className="pt-8 text-center text-sm text-muted-foreground">
        Loading...
      </p>
    </div>
  )
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-destructive" role="alert">
      {children}
    </p>
  )
}

function makeInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return `${parts[0]?.[0] ?? "F"}${parts.at(-1)?.[0] ?? ""}`.toUpperCase()
}

function message(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback
}
