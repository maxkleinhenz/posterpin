import { ConvexError, v } from "convex/values";
import { getPinStatus } from "../shared/pins";
import { internalMutation, mutation, query } from "./_generated/server";
import {
	hangPinAgainSchema,
	insertPinSchema,
	takePinDownSchema,
	updatePinColorSchema,
} from "./schema";
import { ensureSeedCampaign } from "./seedHelpers";
import {
	requireCampaign,
	requirePin,
	validateColor,
	validateCoordinates,
} from "./validation";

export const seed = internalMutation(async (ctx) => {
	const existing = await ctx.db.query("pins").first();
	if (existing) {
		return;
	}
	await ctx.db.insert("pins", {
		longitude: 13.726584932188327,
		latitude: 51.029938550838814,
		campaignId: await ensureSeedCampaign(ctx),
		color: "yellow",
		hangAt: Date.now(),
		tookDownAt: null,
	});
});

export const getById = query({
	args: { pinId: v.id("pins") },
	handler: async (ctx, args) => {
		return await ctx.db.get(args.pinId);
	},
});

export const list = query({
	args: { campaignId: v.id("campaigns") },
	handler: async (ctx, args) => {
		return await ctx.db
			.query("pins")
			.withIndex("by_campaign", (q) => q.eq("campaignId", args.campaignId))
			.order("desc") // default order is by _creationTime, we use it to keep order after re-hanging up
			.collect();
	},
});

export const add = mutation({
	args: insertPinSchema,
	handler: async (ctx, args) => {
		validateCoordinates(args.latitude, args.longitude);
		validateColor(args.color);
		await requireCampaign(ctx, args.campaignId);
		return await ctx.db.insert("pins", {
			latitude: args.latitude,
			longitude: args.longitude,
			campaignId: args.campaignId,
			color: args.color,
			hangAt: Date.now(),
			tookDownAt: null,
		});
	},
});

export const addPlanned = mutation({
	args: insertPinSchema,
	handler: async (ctx, args) => {
		validateCoordinates(args.latitude, args.longitude);
		validateColor(args.color);
		await requireCampaign(ctx, args.campaignId);
		return await ctx.db.insert("pins", {
			latitude: args.latitude,
			longitude: args.longitude,
			campaignId: args.campaignId,
			color: args.color,
			hangAt: null,
			tookDownAt: null,
		});
	},
});

export const updatePosition = mutation({
	args: { id: v.id("pins"), latitude: v.number(), longitude: v.number() },
	handler: async (ctx, { id, latitude, longitude }) => {
		validateCoordinates(latitude, longitude);
		const pin = await requirePin(ctx, id);
		if (getPinStatus(pin) !== "planned")
			throw new ConvexError("Nur geplante Plakate können verschoben werden.");
		await ctx.db.patch(id, { latitude, longitude });
	},
});

export const remove = mutation({
	args: { id: v.id("pins") },
	handler: async (ctx, { id }) => {
		const pin = await requirePin(ctx, id);
		if (getPinStatus(pin) !== "planned")
			throw new ConvexError("Nur geplante Plakate können gelöscht werden.");
		await ctx.db.delete(id);
	},
});

export const takeDown = mutation({
	args: takePinDownSchema,
	handler: async (ctx, { id }) => {
		const pin = await requirePin(ctx, id);
		if (getPinStatus(pin) !== "hung")
			throw new ConvexError(
				"Das Plakat muss vor dem Abhängen aufgehängt sein.",
			);
		await ctx.db.patch(id, {
			tookDownAt: Date.now(),
		});
	},
});

export const hangAgain = mutation({
	args: hangPinAgainSchema,
	handler: async (ctx, { id }) => {
		const pin = await requirePin(ctx, id);
		if (getPinStatus(pin) === "hung")
			throw new ConvexError(
				"Das Plakat kann zu diesem Zeitpunkt nicht aufgehängt werden.",
			);
		await ctx.db.patch(id, {
			hangAt: Date.now(),
			tookDownAt: null,
		});
	},
});

export const updateColor = mutation({
	args: updatePinColorSchema,
	handler: async (ctx, { id, color }) => {
		validateColor(color);
		await requirePin(ctx, id);
		await ctx.db.patch(id, { color });
	},
});
