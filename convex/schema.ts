import { defineSchema, defineTable } from 'convex/server'
import { Infer, v } from 'convex/values'
import type { Doc } from './_generated/dataModel'

const schema = defineSchema({
  pins: defineTable({
    longitude: v.number(),
    latitude: v.number(),
  }),
  products: defineTable({
    title: v.string(),
    imageId: v.string(),
    price: v.number(),
  }),
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
})

export default schema;

export type Pin = Doc<'pins'>

const pin = schema.tables.pins.validator

export const insertPinSchema = v.object({
  latitude: pin.fields.latitude,
  longitude: pin.fields.longitude,
})

export type InsertPin = Infer<typeof insertPinSchema>


