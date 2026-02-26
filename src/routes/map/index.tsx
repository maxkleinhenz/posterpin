import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { useGeolocation } from "@uidotdev/usehooks";
import "maplibre-gl/dist/maplibre-gl.css";
import { useState } from "react";
import MapLibre, {
	type LngLatLike,
	type MapLayerMouseEvent,
	Marker,
} from "react-map-gl/maplibre";
import { useShallow } from "zustand/react/shallow";
import { env } from "@/env";
import { pinQueries } from "@/queries";
import { useAppStore } from "@/store/app-store";
import AccuracyCricle from "./-components/map-accuracy-cricle";
import MapControls from "./-components/map-control";
import MenuSheet from "./-components/menu-sheet";
import PinControl from "./-components/pin-control";
import PinDetailsSheet from "./-components/pin-details-sheet";
import PinsLayer, {
	pinSourceId,
	pinsClusterLayer,
	pinsUnclusteredPointLayer,
} from "./-components/pin-layer";

export const Route = createFileRoute("/map/")({
	component: RouteComponent,
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(pinQueries.list());
	},
});

function RouteComponent() {
	return (
		<ClientOnly>
			<MapComponent />
		</ClientOnly>
	);
}

function MapComponent() {
	const [disableAccuracyCircle, setDisableAccuracyCircle] = useState(true);
	const [cursor, setCursor] = useState<string>("grab");
	const { setMode } = useAppStore(
		useShallow((state) => ({
			setMode: state.setMode,
		})),
	);

	async function onMapClick(e: MapLayerMouseEvent) {
		if (!e.features || e.features.length === 0) {
			return;
		}

		const map = e.target;
		const feature = e.features[0];

		if (feature.layer?.id === pinsClusterLayer.id) {
			const clusterId = feature.properties?.cluster_id as number;
			if (clusterId) {
				const source = map.getSource(pinSourceId) as maplibregl.GeoJSONSource;
				const zoom = await source.getClusterExpansionZoom(clusterId);
				map.easeTo({
					zoom,
					center: (feature.geometry as GeoJSON.Point).coordinates as LngLatLike,
				});
			}
		} else if (feature.layer?.id === pinsUnclusteredPointLayer.id) {
			setMode({
				mode: "focused-pin",
				focusedPin: {
					id: feature.properties?.id as string,
					creationTime: new Date(feature.properties?.creationTime as string),
				},
			});

			const bottomPadding = map.getContainer().clientHeight / 4;
			map.flyTo({
				center: (feature.geometry as GeoJSON.Point).coordinates as LngLatLike,
				zoom: map.getZoom() < 18 ? 18 : map.getZoom(),
				padding: { top: 0, bottom: bottomPadding, left: 0, right: 0 },
			});
		}
	}

	function onMouseEnter(e: MapLayerMouseEvent) {
		const feature = e.features?.[0];
		if (
			feature?.layer.id === pinsClusterLayer.id ||
			feature?.layer.id === pinsUnclusteredPointLayer.id
		) {
			setCursor("pointer");
		}
	}

	function onMouseLeave() {
		setCursor("grab");
	}

	const geolocation = useGeolocation({
		enableHighAccuracy: true,
		maximumAge: 10000,
		timeout: 5000,
	});

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
					dragRotate={false}
					pitchWithRotate={false}
					keyboard={false}
					style={{ width: "100%", height: "100%" }}
					mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${env.VITE_MAPTILER_KEY}`}
					interactiveLayerIds={[
						pinsClusterLayer.id,
						pinsUnclusteredPointLayer.id,
					]}
					cursor={cursor}
					onClick={onMapClick}
					onMouseEnter={onMouseEnter}
					onMouseLeave={onMouseLeave}
				>
					<AccuracyCricle
						disable={disableAccuracyCircle}
						geolocation={geolocation}
					/>
					<Marker
						longitude={geolocation.longitude}
						latitude={geolocation.latitude}
						anchor="bottom"
					>
						<div className="size-5 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
					</Marker>
					<PinsLayer />
					<MapControls
						geolocation={geolocation}
						toggleaAcuracyCircle={() =>
							setDisableAccuracyCircle((prev) => !prev)
						}
					/>
					<PinControl geolocation={geolocation} />
					<MenuSheet />
				</MapLibre>
			</div>
			<PinDetailsSheet />
		</div>
	);
}
