import { LocateFixed, Navigation2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GeolocationState } from "@/lib/use-geolocation";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { useMap } from "react-map-gl/maplibre";
import PinSettingsPopup from "./pin-settings";

export default function MapControls({
	geolocation,
}: {
	geolocation: GeolocationState;
}) {
	const { current: map } = useMap();
	const [bearing, setBearing] = useState(0);
	const [followMode, setFollowMode] = useState(false);
	const hasCenteredRef = useRef(false);

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;

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
	followModeRef.current = followMode;

	useEffect(() => {
		if (!map || latitude == null || longitude == null) return;

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
	}, [map, latitude, longitude]);

	function handleLocationButtonClick() {
		if (latitude == null || longitude == null) return;

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
		<div className="absolute bottom-10 right-4 grid gap-2">
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
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="p-5"
							variant="ghost"
							size="icon-lg"
							onClick={() =>
								map?.easeTo({
									bearing: 0,
									animate: true,
								})
							}
						>
							<Navigation2
								className="size-5 transition-transform"
								style={{ transform: `rotate(${-bearing}deg)` }}
							/>
							<span className="sr-only">Kompass nach Norden</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="left">
						Nach Norden ausrichten
					</TooltipContent>
				</Tooltip>
				{longitude != null && latitude != null && (
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
