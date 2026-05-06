"use client"

import { useQuery } from "convex/react"

import { api } from "@/convex/_generated/api"

export function ConvexStatus() {
  const health = useQuery(api.health.ping)

  if (health === undefined) {
    return (
      <div className="font-mono text-xs text-muted-foreground">
        Convex: checking connection...
      </div>
    )
  }

  return (
    <div className="font-mono text-xs text-muted-foreground">
      Convex: {health.status} via {health.region}
    </div>
  )
}
