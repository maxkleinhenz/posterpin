import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { useMemo } from "react";
import {
	type GeoJSONSourceSpecification,
	Layer,
	type LayerProps,
	Source,
} from "react-map-gl/maplibre";
import { pinQueries } from "@/queries/pins";

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

const pinsClusterCountLayer = {
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
	filter: [
		"all",
		["!", ["has", "point_count"]],
		["==", ["get", "tookDownAt"], null],
		["!=", ["get", "hangAt"], null],
	],
	paint: {
		"circle-radius": 18,
		"circle-color": "#fbbf24",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
	},
} as const satisfies LayerProps;

export const pinsTookDownLayer = {
	id: "pins-layer-took-down",
	type: "circle",
	filter: [
		"all",
		["!", ["has", "point_count"]],
		["!=", ["get", "tookDownAt"], null],
	],
	paint: {
		"circle-radius": 18,
		"circle-color": "#9ca3af",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
		"circle-opacity": 0.6,
	},
} as const satisfies LayerProps;

export const pinsPlannedLayer = {
	id: "pins-layer-planned",
	type: "circle",
	filter: [
		"all",
		["!", ["has", "point_count"]],
		["==", ["get", "hangAt"], null],
		["==", ["get", "tookDownAt"], null],
	],
	paint: {
		"circle-radius": 18,
		"circle-color": "#3b82f6",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
		"circle-opacity": 0.85,
	},
} as const satisfies LayerProps;

type DraggingPin = { id: string; latitude: number; longitude: number };

export default function PinsLayer({
	draggingPin,
}: {
	draggingPin?: DraggingPin | null;
}) {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/" });
	const pins = useQuery(pinQueries.list(campaignId as Id<"campaigns">));

	const pinsGeoJSON = useMemo(() => {
		if (!pins.data) return null;

		return {
			type: "geojson" as const,
			data: {
				type: "FeatureCollection" as const,
				features: pins.data.map((pin) => {
					const isDragging = draggingPin != null && pin._id === draggingPin.id;
					return {
						type: "Feature" as const,
						geometry: {
							type: "Point" as const,
							coordinates: isDragging
								? [draggingPin.longitude, draggingPin.latitude]
								: [pin.longitude, pin.latitude],
						},
						properties: {
							id: pin._id,
							hangAt: pin.hangAt ?? null,
							tookDownAt: pin.tookDownAt ?? null,
						},
					};
				}),
			},
		} satisfies GeoJSONSourceSpecification;
	}, [pins.data, draggingPin]);

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
			<Layer {...pinsTookDownLayer} />
			<Layer {...pinsUnclusteredPointLayer} />
			<Layer {...pinsPlannedLayer} />
		</Source>
	);
}
