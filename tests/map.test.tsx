// @vitest-environment jsdom
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import type { ComponentType, PropsWithChildren } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
	props: {} as Record<string, unknown>,
	location: {} as Record<string, unknown>,
	pending: 0,
	add: vi.fn(),
	move: vi.fn(),
	// What the map reports under the pointer, independent of the stale feature
	// list react-map-gl carries over from the last hover.
	rendered: [] as unknown[],
	map: {
		dragPan: { disable: vi.fn(), enable: vi.fn() },
		flyTo: vi.fn(),
		getZoom: () => 18,
		getContainer: () => ({ clientHeight: 800 }),
		getLayer: (id: string) => ({ id }),
		queryRenderedFeatures: vi.fn(() => state.rendered),
	},
	campaign: {
		_id: "campaign-id",
		_creationTime: 1,
		name: "Test",
		latitude: 51,
		longitude: 13,
	},
}));
vi.mock("@tanstack/react-query", () => ({
	useSuspenseQuery: () => ({ data: state.campaign }),
	useIsMutating: () => state.pending,
}));
vi.mock("@tanstack/react-router", () => ({
	createFileRoute: () => (options: unknown) => ({
		options,
		useParams: () => ({ campaignId: "campaign-id" }),
	}),
	ClientOnly: ({ children }: PropsWithChildren) => children,
	useNavigate: () => vi.fn(),
	notFound: () => new Error("Not found"),
}));
vi.mock("@/queries/pins", () => ({
	pinQueries: {
		list: (campaignId: string) => ({ queryKey: ["pins", campaignId] }),
	},
	useAddPlannedPinMutation: () => ({ mutate: state.add, isPending: false }),
	useUpdatePinPositionMutation: () => ({
		mutate: state.move,
		isPending: false,
	}),
}));
vi.mock("@/env", () => ({ env: { VITE_MAPTILER_KEY: "test" } }));
vi.mock("@uidotdev/usehooks", () => ({ useMediaQuery: () => false }));
vi.mock("@/lib/use-geolocation", () => ({
	useGeolocation: () => ({
		latitude: null,
		longitude: null,
		timestamp: null,
		error: null,
	}),
	hasFreshLocation: () => false,
}));
vi.mock("react-map-gl/maplibre", () => ({
	default: (props: PropsWithChildren) => {
		state.props = props as Record<string, unknown>;
		return props.children;
	},
	MapProvider: ({ children }: PropsWithChildren) => children,
	Marker: () => null,
}));
vi.mock("../src/routes/campaigns/$campaignId/-components/pin-layer", () => ({
	default: () => null,
	hungClusterLayer: { id: "hung-cluster" },
	tookDownClusterLayer: { id: "down-cluster" },
	plannedClusterLayer: { id: "planned-cluster" },
	pinsUnclusteredPointLayer: { id: "hung" },
	pinsTookDownLayer: { id: "down" },
	pinsPlannedLayer: { id: "planned" },
	hungSourceId: "hung-source",
	tookDownSourceId: "down-source",
	plannedSourceId: "planned-source",
}));
vi.mock("../src/routes/campaigns/$campaignId/-components/map-control", () => ({
	default: ({ geolocation }: { geolocation: Record<string, unknown> }) => {
		state.location = geolocation;
		return null;
	},
}));
vi.mock(
	"../src/routes/campaigns/$campaignId/-components/map-accuracy-cricle",
	() => ({ default: () => null }),
);
vi.mock("../src/routes/campaigns/$campaignId/-components/menu-sheet", () => ({
	default: () => null,
}));
vi.mock("../src/routes/campaigns/$campaignId/-components/pin-control", () => ({
	default: () => null,
}));
vi.mock(
	"../src/routes/campaigns/$campaignId/-components/pin-details-sheet",
	() => ({ default: () => null }),
);

import { TooltipProvider } from "../src/components/ui/tooltip";
import PinSettingsPopup from "../src/routes/campaigns/$campaignId/-components/pin-settings";
import { Route } from "../src/routes/campaigns/$campaignId/index";
import { defaultFilter, useAppStore } from "../src/store/app-store";
import { useMapSettings } from "../src/store/map-settings";

beforeEach(() => {
	vi.clearAllMocks();
	state.pending = 0;
	state.rendered = [];
	useMapSettings.getState().setMapStyle("streets");
	useAppStore.setState({
		mode: { mode: "none" },
		pinFilter: defaultFilter,
		pinColor: "yellow",
	});
});
afterEach(cleanup);
function show() {
	const Component = Route.options.component as ComponentType;
	render(
		<TooltipProvider>
			<Component />
		</TooltipProvider>,
	);
}

it("switches the map from settings, saves the selection, and resets to streets", () => {
	show();
	render(
		<TooltipProvider>
			<PinSettingsPopup />
		</TooltipProvider>,
	);
	fireEvent.click(screen.getByRole("button", { name: "Einstellungen" }));
	expect(screen.queryByRole("combobox")).toBeNull();
	expect(screen.getAllByRole("radio").length).toBe(4);
	for (const [style, label] of [
		["dataviz-v4-light", "Hell"],
		["dataviz-v4-dark", "Dunkel"],
		["hybrid-v4", "Satellit"],
		["streets", "Standard"],
	]) {
		const card = screen.getByRole("radio", { name: label }) as HTMLInputElement;
		fireEvent.click(card);
		expect(card.checked).toBe(true);
		expect(
			card.closest("label")?.querySelector("img")?.getAttribute("src"),
		).toContain(`/maps/${style}/256/`);
		expect(state.props.mapStyle).toBe(
			`https://api.maptiler.com/maps/${style}/style.json?key=test`,
		);
		expect(localStorage.getItem("posterpin-map-style")).toBe(style);
	}
	fireEvent.click(screen.getByRole("radio", { name: "Dunkel" }));
	fireEvent.click(
		screen.getByRole("button", { name: "Einstellungen zurücksetzen" }),
	);
	expect(state.props.mapStyle).toBe(
		"https://api.maptiler.com/maps/streets/style.json?key=test",
	);
	expect(localStorage.getItem("posterpin-map-style")).toBe("streets");
});
function event(type: string, withPin = true, point = { x: 0, y: 0 }) {
	return {
		type,
		target: state.map,
		point,
		preventDefault: vi.fn(),
		originalEvent: { cancelable: true, preventDefault: vi.fn() },
		lngLat: { lat: 52, lng: 14 },
		features: withPin
			? [
					{
						layer: { id: "planned" },
						properties: { id: "pin-id" },
						geometry: { coordinates: [13, 51] },
					},
				]
			: [],
	};
}
// A pointer far enough from the start of a drag to count as movement.
const dragged = { x: 40, y: 40 };
function fire(
	name: string,
	value: ReturnType<typeof event>,
	rendered: unknown[] = value.features,
) {
	state.rendered = rendered;
	act(() => {
		(state.props[name] as (value: ReturnType<typeof event>) => void)(value);
	});
}

it("uses campaign coordinates only for the initial map center, leaving GPS unavailable", () => {
	show();
	expect(state.props.initialViewState).toMatchObject({
		latitude: 51,
		longitude: 13,
	});
	expect(state.location.latitude).toBeNull();
	expect(state.location.longitude).toBeNull();
	expect(state.props.keyboard).toBe(true);
});

it("moves a planned pin using touch and restores map panning", () => {
	show();
	fire("onTouchStart", event("touchstart"));
	fire("onTouchMove", event("touchmove", true, dragged));
	fire("onTouchEnd", event("touchend"));
	expect(state.move).toHaveBeenCalledWith({
		id: "pin-id",
		latitude: 52,
		longitude: 14,
	});
	expect(state.map.dragPan.disable).toHaveBeenCalled();
	expect(state.map.dragPan.enable).toHaveBeenCalled();
});

it("updates the cursor for mode changes, hover, and dragging", () => {
	show();
	expect(state.props.cursor).toBe("grab");
	act(() => useAppStore.getState().setMode({ mode: "planning" }));
	expect(state.props.cursor).toBe("crosshair");
	fire("onMouseEnter", event("mouseenter"));
	expect(state.props.cursor).toBe("grab");
	act(() => useAppStore.getState().setMode({ mode: "none" }));
	act(() => useAppStore.getState().setMode({ mode: "planning" }));
	expect(state.props.cursor).toBe("crosshair");
	fire("onMouseDown", event("mousedown"));
	expect(state.props.cursor).toBe("grabbing");
	fire("onMouseUp", event("mouseup"));
	expect(state.props.cursor).toBe("crosshair");
});

it("cancels interrupted touch drags without writing coordinates", () => {
	show();
	fire("onTouchStart", event("touchstart"));
	fire("onTouchMove", event("touchmove", true, dragged));
	fire("onTouchCancel", event("touchcancel"));
	expect(state.move).not.toHaveBeenCalled();
	expect(state.map.dragPan.enable).toHaveBeenCalled();
});

it("opens pin details on a touch tap", () => {
	show();
	fire("onTouchStart", event("touchstart"));
	fire("onTouchEnd", event("touchend"));
	expect(state.move).not.toHaveBeenCalled();
	expect(useAppStore.getState().mode).toEqual({
		mode: "focused-pin",
		focusedPin: { id: "pin-id" },
	});
});

it.each(["touchend", "touchcancel"])(
	"accepts the next planning tap after a drag ends with %s",
	(type) => {
		useAppStore.getState().setMode({ mode: "planning" });
		show();
		fire("onTouchStart", event("touchstart"));
		fire("onTouchMove", event("touchmove", true, dragged));
		fire(type === "touchend" ? "onTouchEnd" : "onTouchCancel", event(type));
		// The prevented touchstart suppresses compatibility mouse events for the drag.
		fire("onTouchStart", event("touchstart", false));
		fire("onTouchEnd", event("touchend", false));
		fire("onClick", event("click", false));
		expect(state.add).toHaveBeenCalledOnce();
	},
);

it("opens a hung pin on the first tap after a touch drag", () => {
	show();
	fire("onTouchStart", event("touchstart"));
	fire("onTouchMove", event("touchmove", true, dragged));
	fire("onTouchEnd", event("touchend"));
	const hungPin = event("touchstart");
	hungPin.features[0].layer.id = "hung";
	hungPin.features[0].properties.id = "hung-pin-id";
	fire("onTouchStart", hungPin);
	fire("onTouchEnd", { ...hungPin, type: "touchend" });
	fire("onClick", { ...hungPin, type: "click" });
	expect(useAppStore.getState().mode).toEqual({
		mode: "focused-pin",
		focusedPin: { id: "hung-pin-id" },
	});
});

it("drags the pin under the finger, not the one left over from the last hover", () => {
	show();
	// react-map-gl hands touchstart the features of the previous hover; nothing
	// is actually rendered at this touch point.
	fire("onTouchStart", event("touchstart"), []);
	fire("onTouchMove", event("touchmove", true, dragged));
	fire("onTouchEnd", event("touchend"));
	expect(state.move).not.toHaveBeenCalled();
	expect(state.map.dragPan.disable).not.toHaveBeenCalled();
	expect(useAppStore.getState().mode).toEqual({ mode: "none" });
});

it("treats a wobbling finger as a tap instead of a position change", () => {
	show();
	fire("onTouchStart", event("touchstart"));
	fire("onTouchMove", event("touchmove", true, { x: 3, y: 2 }));
	fire("onTouchEnd", event("touchend"));
	expect(state.move).not.toHaveBeenCalled();
	expect(useAppStore.getState().mode).toEqual({
		mode: "focused-pin",
		focusedPin: { id: "pin-id" },
	});
});

it("still suppresses the click generated by a mouse drag", () => {
	useAppStore.getState().setMode({ mode: "planning" });
	show();
	fire("onMouseDown", event("mousedown"));
	fire("onMouseMove", event("mousemove", true, dragged));
	fire("onMouseUp", event("mouseup"));
	fire("onClick", event("click", false));
	expect(state.add).not.toHaveBeenCalled();
	expect(useAppStore.getState().mode.mode).toBe("planning");
});

it.each([3, 5, 7, 8])(
	"handles a mouse gesture moving %s pixels",
	(distance) => {
		show();
		const point = { x: distance, y: 0 };
		fire("onMouseDown", event("mousedown"));
		fire("onMouseMove", event("mousemove", true, point));
		fire("onMouseUp", event("mouseup", true, point));
		// MapLibre suppresses clicks at or beyond clickTolerance (default: 3px).
		const clickTolerance =
			(state.props.clickTolerance as number | undefined) ?? 3;
		if (distance < clickTolerance) fire("onClick", event("click", true, point));
		if (distance < 8) {
			expect(state.move).not.toHaveBeenCalled();
			expect(useAppStore.getState().mode).toEqual({
				mode: "focused-pin",
				focusedPin: { id: "pin-id" },
			});
		} else {
			expect(state.move).toHaveBeenCalledOnce();
			expect(useAppStore.getState().mode.mode).toBe("none");
		}
	},
);

it("does not create invisible planned pins after filters change", () => {
	useAppStore.getState().setMode({ mode: "planning" });
	useAppStore.getState().setPinFilter({ ...defaultFilter, planned: false });
	show();
	fire("onClick", event("click", false));
	expect(state.add).not.toHaveBeenCalled();
});

it("does not create another pin while creation is pending", () => {
	useAppStore.getState().setMode({ mode: "planning" });
	state.pending = 1;
	show();
	fire("onClick", event("click", false));
	expect(state.add).not.toHaveBeenCalled();
});

it("returns not found before requesting pins for an invalid or missing campaign", async () => {
	const ensureQueryData = vi.fn().mockResolvedValue(null);
	const loader = Route.options.loader;
	if (typeof loader !== "function") throw new Error("Missing route loader");
	await expect(
		Reflect.apply(loader, undefined, [
			{
				params: { campaignId: "invalid" },
				context: { queryClient: { ensureQueryData } },
			},
		]),
	).rejects.toThrow("Not found");
	expect(ensureQueryData).toHaveBeenCalledTimes(1);
});
