import { httpRouter } from "convex/server"
import { auth } from "./auth"
import { handleXOAuthCallback } from "./xOAuth"

const http = httpRouter()

auth.addHttpRoutes(http)

http.route({
  path: "/oauth/x/callback",
  method: "GET",
  handler: handleXOAuthCallback,
})

export default http
