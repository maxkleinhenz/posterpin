/** biome-ignore-all lint/suspicious/noShadowRestrictedNames: using Map icon component name from lucide-react */

import { useSuspenseQuery } from "@tanstack/react-query";
import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import type { Campaign } from "convex/schema";
import { Map, Plus } from "lucide-react";
import { useId, useState } from "react";
import MapLibre, { Marker } from "react-map-gl/maplibre";
import { Button } from "@/components/ui/button";
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
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/components/ui/item";
import { env } from "@/env";
import { campaignsQueries, useAddCampaignMutation } from "@/queries/campaigns";

export const Route = createFileRoute("/")({
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(campaignsQueries.list());
	},
	component: App,
});

function App() {
	const campaigns = useSuspenseQuery(campaignsQueries.list());
	const addCampaignMutation = useAddCampaignMutation();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [center, setCenter] = useState<{ longitude: number; latitude: number }>(
		{
			longitude: 13.7266,
			latitude: 51.0299,
		},
	);
	const nameInputId = useId();
	const descriptionInputId = useId();
	const startDateInputId = useId();
	const endDateInputId = useId();

	function resetForm() {
		setName("");
		setDescription("");
		setStartDate("");
		setEndDate("");
		setCenter({ longitude: 13.7266, latitude: 51.0299 });
	}

	async function handleCreateCampaign(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();

		const campaignName = name.trim();
		if (campaignName.length === 0) {
			return;
		}

		await addCampaignMutation.mutateAsync({
			name: campaignName,
			description: description.trim() === "" ? undefined : description.trim(),
			longitude: center.longitude,
			latitude: center.latitude,
			startAt:
				startDate.trim() === "" ? undefined : new Date(startDate).getTime(),
			endAt: endDate.trim() === "" ? undefined : new Date(endDate).getTime(),
		});

		setDialogOpen(false);
		resetForm();
	}

	return (
		<div className="min-h-screen">
			<div className="space-y-8 max-w-7xl mx-auto px-2 py-12 md:px-6 lg:px-12 lg:py-12">
				<div className="flex gap-2 items-center text-2xl leading-[1.29167] font-semibold text-balance sm:text-4xl lg:text-5xl">
					<Map className="size-8" />
					<h1>Kampagnenplaner</h1>
				</div>
				<div>
					{campaigns.isLoading ? (
						<p>Lade Kampagnen...</p>
					) : (
						<div className="grid gap-2">
							<div className="flex justify-end">
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
											className="grid gap-4"
											onSubmit={handleCreateCampaign}
										>
											<div className="grid gap-2">
												<label
													className="text-sm font-medium"
													htmlFor={nameInputId}
												>
													Name
												</label>
												<input
													id={nameInputId}
													required
													value={name}
													onChange={(event) => setName(event.target.value)}
													className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring/50 flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
												/>
											</div>

											<div className="grid gap-2">
												<label
													className="text-sm font-medium"
													htmlFor={descriptionInputId}
												>
													Beschreibung (optional)
												</label>
												<textarea
													id={descriptionInputId}
													value={description}
													onChange={(event) =>
														setDescription(event.target.value)
													}
													className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring/50 min-h-20 w-full rounded-md border px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
												/>
											</div>

											<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
												<div className="grid gap-2">
													<label
														className="text-sm font-medium"
														htmlFor={startDateInputId}
													>
														Startdatum (optional)
													</label>
													<input
														id={startDateInputId}
														type="date"
														value={startDate}
														onChange={(event) =>
															setStartDate(event.target.value)
														}
														className="border-input bg-background ring-offset-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
													/>
												</div>

												<div className="grid gap-2">
													<label
														className="text-sm font-medium"
														htmlFor={endDateInputId}
													>
														Enddatum (optional)
													</label>
													<input
														id={endDateInputId}
														type="date"
														value={endDate}
														onChange={(event) => setEndDate(event.target.value)}
														className="border-input bg-background ring-offset-background focus-visible:ring-ring/50 h-9 w-full rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px]"
													/>
												</div>
											</div>

											<div className="grid gap-2">
												<p className="text-sm font-medium">
													Standardmittelpunkt
												</p>
												<div className="relative h-64 w-full overflow-hidden rounded-md border">
													<ClientOnly>
														<MapLibre
															initialViewState={{
																longitude: center.longitude,
																latitude: center.latitude,
																zoom: 13,
															}}
															dragRotate={false}
															pitchWithRotate={false}
															keyboard={false}
															style={{ width: "100%", height: "100%" }}
															mapStyle={`https://api.maptiler.com/maps/streets/style.json?key=${env.VITE_MAPTILER_KEY}`}
															onMoveEnd={(event) =>
																setCenter({
																	longitude: event.viewState.longitude,
																	latitude: event.viewState.latitude,
																})
															}
														>
															<Marker
																longitude={center.longitude}
																latitude={center.latitude}
																anchor="bottom"
															>
																<div className="size-4 rounded-full border-2 border-white bg-blue-600" />
															</Marker>
														</MapLibre>
													</ClientOnly>
													<div className="absolute bottom-0 left-0 bg-background p-2">
														<p className="text-muted-foreground text-xs">
															{center.latitude.toFixed(6)},{" "}
															{center.longitude.toFixed(6)}
														</p>
													</div>
												</div>
											</div>

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
														name.trim().length === 0 ||
														addCampaignMutation.isPending
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
							</div>
							<CampaignList campaigns={campaigns.data} />
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function CampaignList({ campaigns }: { campaigns: Campaign[] }) {
	return (
		<div className="grid gap-4">
			<ItemGroup className="border border-border rounded-md overflow-hidden bg-background">
				{campaigns.map((campaign) => (
					<Item
						key={campaign._id}
						className="border-b border-b-border rounded-none last:border-0 hover:bg-muted/50"
					>
						<ItemContent className="flex flex-col md:items-center md:flex-row md:justify-between">
							<div>
								<ItemTitle className="">{campaign.name}</ItemTitle>
								{campaign.description != null && (
									<ItemDescription>{campaign.description}</ItemDescription>
								)}
							</div>
							<div className="">
								{campaign.startAt != null && (
									<span>
										{new Date(campaign.startAt).toLocaleDateString()}{" "}
										{campaign.startAt != null &&
											`- ${new Date(campaign.endAt ?? 0).toLocaleDateString()}`}
									</span>
								)}
							</div>
						</ItemContent>

						<ItemActions>
							<Button variant="outline" size="sm" asChild>
								<Link to="/map" className="w-full">
									Anzeigen
								</Link>
							</Button>
						</ItemActions>
					</Item>
				))}
			</ItemGroup>
		</div>
	);
}
