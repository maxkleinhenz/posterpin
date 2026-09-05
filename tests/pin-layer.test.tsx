// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
	const images = new Set<string>();
	return {
		images,
		maps: {
			current: {
				hasImage: (id: string) => images.has(id),
				addImage: (id: string) => images.add(id),
				on: () => {},
				off: () => {},
			},
		},
	};
});
vi.mock("@tanstack/react-query", () => ({ useQuery: () => ({ data: [] }) }));
vi.mock("@tanstack/react-router", () => ({
	useParams: () => ({ campaignId: "test" }),
}));
vi.mock("@/queries/pins", () => ({ pinQueries: { list: () => ({}) } }));
vi.mock("react-map-gl/maplibre", () => ({
	useMap: () => state.maps,
	Layer: () => null,
	Source: () => null,
}));

import PinsLayer, {
	pinsPlannedLayer,
	pinsTookDownLayer,
	pinsUnclusteredPointLayer,
} from "../src/routes/campaigns/$campaignId/-components/pin-layer";

it("draws every pin status as a native circle so a style swap needs no custom images", () => {
	render(<PinsLayer />);
	expect([...state.images]).toEqual([]);
	for (const layer of [
		pinsPlannedLayer,
		pinsTookDownLayer,
		pinsUnclusteredPointLayer,
	]) {
		expect(layer.type).toBe("circle");
	}
});

it("separates the statuses by fill instead of by texture", () => {
	// Planned reads as unfilled: the pin color is carried by the ring, and the
	// interior is only a wash of it rather than a solid disc.
	expect(pinsPlannedLayer.paint["circle-stroke-color"]).toEqual([
		"coalesce",
		["get", "colorRgb"],
		expect.any(String),
	]);
	expect(pinsPlannedLayer.paint["circle-opacity"]).toBeLessThan(0.25);
	expect(pinsPlannedLayer.paint["circle-stroke-width"]).toBeGreaterThan(
		pinsUnclusteredPointLayer.paint["circle-stroke-width"],
	);

	// Hung is the loudest marker: solid fill, largest radius.
	expect("circle-opacity" in pinsUnclusteredPointLayer.paint).toBe(false);
	expect(pinsUnclusteredPointLayer.paint["circle-radius"]).toBeGreaterThan(
		pinsPlannedLayer.paint["circle-radius"],
	);

	// Took down recedes: faded and smaller than both of the active statuses.
	expect(pinsTookDownLayer.paint["circle-opacity"]).toBeLessThan(1);
	expect(pinsTookDownLayer.paint["circle-radius"]).toBeLessThan(
		pinsPlannedLayer.paint["circle-radius"],
	);
});
