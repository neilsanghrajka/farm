import { LoginScreen } from "@/components/login-screen"
import { FarmApp } from "@/components/farm-app"

export default function Page() {
  return (
    <LoginScreen>
      <FarmApp view="home" />
    </LoginScreen>
  )
}
