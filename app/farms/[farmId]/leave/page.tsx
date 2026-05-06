import { FarmApp } from "@/components/farm-app"
import { LoginScreen } from "@/components/login-screen"
import type { Id } from "@/convex/_generated/dataModel"

export default async function LeaveFarmPage({
  params,
}: {
  params: Promise<{ farmId: string }>
}) {
  const { farmId } = await params

  return (
    <LoginScreen>
      <FarmApp view="leave" farmId={farmId as Id<"farms">} />
    </LoginScreen>
  )
}
