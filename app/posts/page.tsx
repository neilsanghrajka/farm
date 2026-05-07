import { FarmApp } from "@/components/farm-app"
import { LoginScreen } from "@/components/login-screen"

export default function PostsPage() {
  return (
    <LoginScreen>
      <FarmApp view="posts" />
    </LoginScreen>
  )
}
