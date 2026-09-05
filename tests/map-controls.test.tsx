// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { UseGeolocationResult } from "../src/lib/use-geolocation";

const map = vi.hoisted(() => ({
	getBearing: () => 0,
	on: vi.fn(),
	off: vi.fn(),
	flyTo: vi.fn(),
	easeTo: vi.fn(),
}));
vi.mock("react-map-gl/maplibre", () => ({ useMap: () => ({ current: map }) }));
vi.mock("../src/routes/campaigns/$campaignId/-components/pin-settings", () => ({
	default: () => null,
}));
import MapControls from "../src/routes/campaigns/$campaignId/-components/map-control";
import { TooltipProvider } from "../src/components/ui/tooltip";

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

function location(): UseGeolocationResult {
	return {
		latitude: 51,
		longitude: 13,
		timestamp: Date.now(),
		error: null,
		accuracy: 10,
		altitude: null,
		altitudeAccuracy: null,
		heading: null,
		speed: null,
		loading: false,
		supported: true,
		isWatching: true,
		startWatching: vi.fn(),
		stopWatching: vi.fn(),
		refreshLocation: vi.fn(),
	};
}

function view(data: UseGeolocationResult) {
	return (
		<TooltipProvider>
			<MapControls geolocation={data} />
		</TooltipProvider>
	);
}

it("only follows changes in position, not unrelated renders or refreshed timestamps", () => {
	const data = location();
	const { rerender } = render(view(data));
	fireEvent.click(screen.getByRole("button", { name: "Zentriere Karte" }));
	map.easeTo.mockClear();
	rerender(view({ ...data }));
	rerender(view({ ...data, timestamp: Date.now() }));
	expect(map.easeTo).not.toHaveBeenCalled();
	rerender(view({ ...data, latitude: 52 }));
	expect(map.easeTo).toHaveBeenCalledExactlyOnceWith({
		center: { lng: 13, lat: 52 },
		padding: { top: 0, bottom: 0, left: 0, right: 0 },
		animate: true,
	});
});

it("provides a location retry after expiry or an acquisition error", () => {
	const data = { ...location(), timestamp: Date.now() - 30_000 };
	const { rerender } = render(view(data));
	fireEvent.click(
		screen.getByRole("button", { name: "Standort erneut ermitteln" }),
	);
	expect(data.refreshLocation).toHaveBeenCalledOnce();
	rerender(
		view({
			...data,
			error: { code: 3, message: "Timeout" } as GeolocationPositionError,
		}),
	);
	fireEvent.click(
		screen.getByRole("button", { name: "Standort erneut ermitteln" }),
	);
	expect(data.refreshLocation).toHaveBeenCalledTimes(2);
});

it("announces acquisition and prevents duplicate retries while it is pending", () => {
	const data = {
		...location(),
		latitude: null,
		longitude: null,
		loading: true,
	};
	render(view(data));
	const button = screen.getByRole("button", {
		name: "Standort wird ermittelt…",
	});
	expect(button.hasAttribute("disabled")).toBe(true);
	fireEvent.click(button);
	expect(data.refreshLocation).not.toHaveBeenCalled();
});
