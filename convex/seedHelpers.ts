import type { MutationCtx } from "./_generated/server";

export async function ensureSeedCampaign(ctx: MutationCtx) {
	const existing = await ctx.db.query("campaigns").first();
	if (existing) return existing._id;
	return await ctx.db.insert("campaigns", {
		name: "Test Kampagne",
		description: "Beschreibung der Test Kampagne",
		longitude: 13.726584932188327,
		latitude: 51.029938550838814,
		startAt: Date.now(),
	});
}
