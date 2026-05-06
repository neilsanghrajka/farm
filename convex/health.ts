import { query } from "./_generated/server"

export const ping = query({
  args: {},
  handler: async () => {
    return {
      region: "eu-west-1",
      status: "connected",
    }
  },
})
