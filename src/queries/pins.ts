import { convexQuery } from "@convex-dev/react-query";
import { useMutation, useMutationState } from "@tanstack/react-query";
import type { OptimisticLocalStore } from "convex/browser";
import { useMutation as useConvexMutation } from "convex/react";
import type { Pin } from "convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export const pinQueries = {
	getById: (pinId: Id<"pins">) => convexQuery(api.pins.getById, { pinId }),
	list: (campaignId: Id<"campaigns">) =>
		convexQuery(api.pins.list, { campaignId }),
};

// Convex replays pending updates on live data and rolls them back on failure.
// Update both representations so an open details sheet agrees with the map.
export function updateCachedPin(
	store: OptimisticLocalStore,
	id: Id<"pins">,
	patch: Partial<
		Pick<Pin, "latitude" | "longitude" | "color" | "hangAt" | "tookDownAt">
	> | null,
) {
	const detail = store.getQuery(api.pins.getById, { pinId: id });
	if (detail)
		store.setQuery(
			api.pins.getById,
			{ pinId: id },
			patch ? { ...detail, ...patch } : null,
		);
	for (const { args, value } of store.getAllQueries(api.pins.list)) {
		if (!value) continue;
		store.setQuery(
			api.pins.list,
			args,
			patch
				? value.map((pin) => (pin._id === id ? { ...pin, ...patch } : pin))
				: value.filter((pin) => pin._id !== id),
		);
	}
}

// New documents become interactive only once Convex supplies a real ID.
export function useAddPinMutation() {
	const mutationFn = useConvexMutation(api.pins.add);
	return useMutation({ mutationFn });
}

export function useAddPlannedPinMutation() {
	const mutationFn = useConvexMutation(api.pins.addPlanned);
	return useMutation({ mutationKey: ["add-planned-pin"], mutationFn });
}

const pinStatusMutationKey = ["pin-status"] as const;

export function usePendingPinStatusIds() {
	// A mutation observer only exposes its latest call; the cache retains all.
	const ids = useMutationState({
		filters: { mutationKey: pinStatusMutationKey, status: "pending" },
		select: (mutation) => (mutation.state.variables as { id: Id<"pins"> }).id,
	});
	return new Set(ids);
}

// The server stamps the authoritative time; the local clock only fills the gap
// until the real value arrives, so a skewed device cannot persist a bad one.
export function useTakeDownPinMutation() {
	const mutationFn = useConvexMutation(api.pins.takeDown).withOptimisticUpdate(
		(store, { id }) => updateCachedPin(store, id, { tookDownAt: Date.now() }),
	);
	return useMutation({ mutationKey: pinStatusMutationKey, mutationFn });
}

export function useHangAgainPinMutation() {
	const mutationFn = useConvexMutation(api.pins.hangAgain).withOptimisticUpdate(
		(store, { id }) =>
			updateCachedPin(store, id, { hangAt: Date.now(), tookDownAt: null }),
	);
	return useMutation({ mutationKey: pinStatusMutationKey, mutationFn });
}

export function useUpdatePinPositionMutation() {
	const mutationFn = useConvexMutation(
		api.pins.updatePosition,
	).withOptimisticUpdate((store, { id, latitude, longitude }) =>
		updateCachedPin(store, id, { latitude, longitude }),
	);
	return useMutation({ mutationFn });
}

export function useRemovePinMutation() {
	const remove = useConvexMutation(api.pins.remove).withOptimisticUpdate(
		(store, { id }) => updateCachedPin(store, id, null),
	);
	return useMutation({ mutationFn: (id: Id<"pins">) => remove({ id }) });
}

export function useUpdatePinColorMutation() {
	const mutationFn = useConvexMutation(
		api.pins.updateColor,
	).withOptimisticUpdate((store, { id, color }) =>
		updateCachedPin(store, id, { color }),
	);
	return useMutation({ mutationFn });
}
