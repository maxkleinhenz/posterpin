// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { expect, it, vi } from "vitest";

const state = vi.hoisted(() => {
	const images = new Set<string>();
	const listeners = new Map<string, () => void>();
	return {
		images,
		listeners,
		maps: {
			current: {
				hasImage: (id: string) => images.has(id),
				addImage: (id: string) => images.add(id),
				on: (event: string, callback: () => void) =>
					listeners.set(event, callback),
				off: (event: string) => listeners.delete(event),
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

import PinsLayer from "../src/routes/campaigns/$campaignId/-components/pin-layer";

it("restores patterned pin images after a style replacement and removes the listener on unmount", () => {
	const canvas = vi
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		.mockReturnValue(null);
	const { unmount } = render(<PinsLayer />);
	const originalImages = [...state.images];
	expect(originalImages).toContain("pin-planned-yellow");
	expect(originalImages).toContain("pin-tookdown-yellow");
	state.images.clear();
	act(() => state.listeners.get("style.load")?.());
	expect([...state.images]).toEqual(originalImages);
	unmount();
	expect(state.listeners.has("style.load")).toBe(false);
	canvas.mockRestore();
});
