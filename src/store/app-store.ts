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

export type FocusedPin = {
	id: string;
	hangAt: Date | null;
	tookDownAt: Date | null;
};

interface AppState {
	mode: Mode;
	setMode: (mode: Mode) => void;
}

export const useAppStore = create<AppState>((set) => ({
	mode: { mode: "none" },
	setMode: (mode) => set(() => ({ mode: mode })),
}));
