/** biome-ignore-all lint/correctness/useUniqueElementIds: layer and source IDs are fixed map style IDs by design */

import "maplibre-gl/dist/maplibre-gl.css";
import * as turf from "@turf/turf";
import { useMemo } from "react";
import {
	type GeoJSONSourceSpecification,
	Layer,
	Source,
} from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";
import type { GeolocationState } from "@/lib/use-geolocation";
import { useAppStore } from "@/store/app-store";

// Helper function to create a circle GeoJSON
function createGeoJSONCircle(center: [number, number], radiusInMeters: number) {
	const circle = turf.circle(center, radiusInMeters, {
		steps: 64,
		units: "meters",
	});

	return {
		type: "geojson" as const,
		data: circle,
	} satisfies GeoJSONSourceSpecification;
}

export default function AccuracyCricle({
	geolocation,
}: {
	geolocation: GeolocationState;
}) {
	const { isAuracyVisible } = useAppStore(
		useShallow((state) => ({
			isAuracyVisible: state.isAuracyVisible,
		})),
	);

	const accuracyCricle = useMemo(() => {
		if (
			geolocation.longitude == null ||
			geolocation.latitude == null ||
			geolocation.accuracy == null
		) {
			return {
				type: "geojson" as const,
				data: {
					type: "Feature" as const,
					geometry: {
						type: "Polygon" as const,
						coordinates: [],
					},
					properties: {},
				},
			};
		}

		const geoJson = createGeoJSONCircle(
			[geolocation.longitude, geolocation.latitude],
			geolocation.accuracy,
		);
		return geoJson;
	}, [geolocation.accuracy, geolocation.latitude, geolocation.longitude]);

	if (!isAuracyVisible) {
		return null;
	}

	return (
		<Source
			id="source-accuracy-circle"
			type="geojson"
			data={accuracyCricle.data}
		>
			<Layer
				id="accuracy-circle"
				type="fill"
				paint={{
					"fill-color": "#42a5f5",
					"fill-opacity": 0.1,
				}}
			/>
			<Layer
				id="accuracy-circle-outline"
				type="line"
				paint={{
					"line-color": "#42a5f5",
					"line-width": 2,
				}}
			/>
		</Source>
	);
}
