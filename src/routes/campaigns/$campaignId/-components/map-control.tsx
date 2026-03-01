import type { GeolocationState } from "@uidotdev/usehooks";
import {
	LocateFixed,
	Navigation2,
	Settings,
	ZoomIn,
	ZoomOut,
} from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useState } from "react";
import { useMap } from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";

export default function MapControls({
	geolocation,
	toggleaAcuracyCircle,
}: {
	geolocation: GeolocationState;
	toggleaAcuracyCircle: () => void;
}) {
	const { current: map } = useMap();
	const [bearing, setBearing] = useState(0);

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;

	useEffect(() => {
		if (!map) {
			return;
		}

		const syncBearing = () => {
			setBearing(map.getBearing());
		};

		syncBearing();
		map.on("rotate", syncBearing);

		return () => {
			map.off("rotate", syncBearing);
		};
	}, [map]);

	return (
		<div className="absolute bottom-10 right-2 grid gap-2">
			<div className="grid gap-2 p-1 bg-background rounded-md shadow-md">
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							className="p-5"
							variant="ghost"
							size="icon-lg"
							onClick={toggleaAcuracyCircle}
						>
							<Settings className="size-5" />
							<span className="sr-only">Toogle Genauigkeitskreis</span>
						</Button>
					</TooltipTrigger>
					<TooltipContent className="px-2 py-1 text-xs" side="left">
						Toogle Genauigkeitskreis
					</TooltipContent>
				</Tooltip>
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
								variant="ghost"
								size="icon-lg"
								onClick={() =>
									map?.flyTo({
										center: {
											lng: longitude,
											lat: latitude,
										},
										padding: { top: 0, bottom: 0, left: 0, right: 0 },
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
			</div>
		</div>
	);
}
