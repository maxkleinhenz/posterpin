import { internalMutation, mutation, query } from "./_generated/server"
import {  insertCampaignSchema } from "./schema"

export const seed = internalMutation(async (ctx) => {
  const campaigns = await ctx.db.query('campaigns').collect()
  if (campaigns.length > 0) {
    return
  }
  await ctx.db.insert('campaigns', {
    name: "Test Kampagne",
    description: "Beschreibung der Test Kampagne",
    longitude: 13.726584932188327,
    latitude: 51.029938550838814,
    startAt: Date.now(),
    endAt: undefined,
  })
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('campaigns')
      .withIndex('by_start_at')
      .order('desc')
      .collect()
  },
})


export const add = mutation({
  args: insertCampaignSchema,
  handler: async (ctx, args) => {
    return await ctx.db.insert('campaigns', {
      name: args.name,
      description: args.description,
      latitude: args.latitude,
      longitude: args.longitude,
      startAt: args.startAt,
      endAt: args.endAt,
    })
  },
})
