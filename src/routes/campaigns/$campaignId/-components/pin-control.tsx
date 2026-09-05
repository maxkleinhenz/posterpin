import { useIsMutating } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import { LocateOff } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { colors } from "@/colors";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { AddPin } from "@/icons";
import { type GeolocationState, hasFreshLocation } from "@/lib/use-geolocation";
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
	const addPin = useAddPinMutation();
	const pendingPlans = useIsMutating({ mutationKey: ["add-planned-pin"] });
	const { mode, setMode, pinColor, setPinColor, pinFilter } = useAppStore(
		useShallow((state) => ({
			mode: state.mode,
			setMode: state.setMode,
			pinColor: state.pinColor,
			setPinColor: state.setPinColor,
			pinFilter: state.pinFilter,
		})),
	);
	const canPlan = pinFilter.planned && pinFilter.colors[pinColor];

	if (mode.mode === "planning") {
		return (
			<div className="absolute bottom-10 inset-x-0 flex px-16 flex-col items-center gap-2">
				<output className="bg-blue-600 text-white text-center text-sm px-4 py-2 rounded-md shadow-md">
					{!canPlan
						? "Bitte geplante Plakate und eine Farbe in den Einstellungen einblenden."
						: pendingPlans
							? "Plakat wird gespeichert…"
							: "Klicke oder tippe auf die Karte, um ein Plakat zu planen."}
				</output>
				<Button variant="outline" onClick={() => setMode({ mode: "none" })}>
					Beenden
				</Button>
			</div>
		);
	}

	return (
		<div className="flex gap-2 absolute left-1/2 -translate-x-1/2 bottom-10 justify-center">
			{canSetPins && hasFreshLocation(geolocation) ? (
				pinFilter.colors[pinColor] ? (
					<ButtonGroup>
						<Button
							className={`shadow-md p-6 ${colors[pinColor].bg} ${colors[pinColor].text}`}
							size="lg"
							disabled={addPin.isPending}
							onClick={() => {
								if (
									!hasFreshLocation(geolocation) ||
									geolocation.latitude == null ||
									geolocation.longitude == null ||
									addPin.isPending
								)
									return;
								addPin.mutate({
									latitude: geolocation.latitude,
									longitude: geolocation.longitude,
									campaignId: campaignId as Id<"campaigns">,
									color: pinColor,
								});
							}}
						>
							<AddPin className="size-5" />{" "}
							{addPin.isPending ? "Speichere…" : "Plakat hängen"}
						</Button>
						<PinColorPopover
							selectedColor={pinColor}
							onSelectColor={setPinColor}
							disabled={addPin.isPending}
						/>
					</ButtonGroup>
				) : (
					<p className="bg-background text-sm p-2 rounded-full shadow-md">
						Keine Farbe ausgewählt
					</p>
				)
			) : (
				<output className="flex gap-2 items-center bg-background text-sm p-2 rounded-full">
					<LocateOff className="size-5" /> Standort nicht verfügbar
				</output>
			)}
		</div>
	);
}
