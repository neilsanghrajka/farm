"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import { useAction, useMutation, useQuery } from "convex/react"
import {
  ArrowLeft,
  ChevronRight,
  Copy,
  Home,
  Link as LinkIcon,
  LogOut,
  Send,
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
  FarmExplainerDialog,
  FarmSafetyDialog,
} from "@/components/farm-explainer-dialog"
import { InstallPrompt } from "@/components/install-prompt"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { cn } from "@/lib/utils"

const X_LINK_CONSENT_HIDDEN_KEY = "farm:x-link-consent-hidden"

type Role = "admin" | "member"
type FarmSummary = {
  id: Id<"farms">
  name: string
  memberCount: number
  role: Role
}

type LinkedXStatus = {
  status:
    | "eligible"
    | "missing"
    | "needs_reconnect"
    | "expired"
    | "revoked"
    | "disconnected"
  eligible: boolean
  eligibleAccountCount: number
  username?: string | null
  handle?: string | null
}

type XAccountState =
  | { status: "unlinked" }
  | {
      status: "linked" | "needs_reconnect"
      username: string | null
      displayName: string | null
    }

type FarmAppProps =
  | {
      view: "home"
      initialPostUrl?: string
      initialFarmId?: string
    }
  | { view: "settings" }
  | { view: "farms" }
  | { view: "posts" }
  | { view: "new" }
  | { view: "detail"; farmId: Id<"farms"> }
  | { view: "join"; inviteCode: string }
  | { view: "delete"; farmId: Id<"farms"> }
  | { view: "leave"; farmId: Id<"farms"> }

export function FarmApp(props: FarmAppProps) {
  const bottomNavActive =
    props.view === "home" || props.view === "farms" || props.view === "posts"
      ? props.view
      : null

  return (
    <main className="min-h-svh overflow-x-hidden bg-background text-foreground">
      <div
        className={cn(
          "mx-auto flex min-h-svh w-full max-w-[28rem] flex-col px-5 pt-8",
          bottomNavActive
            ? "pb-[calc(6rem+max(1rem,env(safe-area-inset-bottom)))]"
            : "pb-[max(1rem,env(safe-area-inset-bottom))]"
        )}
      >
        {props.view === "home" ? (
          <HomeScreen
            initialFarmId={props.initialFarmId}
            initialPostUrl={props.initialPostUrl}
          />
        ) : null}
        {props.view === "settings" ? <SettingsScreen /> : null}
        {props.view === "farms" ? <MyFarmsScreen /> : null}
        {props.view === "posts" ? <PostsScreen /> : null}
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
        {bottomNavActive ? <BottomNav active={bottomNavActive} /> : null}
      </div>
    </main>
  )
}

function BottomNav({ active }: { active: "farms" | "home" | "posts" }) {
  const items = [
    {
      key: "farms",
      href: "/farms",
      label: "My Farms",
      icon: <UsersRound aria-hidden="true" />,
    },
    {
      key: "home",
      href: "/",
      label: "Home",
      icon: <Home aria-hidden="true" />,
    },
    {
      key: "posts",
      href: "/posts",
      label: "Posts",
      icon: <Send aria-hidden="true" />,
    },
  ] as const

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background shadow-[0_-8px_24px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto grid w-full max-w-[28rem] grid-cols-3 items-end gap-2 px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const isActive = active === item.key
          return (
            <Button
              asChild
              className={cn(
                "h-14 w-full flex-col gap-1 rounded-xl px-2 text-xs",
                !isActive && "text-muted-foreground"
              )}
              key={item.key}
              variant={isActive ? "default" : "ghost"}
            >
              <NextLink
                aria-current={isActive ? "page" : undefined}
                href={item.href}
              >
                <span className="flex size-6 items-center justify-center [&>svg]:size-5">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </NextLink>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}

function HomeScreen({
  initialFarmId,
  initialPostUrl,
}: {
  initialFarmId?: string
  initialPostUrl?: string
}) {
  const farms = useQuery(api.farms.listMine) as FarmSummary[] | undefined
  const recentRequests = useQuery(api.requests.listMine)
  const postUrlId = useId()
  const farmId = useId()
  const [postUrl, setPostUrl] = useState(initialPostUrl ?? "")
  const [chosenFarmId, setChosenFarmId] = useState<Id<"farms"> | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const initialFarm =
    farms && initialFarmId
      ? farms.find((farm) => farm.id === initialFarmId)?.id
      : null
  const hasFarmPrefill = Boolean(initialFarmId)
  const singleFarmId = farms?.length === 1 ? farms[0]?.id : null
  const selectedFarmId =
    chosenFarmId ?? initialFarm ?? (!hasFarmPrefill ? singleFarmId : null)
  const selectedFarm = farms?.find((farm) => farm.id === selectedFarmId)
  const linkedXArgs = selectedFarmId ? { farmId: selectedFarmId } : {}
  const linkedXStatus = useQuery(api.requests.getLinkedXStatus, linkedXArgs) as
    | LinkedXStatus
    | undefined
  const createRequest = useAction(api.requests.createFromHome)
  const farmsLoaded = farms !== undefined
  const selectedFarmExists = Boolean(
    farms?.some((farm) => farm.id === selectedFarmId)
  )
  const xEligible = Boolean(linkedXStatus?.eligible)
  const xStatusLoaded = linkedXStatus !== undefined
  const invalidFarmPrefill = Boolean(
    farmsLoaded && hasFarmPrefill && !initialFarm && !chosenFarmId
  )
  const canCreateRequest = Boolean(
    postUrl.trim() &&
    xStatusLoaded &&
    xEligible &&
    farmsLoaded &&
    selectedFarmExists
  )
  const needsXLink = xStatusLoaded && !xEligible
  const farmSelectorLabel = !farms
    ? "Loading Farms..."
    : (selectedFarm?.name ?? "Choose a Farm")
  const farmSelectorSubtext = selectedFarmId
    ? linkedXStatus
      ? linkedAccountLabel(linkedXStatus.eligibleAccountCount)
      : "Checking linked accounts..."
    : farms && farms.length === 0
      ? "No Farms yet"
      : "Choose where to request engagement"

  async function handleRequestSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedPostUrl = postUrl.trim()
    if (!trimmedPostUrl) {
      setRequestError("Paste an X post URL.")
      return
    }
    if (!xEligible) {
      setRequestError("Connect your X account before requesting likes.")
      return
    }
    if (!selectedFarmId || !selectedFarmExists) {
      setRequestError("Choose a Farm first.")
      return
    }

    setIsRequesting(true)
    setRequestError(null)
    try {
      const result = await createRequest({
        farmId: selectedFarmId,
        postUrl: trimmedPostUrl,
      })
      window.location.href = `/requests/${result.requestId}`
    } catch (cause) {
      setRequestError(message(cause, "Could not create the request."))
      setIsRequesting(false)
    }
  }

  function handleLinkXAccount() {
    window.location.href = "/settings"
  }

  return (
    <div className="flex flex-1 flex-col gap-8 pb-5">
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
        <div className="flex items-center gap-2">
          <FarmSafetyDialog variant="icon" />
          <Button
            asChild
            className="size-11 rounded-xl border-border bg-card shadow-sm"
            size="icon-lg"
            variant="outline"
          >
            <NextLink href="/settings" aria-label="Settings">
              <Settings className="size-7" aria-hidden="true" />
            </NextLink>
          </Button>
        </div>
      </header>

      <InstallPrompt />

      <form className="space-y-5" noValidate onSubmit={handleRequestSubmit}>
        <div>
          <h1 className="text-[clamp(1.65rem,7vw,2rem)] leading-tight font-semibold tracking-normal">
            <span>Request Engagement</span>
          </h1>
        </div>

        <div className="flex h-16 items-center gap-4 rounded-xl border border-border bg-card px-5 text-lg text-muted-foreground shadow-sm">
          <Label className="sr-only" htmlFor={postUrlId}>
            X post URL
          </Label>
          <LinkIcon className="size-6 shrink-0" aria-hidden="true" />
          <Input
            aria-invalid={Boolean(requestError)}
            className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 text-lg shadow-none focus-visible:ring-0"
            id={postUrlId}
            inputMode="url"
            onChange={(event) => {
              setPostUrl(event.target.value)
              setRequestError(null)
            }}
            placeholder="Paste X post URL"
            type="url"
            value={postUrl}
          />
        </div>

        <TweetPreview postUrl={postUrl} />

        <div>
          <Label className="sr-only" htmlFor={farmId}>
            Farm
          </Label>
          <Select
            disabled={!farms || farms.length === 0}
            onValueChange={(value) => {
              setChosenFarmId(value as Id<"farms">)
              setRequestError(null)
            }}
            value={selectedFarmId ?? ""}
          >
            <SelectTrigger
              className="h-16 w-full justify-start gap-4 rounded-xl border-border bg-card px-4 py-0 text-left shadow-sm data-[size=default]:h-16 [&>svg]:ml-auto [&>svg]:size-6"
              id={farmId}
            >
              <FarmGlyph className="size-11 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-lg font-semibold text-foreground">
                  {farmSelectorLabel}
                </span>
                <span className="mt-0.5 block truncate text-sm">
                  {farmSelectorSubtext}
                </span>
              </span>
            </SelectTrigger>
            <SelectContent
              align="start"
              className="w-[calc(var(--radix-select-trigger-width)+1rem)] max-w-[calc(100vw-2.5rem)]"
              position="popper"
              sideOffset={6}
            >
              {farms?.map((farm) => (
                <SelectItem
                  className="py-3 pr-10 pl-3 text-base"
                  key={farm.id}
                  value={farm.id}
                >
                  {farm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {invalidFarmPrefill ? (
          <ErrorText>Choose a Farm first.</ErrorText>
        ) : null}
        {requestError ? <ErrorText>{requestError}</ErrorText> : null}

        <Button
          className="h-16 w-full gap-1.5 rounded-xl px-2 text-sm leading-tight font-semibold whitespace-nowrap sm:text-base"
          disabled={isRequesting || (!needsXLink && !canCreateRequest)}
          onClick={needsXLink ? handleLinkXAccount : undefined}
          type={needsXLink ? "button" : "submit"}
        >
          {needsXLink ? (
            <>
              <TriangleAlert className="size-5" aria-hidden="true" />
              <span>Link</span>
              <span className="sr-only">X</span>
              <XLogoMark className="size-4 text-current" />
              <span>Account to request engagement</span>
            </>
          ) : isRequesting ? (
            "Creating request..."
          ) : (
            "Request"
          )}
        </Button>
      </form>

      <RecentRequests requests={recentRequests} />

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

function RecentRequests({
  requests,
}: {
  requests:
    | Array<{
        id: Id<"engagementRequests">
        farmName: string
        postTitle: string
        postUrl: string
        status: "active" | "completed" | "partial" | "failed" | "canceled"
        likedCount: number
        pendingCount: number
        targetMemberCount: number
      }>
    | undefined
}) {
  if (requests === undefined || requests.length === 0) {
    return null
  }

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-normal">
        {requests.length === 1 ? "Recent request" : "Recent requests"}
      </h2>
      <Card className="gap-0 py-0">
        {requests.map((request) => (
          <NextLink
            className="flex min-h-20 items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
            href={`/requests/${request.id}`}
            key={request.id}
          >
            <span className="min-w-0">
              <span className="block truncate text-base font-semibold">
                {request.postTitle}
              </span>
              <span className="block truncate text-sm text-muted-foreground">
                {request.farmName} · {request.likedCount} of{" "}
                {request.targetMemberCount} likes
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <RequestSummaryBadge
                pendingCount={request.pendingCount}
                status={request.status}
              />
              <ChevronRight className="size-5 text-muted-foreground" />
            </span>
          </NextLink>
        ))}
      </Card>
    </section>
  )
}

function PostsScreen() {
  const requests = useQuery(api.requests.listMine)

  return (
    <div className="flex flex-1 flex-col gap-8 pb-5">
      <TopNav title="Posts" backHref="/" />
      <p className="text-base leading-7 text-muted-foreground">
        Engagement requests, status, and history.
      </p>
      <PostHistoryList requests={requests} />
    </div>
  )
}

function PostHistoryList({
  requests,
}: {
  requests:
    | Array<{
        id: Id<"engagementRequests">
        farmName: string
        postTitle: string
        postUrl: string
        status: "active" | "completed" | "partial" | "failed" | "canceled"
        likedCount: number
        pendingCount: number
        targetMemberCount: number
        createdAt: number
      }>
    | undefined
}) {
  if (requests === undefined) {
    return (
      <Card>
        <CardContent className="px-5 text-muted-foreground">
          Loading posts...
        </CardContent>
      </Card>
    )
  }

  if (requests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No posts yet</CardTitle>
          <CardDescription>
            Request engagement on an X post to start tracking status here.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card className="gap-4 py-4" key={request.id}>
          <CardHeader className="gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="truncate">{request.postTitle}</CardTitle>
                <CardDescription className="truncate">
                  {request.farmName}
                </CardDescription>
              </div>
              <RequestSummaryBadge
                pendingCount={request.pendingCount}
                status={request.status}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <TweetPreview compact postUrl={request.postUrl} />
            <div className="grid grid-cols-3 gap-2 text-center">
              <RequestMetric label="Likes" value={request.likedCount} />
              <RequestMetric label="Members" value={request.targetMemberCount} />
              <RequestMetric label="Pending" value={request.pendingCount} />
            </div>
            <Button className="h-11 w-full rounded-xl" variant="outline" asChild>
              <NextLink href={`/requests/${request.id}`}>
                View status
                <ChevronRight className="size-4" aria-hidden="true" />
              </NextLink>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function RequestMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-2 py-2">
      <div className="text-lg font-semibold leading-none">{value}</div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function TweetPreview({ postUrl }: {
  compact?: boolean
  postUrl: string
}) {
  const embed = useMemo(() => getTweetEmbed(postUrl), [postUrl])

  if (!embed) return null

  return (
    <div className="h-[14rem] overflow-hidden rounded-xl" key={embed.id}>
      <iframe
        className="h-[18rem] w-full border-0 bg-transparent"
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        scrolling="no"
        src={embed.src}
        title="X post preview"
      />
      <a className="sr-only" href={embed.url}>
        View this post on X
      </a>
    </div>
  )
}

function getTweetEmbed(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    const host = url.hostname.toLowerCase().replace(/^www\./, "")
    if (host !== "x.com" && host !== "twitter.com") return null

    const match = url.pathname.match(/^\/([^/]+)\/status(?:es)?\/(\d+)/)
    if (!match) return null

    const id = match[2]
    return {
      id,
      src: `https://platform.twitter.com/embed/Tweet.html?dnt=true&id=${id}&lang=en&theme=light`,
      url: `https://twitter.com/${match[1]}/status/${id}`,
    }
  } catch {
    return null
  }
}

function linkedAccountLabel(count: number) {
  return `${count} linked ${count === 1 ? "account" : "accounts"} ready`
}

function RequestSummaryBadge({
  pendingCount,
  status,
}: {
  pendingCount: number
  status: "active" | "completed" | "partial" | "failed" | "canceled"
}) {
  if (status === "completed") {
    return (
      <Badge className="bg-primary/10 text-primary" variant="secondary">
        Complete
      </Badge>
    )
  }
  if (status === "failed") {
    return <Badge variant="destructive">Failed</Badge>
  }
  if (status === "canceled") {
    return <Badge variant="outline">Canceled</Badge>
  }
  return (
    <Badge variant="outline">
      {pendingCount > 0 ? `${pendingCount} pending` : "Active"}
    </Badge>
  )
}

function SettingsScreen() {
  const viewer = useQuery(api.users.current)
  const xAccount = useQuery(api.accounts.currentX)
  const startXOAuth = useAction(api.xOAuth.start)
  const disconnectX = useMutation(api.accounts.disconnectX)
  const syncXStatus = useMutation(api.accounts.syncCurrentXStatus)
  const { signOut } = useAuthActions()
  const [initialXCallbackState] = useState(getInitialXCallbackState)
  const [isConnectingX, setIsConnectingX] = useState(false)
  const [isDisconnectingX, setIsDisconnectingX] = useState(false)
  const [isXConsentOpen, setIsXConsentOpen] = useState(false)
  const [hideXConsentNextTime, setHideXConsentNextTime] = useState(false)
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

  useEffect(() => {
    if (xAccount?.status === "needs_reconnect") {
      void syncXStatus()
    }
  }, [syncXStatus, xAccount?.status])

  function shouldSkipXConsent() {
    if (typeof window === "undefined") return false
    return window.localStorage.getItem(X_LINK_CONSENT_HIDDEN_KEY) === "true"
  }

  function handleOpenXLink() {
    if (shouldSkipXConsent()) {
      void handleConnectX()
      return
    }

    setHideXConsentNextTime(false)
    setIsXConsentOpen(true)
  }

  async function handleConnectX() {
    if (hideXConsentNextTime && typeof window !== "undefined") {
      window.localStorage.setItem(X_LINK_CONSENT_HIDDEN_KEY, "true")
    }
    setIsConnectingX(true)
    setXError(null)
    setXNotice(null)

    try {
      const result = await startXOAuth({ returnTo: "/settings" })
      window.location.href = result.authorizationUrl
    } catch (cause) {
      setXError(message(cause, "Could not start X account linking."))
      setIsConnectingX(false)
      setIsXConsentOpen(false)
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
      <InstallPrompt />
      <section className="space-y-3">
        <SectionLabel>Account</SectionLabel>
        <Card>
          <CardContent className="px-4">
            <div className="flex items-center gap-4">
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
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionLabel>Connected accounts</SectionLabel>
        <div className="space-y-3">
          <Card className="py-0">
            <CardContent className="px-4 py-4">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
                  <XLogoMark className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-semibold">X account</h2>
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
                    onClick={handleOpenXLink}
                    type="button"
                  >
                    {isConnectingX
                      ? "Opening X"
                      : xAccount?.status === "needs_reconnect"
                        ? "Reconnect"
                        : "Link"}
                  </Button>
                )}
              </div>
              <Dialog
                open={isXConsentOpen}
                onOpenChange={(open) => {
                  if (!isConnectingX) {
                    setIsXConsentOpen(open)
                  }
                }}
              >
                <DialogContent>
                  <DialogHeader className="items-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-xl bg-muted">
                      <XLogoMark className="size-5" />
                    </div>
                    <DialogTitle>Connect X</DialogTitle>
                    <DialogDescription>
                      Farm will send you to X to approve access.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                    <p>Farm uses only official X APIs.</p>
                    <p>
                      Farm asks for permission to identify the X account you
                      link, like or unlike only the X post links you submit in
                      Farm, and stay connected so you do not have to relink
                      every session.
                    </p>
                    <p>
                      X requires read scopes for its user-context like API. Farm
                      uses them only to identify the linked account and process
                      submitted post URLs.
                    </p>
                    <p>
                      Farm cannot read your DMs, follow people, see your
                      password, or post anything new.
                    </p>
                  </div>
                  <label className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Checkbox
                      checked={hideXConsentNextTime}
                      disabled={isConnectingX}
                      onCheckedChange={(checked) =>
                        setHideXConsentNextTime(checked === true)
                      }
                    />
                    <span>Don&apos;t show this again</span>
                  </label>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button
                        disabled={isConnectingX}
                        type="button"
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </DialogClose>
                    <Button
                      disabled={isConnectingX}
                      onClick={() => void handleConnectX()}
                      type="button"
                    >
                      {isConnectingX ? "Opening X" : "Continue to X"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
          <FarmSafetyDialog variant="outline" />
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>Farms</SectionLabel>
        <div className="space-y-3">
          <Card className="py-0">
            <LinkRow
              href="/farms"
              icon={<FarmGlyph className="size-11" />}
              title="My Farms"
              subtitle="View and manage your Farms"
            />
          </Card>
          <FarmExplainerDialog variant="outline" />
        </div>
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
    <div className="flex flex-1 flex-col pb-5">
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
            placeholder="Example Farm"
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
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  )
  const joinUrl = useMemo(() => {
    if (detail?.status !== "ok" || !detail.farm.inviteCode) return null
    return `${window.location.origin}/join/${detail.farm.inviteCode}`
  }, [detail])

  async function copyLink() {
    if (!joinUrl) return
    try {
      await copyTextToClipboard(joinUrl)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("failed")
    }
    window.setTimeout(() => setCopyStatus("idle"), 1500)
  }

  if (detail === undefined) return <LoadingScreen title="Example Farm" />
  if (detail.status === "unavailable") return <UnavailableFarmScreen />

  return (
    <div className="space-y-8">
      <TopNav title={detail.farm.name} backHref="/" />
      <FarmHeader
        name={detail.farm.name}
        memberCount={detail.farm.memberCount}
        role={detail.farm.role}
      />
      <Button className="h-14 w-full rounded-xl text-base" asChild>
        <NextLink href={`/?farmId=${encodeURIComponent(farmId)}`}>
          <Sparkles className="size-5" />
          Request engagement
        </NextLink>
      </Button>
      {detail.farm.role === "admin" && joinUrl ? (
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Share Join Link</h2>
          <Card className="min-h-14 justify-center py-0">
            <CardContent className="flex items-center gap-3 px-4">
              <LinkIcon className="size-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{joinUrl}</span>
              <Button
                className="h-9 shrink-0 rounded-lg px-3"
                onClick={copyLink}
                type="button"
                variant="ghost"
              >
                <Copy className="size-4" />
                {copyStatus === "copied"
                  ? "Copied"
                  : copyStatus === "failed"
                    ? "Copy failed"
                    : "Copy"}
              </Button>
            </CardContent>
          </Card>
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
    </div>
  )
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // Fall through to the selection-based copy path.
    }
  }

  const textarea = document.createElement("textarea")
  textarea.value = text
  textarea.setAttribute("readonly", "")
  textarea.style.position = "fixed"
  textarea.style.left = "-9999px"
  textarea.style.top = "0"
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Copy command failed")
    }
  } finally {
    document.body.removeChild(textarea)
  }
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
        <h1 className="truncate text-2xl leading-tight font-semibold tracking-normal">
          {name}
        </h1>
        <dl className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Meta
            icon={<UsersRound />}
            label="Members"
            value={`${memberCount} ${memberCount === 1 ? "member" : "members"}`}
          />
          <span aria-hidden="true">•</span>
          <Meta
            icon={<UserRound />}
            label="Role"
            value={role === "admin" ? "You are admin" : "You are member"}
          />
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
      <dd>{value}</dd>
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

function getXAccountSubtitle(account: XAccountState | undefined) {
  if (account === undefined) {
    return "Checking connection"
  }

  if (account.status === "linked") {
    return account.username ? `@${account.username}` : "Linked for X likes"
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
