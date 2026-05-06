import { FarmApp } from "@/components/farm-app"
import { LoginScreen } from "@/components/login-screen"

export default function SettingsPage() {
  return (
    <LoginScreen>
      <FarmApp view="settings" />
    </LoginScreen>
  )
}
