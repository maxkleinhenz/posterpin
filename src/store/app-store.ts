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
			mode: "none";
	  };

export type FocusedPin = {
	id: string;
	creationTime: Date;
};

interface AppState {
	mode: Mode;
	setMode: (mode: Mode) => void;
}

export const useAppStore = create<AppState>((set) => ({
	mode: { mode: "none" },
	setMode: (mode) => set(() => ({ mode: mode })),
}));
