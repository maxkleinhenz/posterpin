import { convexQuery } from "@convex-dev/react-query";
import { useMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";

import { api } from "../../convex/_generated/api";

export const campaignsQueries = {
	getById: (id: string) => convexQuery(api.campaigns.getById, { id }),
	list: () => convexQuery(api.campaigns.list, {}),
};

export function useAddCampaignMutation() {
	const mutationFn = useConvexMutation(api.campaigns.add);
	return useMutation({ mutationFn });
}
