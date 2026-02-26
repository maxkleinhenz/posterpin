/** biome-ignore-all lint/suspicious/noShadowRestrictedNames: <explanation> */

import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { Campaign } from "convex/schema";
import { Map, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from "@/components/ui/item";
import { campaignsQueries } from "@/queries/campaigns";

export const Route = createFileRoute("/")({
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(campaignsQueries.list());
	},
	component: App,
});

function App() {
	const campaigns = useSuspenseQuery(campaignsQueries.list());

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
								<Button>
									<Plus /> Neue Kampagne
								</Button>
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
