"use client"

import { useQuery } from "convex/react"
import {
  ArrowLeft,
  Check,
  CircleMinus,
  Clock,
  Copy,
  ExternalLink,
  Home,
  MoreHorizontal,
  Send,
  TriangleAlert,
} from "lucide-react"
import NextLink from "next/link"
import { useMemo, useState } from "react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

type AttemptStatus =
  | "pending"
  | "liked"
  | "already_liked"
  | "skipped_no_x"
  | "skipped_ineligible"
  | "failed_retryable"
  | "failed_final"

type RequestStatusScreenProps = {
  requestId: Id<"engagementRequests"> | null
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
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

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

  const request = detail.request
  const targetCount = Math.max(0, request.targetMemberCount)
  const progress =
    targetCount > 0 ? (request.likedCount / targetCount) * 100 : 0
  const askAgainHref = `/?postUrl=${encodeURIComponent(request.postUrl)}&farmId=${encodeURIComponent(detail.farm.id)}`

  return (
    <div className="flex min-h-[calc(100svh-4rem)] flex-col">
      <div className="space-y-8 pb-7">
        <TopNav title="Request status" backHref="/" trailing={<MoreButton />} />

        <section className="space-y-3 pt-2">
          <p className="text-lg text-muted-foreground">X post</p>
          <div className="space-y-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-normal">
              {request.postTitle}
            </h1>
            <a
              className="inline-flex max-w-full items-center gap-2 text-lg font-medium text-primary"
              href={request.postUrl}
              rel="noreferrer"
              target="_blank"
            >
              <span className="truncate">{readableXUrl(request.postUrl)}</span>
              <ExternalLink className="size-5 shrink-0" aria-hidden="true" />
            </a>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Requested by {detail.requester.name} in {detail.farm.name}.
          </p>
        </section>

        <section className="space-y-5">
          <div>
            <p className="text-[3.25rem] leading-none font-semibold tracking-normal">
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
            <AggregateBadge status={request.status} />
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
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">
            Members ({request.targetMemberCount})
          </h2>
          {detail.outcomes.length > 0 ? (
            <div className="divide-y divide-border border-y border-border">
              {detail.outcomes.map((outcome) => (
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
            <div className="rounded-xl border border-border px-4 py-5 text-base text-muted-foreground">
              No members were targeted for this request.
            </div>
          )}
        </section>
      </div>

      <div className="mt-auto space-y-3 border-t border-border pt-5">
        {copyError ? <ErrorText>{copyError}</ErrorText> : null}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-14 rounded-xl text-base"
            onClick={() => void copyStatusLink()}
            type="button"
            variant="outline"
          >
            <Copy className="size-5" aria-hidden="true" />
            {copied ? "Copied" : "Copy link"}
          </Button>
          <Button className="h-14 rounded-xl text-base" asChild>
            <NextLink href={askAgainHref}>
              <Send className="size-5" aria-hidden="true" />
              Ask again
            </NextLink>
          </Button>
        </div>
      </div>
    </div>
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
    <div className="flex min-h-22 items-center justify-between gap-3 py-4">
      <span className="flex min-w-0 items-center gap-4">
        <Avatar className="size-13 bg-primary/10" size="lg">
          <AvatarFallback className="bg-primary/10 font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-lg font-semibold">{name}</span>
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

function AggregateBadge({
  status,
}: {
  status: "active" | "completed" | "partial" | "failed" | "canceled"
}) {
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
  if (status === "failed_retryable" || status === "failed_final") {
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
      <TopNav title="Request status" backHref="/" />
      <p className="pt-8 text-center text-sm text-muted-foreground">
        Loading...
      </p>
    </div>
  )
}

function UnavailableRequestScreen() {
  return (
    <div className="space-y-16">
      <TopNav title="Request status" backHref="/" />
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

function readableXUrl(value: string) {
  return value.replace(/^https?:\/\//, "")
}
