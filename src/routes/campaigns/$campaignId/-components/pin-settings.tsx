import { SlidersHorizontal } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { type PinFilter, useAppStore } from "@/store/app-store";

const filterItems: {
	key: keyof PinFilter;
	label: string;
	color: string;
}[] = [
	{ key: "hung", label: "Aufgehängt", color: "bg-amber-400" },
	{ key: "tookDown", label: "Abgehängt", color: "bg-gray-400" },
	{ key: "planned", label: "Geplant", color: "bg-blue-500" },
];

export default function PinSettingsPopup() {
	const { pinFilter, setPinFilter } = useAppStore(
		useShallow((state) => ({
			pinFilter: state.pinFilter,
			setPinFilter: state.setPinFilter,
		})),
	);

	const { isAuracyVisible, setIsAuracyVisible } = useAppStore(
		useShallow((state) => ({
			isAuracyVisible: state.isAuracyVisible,
			setIsAuracyVisible: state.setIsAuracyVisible,
		})),
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button className="relative p-5" size="icon-lg" variant="ghost">
					<SlidersHorizontal className="size-5" />
					<span className="sr-only">Filter</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="end"
				sideOffset={12}
				className="w-80 p-3"
			>
				<ItemGroup className="rounded-md overflow-hidden">
					<Item className="rounded-none last:border-0 hover:bg-muted/50">
						<ItemContent className="grid gap-2">
							<div>
								<ItemTitle>Plakate anzeigen</ItemTitle>
							</div>
							<div className="grid gap-2">
								{filterItems.map(({ key, label, color }) => (
									<Label
										key={key}
										className="flex items-center gap-2 cursor-pointer font-normal"
									>
										<Checkbox
											checked={pinFilter[key]}
											onCheckedChange={(checked) =>
												setPinFilter({ ...pinFilter, [key]: checked === true })
											}
										/>
										<span className={`size-3 rounded-full ${color}`} />
										{label}
									</Label>
								))}
							</div>
						</ItemContent>
					</Item>
					<Item className="rounded-none last:border-0 hover:bg-muted/50">
						<ItemContent className="grid gap-2">
							<div>
								<ItemTitle>Genauigkeit</ItemTitle>
							</div>
							<div className="grid gap-2">
								<Label className="flex items-center gap-2 cursor-pointer font-normal">
									<Checkbox
										checked={isAuracyVisible}
										onCheckedChange={(checked) =>
											setIsAuracyVisible(checked === true)
										}
									/>
									Genauigkeitskreis anzeigen
								</Label>
							</div>
						</ItemContent>
					</Item>
				</ItemGroup>
			</PopoverContent>
		</Popover>
	);
}
