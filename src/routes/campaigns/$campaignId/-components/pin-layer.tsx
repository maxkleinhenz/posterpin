import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import type { ExpressionSpecification } from "maplibre-gl";
import { colors, type PinColor } from "@/colors";
import { pinQueries } from "@/queries/pins";
import { useAppStore } from "@/store/app-store";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo } from "react";
import {
	type GeoJSONSourceSpecification,
	Layer,
	type LayerProps,
	Source,
} from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";

export const hungSourceId = "pins-source-hung";
export const tookDownSourceId = "pins-source-took-down";
export const plannedSourceId = "pins-source-planned";

const pinColors = Object.keys(colors) as PinColor[];

function getPinColorKey(color: string | undefined): PinColor {
	if (color && color in colors) {
		return color as PinColor;
	}

	return "yellow";
}

function createDominantColorExpression(
	getValue: (color: PinColor) => string,
	fallback: string,
): ExpressionSpecification {
	const expression: unknown[] = ["case"];

	for (const color of pinColors) {
		expression.push(
			[
				"all",
				...pinColors
					.filter((candidate) => candidate !== color)
					.map((candidate) => [
						">=",
						["get", `colorCount_${color}`],
						["get", `colorCount_${candidate}`],
					]),
			],
			getValue(color),
		);
	}

	expression.push(fallback);

	return expression as ExpressionSpecification;
}

const hungClusterProperties = Object.fromEntries(
	pinColors.map((color) => [
		`colorCount_${color}`,
		["+", ["case", ["==", ["get", "colorKey"], color], 1, 0]],
	]),
);

export const hungClusterLayer = {
	id: "pins-cluster-hung",
	type: "circle",
	filter: ["has", "point_count"],
	paint: {
		"circle-radius": ["step", ["get", "point_count"], 25, 100, 35, 750, 45],
		"circle-color": createDominantColorExpression(
			(color) => colors[color].rgb,
			colors.yellow.rgb,
		),
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
	paint: {
		"text-color": createDominantColorExpression(
			(color) =>
				colors[getPinColorKey(color)].text === "text-black"
					? "#000000"
					: "#ffffff",
			"#000000",
		),
	},
} as const satisfies LayerProps;

export const pinsUnclusteredPointLayer = {
	id: "pins-layer-unclustered",
	type: "circle",
	filter: ["!", ["has", "point_count"]],
	paint: {
		"circle-radius": 18,
		"circle-color": ["coalesce", ["get", "colorRgb"], colors.yellow.rgb],
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
	pin: {
		_id: string;
		longitude: number;
		latitude: number;
		color?: string;
		hangAt?: number | null;
		tookDownAt?: number | null;
	},
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
			colorKey: getPinColorKey(pin.color),
			colorRgb: colors[getPinColorKey(pin.color)].rgb,
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

	const { pinFilter } = useAppStore(
		useShallow((state) => ({ pinFilter: state.pinFilter })),
	);

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
			{pinFilter.tookDown && (
				<Source
					id={tookDownSourceId}
					cluster
					clusterMaxZoom={16}
					clusterRadius={30}
					{...tookDownGeoJSON}
				>
					<Layer {...tookDownClusterLayer} />
					<Layer {...tookDownClusterCountLayer} />
					<Layer {...pinsTookDownLayer} />
				</Source>
			)}
			{pinFilter.planned && (
				<Source
					id={plannedSourceId}
					cluster
					clusterMaxZoom={16}
					clusterRadius={30}
					{...plannedGeoJSON}
				>
					<Layer {...plannedClusterLayer} />
					<Layer {...plannedClusterCountLayer} />
					<Layer {...pinsPlannedLayer} />
				</Source>
			)}
			{pinFilter.hung && (
				<Source
					id={hungSourceId}
					cluster
					clusterMaxZoom={16}
					clusterRadius={30}
					clusterProperties={hungClusterProperties}
					{...hungGeoJSON}
				>
					<Layer {...hungClusterLayer} />
					<Layer {...hungClusterCountLayer} />
					<Layer {...pinsUnclusteredPointLayer} />
				</Source>
			)}
		</>
	);
}
