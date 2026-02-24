import type { GeolocationState } from "@uidotdev/usehooks";
import { LocateFixed, Radius, ZoomIn, ZoomOut } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
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
