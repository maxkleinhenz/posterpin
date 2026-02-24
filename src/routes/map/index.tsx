/** biome-ignore-all lint/correctness/useUniqueElementIds: <explanation> */
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import * as turf from "@turf/turf";
import { type GeolocationState, useGeolocation } from "@uidotdev/usehooks";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { LocateFixed, Pin, Radius, ZoomIn, ZoomOut } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo, useState } from "react";
import MapLibre, {
	type GeoJSONSourceSpecification,
	Layer,
	Marker,
	Source,
	useMap,
} from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
import { env } from "@/env";
import { useAddPinMutation } from "@/queries";

export const Route = createFileRoute("/map/")({
	component: RouteComponent,
});

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

function RouteComponent() {
	return (
		<ClientOnly>
			<MapComponent />
		</ClientOnly>
	);
}

function MapComponent() {
	const [disableAccuracyCircle, setDisableAccuracyCircle] = useState(true);

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
		<div className="h-screen w-screen relative">
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
					interactiveLayerIds={["pins-layer"]}
					onClick={(e) => {
						console.log(e);
						console.log(e.features);
					}}
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
					<PosterPins />
					<MapControls
						geolocation={geolocation}
						toggleaAcuracyCircle={() =>
							setDisableAccuracyCircle((prev) => !prev)
						}
					/>
					<AddPin geolocation={geolocation} />
				</MapLibre>
			</div>
		</div>
	);
}

function AddPin({ geolocation }: { geolocation: GeolocationState }) {
	const mutation = useAddPinMutation();

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;

	if (longitude == null || latitude == null) {
		return null;
	}

	return (
		<div className="w-full absolute inset-x-0 bottom-10 flex justify-center">
			<Button
				onClick={() => {
					mutation.mutate({
						latitude: latitude,
						longitude: longitude,
					});
				}}
			>
				<Pin /> Add Pin
			</Button>
		</div>
	);
}

function MapControls({
	geolocation,
	toggleaAcuracyCircle,
}: {
	geolocation: GeolocationState;
	toggleaAcuracyCircle: () => void;
}) {
	const { current: map } = useMap();

	return (
		<div className="absolute top-4 right-4 flex flex-col gap-2 bg-white rounded-lg p-2 shadow-md">
			<Button
				className="size-12 cursor-pointer"
				variant="ghost"
				size="icon"
				title="Zoom in"
				onClick={() => map?.zoomIn({ animate: true })}
			>
				<ZoomIn className="size-6" />
			</Button>
			<Button
				className="size-12 cursor-pointer"
				variant="ghost"
				size="icon"
				title="Zoom out"
				onClick={() => map?.zoomOut({ animate: true })}
			>
				<ZoomOut className="size-6" />
			</Button>
			{geolocation.longitude != null && geolocation.latitude != null && (
				<Button
					className="size-12 cursor-pointer"
					variant="ghost"
					size="icon"
					title="Center map"
					onClick={() =>
						map?.flyTo({
							// @ts-expect-error
							center: {
								lng: geolocation.longitude,
								lat: geolocation.latitude,
							},
							animate: true,
						})
					}
				>
					<LocateFixed className="size-6" />
				</Button>
			)}

			<Button
				className="size-12 cursor-pointer"
				variant="ghost"
				size="icon"
				title="Toogle accuracy circle"
				onClick={toggleaAcuracyCircle}
			>
				<Radius className="size-6" />
			</Button>
		</div>
	);
}

function AccuracyCricle({
	disable,
	geolocation,
}: {
	disable?: boolean;
	geolocation: GeolocationState;
}) {
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

	if (disable) {
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

function PosterPins() {
	const pins = useQuery(api.pins.list);

	const pinsGeoJSON = useMemo(() => {
		if (!pins) return null;

		return {
			type: "geojson" as const,
			data: {
				type: "FeatureCollection" as const,
				features: pins.map((pin) => ({
					type: "Feature" as const,
					geometry: {
						type: "Point" as const,
						coordinates: [pin.longitude, pin.latitude],
					},
					properties: {
						id: pin._id,
					},
				})),
			},
		} satisfies GeoJSONSourceSpecification;
	}, [pins]);

	if (!pinsGeoJSON) return null;

	return (
		<Source id="pins-source" {...pinsGeoJSON}>
			<Layer
				id="pins-layer"
				type="circle"
				paint={{
					"circle-radius": 8,
					"circle-color": "#fbbf24",
					"circle-stroke-width": 2,
					"circle-stroke-color": "#ffffff",
				}}
			/>
		</Source>
	);
}
