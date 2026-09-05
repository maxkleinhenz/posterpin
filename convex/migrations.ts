import { Migrations } from "@convex-dev/migrations";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const migrations = new Migrations<DataModel>(components.migrations, {
	migrationsLocationPrefix: "migrations:",
});

// npx convex dev
//  npx convex run migrations:run '{fn: "addTookDownAtColumn"}'
export const addTookDownAtColumn = migrations.define({
	table: "pins",
	migrateOne: async (ctx, doc) => {
		// Add tookDownAt field if it doesn't exist
		if (doc.tookDownAt === undefined) {
			await ctx.db.patch(doc._id, { tookDownAt: null });
		}
	},
});

// npx convex dev
// npx convex run migrations:run '{fn: "addHangAtColumn"}'
export const addHangAtColumn = migrations.define({
	table: "pins",
	migrateOne: async (ctx, doc) => {
		// Add tookDownAt field if it doesn't exist
		if (doc.hangAt === undefined) {
			await ctx.db.patch(doc._id, { hangAt: doc._creationTime });
		}
	},
});

// npx convex dev
// npx convex run migrations:run '{fn: "addCampaignIdColumn"}'
export const addCampaignIdColumn = migrations.define({
	table: "pins",
	migrateOne: async (ctx, doc) => {
		if (doc.campaignId == null || !(await ctx.db.get(doc.campaignId))) {
			const campaignId = ctx.db.normalizeId(
				"campaigns",
				process.env.LEGACY_CAMPAIGN_ID ?? "",
			);
			if (!campaignId || !(await ctx.db.get(campaignId))) {
				throw new Error(
					"Set LEGACY_CAMPAIGN_ID to an existing campaign before migrating orphaned pins.",
				);
			}
			await ctx.db.patch(doc._id, {
				campaignId,
			});
		}
	},
});

// npx convex dev
// npx convex run migrations:run '{fn: "addColorColumn"}'
export const addColorColumn = migrations.define({
	table: "pins",
	migrateOne: async (ctx, doc) => {
		if (doc.color === undefined || doc.color === null || doc.color === "") {
			await ctx.db.patch(doc._id, { color: "yellow" });
		}
	},
});

export const run = migrations.runner();
