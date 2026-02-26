import { defineSchema, defineTable } from 'convex/server'
import { Infer, v } from 'convex/values'
import type { Doc } from './_generated/dataModel'

const schema = defineSchema({
  pins: defineTable({
    longitude: v.number(),
    latitude: v.number(),
    hangAt: v.optional(v.nullable(v.number())),
    tookDownAt: v.optional(v.nullable(v.number())),
  }).index('by_hang_at', ['hangAt']),
  campaigns: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    longitude: v.number(),
    latitude: v.number(),
    startAt: v.optional(v.nullable(v.number())),
    endAt: v.optional(v.nullable(v.number())),
  }).index('by_start_at', ['startAt']),
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

export const takePinDownSchema = v.object({
  id: v.id('pins'),
  tookDownAt: v.number(),
})
export type TakePinDown = Infer<typeof takePinDownSchema>

export const hangPinAgainSchema = v.object({
  id: v.id('pins'),
  hangAt: v.number(),
})
export type HangPinAgain = Infer<typeof hangPinAgainSchema>

export type Campaign = Doc<'campaigns'>
const campaign = schema.tables.campaigns.validator
export const insertCampaignSchema = v.object({
  name: campaign.fields.name,
  description: campaign.fields.description,
  longitude: campaign.fields.longitude,
    latitude: campaign.fields.latitude,
    startAt: campaign.fields.startAt,
    endAt: campaign.fields.endAt,
})
export type InsertCampaign = Infer<typeof insertCampaignSchema>

