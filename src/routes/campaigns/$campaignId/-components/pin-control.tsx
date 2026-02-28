import { useParams } from "@tanstack/react-router";
import type { GeolocationState } from "@uidotdev/usehooks";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { AddPin } from "@/icons";
import { useAddPinMutation } from "@/queries/pins";

export default function PinControl({
	geolocation,
}: {
	geolocation: GeolocationState;
}) {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/" });
	const mutation = useAddPinMutation();

	const longitude = geolocation.longitude;
	const latitude = geolocation.latitude;

	if (longitude == null || latitude == null) {
		return null;
	}

	return (
		<div className="flex gap-2 absolute left-1/2 -translate-x-1/2 bottom-10 justify-center">
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
		</div>
	);
}
