import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";

const modules = import.meta.glob("../convex/**/*.{ts,js}");
const campaign = { name: "Campaign", latitude: 51, longitude: 13 };

function setup() {
	return convexTest(schema, modules);
}

describe("campaign validation", () => {
	it.each([
		{ name: "   " },
		{ latitude: 91 },
		{ longitude: -181 },
		{ latitude: Number.NaN },
		{ startAt: -1 },
		{ startAt: Number.POSITIVE_INFINITY },
		{ endAt: 100 },
		{ startAt: 200, endAt: 100 },
	])("rejects invalid campaign %j without inserting it", async (invalid) => {
		const t = setup();
		await expect(
			t.mutation(api.campaigns.add, { ...campaign, ...invalid }),
		).rejects.toThrow();
		expect(await t.query(api.campaigns.list)).toEqual([]);
	});

	it("allows absent dates, trims names, and handles missing or malformed IDs", async () => {
		const t = setup();
		const id = await t.mutation(api.campaigns.add, {
			...campaign,
			name: "  Campaign  ",
		});
		expect(await t.query(api.campaigns.getById, { id })).toMatchObject({
			name: "Campaign",
		});
		expect(
			await t.query(api.campaigns.getById, { id: "not-an-id" }),
		).toBeNull();
		await t.run(async (ctx) => ctx.db.delete(id));
		expect(await t.query(api.campaigns.getById, { id })).toBeNull();
	});
});

describe("pins", () => {
	it("rejects invalid coordinates and colors on insert and update", async () => {
		const t = setup();
		const campaignId = await t.mutation(api.campaigns.add, campaign);
		const args = { campaignId, latitude: 51, longitude: 13, color: "yellow" };
		await expect(
			t.mutation(api.pins.add, { ...args, color: "constructor" }),
		).rejects.toThrow();
		await expect(
			t.mutation(api.pins.addPlanned, { ...args, latitude: 100 }),
		).rejects.toThrow();
		const id = await t.mutation(api.pins.addPlanned, args);
		await expect(
			t.mutation(api.pins.updatePosition, {
				id,
				latitude: 0,
				longitude: Infinity,
			}),
		).rejects.toThrow();
		await expect(
			t.mutation(api.pins.updateColor, { id, color: "invalid" }),
		).rejects.toThrow();
		expect(await t.query(api.pins.getById, { pinId: id })).toMatchObject(args);
	});

	it("rejects insertion and edits for a deleted campaign", async () => {
		const t = setup();
		const campaignId = await t.mutation(api.campaigns.add, campaign);
		const args = { campaignId, latitude: 51, longitude: 13, color: "yellow" };
		const id = await t.mutation(api.pins.add, args);
		await t.run(async (ctx) => ctx.db.delete(campaignId));
		await expect(t.mutation(api.pins.add, args)).rejects.toThrow(
			"Kampagne nicht gefunden",
		);
		await expect(t.mutation(api.pins.addPlanned, args)).rejects.toThrow(
			"Kampagne nicht gefunden",
		);
		await expect(
			t.mutation(api.pins.updateColor, { id, color: "blue" }),
		).rejects.toThrow();
	});

	it("enforces the planned → hung → taken down → hung lifecycle", async () => {
		const t = setup();
		const campaignId = await t.mutation(api.campaigns.add, campaign);
		const id = await t.mutation(api.pins.addPlanned, {
			campaignId,
			latitude: 51,
			longitude: 13,
			color: "yellow",
		});
		await expect(t.mutation(api.pins.takeDown, { id })).rejects.toThrow();
		await t.mutation(api.pins.updatePosition, {
			id,
			latitude: 52,
			longitude: 14,
		});
		await t.mutation(api.pins.hangAgain, { id });
		await expect(t.mutation(api.pins.hangAgain, { id })).rejects.toThrow();
		await expect(t.mutation(api.pins.remove, { id })).rejects.toThrow();
		await expect(
			t.mutation(api.pins.updatePosition, { id, latitude: 53, longitude: 15 }),
		).rejects.toThrow();
		await t.mutation(api.pins.takeDown, { id });
		await expect(t.mutation(api.pins.takeDown, { id })).rejects.toThrow();
		await t.mutation(api.pins.hangAgain, { id });
		expect(await t.query(api.pins.getById, { pinId: id })).toMatchObject({
			tookDownAt: null,
			latitude: 52,
			longitude: 14,
		});
	});

	it("stamps hang and take-down times from the server clock", async () => {
		const t = setup();
		const campaignId = await t.mutation(api.campaigns.add, campaign);
		const id = await t.mutation(api.pins.addPlanned, {
			campaignId,
			latitude: 51,
			longitude: 13,
			color: "yellow",
		});
		const before = Date.now();
		await t.mutation(api.pins.hangAgain, { id });
		const hung = await t.query(api.pins.getById, { pinId: id });
		await t.mutation(api.pins.takeDown, { id });
		const takenDown = await t.query(api.pins.getById, { pinId: id });
		// A device with a skewed clock cannot contribute a contradictory order.
		expect(hung?.hangAt).toBeGreaterThanOrEqual(before);
		expect(takenDown?.tookDownAt).toBeGreaterThanOrEqual(hung?.hangAt ?? 0);
	});

	it("seeds a fresh database with a real campaign and remains idempotent", async () => {
		const t = setup();
		await t.mutation(internal.pins.seed);
		await t.mutation(internal.campaigns.seed);
		await t.mutation(internal.pins.seed);
		const campaigns = await t.query(api.campaigns.list);
		expect(campaigns).toHaveLength(1);
		const pins = await t.query(api.pins.list, { campaignId: campaigns[0]._id });
		expect(pins).toHaveLength(1);
		expect(pins[0].campaignId).toBe(campaigns[0]._id);
	});
});
