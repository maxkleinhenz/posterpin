import { internalMutation, mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { hangPinAgainSchema, insertPinSchema, takePinDownSchema } from "./schema"
import { v } from "convex/values"

export const seed = internalMutation(async (ctx) => {
  const allBoards = await ctx.db.query('pins').collect()
  if (allBoards.length > 0) {
    return
  }
  await ctx.db.insert('pins', {
    longitude: 13.726584932188327,
    latitude: 51.029938550838814,
    campaignId: "jh7fe4q149a63we6t1sd749dqd81wnmz" as Id<"campaigns">,
    hangAt: Date.now(),
    tookDownAt: null,
  })
})

export const getById = query({
  args: {pinId: v.id("pins")},
  handler: async (ctx, args) => {
    return await ctx.db.get("pins", args.pinId);
  },
})

export const list = query({
  args: {campaignId: v.id("campaigns")},
  handler: async (ctx, args) => {
    return await ctx.db
      .query('pins')
      .withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
      .order('desc') // default order is by _creationTime, we use it to keep order after re-hanging up
      .collect()
  },
})

export const add = mutation({
  args: insertPinSchema,
  handler: async (ctx, args) => {
    return await ctx.db.insert('pins', {
      latitude: args.latitude,
      longitude: args.longitude,
      campaignId: args.campaignId,
      hangAt: Date.now(),
      tookDownAt: null,
    })
  },
})

export const takeDown = mutation({
  args: takePinDownSchema,
  handler: async (ctx, { id, tookDownAt }) => {
    await ctx.db.patch(id, {
      tookDownAt: tookDownAt
    })
  },
})

export const hangAgain = mutation({
  args: hangPinAgainSchema,
  handler: async (ctx, { id, hangAt }) => {
    await ctx.db.patch(id, {
      hangAt: hangAt,
      tookDownAt: null
    })
  },
})
