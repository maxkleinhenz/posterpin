import { zodResolver } from "@hookform/resolvers/zod";
import { useThrottledCallback } from "@tanstack/react-pacer";
import { ClientOnly } from "@tanstack/react-router";
import { CalendarIcon, CircleX, Plus } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import MapLibre, { Marker } from "react-map-gl/maplibre";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { env } from "@/env";
import { cn } from "@/lib/utils";
import { useAddCampaignMutation } from "@/queries/campaigns";

const formSchema = z
	.object({
		name: z.string().min(1, "Name muss ausgefüllt sein"),
		description: z.string(),
		startAt: z.coerce.date().optional(),
		endAt: z.coerce.date().optional(),
		longitude: z.number(),
		latitude: z.number(),
	})
	.superRefine(({ startAt, endAt }, ctx) => {
		if (!startAt && endAt) {
			ctx.addIssue({
				code: "custom",
				message:
					"Wenn Enddatum ausgefüllt, dann muss auch das Startdatum ausgefüllt sein",
				path: ["startAt"],
			});
		}

		if (startAt && endAt && startAt > endAt) {
			ctx.addIssue({
				code: "custom",
				message: "Startdatum muss vor Enddatum liegen",
				path: ["startAt"],
			});
		}
	});

type FormValues = z.input<typeof formSchema>;
type SubmitValues = z.output<typeof formSchema>;

const DEFAULT_CENTER = {
	longitude: 13.7266,
	latitude: 51.0299,
};

const dateFormatter = new Intl.DateTimeFormat(
	typeof navigator === "undefined" ? "de-DE" : navigator.language,
	{ dateStyle: "short" },
);

export default function CreateCampaign() {
	const [dialogOpen, setDialogOpen] = useState(false);
	const nameInputId = useId();
	const descriptionInputId = useId();
	const startDateInputId = useId();
	const endDateInputId = useId();

	const addCampaignMutation = useAddCampaignMutation();

	const form = useForm<FormValues, undefined, SubmitValues>({
		// @ts-expect-error zodResolver types are weird
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: "",
			description: "",
			startAt: undefined,
			endAt: undefined,
			longitude: DEFAULT_CENTER.longitude,
			latitude: DEFAULT_CENTER.latitude,
		},
	});
	const watchedName = form.watch("name");
	const watchedLongitude = form.watch("longitude");
	const watchedLatitude = form.watch("latitude");

	function resetForm() {
		form.reset();
	}

	async function onSubmit(data: SubmitValues) {
		const campaignName = data.name.trim();
		if (campaignName.length === 0) {
			return;
		}
		const campaignDescription = data.description.trim();

		await addCampaignMutation.mutateAsync({
			name: campaignName,
			description: campaignDescription === "" ? undefined : campaignDescription,
			longitude: data.longitude,
			latitude: data.latitude,
			startAt: data.startAt?.getTime(),
			endAt: data.endAt?.getTime(),
		});

		setDialogOpen(false);
		resetForm();
	}

	const throttleMapMove = useThrottledCallback(
		(longitude: number, latitude: number) => {
			form.setValue("longitude", longitude, {
				shouldDirty: true,
			});
			form.setValue("latitude", latitude, {
				shouldDirty: true,
			});
		},
		{
			wait: 100,
		},
	);

	return (
		<Dialog
			open={dialogOpen}
			onOpenChange={(open) => {
				setDialogOpen(open);
				if (!open) {
					resetForm();
				}
			}}
		>
			<DialogTrigger asChild>
				<Button>
					<Plus /> Neue Kampagne
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Neue Kampagne</DialogTitle>
					<DialogDescription>
						Lege eine neue Kampagne an. Bewege die Karte, um den
						Standardmittelpunkt zu setzen.
					</DialogDescription>
				</DialogHeader>

				<form
					className="grid gap-4 max-h-[65dvh] overflow-y-auto px-1 sm:max-h-[70dvh]"
					onSubmit={form.handleSubmit(onSubmit)}
				>
					<FieldGroup>
						<Controller
							name="name"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={nameInputId}>Name</FieldLabel>
									<Input
										{...field}
										id={nameInputId}
										aria-invalid={fieldState.invalid}
										autoComplete="off"
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
						<Controller
							name="description"
							control={form.control}
							render={({ field, fieldState }) => (
								<Field data-invalid={fieldState.invalid}>
									<FieldLabel htmlFor={descriptionInputId}>
										Beschreibung (optional)
									</FieldLabel>
									<Input
										{...field}
										id={descriptionInputId}
										aria-invalid={fieldState.invalid}
										autoComplete="off"
									/>
									{fieldState.invalid && (
										<FieldError errors={[fieldState.error]} />
									)}
								</Field>
							)}
						/>
						<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<Controller
								name="startAt"
								control={form.control}
								render={({ field, fieldState }) => {
									const selectedDate =
										field.value instanceof Date ? field.value : undefined;

									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor={startDateInputId}>
												Startdatum (optional)
											</FieldLabel>
											<Popover>
												<div className="flex gap-1">
													<PopoverTrigger asChild className="flex-1">
														<Button
															id={startDateInputId}
															variant="outline"
															className={cn(
																"w-full justify-between font-normal",
																!selectedDate && "text-muted-foreground",
															)}
														>
															{selectedDate
																? dateFormatter.format(selectedDate)
																: "Datum wählen"}
															<CalendarIcon className="size-4 opacity-50" />
														</Button>
													</PopoverTrigger>
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																disabled={!selectedDate}
																onClick={() => field.onChange(undefined)}
															>
																<CircleX className="size-4 opacity-50" />
															</Button>
														</TooltipTrigger>
														<TooltipContent
															className="px-2 py-1 text-xs"
															side="bottom"
														>
															Datum entfernen
														</TooltipContent>
													</Tooltip>
												</div>
												<PopoverContent className="w-auto p-0" align="start">
													<Calendar
														mode="single"
														selected={selectedDate}
														onSelect={(date) => field.onChange(date)}
													/>
												</PopoverContent>
											</Popover>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									);
								}}
							/>

							<Controller
								name="endAt"
								control={form.control}
								render={({ field, fieldState }) => {
									const selectedDate =
										field.value instanceof Date ? field.value : undefined;

									return (
										<Field data-invalid={fieldState.invalid}>
											<FieldLabel htmlFor={endDateInputId}>
												Enddatum (optional)
											</FieldLabel>
											<Popover>
												<div className="flex gap-1">
													<PopoverTrigger asChild className="flex-1">
														<Button
															id={endDateInputId}
															variant="outline"
															className={cn(
																"w-full justify-between font-normal",
																!selectedDate && "text-muted-foreground",
															)}
														>
															{selectedDate
																? dateFormatter.format(selectedDate)
																: "Datum wählen"}
															<CalendarIcon className="size-4 opacity-50" />
														</Button>
													</PopoverTrigger>
													<Tooltip>
														<TooltipTrigger asChild>
															<Button
																variant="ghost"
																disabled={!selectedDate}
																onClick={() => field.onChange(undefined)}
															>
																<CircleX className="size-4 opacity-50" />
															</Button>
														</TooltipTrigger>
														<TooltipContent
															className="px-2 py-1 text-xs"
															side="bottom"
														>
															Datum entfernen
														</TooltipContent>
													</Tooltip>
												</div>
												<PopoverContent className="w-auto p-0" align="start">
													<Calendar
														mode="single"
														selected={selectedDate}
														onSelect={(date) => field.onChange(date)}
													/>
												</PopoverContent>
											</Popover>
											{fieldState.invalid && (
												<FieldError errors={[fieldState.error]} />
											)}
										</Field>
									);
								}}
							/>
						</div>

						<div className="grid gap-2">
							<p className="text-sm font-medium">Standardmittelpunkt</p>
							<div className="relative h-64 w-full overflow-hidden rounded-md border">
								<ClientOnly>
									<MapLibre
										initialViewState={{
											longitude: DEFAULT_CENTER.longitude,
											latitude: DEFAULT_CENTER.latitude,
											zoom: 13,
										}}
										dragRotate={false}
										pitchWithRotate={false}
										keyboard={false}
										style={{ width: "100%", height: "100%" }}
										mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${env.VITE_MAPTILER_KEY}`}
										onMove={(event) =>
											throttleMapMove(
												event.viewState.longitude,
												event.viewState.latitude,
											)
										}
									>
										<Marker
											longitude={watchedLongitude}
											latitude={watchedLatitude}
											anchor="bottom"
										>
											<div className="size-4 rounded-full border-2 border-white bg-blue-600" />
										</Marker>
									</MapLibre>
								</ClientOnly>
								<div className="absolute bottom-0 left-0 bg-background p-2">
									<p className="text-muted-foreground text-xs">
										{watchedLatitude.toFixed(6)}, {watchedLongitude.toFixed(6)}
									</p>
								</div>
							</div>
						</div>
					</FieldGroup>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setDialogOpen(false)}
						>
							Abbrechen
						</Button>
						<Button
							type="submit"
							disabled={
								watchedName.trim().length === 0 || addCampaignMutation.isPending
							}
						>
							{addCampaignMutation.isPending
								? "Erstelle..."
								: "Kampagne erstellen"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
