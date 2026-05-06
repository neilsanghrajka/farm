import { FarmApp } from "@/components/farm-app"
import { LoginScreen } from "@/components/login-screen"

export default function FarmsPage() {
  return (
    <LoginScreen>
      <FarmApp view="farms" />
    </LoginScreen>
  )
}
