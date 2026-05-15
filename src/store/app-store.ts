import { create } from "zustand";
import type { PinColor } from "@/colors";

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

export const defaultFilter = {
	hung: true,
	tookDown: true,
	planned: true,
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
	setPinFilter: (filter) => set(() => ({ pinFilter: filter })),
	isAuracyVisible: defaultAuracyVisiblity,
	setIsAuracyVisible: (visible) => set(() => ({ isAuracyVisible: visible })),
	pinColor: "yellow",
	setPinColor: (color) => set(() => ({ pinColor: color })),
}));
