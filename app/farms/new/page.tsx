import { FarmApp } from "@/components/farm-app"
import { LoginScreen } from "@/components/login-screen"

export default function NewFarmPage() {
  return (
    <LoginScreen>
      <FarmApp view="new" />
    </LoginScreen>
  )
}
