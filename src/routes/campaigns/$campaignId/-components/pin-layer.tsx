import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import type { ExpressionSpecification } from "maplibre-gl";
import { useEffect, useMemo } from "react";
import {
	type GeoJSONSourceSpecification,
	Layer,
	type LayerProps,
	Source,
	useMap,
} from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";

import { colors, type PinColor } from "@/colors";

import "maplibre-gl/dist/maplibre-gl.css";
import { pinQueries } from "@/queries/pins";
import { useAppStore } from "@/store/app-store";

import { getPinStatus, normalizePinColor } from "../../../../../shared/pins";

function createPinPatternImage(
	color: string,
	pattern: "stripes" | "crosshatch",
): { width: number; height: number; data: Uint8Array } {
	const size = 40;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx)
		return { width: size, height: size, data: new Uint8Array(size * size * 4) };
	const cx = size / 2;
	const cy = size / 2;
	const r = size / 2 - 2;

	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fillStyle = color;
	ctx.globalAlpha = pattern === "crosshatch" ? 0.5 : 0.65;
	ctx.fill();
	ctx.globalAlpha = 1;

	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.clip();

	if (pattern === "stripes") {
		ctx.strokeStyle = "rgba(255,255,255,0.65)";
		ctx.lineWidth = 3;
		for (let i = -size; i < size * 2; i += 14) {
			ctx.beginPath();
			ctx.moveTo(i, 0);
			ctx.lineTo(i + size, size);
			ctx.stroke();
		}
	} else {
		ctx.strokeStyle = "rgba(0,0,0,0.3)";
		ctx.lineWidth = 1.5;
		for (let i = -size; i < size * 2; i += 12) {
			ctx.beginPath();
			ctx.moveTo(i, 0);
			ctx.lineTo(i + size, size);
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(size - i, 0);
			ctx.lineTo(-i, size);
			ctx.stroke();
		}
	}

	ctx.restore();

	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.strokeStyle = pattern === "crosshatch" ? "#888888" : "#ffffff";
	ctx.lineWidth = 3;
	ctx.stroke();

	const imageData = ctx.getImageData(0, 0, size, size);
	return {
		width: size,
		height: size,
		data: new Uint8Array(imageData.data.buffer),
	};
}

export const hungSourceId = "pins-source-hung";
export const tookDownSourceId = "pins-source-took-down";
export const plannedSourceId = "pins-source-planned";

const pinColors = Object.keys(colors) as PinColor[];

function getPinColorKey(color: string | undefined): PinColor {
	if (color && Object.hasOwn(colors, color)) {
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

const clusterColorProperties = Object.fromEntries(
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
	type: "symbol",
	filter: ["has", "point_count"],
	layout: {
		"icon-image": [
			"concat",
			"pin-tookdown-",
			createDominantColorExpression((color) => color, "yellow"),
		],
		"icon-size": ["step", ["get", "point_count"], 1.25, 100, 1.75, 750, 2.25],
		"icon-allow-overlap": true,
		"icon-ignore-placement": true,
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

export const pinsTookDownLayer = {
	id: "pins-layer-took-down",
	type: "symbol",
	filter: ["!", ["has", "point_count"]],
	layout: {
		"icon-image": ["concat", "pin-tookdown-", ["get", "colorKey"]],
		"icon-size": 1,
		"icon-allow-overlap": true,
		"icon-ignore-placement": true,
	},
} as const satisfies LayerProps;

export const plannedClusterLayer = {
	id: "pins-cluster-planned",
	type: "symbol",
	filter: ["has", "point_count"],
	layout: {
		"icon-image": [
			"concat",
			"pin-planned-",
			createDominantColorExpression((color) => color, "yellow"),
		],
		"icon-size": ["step", ["get", "point_count"], 1.25, 100, 1.75, 750, 2.25],
		"icon-allow-overlap": true,
		"icon-ignore-placement": true,
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

export const pinsPlannedLayer = {
	id: "pins-layer-planned",
	type: "symbol",
	filter: ["!", ["has", "point_count"]],
	layout: {
		"icon-image": ["concat", "pin-planned-", ["get", "colorKey"]],
		"icon-size": 1,
		"icon-allow-overlap": true,
		"icon-ignore-placement": true,
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
	const maps = useMap();

	useEffect(() => {
		const map = Object.values(maps)[0];
		if (!map) return;
		const addPinImages = () => {
			for (const color of pinColors) {
				const rgb = colors[color].rgb;
				const plannedId = `pin-planned-${color}`;
				if (!map.hasImage(plannedId)) {
					map.addImage(plannedId, createPinPatternImage(rgb, "stripes"));
				}
				const tookDownId = `pin-tookdown-${color}`;
				if (!map.hasImage(tookDownId)) {
					map.addImage(tookDownId, createPinPatternImage(rgb, "crosshatch"));
				}
			}
		};
		addPinImages();
		// Replacing the base style can discard the custom marker images.
		map.on("style.load", addPinImages);
		return () => {
			map.off("style.load", addPinImages);
		};
	}, [maps]);

	const pins = useQuery(pinQueries.list(campaignId as Id<"campaigns">));

	const { pinFilter } = useAppStore(
		useShallow((state) => ({ pinFilter: state.pinFilter })),
	);

	const { hungGeoJSON, tookDownGeoJSON, plannedGeoJSON } = useMemo(() => {
		if (!pins.data) return {};

		const hung = pins.data
			.filter(
				(p) =>
					getPinStatus(p) === "hung" &&
					pinFilter.colors[normalizePinColor(p.color)],
			)
			.map((p) => toFeature(p));

		const tookDown = pins.data
			.filter(
				(p) =>
					getPinStatus(p) === "tookDown" &&
					pinFilter.colors[normalizePinColor(p.color)],
			)
			.map((p) => toFeature(p));

		const planned = pins.data
			.filter(
				(p) =>
					getPinStatus(p) === "planned" &&
					pinFilter.colors[normalizePinColor(p.color)],
			)
			.map((p) => toFeature(p, draggingPin));

		return {
			hungGeoJSON: toGeoJSON(hung),
			tookDownGeoJSON: toGeoJSON(tookDown),
			plannedGeoJSON: toGeoJSON(planned),
		};
	}, [pins.data, draggingPin, pinFilter.colors]);

	if (!hungGeoJSON || !tookDownGeoJSON || !plannedGeoJSON) return null;

	return (
		<>
			{pinFilter.tookDown && (
				<Source
					id={tookDownSourceId}
					cluster
					clusterMaxZoom={16}
					clusterRadius={30}
					clusterProperties={clusterColorProperties}
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
					clusterProperties={clusterColorProperties}
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
					clusterProperties={clusterColorProperties}
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
