import { useMediaQuery } from "@uidotdev/usehooks";
import { MapIcon, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	defaultAuracyVisiblity,
	defaultFilter,
	type PinFilter,
	useAppStore,
} from "@/store/app-store";

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
	const isSmallDevice = useMediaQuery("only screen and (max-width : 768px)");

	const [open, setOpen] = useState(false);

	const {
		pinFilter,
		setPinFilter,
		setMode,
		isAuracyVisible,
		setIsAuracyVisible,
	} = useAppStore(
		useShallow((state) => ({
			pinFilter: state.pinFilter,
			setPinFilter: state.setPinFilter,
			setMode: state.setMode,
			isAuracyVisible: state.isAuracyVisible,
			setIsAuracyVisible: state.setIsAuracyVisible,
		})),
	);

	const changedSettings = useMemo(() => {
		return (
			defaultFilter.hung !== pinFilter.hung ||
			defaultFilter.planned !== pinFilter.planned ||
			defaultFilter.tookDown !== pinFilter.tookDown ||
			isAuracyVisible !== defaultAuracyVisiblity
		);
	}, [pinFilter, isAuracyVisible]);

	return (
		<Sheet
			modal={true}
			open={open}
			onOpenChange={(o) => {
				setOpen(o);
			}}
		>
			<Tooltip>
				<TooltipTrigger asChild>
					<SheetTrigger asChild>
						<Button
							className="relative p-5"
							size="icon-lg"
							variant={changedSettings ? "default" : "ghost"}
						>
							<SlidersHorizontal className="size-5" />
							<span className="sr-only">Einstellungen</span>
						</Button>
					</SheetTrigger>
				</TooltipTrigger>
				<TooltipContent className="px-2 py-1 text-xs" side="left">
					Einstellungen
				</TooltipContent>
			</Tooltip>

			<SheetContent
				className="gap-0 rounded-t-md w-full md:w-96 max-sm:max-h-4/5 md:h-dvh"
				side={isSmallDevice ? "bottom" : "right"}
			>
				<SheetHeader>
					<SheetTitle>Einstellungen</SheetTitle>
					<SheetDescription>
						Anpassungen von Karteneinstellungen
					</SheetDescription>
				</SheetHeader>
				<ItemGroup className="rounded-md overflow-auto">
					<Item>
						<ItemContent className="flex gap-2 items-start">
							<Button
								variant="outline"
								onClick={() => {
									setMode({ mode: "planning" });
									setOpen(false);
								}}
							>
								<MapIcon className="size-5" /> Planen
							</Button>
						</ItemContent>
					</Item>
					<Item className="hover:bg-muted/50">
						<ItemContent className="grid gap-2">
							<div>
								<ItemTitle>Plakate anzeigen</ItemTitle>
							</div>
							<div className="grid">
								{filterItems.map(({ key, label, color }) => (
									<Label
										key={key}
										className="flex items-center gap-2 cursor-pointer font-normal py-2"
									>
										<Checkbox
											checked={pinFilter[key]}
											onCheckedChange={(checked) =>
												setPinFilter({
													...pinFilter,
													[key]: checked === true,
												})
											}
										/>
										<span className={`size-3 rounded-full ${color}`} />
										{label}
									</Label>
								))}
							</div>
						</ItemContent>
					</Item>
					<Item className="hover:bg-muted/50">
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
					<Item>
						<ItemContent className="flex gap-2 items-start">
							<Button
								variant="outline"
								onClick={() => {
									setPinFilter({ ...defaultFilter });
									setIsAuracyVisible(defaultAuracyVisiblity);
								}}
							>
								Einstellungen zurücksetzen
							</Button>
						</ItemContent>
					</Item>
				</ItemGroup>
			</SheetContent>
		</Sheet>
	);
}
