/** biome-ignore-all lint/correctness/useUniqueElementIds: <explanation> */
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import * as turf from "@turf/turf";
import { useGeolocation } from "@uidotdev/usehooks";
import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";
import { Pin, ZoomIn, ZoomOut } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useMemo } from "react";
// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
import Map, {
	type GeoJSONSourceSpecification,
	Layer,
	Marker,
	Source,
	useMap,
} from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";

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
				<Map
					initialViewState={{
						longitude: geolocation.longitude,
						latitude: geolocation.latitude,
						zoom: 16,
					}}
					dragRotate={false}
					pitchWithRotate={false}
					keyboard={false}
					style={{ width: "100%", height: "100%" }}
					mapStyle="https://api.maptiler.com/maps/streets/style.json?key=aRKRc5rxQmYEFyjrGytq"
					interactiveLayerIds={["pins-layer"]}
					onClick={(e) => {
						console.log(e);
						console.log(e.features);
					}}
				>
					<AccuracyCricle geolocation={geolocation} />
					<Marker
						longitude={geolocation.longitude}
						latitude={geolocation.latitude}
						anchor="bottom"
					>
						<div className="size-5 rounded-full bg-blue-600 border-2 border-white shadow-md"></div>
					</Marker>
					<PosterPins />
					<MapControls />
				</Map>
			</div>
			<AddPin />
		</div>
	);
}

function AddPin() {
	return (
		<div className="w-full absolute inset-x-0 bottom-10 flex justify-center">
			<Button
				onClick={() => {
					alert("Add pin");
				}}
			>
				<Pin /> Add Pin
			</Button>
		</div>
	);
}

function MapControls() {
	const { current: map } = useMap();

	return (
		<div className="absolute top-4 right-4 flex flex-col gap-2">
			<Button
				className="rounded-full size-12 cursor-pointer hover:bg-secondary hover:ring-2"
				variant="secondary"
				size="icon"
				onClick={() => map?.zoomIn({ animate: true })}
			>
				<ZoomIn className="size-6" />
			</Button>
			<Button
				className="rounded-full size-12 cursor-pointer hover:bg-secondary hover:ring-2"
				variant="secondary"
				size="icon"
				onClick={() => map?.zoomOut({ animate: true })}
			>
				<ZoomOut className="size-6" s />
			</Button>
		</div>
	);
}

function AccuracyCricle({
	geolocation,
}: {
	geolocation: ReturnType<typeof useGeolocation>;
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
					"fill-opacity": 0.2,
				}}
			/>
			<Layer
				id="accuracy-circle-outline"
				type="line"
				paint={{
					"line-color": "#42a5f5",
					"line-width": 3,
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
