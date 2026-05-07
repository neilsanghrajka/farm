"use client"

import { HelpCircle, ShieldCheck } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function FarmExplainerDialog({
  className,
  variant = "link",
}: {
  className?: string
  variant?: "link" | "outline"
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className={cn(
            variant === "link"
              ? "h-auto px-0 text-base font-medium"
              : "h-12 w-full rounded-xl text-base",
            className
          )}
          type="button"
          variant={variant}
        >
          <HelpCircle className="size-4" aria-hidden="true" />
          What is Farm?
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] max-w-[min(calc(100vw-2rem),26rem)] overflow-y-auto p-2">
        <DialogHeader className="sr-only">
          <DialogTitle>How Farm works</DialogTitle>
          <DialogDescription>
            A simple visual explanation of joining a Farm and sharing an X post
            link for automatic likes from your network.
          </DialogDescription>
        </DialogHeader>
        <Image
          alt="How Farm Works: join a farm, drop your X post link, everyone else in the farm automatically likes your tweet, and get your first 10-20 likes from your network."
          className="h-auto w-full rounded-lg"
          height={1672}
          sizes="min(calc(100vw - 2rem), 26rem)"
          src="/farm-how-it-works.png"
          width={941}
        />
      </DialogContent>
    </Dialog>
  )
}

export function FarmSafetyDialog({
  className,
  variant = "link",
}: {
  className?: string
  variant?: "icon" | "link" | "outline"
}) {
  const isIcon = variant === "icon"

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label={isIcon ? "Is Farm safe to use?" : undefined}
          className={cn(
            isIcon
              ? "size-11 rounded-xl border-border bg-card shadow-sm"
              : variant === "link"
              ? "h-auto px-0 text-base font-medium"
              : "h-12 w-full rounded-xl text-base",
            className
          )}
          type="button"
          variant={isIcon ? "outline" : variant}
          size={isIcon ? "icon-lg" : undefined}
        >
          <ShieldCheck
            className={cn(isIcon ? "size-6" : "size-4")}
            aria-hidden="true"
          />
          {isIcon ? null : "Is Farm safe to use?"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100svh-2rem)] max-w-[min(calc(100vw-2rem),26rem)] overflow-y-auto p-2">
        <DialogHeader className="sr-only">
          <DialogTitle>Is Farm safe to use?</DialogTitle>
          <DialogDescription>
            A simple visual explanation of Farm safety, X API access, network
            likes, and staggered likes.
          </DialogDescription>
        </DialogHeader>
        <Image
          alt="Farm is safe to use: official X Likes API, no extra access, your network only, and staggered likes."
          className="h-auto w-full rounded-lg"
          height={1672}
          sizes="min(calc(100vw - 2rem), 26rem)"
          src="/farm-safe-to-use.png"
          width={941}
        />
      </DialogContent>
    </Dialog>
  )
}
