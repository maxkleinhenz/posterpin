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
};

type UseGeolocationConfig = {
	autoStart?: boolean;
};

const initialState: GeolocationState = {
	loading: true,
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
		loading: supported,
	});
	const [isWatching, setIsWatching] = useState(false);
	const watchIdRef = useRef<number | null>(null);
	const optionsRef = useRef(options);
	optionsRef.current = options;

	const stopWatching = useCallback(() => {
		if (!supported) return;

		if (watchIdRef.current !== null) {
			navigator.geolocation.clearWatch(watchIdRef.current);
			watchIdRef.current = null;
		}

		setIsWatching(false);
		setState(initialState);
	}, [supported]);

	const startWatching = useCallback(() => {
		if (!supported || watchIdRef.current !== null) return;

		setState((previous) => ({
			...previous,
			loading: true,
			error: null,
		}));

		watchIdRef.current = navigator.geolocation.watchPosition(
			(position) => {
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
				setState((previous) => ({
					...previous,
					loading: false,
					error,
				}));
			},
			optionsRef.current,
		);

		setIsWatching(true);
	}, [supported]);

	useEffect(() => {
		if (!supported || !options?.autoStart) {
			setState((previous) => ({ ...previous, loading: false }));
			return;
		}

		startWatching();
		return stopWatching;
	}, [options?.autoStart, startWatching, stopWatching, supported]);

	return {
		...state,
		supported,
		isWatching,
		startWatching,
		stopWatching,
	};
}
