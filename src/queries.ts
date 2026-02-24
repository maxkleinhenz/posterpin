import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import type { InsertPin, Pin } from "convex/schema";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

export const pinQueries = {
	list: () => convexQuery(api.pins.list, {}),
};

export const useAddPinMutation = () => {
	const queryClient = useQueryClient();
	const convex = useConvex();

	return useMutation({
		mutationFn: async (pin: InsertPin) => {
			return await convex.mutation(api.pins.add, pin);
		},
		onMutate: async (pin) => {
			// Cancel outgoing refetches
			await queryClient.cancelQueries({ queryKey: pinQueries.list().queryKey });

			// Snapshot the previous value
			const previousPins = queryClient.getQueryData<Pin[]>(
				pinQueries.list().queryKey,
			);

			// Optimistically update the cache with a temporary Pin
			const optimisticPin: Pin = {
				...pin,
				_id: "temp_id" as Id<"pins">, // Temporary ID until server responds
				_creationTime: Date.now(),
			};

			queryClient.setQueryData<Pin[]>(pinQueries.list().queryKey, (old) => {
				if (!old) return [optimisticPin];
				return [optimisticPin, ...old];
			});

			// Return context for rollback
			return { previousPins };
		},
		onError: (_error, _variables, context) => {
			// Rollback on error
			if (context?.previousPins) {
				queryClient.setQueryData(
					pinQueries.list().queryKey,
					context.previousPins,
				);
			}
		},
		onSettled: () => {
			// Invalidate to refetch and ensure consistency
			queryClient.invalidateQueries({ queryKey: pinQueries.list().queryKey });
		},
	});
};
