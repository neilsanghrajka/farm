function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const authConfig = {
  providers: [
    {
      domain: requiredEnv("CONVEX_SITE_URL"),
      applicationID: "convex",
    },
  ],
}

export default authConfig
