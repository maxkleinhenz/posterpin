import { Check, X } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import ColorWheel from "@/assets/color-wheel.svg";
import { colors, type PinColor } from "@/colors";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";

export default function PinColorPopover({
	selectedColor,
	onSelectColor,
	wheelClassName,
	disabled,
}: {
	selectedColor: PinColor;
	onSelectColor: (color: PinColor) => void;
	wheelClassName?: string;
	disabled?: boolean;
}) {
	const { pinFilter } = useAppStore(
		useShallow((state) => ({
			pinFilter: state.pinFilter,
		})),
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					className={`shadow-md h-full p-2 transition-all ${colors[selectedColor].bg}`}
					size="lg"
					disabled={disabled}
					aria-label={`Farbe wählen: ${colors[selectedColor].label}`}
				>
					<img
						src={ColorWheel}
						alt="Color Wheel"
						className={cn("size-8", wheelClassName)}
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent>
				<PopoverHeader>
					<PopoverTitle>Farbwahl</PopoverTitle>
					<PopoverDescription>
						Wähle eine Farbe für dein Plakat aus.
					</PopoverDescription>
				</PopoverHeader>
				<div className="flex flex-wrap gap-2 py-2">
					{Object.entries(pinFilter.colors).map(([color, value]) => (
						<ColorButton
							key={color}
							color={color as PinColor}
							selected={color === selectedColor}
							onSelectColor={onSelectColor}
							disabled={!value}
						/>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}

function ColorButton({
	color,
	selected,
	disabled,
	onSelectColor,
}: {
	color: PinColor;
	selected: boolean;
	disabled?: boolean;
	onSelectColor: (color: PinColor) => void;
}) {
	return (
		<Button
			className={`size-10 ${colors[color].bg}`}
			onClick={() => onSelectColor(color)}
			disabled={disabled}
			aria-label={colors[color].label}
			aria-pressed={selected}
		>
			{selected && (
				<Check className="stroke-3 rounded-full bg-muted text-muted-foreground size-4 p-0.5" />
			)}
			{disabled && (
				<X className="stroke-3 rounded-full bg-muted text-muted-foreground size-4 p-0.5" />
			)}
		</Button>
	);
}
