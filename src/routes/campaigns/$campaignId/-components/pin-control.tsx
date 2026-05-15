import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { LocateOff } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { colors } from "@/colors";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { AddPin } from "@/icons";
import type { GeolocationState } from "@/lib/use-geolocation";
import { useAddPinMutation } from "@/queries/pins";
import { useAppStore } from "@/store/app-store";
import PinColorPopover from "./pin-color-popover";

export default function PinControl({
	canSetPins,
	geolocation,
}: {
	canSetPins?: boolean;
	geolocation: GeolocationState;
}) {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/" });
	const mutation = useAddPinMutation();
	const { mode, setMode, pinColor } = useAppStore(
		useShallow((state) => ({
			mode: state.mode,
			setMode: state.setMode,
			pinColor: state.pinColor,
		})),
	);

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;
	const isPlanning = mode.mode === "planning";

	if (isPlanning) {
		return (
			<div className="absolute bottom-10 inset-x-0 flex px-8 flex-col items-center gap-2">
				<div className="bg-blue-600 text-white text-pretty text-sm px-6 py-2 rounded-full shadow-md">
					Planungsmodus — Tippe auf die Karte um ein Plakat zu planen
				</div>
				<Button
					className="shadow-md p-6"
					size="lg"
					variant="outline"
					onClick={() => setMode({ mode: "none" })}
				>
					Beenden
				</Button>
			</div>
		);
	}

	return (
		<div className="flex gap-2 absolute left-1/2 -translate-x-1/2 bottom-10 justify-center">
			{canSetPins && longitude != null && latitude != null ? (
				<ButtonGroup>
					<Button
						className={`shadow-md p-6 ${colors[pinColor].bg} ${colors[pinColor].text}`}
						size="lg"
						onClick={() => {
							mutation.mutate({
								latitude: latitude,
								longitude: longitude,
								campaignId: campaignId as Id<"campaigns">,
							});
						}}
					>
						<AddPin className="size-5" /> Plakat hängen
					</Button>
					<PinColorPopover />
				</ButtonGroup>
			) : (
				<div className="flex gap-2 items-center bg-white text-sm p-2 rounded-full">
					<LocateOff className="size-5" /> Standort nicht verfügbar
				</div>
			)}
		</div>
	);
}
