"use client"

import { useMutation, useQuery } from "convex/react"
import {
  ArrowLeft,
  BarChart3,
  Check,
  CircleMinus,
  Clock,
  Copy,
  ExternalLink,
  Heart,
  Home,
  Link,
  MessageCircle,
  MoreHorizontal,
  Pause,
  Play,
  Repeat2,
  Send,
  TriangleAlert,
  X,
} from "lucide-react"
import NextLink from "next/link"
import { useMemo, useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

type AttemptStatus =
  | "pending"
  | "liked"
  | "already_liked"
  | "skipped"
  | "skipped_no_x"
  | "skipped_ineligible"
  | "skipped_not_selected"
  | "skipped_cap_exceeded"
  | "skipped_post_unavailable"
  | "skipped_canceled"
  | "failed"
  | "failed_retryable"
  | "failed_final"

type RequestStatusScreenProps = {
  requestId: Id<"engagementRequests"> | null
}

type RequestStatus = "active" | "completed" | "partial" | "failed" | "canceled"
type AutoEngageStatus = "active" | "paused" | "stopped" | "completed"
type FutureRequestFields = {
  postTextPreview?: string | null
  postAuthorUsername?: string | null
  postAuthorDisplayName?: string | null
  engagementDeadlineAt?: number | null
  autoEngageStatus?: AutoEngageStatus | null
  stopReason?: string | null
  selectedAttemptCount?: number | null
  canManageAutoEngage?: boolean
}
type RequestOutcome = {
  id: Id<"engagementAttempts">
  initials: string
  name: string
  providerUsername: string | null
  status: AttemptStatus
}

export function RequestStatusScreen({ requestId }: RequestStatusScreenProps) {
  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh w-full max-w-[28rem] flex-col px-5 py-8">
        {requestId ? (
          <RequestStatusContent requestId={requestId} />
        ) : (
          <UnavailableRequestScreen />
        )}
      </div>
    </main>
  )
}

function RequestStatusContent({
  requestId,
}: {
  requestId: Id<"engagementRequests">
}) {
  const detail = useQuery(api.requests.get, { requestId })
  const pauseAutoEngage = useMutation(api.autoEngage.pauseRequest)
  const resumeAutoEngage = useMutation(api.autoEngage.resumeRequest)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [controlError, setControlError] = useState<string | null>(null)
  const [controlPending, setControlPending] = useState<
    "pause" | "resume" | null
  >(null)

  const statusLink = useMemo(() => {
    if (typeof window === "undefined") return ""
    return window.location.href
  }, [])

  async function copyStatusLink() {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(statusLink || window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopyError("Could not copy the link.")
    }
  }

  if (detail === undefined) {
    return <LoadingRequestScreen />
  }

  if (detail.status === "unavailable") {
    return <UnavailableRequestScreen />
  }

  const request = detail.request as typeof detail.request & FutureRequestFields
  const selectedTargetCount = Math.max(
    request.selectedAttemptCount ?? 0,
    request.likedCount + request.pendingCount + request.failedCount
  )
  const targetCount =
    selectedTargetCount > 0
      ? selectedTargetCount
      : Math.max(0, request.targetMemberCount)
  const progress =
    targetCount > 0 ? (request.likedCount / targetCount) * 100 : 0
  const askAgainHref = `/?postUrl=${encodeURIComponent(request.postUrl)}&farmId=${encodeURIComponent(detail.farm.id)}`
  const postState = getPostState(request)
  const statusCopy = getStatusCopy(request, postState)
  const outcomes = detail.outcomes as RequestOutcome[]

  async function updateAutoEngage(action: "pause" | "resume") {
    setControlError(null)
    setControlPending(action)

    try {
      if (action === "pause") {
        await pauseAutoEngage({ requestId })
      } else {
        await resumeAutoEngage({ requestId })
      }
    } catch {
      setControlError(
        action === "pause"
          ? "Could not pause auto likes. Try again."
          : "Could not resume auto likes. Try again."
      )
    } finally {
      setControlPending(null)
    }
  }

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col">
      <div className="space-y-6 pb-7">
        <TopNav title="Post detail" backHref="/" trailing={<MoreButton />} />

        <section className="space-y-3 pt-2">
          <XPostPreview request={request} unavailable={postState.stopped} />
          <p className="text-sm leading-6 text-muted-foreground">
            Requested by {detail.requester.name} in {detail.farm.name}.
          </p>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-[2.75rem] leading-none font-semibold tracking-normal sm:text-[3.25rem]">
              {request.likedCount} of {targetCount} likes
            </p>
          </div>
          <div
            aria-label="Farm likes progress"
            aria-valuemax={targetCount}
            aria-valuemin={0}
            aria-valuenow={request.likedCount}
            className="h-2 rounded-full bg-muted"
            role="progressbar"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <AggregateBadge status={request.status} postState={postState} />
            {request.pendingCount > 0 ? (
              <Badge className="h-8 gap-2 bg-secondary px-4 text-base text-secondary-foreground">
                <Clock className="size-4" aria-hidden="true" />
                {request.pendingCount} pending
              </Badge>
            ) : null}
            {request.skippedCount > 0 ? (
              <Badge className="h-8 gap-2 bg-muted px-4 text-base text-muted-foreground">
                <CircleMinus className="size-4" aria-hidden="true" />
                {request.skippedCount} skipped
              </Badge>
            ) : null}
            {request.failedCount > 0 ? (
              <Badge className="h-8 gap-2 px-4 text-base" variant="destructive">
                <TriangleAlert className="size-4" aria-hidden="true" />
                {request.failedCount} failed
              </Badge>
            ) : null}
            {request.status === "active" && !postState.stopped ? (
              <Badge className="h-8 gap-2 bg-background px-4 text-base text-foreground ring-1 ring-border">
                <Clock className="size-4" aria-hidden="true" />
                6h window
              </Badge>
            ) : null}
          </div>
        </section>

        <Alert
          className={
            postState.stopped
              ? "border-border bg-muted text-foreground"
              : postState.paused
                ? "border-primary/20 bg-primary/5 text-foreground"
                : "border-primary/20 bg-primary/5 text-foreground"
          }
        >
          {postState.paused ? (
            <Pause className="size-5 text-primary" aria-hidden="true" />
          ) : postState.stopped ? (
            <CircleMinus
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <Clock className="size-5 text-primary" aria-hidden="true" />
          )}
          <AlertDescription className="text-base leading-6 text-foreground">
            {statusCopy}
          </AlertDescription>
        </Alert>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Activity</h2>
          {outcomes.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border bg-card">
              {postState.paused ? (
                <ActivitySummaryRow
                  icon={<Pause className="size-4" aria-hidden="true" />}
                  label="Auto likes paused"
                  tone="primary"
                />
              ) : null}
              {postState.stopped ? (
                <>
                  <ActivitySummaryRow
                    icon={<X className="size-4" aria-hidden="true" />}
                    label="Post unavailable"
                    tone="muted"
                  />
                  <ActivitySummaryRow
                    icon={<CircleMinus className="size-4" aria-hidden="true" />}
                    label="Remaining likes stopped"
                    tone="muted"
                  />
                </>
              ) : null}
              {outcomes.map((outcome) => (
                <OutcomeRow
                  initials={outcome.initials}
                  key={outcome.id}
                  name={outcome.name}
                  providerUsername={outcome.providerUsername}
                  status={outcome.status}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border px-4 py-5 text-base text-muted-foreground">
              No members were targeted for this request.
            </div>
          )}
        </section>
      </div>

      <div className="mt-auto space-y-3 border-t border-border pt-5">
        {copyError ? <ErrorText>{copyError}</ErrorText> : null}
        {controlError ? <ErrorText>{controlError}</ErrorText> : null}
        <PostDetailActions
          askAgainHref={askAgainHref}
          copied={copied}
          controlPending={controlPending}
          copyStatusLink={copyStatusLink}
          canManageAutoEngage={Boolean(request.canManageAutoEngage)}
          postState={postState}
          requestStatus={request.status}
          updateAutoEngage={updateAutoEngage}
        />
      </div>
    </div>
  )
}

function XPostPreview({
  request,
  unavailable,
}: {
  request: {
    postUrl: string
    postTitle: string
    postTextPreview?: string | null
    postAuthorUsername?: string | null
    postAuthorDisplayName?: string | null
  }
  unavailable: boolean
}) {
  if (unavailable) {
    return (
      <Card className="items-center gap-4 rounded-lg border-border bg-muted/40 px-6 py-9 text-center ring-0">
        <div className="flex size-14 items-center justify-center rounded-full border border-muted-foreground/50">
          <X className="size-7 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold tracking-normal">
            X post unavailable
          </h2>
          <p className="mx-auto max-w-[16rem] text-base leading-6 text-muted-foreground">
            The post may have been deleted or made private.
          </p>
        </div>
      </Card>
    )
  }

  const author =
    request.postAuthorUsername ??
    readableXUrl(request.postUrl).split("/")[0] ??
    "x.com"
  const displayName = request.postAuthorDisplayName ?? `@${author}`
  const body = request.postTextPreview ?? request.postTitle

  return (
    <Card className="gap-4 rounded-lg border-border px-4 py-4 ring-0">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-foreground text-lg font-semibold text-background">
          X
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex min-w-0 items-center gap-2">
            <p className="truncate text-base font-semibold">{displayName}</p>
            {request.postAuthorUsername ? (
              <Badge className="h-6 bg-primary/10 px-2 text-primary">
                @{request.postAuthorUsername}
              </Badge>
            ) : null}
          </div>
          <p className="text-lg leading-7 text-foreground">{body}</p>
          <div className="flex items-center justify-between gap-3 text-muted-foreground">
            <div className="flex min-w-0 items-center gap-5">
              <MessageCircle className="size-5" aria-hidden="true" />
              <Repeat2 className="size-5" aria-hidden="true" />
              <Heart className="size-5" aria-hidden="true" />
              <BarChart3 className="size-5" aria-hidden="true" />
            </div>
            <a
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary"
              href={request.postUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open
              <ExternalLink className="size-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>
    </Card>
  )
}

function OutcomeRow({
  initials,
  name,
  providerUsername,
  status,
}: {
  initials: string
  name: string
  providerUsername: string | null
  status: AttemptStatus
}) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-3 border-b border-border px-3 py-3 last:border-b-0">
      <span className="flex min-w-0 items-center gap-4">
        <Avatar className="size-11 bg-primary/10" size="lg">
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-base font-semibold">{name}</span>
          <span className="block truncate text-base text-muted-foreground">
            {providerUsername
              ? `@${providerUsername}`
              : status === "skipped_no_x"
                ? "No X linked"
                : "Farm member"}
          </span>
        </span>
      </span>
      <OutcomeBadge status={status} />
    </div>
  )
}

function ActivitySummaryRow({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode
  label: string
  tone: "primary" | "muted"
}) {
  return (
    <div className="flex min-h-14 items-center gap-3 border-b border-border px-3 py-3">
      <span
        className={
          tone === "primary"
            ? "flex size-8 shrink-0 items-center justify-center rounded-full border border-primary text-primary"
            : "flex size-8 shrink-0 items-center justify-center rounded-full border border-muted-foreground/60 text-muted-foreground"
        }
      >
        {icon}
      </span>
      <span className="text-base font-medium">{label}</span>
    </div>
  )
}

function AggregateBadge({
  status,
  postState,
}: {
  status: RequestStatus
  postState: PostState
}) {
  if (postState.stopped) {
    return (
      <Badge className="h-8 gap-2 bg-muted px-4 text-base text-muted-foreground">
        <CircleMinus className="size-4" aria-hidden="true" />
        Stopped
      </Badge>
    )
  }
  if (postState.paused) {
    return (
      <Badge className="h-8 gap-2 bg-primary/10 px-4 text-base text-primary">
        <Pause className="size-4" aria-hidden="true" />
        Paused
      </Badge>
    )
  }
  if (status === "completed") {
    return (
      <Badge className="h-8 gap-2 bg-primary/10 px-4 text-base text-primary">
        <Check className="size-4" aria-hidden="true" />
        Complete
      </Badge>
    )
  }
  if (status === "failed") {
    return (
      <Badge className="h-8 gap-2 px-4 text-base" variant="destructive">
        <TriangleAlert className="size-4" aria-hidden="true" />
        Failed
      </Badge>
    )
  }
  if (status === "canceled") {
    return (
      <Badge className="h-8 gap-2 bg-muted px-4 text-base text-muted-foreground">
        <CircleMinus className="size-4" aria-hidden="true" />
        Canceled
      </Badge>
    )
  }
  return (
    <Badge className="h-8 gap-2 bg-primary/10 px-4 text-base text-primary">
      <span className="size-2 rounded-full bg-primary" aria-hidden="true" />
      {status === "partial" ? "Partial" : "Active"}
    </Badge>
  )
}

function OutcomeBadge({ status }: { status: AttemptStatus }) {
  if (status === "liked" || status === "already_liked") {
    return (
      <Badge className="h-9 gap-2 bg-primary/10 px-4 text-base text-primary">
        <Check className="size-5" aria-hidden="true" />
        {status === "already_liked" ? "Already liked" : "Liked"}
      </Badge>
    )
  }
  if (status === "pending") {
    return (
      <Badge className="h-9 gap-2 bg-secondary px-4 text-base text-secondary-foreground">
        <Clock className="size-5" aria-hidden="true" />
        Pending
      </Badge>
    )
  }
  if (
    status === "failed" ||
    status === "failed_retryable" ||
    status === "failed_final"
  ) {
    return (
      <Badge className="h-9 gap-2 px-4 text-base" variant="destructive">
        <TriangleAlert className="size-5" aria-hidden="true" />
        Failed
      </Badge>
    )
  }
  return (
    <Badge className="h-9 gap-2 bg-muted px-4 text-base text-muted-foreground">
      <CircleMinus className="size-5" aria-hidden="true" />
      {status === "skipped_no_x" ? "No X linked" : "Skipped"}
    </Badge>
  )
}

function LoadingRequestScreen() {
  return (
    <div className="space-y-8">
      <TopNav title="Post detail" backHref="/" />
      <p className="pt-8 text-center text-sm text-muted-foreground">
        Loading...
      </p>
    </div>
  )
}

function UnavailableRequestScreen() {
  return (
    <div className="space-y-16">
      <TopNav title="Post detail" backHref="/" />
      <section className="flex min-h-[32rem] flex-col items-center justify-center gap-7 text-center">
        <div className="flex size-24 items-center justify-center rounded-3xl bg-muted">
          <TriangleAlert className="size-12 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl leading-tight font-semibold tracking-normal">
            This request is not available
          </h1>
          <p className="mx-auto mt-5 max-w-[18rem] text-base leading-7 text-muted-foreground">
            It may have been deleted or you may not have access to its Farm.
          </p>
        </div>
        <Button className="h-14 w-full rounded-xl text-base" asChild>
          <NextLink href="/">
            <Home className="size-5" aria-hidden="true" />
            Go Home
          </NextLink>
        </Button>
      </section>
    </div>
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

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-medium text-destructive" role="alert">
      {children}
    </p>
  )
}

type PostState = {
  paused: boolean
  stopped: boolean
}

function getPostState(
  request: FutureRequestFields & { status: RequestStatus }
) {
  const autoEngageStatus = request.autoEngageStatus

  return {
    paused: autoEngageStatus === "paused",
    stopped:
      autoEngageStatus === "stopped" ||
      request.stopReason === "post_unavailable" ||
      request.status === "canceled",
  }
}

function getStatusCopy(
  request: FutureRequestFields & { status: RequestStatus },
  postState: PostState
) {
  if (postState.stopped) {
    return "Farm stopped processing this request automatically. No more likes will run."
  }
  if (postState.paused) {
    return "Auto likes are paused for this post. Pending likes will not run until resumed."
  }
  if (request.status === "active") {
    return "A few likes start now. The rest roll in over the next few hours."
  }
  if (request.status === "completed") {
    return "Farm activity is complete for this post."
  }
  if (request.status === "partial") {
    return "Farm activity is complete, with some likes skipped or failed."
  }
  if (request.status === "failed") {
    return "Farm could not complete this request."
  }

  return "Farm stopped processing this request automatically. No more likes will run."
}

function PostDetailActions({
  askAgainHref,
  copied,
  controlPending,
  copyStatusLink,
  canManageAutoEngage,
  postState,
  requestStatus,
  updateAutoEngage,
}: {
  askAgainHref: string
  copied: boolean
  canManageAutoEngage: boolean
  controlPending: "pause" | "resume" | null
  copyStatusLink: () => Promise<void>
  postState: PostState
  requestStatus: RequestStatus
  updateAutoEngage: (action: "pause" | "resume") => Promise<void>
}) {
  if (postState.stopped) {
    return (
      <Button className="h-14 w-full rounded-lg text-base" asChild>
        <NextLink href={askAgainHref}>
          <Send className="size-5" aria-hidden="true" />
          Ask again
        </NextLink>
      </Button>
    )
  }

  if (postState.paused && canManageAutoEngage) {
    return (
      <div className="space-y-3">
        <Button
          className="h-14 w-full rounded-lg text-base"
          disabled={controlPending !== null}
          onClick={() => void updateAutoEngage("resume")}
          type="button"
        >
          <Play className="size-5" aria-hidden="true" />
          {controlPending === "resume" ? "Resuming..." : "Resume auto likes"}
        </Button>
        <Button
          className="h-14 w-full rounded-lg text-base"
          onClick={() => void copyStatusLink()}
          type="button"
          variant="outline"
        >
          <Link className="size-5" aria-hidden="true" />
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    )
  }

  if (requestStatus === "active" && canManageAutoEngage) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Button
          className="h-14 rounded-lg text-base"
          disabled={controlPending !== null}
          onClick={() => void updateAutoEngage("pause")}
          type="button"
          variant="outline"
        >
          <Pause className="size-5" aria-hidden="true" />
          {controlPending === "pause" ? "Pausing..." : "Pause auto likes"}
        </Button>
        <Button
          className="h-14 rounded-lg text-base"
          onClick={() => void copyStatusLink()}
          type="button"
          variant="outline"
        >
          <Link className="size-5" aria-hidden="true" />
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
    )
  }

  return (
    <div
      className={
        requestStatus === "active" ? "space-y-3" : "grid grid-cols-2 gap-3"
      }
    >
      <Button
        className={
          requestStatus === "active"
            ? "h-14 w-full rounded-lg text-base"
            : "h-14 rounded-lg text-base"
        }
        onClick={() => void copyStatusLink()}
        type="button"
        variant="outline"
      >
        <Copy className="size-5" aria-hidden="true" />
        {copied ? "Copied" : "Copy link"}
      </Button>
      {requestStatus === "active" ? null : (
        <Button className="h-14 rounded-lg text-base" asChild>
          <NextLink href={askAgainHref}>
            <Send className="size-5" aria-hidden="true" />
            Ask again
          </NextLink>
        </Button>
      )}
    </div>
  )
}

function readableXUrl(value: string) {
  return value.replace(/^https?:\/\//, "")
}
