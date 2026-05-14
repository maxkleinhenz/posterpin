export function Pending() {
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-background">
			<div className="flex flex-col items-center gap-4">
				<div className="h-8 w-8 rounded-full border-2 border-foreground/20 border-t-foreground animate-spin" />
				<p className="text-sm text-foreground/40 tracking-widest uppercase">
					Loading
				</p>
			</div>
		</div>
	);
}
