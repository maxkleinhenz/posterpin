import { internalMutation, mutation, query } from "./_generated/server"
import { hangPinAgainDownSchema as hangPinAgainSchema, insertPinSchema, takePinDownSchema } from "./schema"

export const seed = internalMutation(async (ctx) => {
  const allBoards = await ctx.db.query('pins').collect()
  if (allBoards.length > 0) {
    return
  }
  await ctx.db.insert('pins', {
    longitude: 13.726584932188327,
    latitude: 51.029938550838814,
    hangAt: Date.now(),
    tookDownAt: null,
  })
})

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('pins')
      .withIndex('by_creation_time') // keep order after re-hanging up
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
