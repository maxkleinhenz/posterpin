import {
	LocateFixed,
	LocateOff,
	Navigation2,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-map-gl/maplibre";
import { toast } from "sonner";

import "maplibre-gl/dist/maplibre-gl.css";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	type UseGeolocationResult,
	hasFreshLocation,
} from "@/lib/use-geolocation";
import { cn } from "@/lib/utils";

import PinSettingsPopup from "./pin-settings";

export default function MapControls({
	geolocation,
}: {
	geolocation: UseGeolocationResult;
}) {
	const maps = useMap();
	// Rendered next to the map rather than inside it, so there is no current map.
	const map = maps.current ?? maps.default;
	const [bearing, setBearing] = useState(0);
	const [followMode, setFollowMode] = useState(false);
	const hasCenteredRef = useRef(false);

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;
	const hasLocation = hasFreshLocation(geolocation);
	const locationLabel = !geolocation.supported
		? "Standortbestimmung nicht unterstützt"
		: geolocation.loading
			? "Standort wird ermittelt…"
			: "Standort erneut ermitteln";

	useEffect(() => {
		if (!map) {
			return;
		}

		const syncBearing = () => {
			setBearing(map.getBearing());
		};

		const onMoveStart = (e: { originalEvent?: Event }) => {
			if (e.originalEvent) {
				setFollowMode(false);
			}
		};

		syncBearing();
		map.on("rotate", syncBearing);
		map.on("movestart", onMoveStart);

		return () => {
			map.off("rotate", syncBearing);
			map.off("movestart", onMoveStart);
		};
	}, [map]);

	// Auto-center once when geo position first becomes available,
	// then follow position changes when followMode is active.
	const followModeRef = useRef(followMode);
	useEffect(() => {
		followModeRef.current = followMode;
	}, [followMode]);

	useEffect(() => {
		if (!map || latitude == null || longitude == null || !hasLocation) return;

		if (!hasCenteredRef.current) {
			hasCenteredRef.current = true;
			map.flyTo({
				center: { lng: longitude, lat: latitude },
				padding: { top: 0, bottom: 0, left: 0, right: 0 },
				animate: true,
			});
			return;
		}

		if (followModeRef.current) {
			map.easeTo({
				center: { lng: longitude, lat: latitude },
				padding: { top: 0, bottom: 0, left: 0, right: 0 },
				animate: true,
			});
		}
	}, [map, latitude, longitude, hasLocation]);

	function handleLocationError() {
		if (geolocation.error?.code === 1) {
			toast.error("Standortzugriff verweigert.", {
				description:
					"Bitte erlaube den Zugriff auf deinen Standort, um diese Funktion zu nutzen.",
				dismissible: true,
				closeButton: true,
			});
			return true;
		} else if (geolocation.error?.code === 2) {
			toast.error("Standort nicht gefunden.", {
				description:
					"Dein Gerät konnte deinen Standort nicht bestimmen. Bitte versuche es später erneut.",
				dismissible: true,
				closeButton: true,
			});
			return true;
		} else if (geolocation.error?.code === 3) {
			toast.error("Zeitüberschreitung bei Standortbestimmung.", {
				description:
					"Die Standortbestimmung hat zu lange gedauert. Bitte versuche es erneut.",
				dismissible: true,
				closeButton: true,
			});
			return true;
		}

		return false;
	}

	function handleLocationButtonClick() {
		if (
			latitude == null ||
			longitude == null ||
			!hasFreshLocation(geolocation)
		) {
			handleLocationError();
			geolocation.refreshLocation();
			return;
		}

		if (followMode) {
			setFollowMode(false);
		} else {
			setFollowMode(true);
			map?.flyTo({
				center: { lng: longitude, lat: latitude },
				padding: { top: 0, bottom: 0, left: 0, right: 0 },
				animate: true,
			});
		}
	}

	return (
		<div className="absolute bottom-10 right-2 grid gap-2">
			<div
				className={cn(
					"py-2 mx-auto rounded-full transition-all transition-discrete duration-400",
					{
						"opacity-0 delay-500": bearing === 0,
					},
				)}
			>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="rounded-full"
							variant="default"
							size="icon-sm"
							onClick={() =>
								map?.easeTo({
									bearing: 0,
									animate: true,
								})
							}
						>
							<Navigation2
								className="transition-transform"
								style={{ transform: `rotate(${-bearing}deg)` }}
							/>
							<span className="sr-only">Kompass nach Norden</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="left">
						Nach Norden ausrichten
					</TooltipContent>
				</Tooltip>
			</div>

			<div className="grid gap-2 p-1 bg-background rounded-md shadow-md">
				<PinSettingsPopup />
			</div>
			<div className="grid gap-2 p-1 bg-background rounded-md shadow-md">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="p-5"
							variant="ghost"
							size="icon-lg"
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
							className="p-5"
							variant="ghost"
							size="icon-lg"
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
				{!hasLocation ? (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="p-5"
								variant="ghost"
								size="icon-lg"
								onClick={handleLocationButtonClick}
								disabled={geolocation.loading || !geolocation.supported}
							>
								<LocateOff className="size-5" />
								<span className="sr-only">{locationLabel}</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent className="px-2 py-1 text-xs" side="left">
							{locationLabel}
						</TooltipContent>
					</Tooltip>
				) : (
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								className="p-5"
								variant={followMode ? "default" : "ghost"}
								size="icon-lg"
								onClick={handleLocationButtonClick}
							>
								<LocateFixed className="size-5" />
								<span className="sr-only">
									{followMode ? "Folgemodus deaktivieren" : "Zentriere Karte"}
								</span>
							</Button>
						</TooltipTrigger>
						<TooltipContent className="px-2 py-1 text-xs" side="left">
							{followMode ? "Folgemodus deaktivieren" : "Zentriere Karte"}
						</TooltipContent>
					</Tooltip>
				)}
			</div>
		</div>
	);
}
