import { LoginScreen } from "@/components/login-screen"
import { FarmApp } from "@/components/farm-app"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ farmId?: string; postUrl?: string }>
}) {
  const params = await searchParams

  return (
    <LoginScreen>
      <FarmApp
        initialFarmId={params.farmId}
        initialPostUrl={params.postUrl}
        view="home"
      />
    </LoginScreen>
  )
}
