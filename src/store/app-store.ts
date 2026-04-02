import { create } from "zustand";

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

export type PinFilter = { hung: boolean; tookDown: boolean; planned: boolean };

export type FocusedPin = {
	id: string;
	hangAt: Date | null;
	tookDownAt: Date | null;
};

interface AppState {
	mode: Mode;
	pinFilter: PinFilter;
	isAuracyVisible: boolean;
	setMode: (mode: Mode) => void;
	setPinFilter: (filter: PinFilter) => void;
	setIsAuracyVisible: (visible: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
	mode: { mode: "none" },
	pinFilter: { hung: true, tookDown: true, planned: true },
	isAuracyVisible: false,
	setMode: (mode) => set(() => ({ mode: mode })),
	setPinFilter: (filter) => set(() => ({ pinFilter: filter })),
	setIsAuracyVisible: (visible) => set(() => ({ isAuracyVisible: visible })),
}));
