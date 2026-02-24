import { internalMutation, mutation, query } from "./_generated/server"
import { insertPinSchema } from "./schema"

export const seed = internalMutation(async (ctx) => {
  const allBoards = await ctx.db.query('pins').collect()
  if (allBoards.length > 0) {
    return
  }
  await ctx.db.insert('pins', {
    longitude: 13.726584932188327,
    latitude: 51.029938550838814,
  })
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('pins')
      .withIndex('by_creation_time')
      .order('desc')
      .collect()
  },
})


export const add = mutation({
  args: insertPinSchema,
  handler: async (ctx, args) => {
    return await ctx.db.insert('pins', {
      latitude: args.latitude,
      longitude: args.longitude,
    })
  },
})
