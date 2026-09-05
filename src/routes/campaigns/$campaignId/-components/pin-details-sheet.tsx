import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import type { Id } from "convex/_generated/dataModel";
import type { Pin } from "convex/schema";
import { useId, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { AddPin, RemovePin } from "@/icons";
import {
	pinQueries,
	useHangAgainPinMutation,
	useRemovePinMutation,
	useTakeDownPinMutation,
	useUpdatePinColorMutation,
	useUpdatePinPositionMutation,
} from "@/queries/pins";
import { useAppStore } from "@/store/app-store";
import { getPinStatus, normalizePinColor } from "../../../../../shared/pins";
import PinColorPopover from "./pin-color-popover";

export default function PinDetailsSheet() {
	const { campaignId } = useParams({ from: "/campaigns/$campaignId/" });
	const { data: pins } = useQuery(
		pinQueries.list(campaignId as Id<"campaigns">),
	);
	const takeDown = useTakeDownPinMutation();
	const hangAgain = useHangAgainPinMutation();
	const remove = useRemovePinMutation();
	const updateColor = useUpdatePinColorMutation();
	const { mode, setMode } = useAppStore(
		useShallow((state) => ({ mode: state.mode, setMode: state.setMode })),
	);
	const pin =
		mode.mode === "focused-pin"
			? pins?.find((p) => p._id === mode.focusedPin.id)
			: undefined;
	const busy =
		takeDown.isPending ||
		hangAgain.isPending ||
		remove.isPending ||
		updateColor.isPending;
	const status = pin ? getPinStatus(pin) : null;

	function close() {
		setMode({ mode: "none" });
	}
	function closeIfStillSelected(id: Id<"pins">) {
		const current = useAppStore.getState().mode;
		if (current.mode === "focused-pin" && current.focusedPin.id === id) close();
	}
	const eventTime = pin?.tookDownAt ?? pin?.hangAt;
	const description = !pin
		? busy
			? "Wird gespeichert…"
			: "Dieses Plakat ist nicht mehr verfügbar."
		: status === "planned"
			? "Noch nicht aufgehängt (geplant)"
			: `${status === "tookDown" ? "Abgehangen" : "Gehangen"} am ${new Date(eventTime ?? 0).toLocaleString(navigator.language, { dateStyle: "short", timeStyle: "short" })}`;

	return (
		<Sheet
			open={mode.mode === "focused-pin"}
			onOpenChange={(open) => {
				if (!open) close();
			}}
			modal={false}
		>
			<SheetContent
				side="bottom"
				className="rounded-t-md w-full max-w-160 left-1/2 -translate-x-1/2 max-h-[80dvh] overflow-y-auto"
			>
				<SheetHeader>
					<SheetTitle>Plakat</SheetTitle>
					<SheetDescription>{description}</SheetDescription>
				</SheetHeader>
				{pin && (
					<>
						<div
							className="flex flex-wrap items-center gap-2 p-4"
							aria-busy={busy}
						>
							{status === "hung" ? (
								<Button
									variant="destructive"
									disabled={busy}
									onClick={() =>
										takeDown.mutate(
											{ id: pin._id },
											{ onSuccess: () => closeIfStillSelected(pin._id) },
										)
									}
								>
									<RemovePin /> Plakat abhängen
								</Button>
							) : (
								<Button
									disabled={busy}
									onClick={() =>
										hangAgain.mutate(
											{ id: pin._id },
											{ onSuccess: () => closeIfStillSelected(pin._id) },
										)
									}
								>
									<AddPin />{" "}
									{status === "planned"
										? "Jetzt aufhängen"
										: "Plakat wieder aufhängen"}
								</Button>
							)}
							{status === "planned" && (
								<Button
									variant="destructive"
									disabled={busy}
									onClick={() =>
										remove.mutate(pin._id, {
											onSuccess: () => closeIfStillSelected(pin._id),
										})
									}
								>
									<RemovePin /> Löschen
								</Button>
							)}
							<PinColorPopover
								selectedColor={normalizePinColor(pin.color)}
								disabled={busy}
								onSelectColor={(color) =>
									updateColor.mutate({ id: pin._id, color })
								}
								wheelClassName="size-5"
							/>
						</div>
						{status === "planned" && (
							<PositionForm key={pin._id} pin={pin} disabled={busy} />
						)}
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

function PositionForm({ pin, disabled }: { pin: Pin; disabled: boolean }) {
	const update = useUpdatePinPositionMutation();
	const id = useId();
	// Only edited fields override live coordinates until the save succeeds.
	const [draft, setDraft] = useState<{
		latitude?: string;
		longitude?: string;
	}>({});
	return (
		<form
			className="px-4 pb-4"
			onSubmit={(event) => {
				event.preventDefault();
				const data = new FormData(event.currentTarget);
				update.mutate(
					{
						id: pin._id,
						latitude: Number(data.get("latitude")),
						longitude: Number(data.get("longitude")),
					},
					{ onSuccess: () => setDraft({}) },
				);
			}}
		>
			<fieldset disabled={disabled || update.isPending} className="grid gap-3">
				<legend className="mb-2 text-sm font-medium">Position ändern</legend>
				<div className="grid grid-cols-2 gap-3">
					<div className="grid gap-2">
						<Label htmlFor={`${id}-lat`}>Breitengrad</Label>
						<Input
							id={`${id}-lat`}
							name="latitude"
							type="number"
							min={-90}
							max={90}
							step="any"
							required
							value={draft.latitude ?? String(pin.latitude)}
							onChange={(event) =>
								setDraft({ ...draft, latitude: event.target.value })
							}
						/>
					</div>
					<div className="grid gap-2">
						<Label htmlFor={`${id}-lng`}>Längengrad</Label>
						<Input
							id={`${id}-lng`}
							name="longitude"
							type="number"
							min={-180}
							max={180}
							step="any"
							required
							value={draft.longitude ?? String(pin.longitude)}
							onChange={(event) =>
								setDraft({ ...draft, longitude: event.target.value })
							}
						/>
					</div>
				</div>
				<Button type="submit" variant="outline">
					{update.isPending ? "Speichere…" : "Position speichern"}
				</Button>
			</fieldset>
		</form>
	);
}
