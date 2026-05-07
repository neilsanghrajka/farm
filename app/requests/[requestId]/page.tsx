import { LoginScreen } from "@/components/login-screen"
import { RequestStatusScreen } from "@/components/request-status-screen"
import type { Id } from "@/convex/_generated/dataModel"

const CONVEX_ID_PATTERN = /^[a-z0-9]{32}$/

export default async function RequestStatusPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params
  const validRequestId = CONVEX_ID_PATTERN.test(requestId)
    ? (requestId as Id<"engagementRequests">)
    : null

  return (
    <LoginScreen>
      <RequestStatusScreen requestId={validRequestId} />
    </LoginScreen>
  )
}
