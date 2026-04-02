import {
	ClientOnly,
	createFileRoute,
	useNavigate,
} from "@tanstack/react-router";
import { useGeolocation } from "@uidotdev/usehooks";
import "maplibre-gl/dist/maplibre-gl.css";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import MapLibre, {
	type LngLatLike,
	type MapLayerMouseEvent,
	type MapLayerTouchEvent,
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
import { campaignsQueries } from "@/queries/campaigns";
import {
	pinQueries,
	useAddPlannedPinMutation,
	useUpdatePinPositionMutation,
} from "@/queries/pins";
import { useAppStore } from "@/store/app-store";
import AccuracyCricle from "./-components/map-accuracy-cricle";
import MapControls from "./-components/map-control";
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

export const Route = createFileRoute("/campaigns/$campaignId/")({
	component: RouteComponent,
	loader: async ({ params, context: { queryClient } }) => {
		const campaignId = params.campaignId as Id<"campaigns">;
		await Promise.all([
			queryClient.ensureQueryData(campaignsQueries.getById(campaignId)),
			queryClient.ensureQueryData(pinQueries.list(campaignId)),
		]);
	},
});

function RouteComponent() {
	return (
		<ClientOnly>
			<MapComponent />
		</ClientOnly>
	);
}

type DraggingPin = { id: string; latitude: number; longitude: number };

function MapComponent() {
	const navigate = useNavigate();
	const campaignId = Route.useParams().campaignId as Id<"campaigns">;

	const campaign = useSuspenseQuery(campaignsQueries.getById(campaignId));

	const [cursor, setCursor] = useState<string>("grab");
	const [draggingPin, setDraggingPin] = useState<DraggingPin | null>(null);
	const wasDraggedRef = useRef(false);

	const { mode, setMode } = useAppStore(
		useShallow((state) => ({
			mode: state.mode,
			setMode: state.setMode,
		})),
	);
	const addPlannedPinMutation = useAddPlannedPinMutation();
	const updatePositionMutation = useUpdatePinPositionMutation();

	useEffect(() => {
		setCursor(mode.mode === "planning" ? "crosshair" : "grab");
	}, [mode.mode]);

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
			const hangAtRaw = feature.properties?.hangAt;
			setMode({
				mode: "focused-pin",
				focusedPin: {
					id: feature.properties?.id as string,
					hangAt: hangAtRaw != null ? new Date(hangAtRaw as number) : null,
					tookDownAt:
						feature.properties?.tookDownAt != null
							? new Date(feature.properties.tookDownAt as number)
							: null,
				},
			});

			const bottomPadding = map.getContainer().clientHeight / 4;
			map.flyTo({
				center: (feature.geometry as GeoJSON.Point).coordinates as LngLatLike,
				zoom: map.getZoom() < 18 ? 18 : map.getZoom(),
				padding: { top: 0, bottom: bottomPadding, left: 0, right: 0 },
			});
			return;
		}

		if (mode.mode === "planning") {
			addPlannedPinMutation.mutate({
				latitude: e.lngLat.lat,
				longitude: e.lngLat.lng,
				campaignId: campaignId,
			});
		}
	}

	function onMouseDown(e: MapLayerMouseEvent) {
		const feature = e.features?.[0];
		if (feature?.layer?.id !== pinsPlannedLayer.id) return;

		const coords = (feature.geometry as GeoJSON.Point).coordinates;
		wasDraggedRef.current = false;
		setDraggingPin({
			id: feature.properties?.id as string,
			longitude: coords[0],
			latitude: coords[1],
		});
		e.target.dragPan.disable();
		setCursor("grabbing");
	}

	function onMouseMove(e: MapLayerMouseEvent) {
		if (!draggingPin) return;
		wasDraggedRef.current = true;
		setDraggingPin({
			...draggingPin,
			latitude: e.lngLat.lat,
			longitude: e.lngLat.lng,
		});
	}

	function onMouseUp(e: MapLayerMouseEvent) {
		if (!draggingPin) return;
		if (wasDraggedRef.current) {
			updatePositionMutation.mutate({
				id: draggingPin.id as Id<"pins">,
				latitude: e.lngLat.lat,
				longitude: e.lngLat.lng,
			});
		}
		setDraggingPin(null);
		e.target.dragPan.enable();
		setCursor(mode.mode === "planning" ? "crosshair" : "grab");
	}

	function onTouchStart(e: MapLayerTouchEvent) {
		const feature = e.features?.[0];
		if (feature?.layer?.id !== pinsPlannedLayer.id) return;

		const coords = (feature.geometry as GeoJSON.Point).coordinates;
		wasDraggedRef.current = false;
		setDraggingPin({
			id: feature.properties?.id as string,
			longitude: coords[0],
			latitude: coords[1],
		});
		e.target.dragPan.disable();
	}

	function onTouchMove(e: MapLayerTouchEvent) {
		if (!draggingPin) return;
		wasDraggedRef.current = true;
		setDraggingPin({
			...draggingPin,
			latitude: e.lngLat.lat,
			longitude: e.lngLat.lng,
		});
	}

	function onTouchEnd(e: MapLayerTouchEvent) {
		if (!draggingPin) return;
		if (wasDraggedRef.current) {
			updatePositionMutation.mutate({
				id: draggingPin.id as Id<"pins">,
				latitude: draggingPin.latitude,
				longitude: draggingPin.longitude,
			});
		}
		setDraggingPin(null);
		e.target.dragPan.enable();
	}

	function onMouseEnter(e: MapLayerMouseEvent) {
		if (draggingPin) return;
		const feature = e.features?.[0];
		if (interactiveLayerIds.some((layerId) => layerId === feature?.layer.id)) {
			setCursor(
				feature?.layer?.id === pinsPlannedLayer.id ? "grab" : "pointer",
			);
		}
	}

	function onMouseLeave() {
		if (draggingPin) return;
		setCursor(mode.mode === "planning" ? "crosshair" : "grab");
	}

	const geolocation = useGeolocation({
		enableHighAccuracy: true,
		maximumAge: 10000,
		timeout: 5000,
	});

	if (campaign.isLoading || campaign.data == null) {
		return (
			<div className="h-screen w-screen">
				<p>Loading</p>
			</div>
		);
	}

	if (geolocation.loading) {
		return (
			<div className="h-screen w-screen">
				<p>loading... (you may need to enable permissions)</p>
			</div>
		);
	}

	if (geolocation.error) {
		return (
			<div className="h-screen w-screen">
				<p>Enable permissions to access your location data</p>
			</div>
		);
	}

	if (geolocation.longitude == null || geolocation.latitude == null) {
		return (
			<div className="h-screen w-screen">
				<p>Could not find your location</p>
			</div>
		);
	}

	return (
		<div className="h-dvh w-screen relative">
			<div className="absolute inset-0">
				<MapLibre
					initialViewState={{
						longitude: geolocation.longitude,
						latitude: geolocation.latitude,
						zoom: 16,
					}}
					// dragRotate={false}
					pitchWithRotate={false}
					keyboard={false}
					style={{ width: "100%", height: "100%" }}
					mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${env.VITE_MAPTILER_KEY}`}
					interactiveLayerIds={interactiveLayerIds as unknown as string[]}
					cursor={cursor}
					onClick={onMapClick}
					onMouseDown={onMouseDown}
					onMouseMove={onMouseMove}
					onMouseUp={onMouseUp}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
					onTouchStart={onTouchStart}
					onTouchMove={onTouchMove}
					onTouchEnd={onTouchEnd}
				>
					<AccuracyCricle geolocation={geolocation} />
					<Marker
						longitude={geolocation.longitude}
						latitude={geolocation.latitude}
						anchor="bottom"
					>
						<div className="size-5 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
					</Marker>
					<PinsLayer draggingPin={draggingPin} />
					<MapControls geolocation={geolocation} />
					<PinControl geolocation={geolocation} />
					<MenuSheet campaign={campaign.data} />
				</MapLibre>
			</div>
			<div className="absolute top-2 left-2 flex items-center gap-2 p-1 pr-4 bg-background rounded-md shadow-md">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="p-5"
							variant="ghost"
							size="icon-lg"
							onClick={() => navigate({ to: "/" })}
						>
							<ArrowLeft />
						</Button>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="bottom">
						Zurück
					</TooltipContent>
				</Tooltip>

				<h1 className="text font-semibold">{campaign.data?.name}</h1>
			</div>
			<PinDetailsSheet />
		</div>
	);
}
