import { useIsMutating, useSuspenseQuery } from "@tanstack/react-query";

import "maplibre-gl/dist/maplibre-gl.css";
import {
	ClientOnly,
	createFileRoute,
	notFound,
	useNavigate,
} from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import type { Campaign } from "convex/schema";
import { ArrowLeft } from "lucide-react";
import { useRef, useState } from "react";
import MapLibre, {
	type LngLatLike,
	type MapLayerMouseEvent,
	type MapLayerTouchEvent,
	MapProvider,
	Marker,
} from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { env } from "@/env";
import { hasFreshLocation, useGeolocation } from "@/lib/use-geolocation";
import { campaignsQueries } from "@/queries/campaigns";
import {
	pinQueries,
	useAddPlannedPinMutation,
	useUpdatePinPositionMutation,
} from "@/queries/pins";
import { type Mode, useAppStore } from "@/store/app-store";
import { getMapStyleUrl, useMapSettings } from "@/store/map-settings";

import AccuracyCricle from "./-components/map-accuracy-cricle";
import MapControls from "./-components/map-control";
import { MapSheetLayout, MapViewport } from "./-components/map-sheet-layout";
import MenuSheet from "./-components/menu-sheet";
import PinControl from "./-components/pin-control";
import PinDetailsSheet from "./-components/pin-details-sheet";
import PinsLayer, {
	hungClusterLayer,
	hungSourceId,
	pinsPlannedLayer,
	pinsTookDownLayer,
	pinsUnclusteredPointLayer,
	plannedClusterLayer,
	plannedSourceId,
	tookDownClusterLayer,
	tookDownSourceId,
} from "./-components/pin-layer";

const clusterSourceMap: Record<string, string> = {
	[hungClusterLayer.id]: hungSourceId,
	[tookDownClusterLayer.id]: tookDownSourceId,
	[plannedClusterLayer.id]: plannedSourceId,
};

const interactiveLayerIds = [
	hungClusterLayer.id,
	tookDownClusterLayer.id,
	plannedClusterLayer.id,
	pinsUnclusteredPointLayer.id,
	pinsTookDownLayer.id,
	pinsPlannedLayer.id,
] as const;

// A finger never holds perfectly still, so a plain tap reports a few pixels of
// travel. Below this it stays a tap instead of committing a new pin position.
const DRAG_THRESHOLD_PX = 8;

type ScreenPoint = { x: number; y: number };

function movedPastThreshold(start: ScreenPoint | null, point: ScreenPoint) {
	if (!start) return true;
	return Math.hypot(point.x - start.x, point.y - start.y) >= DRAG_THRESHOLD_PX;
}

// react-map-gl reuses the features from the last hover for every pointer event,
// and browsers synthesise a mousemove after each tap. By the next touchstart
// that array therefore describes the *previous* tap, so query the touch point.
function featureAt(e: MapLayerMouseEvent | MapLayerTouchEvent) {
	if (e.type !== "touchstart") return e.features?.[0];
	const map = e.target;
	const layers = interactiveLayerIds.filter((id) => map.getLayer(id));
	return map.queryRenderedFeatures(e.point, { layers })[0];
}

export const Route = createFileRoute("/campaigns/$campaignId/")({
	component: RouteComponent,
	loader: async ({ params, context: { queryClient } }) => {
		const campaign = await queryClient.ensureQueryData(
			campaignsQueries.getById(params.campaignId),
		);
		if (!campaign) throw notFound();
		await queryClient.ensureQueryData(pinQueries.list(campaign._id));
	},
});

function RouteComponent() {
	const campaignId = Route.useParams().campaignId as Id<"campaigns">;
	const campaign = useSuspenseQuery(campaignsQueries.getById(campaignId));

	if (campaign.data == null) throw notFound();

	return (
		<ClientOnly>
			<MapComponent campaign={campaign.data} />
		</ClientOnly>
	);
}

type DraggingPin = { id: string; latitude: number; longitude: number };

function MapComponent({ campaign }: { campaign: Campaign }) {
	const navigate = useNavigate();
	const mapStyle = useMapSettings((state) => state.mapStyle);

	const [hoverCursor, setHoverCursor] = useState<{
		mode: Mode;
		cursor: string;
	} | null>(null);
	const [draggingPin, setDraggingPin] = useState<DraggingPin | null>(null);
	const wasDraggedRef = useRef(false);
	const dragStartPointRef = useRef<ScreenPoint | null>(null);

	const { mode, setMode, pinColor, pinFilter } = useAppStore(
		useShallow((state) => ({
			mode: state.mode,
			setMode: state.setMode,
			pinColor: state.pinColor,
			pinFilter: state.pinFilter,
		})),
	);
	const addPlannedPinMutation = useAddPlannedPinMutation();
	const pendingPlans = useIsMutating({ mutationKey: ["add-planned-pin"] });
	const updatePositionMutation = useUpdatePinPositionMutation();

	const geolocation = useGeolocation({
		enableHighAccuracy: true,
		maximumAge: 10000,
		timeout: 5000,
		autoStart: true,
	});

	const cursor = draggingPin
		? "grabbing"
		: hoverCursor?.mode === mode
			? hoverCursor.cursor
			: mode.mode === "planning"
				? "crosshair"
				: "grab";

	async function onMapClick(e: MapLayerMouseEvent) {
		if (wasDraggedRef.current) {
			wasDraggedRef.current = false;
			return;
		}

		const map = e.target;
		const feature = e.features?.[0];

		const sourceId = feature?.layer?.id && clusterSourceMap[feature.layer.id];
		if (sourceId) {
			const clusterId = feature.properties?.cluster_id as number;
			if (clusterId) {
				const source = map.getSource(sourceId) as maplibregl.GeoJSONSource;
				const zoom = await source.getClusterExpansionZoom(clusterId);
				map.easeTo({
					zoom,
					center: (feature.geometry as GeoJSON.Point).coordinates as LngLatLike,
				});
			}
			return;
		}

		if (
			feature?.layer?.id === pinsUnclusteredPointLayer.id ||
			feature?.layer?.id === pinsTookDownLayer.id ||
			feature?.layer?.id === pinsPlannedLayer.id
		) {
			setMode({
				mode: "focused-pin",
				focusedPin: { id: feature.properties?.id as Id<"pins"> },
			});

			const bottomPadding = map.getContainer().clientHeight / 4;
			map.flyTo({
				center: (feature.geometry as GeoJSON.Point).coordinates as LngLatLike,
				zoom: map.getZoom() < 18 ? 18 : map.getZoom(),
				padding: { top: 0, bottom: bottomPadding, left: 0, right: 0 },
			});
			return;
		}

		if (
			mode.mode === "planning" &&
			pinFilter.planned &&
			pinFilter.colors[pinColor] &&
			pendingPlans === 0
		) {
			addPlannedPinMutation.mutate({
				latitude: e.lngLat.lat,
				longitude: e.lngLat.lng,
				campaignId: campaign._id,
				color: pinColor,
			});
		}
	}

	function onDragStart(e: MapLayerMouseEvent | MapLayerTouchEvent) {
		const feature = featureAt(e);
		if (
			feature?.layer?.id !== pinsPlannedLayer.id ||
			updatePositionMutation.isPending
		)
			return;
		e.preventDefault();
		if (e.originalEvent.cancelable) e.originalEvent.preventDefault();

		const coords = (feature.geometry as GeoJSON.Point).coordinates;
		wasDraggedRef.current = false;
		dragStartPointRef.current = e.point;
		setDraggingPin({
			id: feature.properties?.id as string,
			longitude: coords[0],
			latitude: coords[1],
		});
		e.target.dragPan.disable();
		setHoverCursor(null);
	}

	function onDragMove(e: MapLayerMouseEvent | MapLayerTouchEvent) {
		if (!draggingPin) return;
		if (
			!wasDraggedRef.current &&
			!movedPastThreshold(dragStartPointRef.current, e.point)
		)
			return;
		wasDraggedRef.current = true;
		setDraggingPin({
			...draggingPin,
			latitude: e.lngLat.lat,
			longitude: e.lngLat.lng,
		});
	}

	function onDragEnd(e: MapLayerMouseEvent | MapLayerTouchEvent) {
		if (!draggingPin) return;
		if (wasDraggedRef.current && e.type !== "touchcancel") {
			updatePositionMutation.mutate({
				id: draggingPin.id as Id<"pins">,
				latitude: e.lngLat.lat,
				longitude: e.lngLat.lng,
			});
		}
		if (!wasDraggedRef.current && e.type === "touchend") {
			setMode({
				mode: "focused-pin",
				focusedPin: { id: draggingPin.id as Id<"pins"> },
			});
		}
		// Touch start prevents the compatibility click, so no click will clear this.
		if (e.type === "touchend" || e.type === "touchcancel") {
			wasDraggedRef.current = false;
		}
		dragStartPointRef.current = null;
		setDraggingPin(null);
		e.target.dragPan.enable();
		setHoverCursor(null);
	}

	function onMouseEnter(e: MapLayerMouseEvent) {
		if (draggingPin) return;
		const feature = e.features?.[0];
		if (interactiveLayerIds.some((layerId) => layerId === feature?.layer.id)) {
			setHoverCursor({
				mode,
				cursor: feature?.layer?.id === pinsPlannedLayer.id ? "grab" : "pointer",
			});
		}
	}

	function onMouseLeave() {
		if (draggingPin) return;
		setHoverCursor(null);
	}

	const hasLocation = hasFreshLocation(geolocation);
	const initialCenter = {
		longitude: campaign.longitude,
		latitude: campaign.latitude,
	};

	return (
		<MapProvider>
			<MapSheetLayout>
				<MapViewport>
					<MapLibre
						initialViewState={{
							...initialCenter,
							zoom: 16,
						}}
						// dragRotate={false}
						pitchWithRotate={false}
						keyboard={true}
						clickTolerance={DRAG_THRESHOLD_PX}
						style={{ width: "100%", height: "100%" }}
						mapStyle={getMapStyleUrl(mapStyle, env.VITE_MAPTILER_KEY)}
						interactiveLayerIds={interactiveLayerIds as unknown as string[]}
						cursor={cursor}
						onClick={onMapClick}
						onMouseDown={onDragStart}
						onMouseMove={onDragMove}
						onMouseUp={onDragEnd}
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
						onTouchStart={onDragStart}
						onTouchMove={onDragMove}
						onTouchEnd={onDragEnd}
						onTouchCancel={onDragEnd}
					>
						<AccuracyCricle geolocation={geolocation} />
						{hasLocation &&
							geolocation.latitude != null &&
							geolocation.longitude != null && (
								<Marker
									longitude={geolocation.longitude}
									latitude={geolocation.latitude}
									anchor="bottom"
								>
									<div className="size-5 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
								</Marker>
							)}
						<PinsLayer draggingPin={draggingPin} />
					</MapLibre>
				</MapViewport>
				{/* The map chrome sits outside the viewport: the viewport is pinned
				    while a panel slides, and these have to follow the shrinking map
				    area frame by frame instead. */}
				<MapControls geolocation={geolocation} />
				<PinControl canSetPins={hasLocation} geolocation={geolocation} />
				<div className="absolute top-4 left-4 flex gap-2">
					<div className="flex items-center gap-2 p-1 bg-background rounded-md shadow-md">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									className="p-5"
									variant="ghost"
									size="icon-lg"
									aria-label="Zurück zu den Kampagnen"
									onClick={() => navigate({ to: "/" })}
								>
									<ArrowLeft />
								</Button>
							</TooltipTrigger>
							<TooltipContent className="px-2 py-1 text-xs" side="bottom">
								Zurück
							</TooltipContent>
						</Tooltip>
					</div>
					<div className="flex items-center gap-2 py-1 px-1 pe-4 bg-background rounded-md shadow-md">
						<MenuSheet campaign={campaign} />

						<h1 className="font-semibold">{campaign.name}</h1>
					</div>
				</div>
				<PinDetailsSheet />
			</MapSheetLayout>
		</MapProvider>
	);
}
