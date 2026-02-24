import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	type GeoJSONSourceSpecification,
	Layer,
	type LayerProps,
	Source,
} from "react-map-gl/maplibre";
import { pinQueries } from "@/queries";

export const pinSourceId = "pins-source";

export const pinsClusterLayer = {
	id: "pins-cluster",
	type: "circle",
	filter: ["has", "point_count"],
	paint: {
		"circle-radius": ["step", ["get", "point_count"], 25, 100, 35, 750, 45],
		"circle-color": "#fbbf24",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
	},
} as const satisfies LayerProps;

export const pinsClusterCountLayer = {
	id: "pins-cluster-count",
	type: "symbol",
	filter: ["has", "point_count"],
	layout: {
		"text-field": "{point_count_abbreviated}",
		"text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
		"text-size": 16,
	},
} as const satisfies LayerProps;

export const pinsUnclusteredPointLayer = {
	id: "pins-layer-unclustered",
	type: "circle",
	filter: ["!", ["has", "point_count"]],
	paint: {
		"circle-radius": 18,
		"circle-color": "#fbbf24",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
	},
} as const satisfies LayerProps;

export default function PinsLayer() {
	const pins = useQuery(pinQueries.list());

	const pinsGeoJSON = useMemo(() => {
		if (!pins.data) return null;

		return {
			type: "geojson" as const,
			data: {
				type: "FeatureCollection" as const,
				features: pins.data.map((pin) => ({
					type: "Feature" as const,
					geometry: {
						type: "Point" as const,
						coordinates: [pin.longitude, pin.latitude],
					},
					properties: {
						id: pin._id,
						creationTime: pin._creationTime,
					},
				})),
			},
		} satisfies GeoJSONSourceSpecification;
	}, [pins.data]);

	if (!pinsGeoJSON) return null;

	return (
		<Source
			id={pinSourceId}
			cluster={true}
			clusterMaxZoom={16}
			clusterRadius={30}
			{...pinsGeoJSON}
		>
			<Layer {...pinsClusterLayer} />
			<Layer {...pinsClusterCountLayer} />
			<Layer {...pinsUnclusteredPointLayer} />
		</Source>
	);
}
