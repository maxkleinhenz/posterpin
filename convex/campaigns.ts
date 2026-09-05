import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { insertCampaignSchema } from "./schema";
import { ensureSeedCampaign } from "./seedHelpers";
import { validateCampaignDates, validateCoordinates } from "./validation";

export const seed = internalMutation(
	async (ctx) => await ensureSeedCampaign(ctx),
);

export const getById = query({
	args: { id: v.string() },
	handler: async (ctx, args) => {
		const id = ctx.db.normalizeId("campaigns", args.id);
		return id ? await ctx.db.get(id) : null;
	},
});

export const list = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db
			.query("campaigns")
			.withIndex("by_start_at")
			.order("desc")
			.collect();
	},
});

export const add = mutation({
	args: insertCampaignSchema,
	handler: async (ctx, args) => {
		validateCoordinates(args.latitude, args.longitude);
		validateCampaignDates(args.startAt, args.endAt);
		const name = args.name.trim();
		if (!name || name.length > 200)
			throw new ConvexError("Name muss zwischen 1 und 200 Zeichen lang sein.");
		if (args.description && args.description.length > 5000)
			throw new ConvexError("Beschreibung ist zu lang.");
		return await ctx.db.insert("campaigns", {
			name,
			description: args.description?.trim() || undefined,
			latitude: args.latitude,
			longitude: args.longitude,
			startAt: args.startAt,
			endAt: args.endAt,
		});
	},
});
