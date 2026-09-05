import { ConvexQueryClient } from "@convex-dev/react-query";
import {
	MutationCache,
	notifyManager,
	QueryClient,
} from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { ConvexProvider } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";

import { TooltipProvider } from "./components/ui/tooltip";
import { env } from "./env";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	if (typeof document !== "undefined") {
		notifyManager.setScheduler(window.requestAnimationFrame);
	}

	const CONVEX_URL = env.VITE_CONVEX_URL;
	if (!CONVEX_URL) {
		console.error("missing envar CONVEX_URL");
	}
	const convexQueryClient = new ConvexQueryClient(CONVEX_URL);

	const queryClient: QueryClient = new QueryClient({
		defaultOptions: {
			queries: {
				queryKeyHashFn: convexQueryClient.hashFn(),
				queryFn: convexQueryClient.queryFn(),
			},
		},
		mutationCache: new MutationCache({
			onError: (error) => {
				toast.error("Änderung konnte nicht gespeichert werden.", {
					description:
						error instanceof ConvexError && typeof error.data === "string"
							? error.data
							: "Bitte prüfe deine Verbindung und versuche es erneut.",
					closeButton: true,
				});
			},
		}),
	});
	convexQueryClient.connect(queryClient);

	const router = createRouter({
		routeTree,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		context: { queryClient },
		Wrap: ({ children }) => (
			<ConvexProvider client={convexQueryClient.convexClient}>
				<TooltipProvider>{children}</TooltipProvider>
			</ConvexProvider>
		),
		scrollRestoration: true,
	});
	setupRouterSsrQueryIntegration({
		router,
		queryClient,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
