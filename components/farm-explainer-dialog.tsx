"use client"

import { HelpCircle } from "lucide-react"
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
          priority
          src="/farm-how-it-works.png"
          width={941}
        />
      </DialogContent>
    </Dialog>
  )
}
