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

export const hungSourceId = "pins-source-hung";
export const tookDownSourceId = "pins-source-took-down";
export const plannedSourceId = "pins-source-planned";

export const hungClusterLayer = {
	id: "pins-cluster-hung",
	type: "circle",
	filter: ["has", "point_count"],
	paint: {
		"circle-radius": ["step", ["get", "point_count"], 25, 100, 35, 750, 45],
		"circle-color": "#fbbf24",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
	},
} as const satisfies LayerProps;

const hungClusterCountLayer = {
	id: "pins-cluster-count-hung",
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

export const tookDownClusterLayer = {
	id: "pins-cluster-took-down",
	type: "circle",
	filter: ["has", "point_count"],
	paint: {
		"circle-radius": ["step", ["get", "point_count"], 25, 100, 35, 750, 45],
		"circle-color": "#9ca3af",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
	},
} as const satisfies LayerProps;

const tookDownClusterCountLayer = {
	id: "pins-cluster-count-took-down",
	type: "symbol",
	filter: ["has", "point_count"],
	layout: {
		"text-field": "{point_count_abbreviated}",
		"text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
		"text-size": 16,
	},
} as const satisfies LayerProps;

export const pinsTookDownLayer = {
	id: "pins-layer-took-down",
	type: "circle",
	filter: ["!", ["has", "point_count"]],
	paint: {
		"circle-radius": 18,
		"circle-color": "#9ca3af",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
		"circle-opacity": 0.6,
	},
} as const satisfies LayerProps;

export const plannedClusterLayer = {
	id: "pins-cluster-planned",
	type: "circle",
	filter: ["has", "point_count"],
	paint: {
		"circle-radius": ["step", ["get", "point_count"], 25, 100, 35, 750, 45],
		"circle-color": "#3b82f6",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
	},
} as const satisfies LayerProps;

const plannedClusterCountLayer = {
	id: "pins-cluster-count-planned",
	type: "symbol",
	filter: ["has", "point_count"],
	layout: {
		"text-field": "{point_count_abbreviated}",
		"text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
		"text-size": 16,
	},
} as const satisfies LayerProps;

export const pinsPlannedLayer = {
	id: "pins-layer-planned",
	type: "circle",
	filter: ["!", ["has", "point_count"]],
	paint: {
		"circle-radius": 18,
		"circle-color": "#3b82f6",
		"circle-stroke-width": 2,
		"circle-stroke-color": "#ffffff",
		"circle-opacity": 0.85,
	},
} as const satisfies LayerProps;

type DraggingPin = { id: string; latitude: number; longitude: number };

function toFeature(
	pin: { _id: string; longitude: number; latitude: number; hangAt?: number | null; tookDownAt?: number | null },
	draggingPin?: DraggingPin | null,
): GeoJSON.Feature {
	const isDragging = draggingPin != null && pin._id === draggingPin.id;
	return {
		type: "Feature",
		geometry: {
			type: "Point",
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
}

function toGeoJSON(features: GeoJSON.Feature[]): GeoJSONSourceSpecification {
	return {
		type: "geojson",
		data: { type: "FeatureCollection", features },
	};
}

export default function PinsLayer({
	draggingPin,
}: {
	draggingPin?: DraggingPin | null;
}) {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/" });
	const pins = useQuery(pinQueries.list(campaignId as Id<"campaigns">));

	const { hungGeoJSON, tookDownGeoJSON, plannedGeoJSON } = useMemo(() => {
		if (!pins.data) return {};

		const hung = pins.data
			.filter((p) => p.hangAt != null && p.tookDownAt == null)
			.map((p) => toFeature(p));

		const tookDown = pins.data
			.filter((p) => p.tookDownAt != null)
			.map((p) => toFeature(p));

		const planned = pins.data
			.filter((p) => p.hangAt == null && p.tookDownAt == null)
			.map((p) => toFeature(p, draggingPin));

		return {
			hungGeoJSON: toGeoJSON(hung),
			tookDownGeoJSON: toGeoJSON(tookDown),
			plannedGeoJSON: toGeoJSON(planned),
		};
	}, [pins.data, draggingPin]);

	if (!hungGeoJSON || !tookDownGeoJSON || !plannedGeoJSON) return null;

	return (
		<>
			<Source id={hungSourceId} cluster clusterMaxZoom={16} clusterRadius={30} {...hungGeoJSON}>
				<Layer {...hungClusterLayer} />
				<Layer {...hungClusterCountLayer} />
				<Layer {...pinsUnclusteredPointLayer} />
			</Source>
			<Source id={tookDownSourceId} cluster clusterMaxZoom={16} clusterRadius={30} {...tookDownGeoJSON}>
				<Layer {...tookDownClusterLayer} />
				<Layer {...tookDownClusterCountLayer} />
				<Layer {...pinsTookDownLayer} />
			</Source>
			<Source id={plannedSourceId} cluster clusterMaxZoom={16} clusterRadius={30} {...plannedGeoJSON}>
				<Layer {...plannedClusterLayer} />
				<Layer {...plannedClusterCountLayer} />
				<Layer {...pinsPlannedLayer} />
			</Source>
		</>
	);
}
