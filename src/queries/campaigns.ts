import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import type { Campaign, InsertCampaign } from "convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const campaignsQueries = {
	list: () => convexQuery(api.campaigns.list, {}),
};

export const useAddCampaignMutation = () => {
	const queryClient = useQueryClient();
	const convex = useConvex();

	return useMutation({
		mutationFn: async (campaign: InsertCampaign) => {
			return await convex.mutation(api.campaigns.add, campaign);
		},
		onMutate: async (campaign) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: campaignsQueries.list().queryKey,
			});

			// Snapshot the previous value
			const previousCampaigns = queryClient.getQueryData<Campaign[]>(
				campaignsQueries.list().queryKey,
			);

			// Optimistically update the cache with a temporary Campaign
			const optimisticCampaign = {
				...campaign,
				_id: "temp_id" as Id<"campaigns">, // Temporary ID until server responds
				_creationTime: Date.now(),
				name: campaign.name,
				description: campaign.description,
				latitude: campaign.latitude,
				longitude: campaign.longitude,
				startAt: campaign.startAt ?? Date.now(),
				endAt: campaign.endAt ?? null,
			} satisfies Campaign;

			queryClient.setQueryData<Campaign[]>(
				campaignsQueries.list().queryKey,
				(old) => {
					if (!old) return [optimisticCampaign];
					return [optimisticCampaign, ...old];
				},
			);

			// Return context for rollback
			return { previousCampaigns };
		},
		onError: (_error, _variables, context) => {
			// Rollback on error
			if (context?.previousCampaigns) {
				queryClient.setQueryData(
					campaignsQueries.list().queryKey,
					context.previousCampaigns,
				);
			}
		},
		onSettled: () => {
			// Invalidate to refetch and ensure consistency
			queryClient.invalidateQueries({
				queryKey: campaignsQueries.list().queryKey,
			});
		},
	});
};
