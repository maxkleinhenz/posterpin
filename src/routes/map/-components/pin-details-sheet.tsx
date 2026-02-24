import { MapPinMinusInside } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Id } from "convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { useRemovePinMutation } from "@/queries";

export type FocusedPin = {
	id: string;
	creationTime: Date;
};

export default function PinDetailsSheet({
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
