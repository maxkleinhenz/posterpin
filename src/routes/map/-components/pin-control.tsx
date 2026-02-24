import type { GeolocationState } from "@uidotdev/usehooks";
import { MapPinPlusInside } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAddPinMutation } from "@/queries";

export default function PinControl({
	geolocation,
}: {
	geolocation: GeolocationState;
}) {
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
