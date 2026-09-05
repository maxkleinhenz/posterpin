// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	hasFreshLocation,
	MAX_LOCATION_AGE_MS,
	useGeolocation,
} from "../src/lib/use-geolocation";

let success: PositionCallback;
let failure: PositionErrorCallback;
const clearWatch = vi.fn();
const position = () =>
	({
		coords: {
			latitude: 51,
			longitude: 13,
			accuracy: 10,
			altitude: null,
			altitudeAccuracy: null,
			heading: null,
			speed: null,
		},
		timestamp: Date.now(),
	}) as GeolocationPosition;

beforeEach(() => {
	vi.useFakeTimers();
	Object.defineProperty(navigator, "geolocation", {
		configurable: true,
		value: {
			watchPosition: vi.fn((onSuccess, onError) => {
				success = onSuccess;
				failure = onError;
				return 7;
			}),
			clearWatch,
		},
	});
});
afterEach(() => {
	cleanup();
	vi.useRealTimers();
	vi.clearAllMocks();
});

describe("GPS freshness", () => {
	it("invalidates old coordinates when GPS reports an error", () => {
		const { result } = renderHook(() => useGeolocation({ autoStart: true }));
		expect(hasFreshLocation(result.current)).toBe(false);
		act(() => success(position()));
		expect(hasFreshLocation(result.current)).toBe(true);
		act(() =>
			failure({ code: 2, message: "Unavailable" } as GeolocationPositionError),
		);
		expect(result.current.latitude).toBeNull();
		expect(hasFreshLocation(result.current)).toBe(false);
	});

	it("refreshes an expired fix without waiting for movement, bypassing cached positions", () => {
		const { result } = renderHook(() =>
			useGeolocation({ autoStart: true, maximumAge: 10_000 }),
		);
		act(() => success(position()));
		act(() => vi.advanceTimersByTime(MAX_LOCATION_AGE_MS));
		expect(result.current.latitude).toBeNull();
		expect(hasFreshLocation(result.current)).toBe(false);
		expect(result.current.loading).toBe(true);
		expect(clearWatch).toHaveBeenCalledWith(7);
		expect(navigator.geolocation.watchPosition).toHaveBeenCalledTimes(2);
		expect(navigator.geolocation.watchPosition).toHaveBeenLastCalledWith(
			expect.any(Function),
			expect.any(Function),
			expect.objectContaining({ maximumAge: 0 }),
		);
		act(() => success(position()));
		expect(hasFreshLocation(result.current)).toBe(true);
		expect(result.current.loading).toBe(false);
	});

	it("stops restarting the watch when the platform replays an expired fix", () => {
		const { result } = renderHook(() => useGeolocation({ autoStart: true }));
		const stale = position();
		act(() => success(stale));
		act(() => vi.advanceTimersByTime(MAX_LOCATION_AGE_MS));
		expect(navigator.geolocation.watchPosition).toHaveBeenCalledTimes(2);
		// The restarted watch hands back the same already-expired position, which
		// must not spin clearWatch/watchPosition on a zero-length timer.
		act(() => success(stale));
		act(() => vi.advanceTimersByTime(MAX_LOCATION_AGE_MS * 4));
		expect(navigator.geolocation.watchPosition).toHaveBeenCalledTimes(2);
		expect(hasFreshLocation(result.current)).toBe(false);
	});

	it("allows retry after an error and ignores callbacks from the previous watch", () => {
		const { result } = renderHook(() => useGeolocation({ autoStart: true }));
		const oldSuccess = success;
		const oldFailure = failure;
		act(() =>
			failure({ code: 3, message: "Timeout" } as GeolocationPositionError),
		);
		act(() => result.current.refreshLocation());
		expect(result.current.error).toBeNull();
		expect(result.current.loading).toBe(true);
		act(() => oldSuccess(position()));
		expect(hasFreshLocation(result.current)).toBe(false);
		act(() => success(position()));
		act(() =>
			oldFailure({
				code: 2,
				message: "Unavailable",
			} as GeolocationPositionError),
		);
		expect(hasFreshLocation(result.current)).toBe(true);
	});

	it("does not restart a stopped watch when its last fix expires", () => {
		const { result } = renderHook(() => useGeolocation({ autoStart: true }));
		act(() => success(position()));
		act(() => result.current.stopWatching());
		act(() => vi.advanceTimersByTime(MAX_LOCATION_AGE_MS));
		expect(navigator.geolocation.watchPosition).toHaveBeenCalledTimes(1);
		expect(result.current.isWatching).toBe(false);
	});

	it("checks age at the instant a pin is placed, even before the expiry timer fires", () => {
		const { result } = renderHook(() => useGeolocation({ autoStart: true }));
		act(() => success(position()));
		expect(
			hasFreshLocation(result.current, Date.now() + MAX_LOCATION_AGE_MS),
		).toBe(false);
	});

	it("cleans up watches started manually", () => {
		const { result, unmount } = renderHook(() => useGeolocation());
		act(() => result.current.startWatching());
		unmount();
		expect(clearWatch).toHaveBeenCalledWith(7);
	});
});
