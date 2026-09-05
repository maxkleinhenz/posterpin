import { ConvexError } from "convex/values";
import { isPinColor } from "../shared/pins";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";

export function validateCoordinates(latitude: number, longitude: number) {
	if (
		!Number.isFinite(latitude) ||
		latitude < -90 ||
		latitude > 90 ||
		!Number.isFinite(longitude) ||
		longitude < -180 ||
		longitude > 180
	) {
		throw new ConvexError(
			"Bitte gültige Koordinaten angeben (Breite −90 bis 90, Länge −180 bis 180).",
		);
	}
}

export function validateColor(color: string) {
	if (!isPinColor(color)) throw new ConvexError("Unbekannte Plakatfarbe.");
}

export function validateTimestamp(value: number) {
	if (!Number.isSafeInteger(value) || value < 0 || value > 8.64e15) {
		throw new ConvexError("Ungültiger Zeitpunkt.");
	}
}

export function validateCampaignDates(
	startAt?: number | null,
	endAt?: number | null,
) {
	if (startAt != null) validateTimestamp(startAt);
	if (endAt != null) {
		validateTimestamp(endAt);
		if (startAt == null || endAt < startAt) {
			throw new ConvexError(
				"Das Enddatum muss am oder nach dem Startdatum liegen.",
			);
		}
	}
}

export async function requireCampaign(
	ctx: Pick<QueryCtx, "db">,
	id: Id<"campaigns">,
) {
	const campaign = await ctx.db.get(id);
	if (!campaign) throw new ConvexError("Kampagne nicht gefunden.");
	return campaign;
}

export async function requirePin(ctx: Pick<QueryCtx, "db">, id: Id<"pins">) {
	const pin = await ctx.db.get(id);
	if (!pin) throw new ConvexError("Plakat nicht gefunden.");
	await requireCampaign(ctx, pin.campaignId);
	return pin;
}
