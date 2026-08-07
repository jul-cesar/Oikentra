export default function OfflinePage() {
	return (
		<main className="flex min-h-svh items-center justify-center p-6">
			<section className="max-w-md space-y-3 text-center">
				<p className="text-sm font-medium text-primary">Oikentra</p>
				<h1 className="text-2xl font-semibold">Sin conexión</h1>
				<p className="text-muted-foreground">
					No pudimos cargar esta pantalla. Comprueba tu conexión e inténtalo
					nuevamente.
				</p>
			</section>
		</main>
	);
}
