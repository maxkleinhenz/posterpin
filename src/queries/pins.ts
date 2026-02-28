import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvex } from "convex/react";
import type { HangPinAgain, InsertPin, Pin, TakePinDown } from "convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const pinQueries = {
	getById: (pinId: Id<"pins">) => convexQuery(api.pins.getById, { pinId }),
	list: (campaignId: Id<"campaigns">) =>
		convexQuery(api.pins.list, { campaignId }),
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
			await queryClient.cancelQueries({
				queryKey: pinQueries.list(pin.campaignId).queryKey,
			});

			// Snapshot the previous value
			const previousPins = queryClient.getQueryData<Pin[]>(
				pinQueries.list(pin.campaignId).queryKey,
			);

			// Optimistically update the cache with a temporary Pin
			const optimisticPin: Pin = {
				...pin,
				_id: "temp_id" as Id<"pins">, // Temporary ID until server responds
				_creationTime: Date.now(),
				hangAt: Date.now(),
				tookDownAt: null,
			};

			queryClient.setQueryData<Pin[]>(
				pinQueries.list(pin.campaignId).queryKey,
				(old) => {
					if (!old) return [optimisticPin];
					return [optimisticPin, ...old];
				},
			);

			// Return context for rollback
			return { previousPins, campaignId: pin.campaignId };
		},
		onError: (_error, _variables, context) => {
			// Rollback on error
			if (context?.previousPins) {
				queryClient.setQueryData(
					pinQueries.list(context.campaignId).queryKey,
					context.previousPins,
				);
			}
		},
		onSettled: (_data, _error, context) => {
			// Invalidate to refetch and ensure consistency
			queryClient.invalidateQueries({
				queryKey: pinQueries.list(context.campaignId).queryKey,
			});
		},
	});
};

export function useTakeDownPinMutation() {
	const queryClient = useQueryClient();
	const convex = useConvex();

	return useMutation({
		mutationFn: async (pin: TakePinDown) => {
			return await convex.mutation(api.pins.takeDown, pin);
		},
		onMutate: async (pin) => {
			const existingPin = queryClient.getQueryData<Pin>(
				pinQueries.getById(pin.id).queryKey,
			);
			if (!existingPin) throw new Error("Pin not found");

			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: pinQueries.list(existingPin.campaignId).queryKey,
			});

			// Snapshot the previous value
			const previousPins = queryClient.getQueryData<Pin[]>(
				pinQueries.list(existingPin.campaignId).queryKey,
			);
			const newPin = { ...existingPin, tookDownAt: pin.tookDownAt };

			// Optimistically update the pin with tookDownAt timestamp
			queryClient.setQueryData<Pin[]>(
				pinQueries.list(existingPin.campaignId).queryKey,
				(old) => {
					if (!old) return [];
					return old.map((p) => (p._id === pin.id ? newPin : p));
				},
			);

			// Return context for rollback
			return { previousPins, newPin };
		},
		onError: (_error, _variables, context) => {
			// Rollback on error
			if (context?.previousPins) {
				queryClient.setQueryData(
					pinQueries.list(context.newPin.campaignId).queryKey,
					context.previousPins,
				);
			}
		},
		onSettled: (_data, _error, data) => {
			// Invalidate to refetch and ensure consistency
			const existingPin = queryClient.getQueryData<Pin>(
				pinQueries.getById(data.id).queryKey,
			);
			if (!existingPin) return;

			queryClient.invalidateQueries({
				queryKey: pinQueries.list(existingPin.campaignId).queryKey,
			});
		},
	});
}

export function useHangAgainPinMutation() {
	const queryClient = useQueryClient();
	const convex = useConvex();

	return useMutation({
		mutationFn: async (pin: HangPinAgain) => {
			return await convex.mutation(api.pins.hangAgain, pin);
		},
		onMutate: async (pin) => {
			const existingPin = queryClient.getQueryData<Pin>(
				pinQueries.getById(pin.id).queryKey,
			);
			if (!existingPin) throw new Error("Pin not found");

			// Cancel outgoing refetches
			await queryClient.cancelQueries({
				queryKey: pinQueries.list(existingPin.campaignId).queryKey,
			});

			// Snapshot the previous value
			const previousPins = queryClient.getQueryData<Pin[]>(
				pinQueries.list(existingPin.campaignId).queryKey,
			);

			const newPin = { ...existingPin, tookDownAt: null, hangAt: pin.hangAt };

			// Optimistically update the pin with tookDownAt timestamp
			queryClient.setQueryData<Pin[]>(
				pinQueries.list(existingPin.campaignId).queryKey,
				(old) => {
					if (!old) return [];
					return old.map((p) => (p._id === pin.id ? newPin : p));
				},
			);

			// Return context for rollback
			return { previousPins, newPin };
		},
		onError: (_error, _variables, context) => {
			// Rollback on error
			if (context?.previousPins) {
				queryClient.setQueryData(
					pinQueries.list(context.newPin.campaignId).queryKey,
					context.previousPins,
				);
			}
		},
		onSettled: (_data, _error, data) => {
			// Invalidate to refetch and ensure consistency
			const existingPin = queryClient.getQueryData<Pin>(
				pinQueries.getById(data.id).queryKey,
			);
			if (!existingPin) return;
			queryClient.invalidateQueries({
				queryKey: pinQueries.list(existingPin.campaignId).queryKey,
			});
		},
	});
}
