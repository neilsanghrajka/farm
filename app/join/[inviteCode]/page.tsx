import { FarmApp } from "@/components/farm-app"
import { LoginScreen } from "@/components/login-screen"

export default async function JoinFarmPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>
}) {
  const { inviteCode } = await params

  return (
    <LoginScreen>
      <FarmApp view="join" inviteCode={inviteCode} />
    </LoginScreen>
  )
}
