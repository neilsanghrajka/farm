import { FarmApp } from "@/components/farm-app"
import { LoginScreen } from "@/components/login-screen"
import type { Id } from "@/convex/_generated/dataModel"

export default async function DeleteFarmPage({
  params,
}: {
  params: Promise<{ farmId: string }>
}) {
  const { farmId } = await params

  return (
    <LoginScreen>
      <FarmApp view="delete" farmId={farmId as Id<"farms">} />
    </LoginScreen>
  )
}
