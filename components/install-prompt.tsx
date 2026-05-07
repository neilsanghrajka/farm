"use client"

import { Download, Share } from "lucide-react"
import { useEffect, useState, useSyncExternalStore } from "react"

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

type InstallEnvironment = {
  ios: boolean
  standalone: boolean
}

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: () => void) => void
  removeListener?: (listener: () => void) => void
}

const serverEnvironment: InstallEnvironment = {
  ios: false,
  standalone: false,
}

let cachedEnvironment = serverEnvironment

function stableInstallEnvironment(environment: InstallEnvironment) {
  if (
    cachedEnvironment.ios === environment.ios &&
    cachedEnvironment.standalone === environment.standalone
  ) {
    return cachedEnvironment
  }

  cachedEnvironment = environment
  return cachedEnvironment
}

function getInstallEnvironment(): InstallEnvironment {
  if (typeof window === "undefined") return serverEnvironment

  const navigatorWithStandalone = window.navigator as Navigator & {
    standalone?: boolean
  }
  const userAgent = window.navigator.userAgent
  const platform = window.navigator.platform
  const iPadDesktopMode =
    platform === "MacIntel" && window.navigator.maxTouchPoints > 1

  return stableInstallEnvironment({
    ios: /iPad|iPhone|iPod/.test(userAgent) || iPadDesktopMode,
    standalone:
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(display-mode: standalone)").matches) ||
      navigatorWithStandalone.standalone === true,
  })
}

function subscribeToInstallEnvironment(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {}

  const displayModeQuery: LegacyMediaQueryList | null =
    typeof window.matchMedia === "function"
      ? window.matchMedia("(display-mode: standalone)")
      : null

  if (displayModeQuery) {
    if (typeof displayModeQuery.addEventListener === "function") {
      displayModeQuery.addEventListener("change", onStoreChange)
    } else {
      displayModeQuery.addListener?.(onStoreChange)
    }
  }

  window.addEventListener("appinstalled", onStoreChange)

  return () => {
    if (displayModeQuery) {
      if (typeof displayModeQuery.removeEventListener === "function") {
        displayModeQuery.removeEventListener("change", onStoreChange)
      } else {
        displayModeQuery.removeListener?.(onStoreChange)
      }
    }

    window.removeEventListener("appinstalled", onStoreChange)
  }
}

export function InstallPrompt() {
  const environment = useSyncExternalStore(
    subscribeToInstallEnvironment,
    getInstallEnvironment,
    () => serverEnvironment
  )
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setHidden(false)
    }

    function handleAppInstalled() {
      setInstallEvent(null)
      setHidden(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      )
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!installEvent) return

    await installEvent.prompt()
    const choice = await installEvent.userChoice

    if (choice.outcome === "accepted") {
      setHidden(true)
    }

    setInstallEvent(null)
  }

  if (environment.standalone || hidden || (!installEvent && !environment.ios)) {
    return null
  }

  return (
    <Alert className="border-primary/20 bg-primary/5 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          {installEvent ? (
            <Download className="size-5" aria-hidden="true" />
          ) : (
            <Share className="size-5" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <AlertTitle className="text-base">Install Farm</AlertTitle>
          <AlertDescription className="mt-1 text-sm leading-6">
            {installEvent
              ? "Add Farm to your device for a cleaner app-like launch."
              : "In Safari, tap Share, then Add to Home Screen."}
          </AlertDescription>
          {installEvent ? (
            <Button
              className="mt-3 h-10 rounded-lg"
              onClick={() => void handleInstall()}
              type="button"
            >
              Install Farm
            </Button>
          ) : null}
        </div>
      </div>
    </Alert>
  )
}
