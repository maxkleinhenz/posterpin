import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Id } from "convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { AddPin, RemovePin } from "@/icons";
import {
	useHangAgainPinMutation,
	useTakeDownPinMutation,
} from "@/queries/pins";
import { useAppStore } from "@/store/app-store";

export default function PinDetailsSheet() {
	const takePinDownMutation = useTakeDownPinMutation();
	const hangAgainPinMutation = useHangAgainPinMutation();

	const [open, setOpen] = useState(false);
	const { mode, setMode } = useAppStore(
		useShallow((state) => ({
			mode: state.mode,
			setMode: state.setMode,
		})),
	);

	useEffect(() => {
		if (mode.mode === "focused-pin") {
			setOpen(true);
		}
	}, [mode]);

	function close() {
		setOpen(false);
		setMode({ mode: "none" });
	}

	const focusedPin = mode.mode === "focused-pin" ? mode.focusedPin : null;

	return (
		<Sheet open={open} onOpenChange={(e) => (e ? null : close())} modal={false}>
			<SheetContent
				showCloseButton={true}
				side="bottom"
				onInteractOutside={(e) => console.log("interact outside", e)}
				className="rounded-t-md w-full max-w-160 left-1/2 -translate-x-1/2"
			>
				<SheetHeader>
					<SheetTitle>Plakat</SheetTitle>
					<SheetDescription>
						{focusedPin?.tookDownAt != null
							? `Abgehangen am ${focusedPin.tookDownAt.toLocaleString()}`
							: `Gehangen am ${focusedPin?.hangAt.toLocaleString()}`}
					</SheetDescription>
				</SheetHeader>
				<div className="p-4">
					{focusedPin == null ? null : focusedPin.tookDownAt == null ? (
						<Button
							variant="destructive"
							onClick={() => {
								takePinDownMutation.mutate({
									id: focusedPin.id as Id<"pins">,
									tookDownAt: Date.now(),
								});
								close();
							}}
						>
							<RemovePin /> Plakat abhängen
						</Button>
					) : (
						<Button
							variant="default"
							onClick={() => {
								hangAgainPinMutation.mutate({
									id: focusedPin.id as Id<"pins">,
									hangAt: Date.now(),
								});
								close();
							}}
						>
							<AddPin /> Plakat wieder aufhängen
						</Button>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
