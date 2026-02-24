/** biome-ignore-all lint/correctness/useUniqueElementIds: <explanation> */
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import * as turf from "@turf/turf";
import {
	type GeolocationState,
	useGeolocation,
	useMediaQuery,
} from "@uidotdev/usehooks";
import {
	Focus,
	LocateFixed,
	MapPinMinusInside,
	MapPinPlusInside,
	Menu,
	Radius,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useQuery } from "@tanstack/react-query";
import type { Id } from "convex/_generated/dataModel";
import { useMemo, useState } from "react";
import MapLibre, {
	type GeoJSONSourceSpecification,
	Layer,
	type LayerProps,
	type LngLatLike,
	type MapLayerMouseEvent,
	Marker,
	Source,
	useMap,
} from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { VirtualizedScrollArea } from "@/components/VirtualizedScrollArea";
import { env } from "@/env";
import { pinQueries, useAddPinMutation, useRemovePinMutation } from "@/queries";

export const Route = createFileRoute("/map/")({
	component: RouteComponent,
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(pinQueries.list());
	},
});

const pinSourceId = "pins-source";

const pinsClusterLayer = {
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

const pinsUnclusteredPointLayer = {
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

type FocusedPin = {
	id: string;
	creationTime: Date;
};

function MapComponent() {
	const [disableAccuracyCircle, setDisableAccuracyCircle] = useState(true);
	const [cursor, setCursor] = useState<string>("grab");
	const [focusedPin, setFocusedPin] = useState<FocusedPin | undefined>(
		undefined,
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
			setFocusedPin({
				id: feature.properties?.id as string,
				creationTime: new Date(feature.properties?.creationTime as string),
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
					<PosterPins />
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
			<PinDetailsSheet
				focusedPin={focusedPin}
				onClose={() => setFocusedPin(undefined)}
			/>
		</div>
	);
}

function PinControl({ geolocation }: { geolocation: GeolocationState }) {
	const mutation = useAddPinMutation();

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;

	if (longitude == null || latitude == null) {
		return null;
	}

	return (
		<div className="flex gap-2 w-full absolute inset-x-0 bottom-10 justify-center">
			<Button
				className="shadow-md"
				onClick={() => {
					mutation.mutate({
						latitude: latitude,
						longitude: longitude,
					});
				}}
			>
				<MapPinPlusInside /> Plakt hängen
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

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;

	return (
		<div className="absolute top-2 right-2 grid gap-2 bg-background p-2 rounded-md shadow-md">
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="p-2 cursor-pointer"
						variant="ghost"
						size="icon"
						onClick={() => map?.zoomIn({ animate: true })}
					>
						<ZoomIn className="size-5" />
						<span className="sr-only">Hineinzoom</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs" side="left">
					Hineinzoom
				</TooltipContent>
			</Tooltip>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="p-2 cursor-pointer"
						variant="ghost"
						size="icon"
						onClick={() => map?.zoomOut({ animate: true })}
					>
						<ZoomOut className="size-5" />
						<span className="sr-only">Herauszoom</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs" side="left">
					Hineinzoom
				</TooltipContent>
			</Tooltip>
			{longitude != null && latitude != null && (
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="p-2 cursor-pointer"
							variant="ghost"
							size="icon"
							onClick={() =>
								map?.flyTo({
									center: {
										lng: longitude,
										lat: latitude,
									},
									animate: true,
								})
							}
						>
							<LocateFixed className="size-5" />
							<span className="sr-only">Zentriere Karte</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="left">
						Zentriere Karte
					</TooltipContent>
				</Tooltip>
			)}

			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="p-2 cursor-pointer"
						variant="ghost"
						size="icon"
						onClick={toggleaAcuracyCircle}
					>
						<Radius className="size-5" />
						<span className="sr-only">Toogle Genauigkeitskreis</span>
					</Button>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs" side="left">
					Toogle Genauigkeitskreis
				</TooltipContent>
			</Tooltip>
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

function PinDetailsSheet({
	focusedPin,
	onClose,
}: {
	focusedPin: FocusedPin | undefined;
	onClose: () => void;
}) {
	const removePinMutation = useRemovePinMutation();

	return (
		<Sheet
			open={focusedPin != null}
			onOpenChange={(e) => (e ? null : onClose())}
			modal={false}
		>
			<SheetContent
				showCloseButton={true}
				side="bottom"
				// onInteractOutside={(e) => e.preventDefault()}
				className="rounded-t-md w-full max-w-160 left-1/2 -translate-x-1/2"
			>
				<SheetHeader>
					<SheetTitle>Plakat</SheetTitle>
					<SheetDescription>
						Gehangen am {focusedPin?.creationTime.toLocaleString()}
					</SheetDescription>
				</SheetHeader>
				<div className="p-4">
					{focusedPin != null && (
						<Button
							variant="destructive"
							onClick={() => {
								removePinMutation.mutate({ id: focusedPin.id as Id<"pins"> });
								onClose();
							}}
						>
							<MapPinMinusInside /> Plakat abhängen
						</Button>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}

function MenuSheet() {
	const { current: map } = useMap();

	const list = useQuery(pinQueries.list());
	const removePinMutation = useRemovePinMutation();
	const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

	function flyToPin(pin: { latitude: number; longitude: number }) {
		if (!map) return;
		const padding = isSmallDevice
			? {
					top: 0,
					bottom: map.getContainer().clientHeight / 2,
					left: 0,
					right: 0,
				}
			: {
					top: 0,
					bottom: 0,
					left: 384, // width of the SheetContent w-96
					right: 0,
				};

		map.flyTo({
			center: { lat: pin.latitude, lng: pin.longitude },
			zoom: map.getZoom() < 18 ? 18 : map.getZoom(),
			padding: padding,
		});
	}

	if (!list.data) return null;

	return (
		<div className="absolute top-2 left-2">
			<Sheet modal={false}>
				<Tooltip>
					<TooltipTrigger asChild>
						<SheetTrigger asChild>
							<Button
								className="cursor-pointer"
								variant="outline"
								size="icon-lg"
							>
								<Menu className="size-5" />
								<span className="sr-only">Menü</span>
							</Button>
						</SheetTrigger>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="right">
						Menü
					</TooltipContent>
				</Tooltip>

				<SheetContent
					showCloseButton={true}
					side={isSmallDevice ? "bottom" : "left"}
					// onInteractOutside={(e) => e.preventDefault()}
					className="grid grid-rows-[auto_auto_1fr] gap-2 rounded-t-md overflow-hidden w-96 h-1/2 md:h-dvh"
				>
					<SheetHeader>
						<SheetTitle>Kampagne</SheetTitle>
						<SheetDescription>Details zur Kampagne</SheetDescription>
					</SheetHeader>
					<div className="px-4 text-muted-foreground line-clamp-2 text-end text-sm leading-normal font-normal">
						Insgesamt {list.data.length} Plakate
					</div>
					<VirtualizedScrollArea
						className="px-4"
						items={list.data}
						estimateSize={() => 57}
						listHeight="100%"
						renderItem={(item) => (
							<div className="grid grid-cols-[1fr_auto] gap-4 p-2 rounded-md">
								<div>
									<p className="line-clamp-1 text-sm leading-snug font-medium underline-offset-4">
										Plakat
									</p>
									<p className="text-muted-foreground line-clamp-2 text-left text-sm leading-normal font-normal">
										Gehangen am{" "}
										{new Date(item?._creationTime ?? "").toLocaleString()}
									</p>
								</div>
								<div className="inline-flex w-fit -space-x-px rounded-md rtl:space-x-reverse">
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												className="rounded-none rounded-l-md shadow-none focus-visible:z-10"
												variant="outline"
												onClick={() =>
													flyToPin({
														latitude: item.latitude,
														longitude: item.longitude,
													})
												}
											>
												<Focus />
												<span className="sr-only">Focus</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent className="px-2 py-1 text-xs">
											Fokusiere Plakat
										</TooltipContent>
									</Tooltip>
									<Tooltip>
										<TooltipTrigger asChild>
											<Button
												className="rounded-none rounded-r-md shadow-none focus-visible:z-10"
												variant="outline"
												onClick={() =>
													removePinMutation.mutate({
														id: item._id as Id<"pins">,
													})
												}
											>
												<MapPinMinusInside />
												<span className="sr-only">Hänge Plakat ab</span>
											</Button>
										</TooltipTrigger>
										<TooltipContent className="px-2 py-1 text-xs">
											Hänge Plakat ab
										</TooltipContent>
									</Tooltip>
								</div>
							</div>
						)}
					/>
				</SheetContent>
			</Sheet>
		</div>
	);
}
