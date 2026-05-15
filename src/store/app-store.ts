import { create } from "zustand";
import { colors, type PinColor } from "@/colors";

export type Mode =
	| {
			mode: "menu";
	  }
	| {
			mode: "focused-pin";
			focusedPin: FocusedPin;
	  }
	| {
			mode: "planning";
	  }
	| {
			mode: "none";
	  };

export type PinFilter = {
	hung: boolean;
	tookDown: boolean;
	planned: boolean;
	colors: Record<PinColor, boolean>;
};

export type FocusedPin = {
	id: string;
	hangAt: Date | null;
	tookDownAt: Date | null;
	Color: PinColor;
};
const allColors = Object.fromEntries(
	Object.keys(colors).map((color) => [color, true]),
) as Record<PinColor, boolean>;

export const defaultFilter = {
	hung: true,
	tookDown: true,
	planned: true,
	colors: allColors,
} as const satisfies PinFilter;

export const defaultAuracyVisiblity = false;

interface AppState {
	mode: Mode;
	setMode: (mode: Mode) => void;
	pinFilter: PinFilter;
	setPinFilter: (filter: PinFilter) => void;
	isAuracyVisible: boolean;
	setIsAuracyVisible: (visible: boolean) => void;
	pinColor: PinColor;
	setPinColor: (color: PinColor) => void;
}

export const useAppStore = create<AppState>((set) => ({
	mode: { mode: "none" },
	setMode: (mode) => set(() => ({ mode: mode })),
	pinFilter: { ...defaultFilter },
	setPinFilter: (filter) =>
		set((state) => {
			// If the currently selected color is disabled in the new filter, switch to the first enabled color
			const updates: Partial<AppState> = { pinFilter: filter };
			if (!filter.colors[state.pinColor]) {
				const firstEnabled = (Object.keys(filter.colors) as PinColor[]).find(
					(c) => filter.colors[c],
				);
				if (firstEnabled) updates.pinColor = firstEnabled;
			}
			return updates;
		}),
	isAuracyVisible: defaultAuracyVisiblity,
	setIsAuracyVisible: (visible) => set(() => ({ isAuracyVisible: visible })),
	pinColor: "yellow",
	setPinColor: (color) => set(() => ({ pinColor: color })),
}));
