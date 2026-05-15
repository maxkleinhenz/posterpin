import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Id } from "convex/_generated/dataModel";
import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { PinColor } from "@/colors";
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
	useRemovePinMutation,
	useTakeDownPinMutation,
	useUpdatePinColorMutation,
} from "@/queries/pins";
import { useAppStore } from "@/store/app-store";
import PinColorPopover from "./pin-color-popover";

export default function PinDetailsSheet() {
	const takePinDownMutation = useTakeDownPinMutation();
	const hangAgainPinMutation = useHangAgainPinMutation();
	const removePinMutation = useRemovePinMutation();
	const updatePinColorMutation = useUpdatePinColorMutation();

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

	function updateFocusedPinColor(color: PinColor) {
		if (focusedPin == null) return;

		updatePinColorMutation.mutate({
			id: focusedPin.id as Id<"pins">,
			color,
		});

		setMode({
			mode: "focused-pin",
			focusedPin: {
				...focusedPin,
				Color: color,
			},
		});
	}

	const focusedPin = mode.mode === "focused-pin" ? mode.focusedPin : null;

	return (
		<Sheet open={open} onOpenChange={(e) => (e ? null : close())} modal={false}>
			<SheetContent
				showCloseButton={true}
				side="bottom"
				className="rounded-t-md w-full max-w-160 left-1/2 -translate-x-1/2"
			>
				<SheetHeader>
					<SheetTitle>Plakat</SheetTitle>
					<SheetDescription>
						{focusedPin?.hangAt == null
							? "Noch nicht aufgehangen (geplant)"
							: focusedPin.tookDownAt != null
								? `Abgehangen am ${focusedPin.tookDownAt.toLocaleString(
										navigator.language,
										{
											dateStyle: "short",
											timeStyle: "short",
										},
									)}`
								: `Gehangen am ${focusedPin.hangAt.toLocaleString(
										navigator.language,
										{
											dateStyle: "short",
											timeStyle: "short",
										},
									)}`}
					</SheetDescription>
				</SheetHeader>
				<div className="flex items-center gap-2 p-4">
					{focusedPin == null ? null : focusedPin.hangAt == null ? (
						<>
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
								<AddPin /> Jetzt aufhängen
							</Button>
							<Button
								variant="destructive"
								onClick={() => {
									removePinMutation.mutate(focusedPin.id as Id<"pins">);
									close();
								}}
							>
								<RemovePin /> Löschen
							</Button>
						</>
					) : focusedPin.tookDownAt == null ? (
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
					{focusedPin?.Color != null && (
						<PinColorPopover
							selectedColor={focusedPin?.Color}
							onSelectColor={updateFocusedPinColor}
							wheelClassName="size-5"
						/>
					)}
				</div>
			</SheetContent>
		</Sheet>
	);
}
