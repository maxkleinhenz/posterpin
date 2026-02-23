import { internalMutation, query } from "./_generated/server"

export const seed = internalMutation(async (ctx) => {
  const allBoards = await ctx.db.query('pins').collect()
  if (allBoards.length > 0) {
    return
  }
  await ctx.db.insert('pins', {
    title: 'Pin 1',
    description: 'This is the first pin',
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
