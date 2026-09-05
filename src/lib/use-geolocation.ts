import { useCallback, useEffect, useRef, useState } from "react";

export type GeolocationState = {
	loading: boolean;
	accuracy: number | null;
	altitude: number | null;
	altitudeAccuracy: number | null;
	heading: number | null;
	latitude: number | null;
	longitude: number | null;
	speed: number | null;
	timestamp: number | null;
	error: GeolocationPositionError | null;
};

export type UseGeolocationResult = GeolocationState & {
	supported: boolean;
	isWatching: boolean;
	startWatching: () => void;
	stopWatching: () => void;
	refreshLocation: () => void;
};

type UseGeolocationConfig = {
	autoStart?: boolean;
};

export const MAX_LOCATION_AGE_MS = 30_000;

export function hasFreshLocation(location: GeolocationState, now = Date.now()) {
	return (
		location.error == null &&
		location.latitude != null &&
		location.longitude != null &&
		Number.isFinite(location.latitude) &&
		Number.isFinite(location.longitude) &&
		location.timestamp != null &&
		now - location.timestamp >= 0 &&
		now - location.timestamp < MAX_LOCATION_AGE_MS
	);
}

const initialState: GeolocationState = {
	loading: false,
	accuracy: null,
	altitude: null,
	altitudeAccuracy: null,
	heading: null,
	latitude: null,
	longitude: null,
	speed: null,
	timestamp: null,
	error: null,
};

export function useGeolocation(
	options?: PositionOptions & UseGeolocationConfig,
): UseGeolocationResult {
	const supported = typeof window !== "undefined" && "geolocation" in navigator;
	const [state, setState] = useState<GeolocationState>({
		...initialState,
		loading: supported && !!options?.autoStart,
	});
	const [isWatching, setIsWatching] = useState(false);
	const watchIdRef = useRef<number | null>(null);
	const watchGenerationRef = useRef(0);
	const refreshedForRef = useRef<number | null>(null);
	const optionsRef = useRef(options);
	useEffect(() => {
		optionsRef.current = options;
	}, [options]);

	const stopWatching = useCallback(() => {
		if (!supported) return;
		watchGenerationRef.current += 1;

		if (watchIdRef.current !== null) {
			navigator.geolocation.clearWatch(watchIdRef.current);
			watchIdRef.current = null;
		}

		setIsWatching(false);
		setState(initialState);
	}, [supported]);

	const startWatching = useCallback(
		(fresh = false) => {
			if (!supported || watchIdRef.current !== null) return;
			const generation = ++watchGenerationRef.current;

			setState((previous) => ({
				...previous,
				loading: true,
				error: null,
			}));

			watchIdRef.current = navigator.geolocation.watchPosition(
				(position) => {
					if (generation !== watchGenerationRef.current) return;
					setState({
						loading: false,
						accuracy: position.coords.accuracy,
						altitude: position.coords.altitude,
						altitudeAccuracy: position.coords.altitudeAccuracy,
						heading: position.coords.heading,
						latitude: position.coords.latitude,
						longitude: position.coords.longitude,
						speed: position.coords.speed,
						timestamp: position.timestamp,
						error: null,
					});
				},
				(error) => {
					if (generation !== watchGenerationRef.current) return;
					setState({ ...initialState, error });
				},
				{ ...optionsRef.current, ...(fresh ? { maximumAge: 0 } : {}) },
			);

			setIsWatching(true);
		},
		[supported],
	);

	const refreshLocation = useCallback(() => {
		stopWatching();
		startWatching(true);
	}, [startWatching, stopWatching]);

	useEffect(() => {
		if (!supported || !options?.autoStart) {
			return stopWatching;
		}

		startWatching();
		return stopWatching;
	}, [options?.autoStart, startWatching, stopWatching, supported]);

	useEffect(() => {
		if (state.timestamp == null) return;
		const timestamp = state.timestamp;
		// A refresh already ran for this fix or a newer one and the platform still
		// replayed it. Asking again would only cycle clearWatch/watchPosition on a
		// zero-length timer and leave the location permanently unusable.
		if (refreshedForRef.current != null && timestamp <= refreshedForRef.current)
			return;
		const expire = () => {
			// A stationary device may never emit another watch update. Restarting
			// requests a new fix, bypassing the browser's cached position.
			if (watchIdRef.current === null) return;
			refreshedForRef.current = timestamp;
			refreshLocation();
		};
		const timer = window.setTimeout(
			expire,
			Math.max(0, timestamp + MAX_LOCATION_AGE_MS - Date.now()),
		);
		return () => window.clearTimeout(timer);
	}, [state.timestamp, refreshLocation]);

	return {
		...state,
		supported,
		isWatching,
		startWatching,
		stopWatching,
		refreshLocation,
	};
}
