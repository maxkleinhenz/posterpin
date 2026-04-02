import { useParams } from "@tanstack/react-router";
import type { GeolocationState } from "@uidotdev/usehooks";
import type { Id } from "convex/_generated/dataModel";
import { MapIcon } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { AddPin } from "@/icons";
import { useAddPinMutation } from "@/queries/pins";
import { useAppStore } from "@/store/app-store";

export default function PinControl({
	geolocation,
}: {
	geolocation: GeolocationState;
}) {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/" });
	const mutation = useAddPinMutation();
	const { mode, setMode } = useAppStore(
		useShallow((state) => ({ mode: state.mode, setMode: state.setMode })),
	);

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;

	const isPlanning = mode.mode === "planning";

	if (isPlanning) {
		return (
			<div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
				<div className="bg-blue-600 text-white text-sm px-4 py-2 rounded-full shadow-md">
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
			{longitude != null && latitude != null && (
				<Button
					className="shadow-md p-6"
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
			)}
			<Button
				className="shadow-md p-6"
				size="lg"
				variant="outline"
				onClick={() => setMode({ mode: "planning" })}
			>
				<MapIcon className="size-5" /> Planen
			</Button>
		</div>
	);
}
