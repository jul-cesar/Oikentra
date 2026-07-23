"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
	Search01Icon,
	Tag01Icon,
	PencilEdit01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OikentraLoader } from "@/components/ui/oikentra-loader";
import { useCategories } from "@/lib/queries/categories";
import type { CashMovementCategory } from "@/lib/categories-api";
import { CreateCategoryDialog } from "./create-category-dialog";
import { DeactivateCategoryDialog } from "./delete-category-dialog";

export function CategoriesPage({ businessId }: { businessId: string }) {
	const categoriesQuery = useCategories(businessId);
	const [search, setSearch] = useState("");
	const [createOpen, setCreateOpen] = useState(false);
	const [editing, setEditing] = useState<CashMovementCategory | null>(null);
	const [deactivateTarget, setDeactivateTarget] =
		useState<CashMovementCategory | null>(null);

	const categories = useMemo(
		() => categoriesQuery.data ?? [],
		[categoriesQuery.data],
	);

	const filtered = useMemo(
		() =>
			categories.filter((c) =>
				c.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
			),
		[categories, search],
	);

	if (categoriesQuery.isLoading)
		return (
			<OikentraLoader label="Cargando categorías" className="min-h-[60vh]" />
		);

	if (categoriesQuery.error)
		return (
			<div className="mx-auto max-w-lg py-20 text-center">
				<p className="text-muted-foreground">
					No pudimos cargar las categorías.
				</p>
				<Button
					variant="outline"
					className="mt-4"
					onClick={() => void categoriesQuery.refetch()}
				>
					Reintentar
				</Button>
			</div>
		);

	return (
		<div className="mx-auto max-w-3xl space-y-6">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-sm font-medium text-primary">Movimientos</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight">
						Categorías
					</h1>
					<p className="mt-2 text-muted-foreground">
						Organiza tus ventas y gastos por categoría.
					</p>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<HugeiconsIcon icon={Tag01Icon} size={18} />
					Nueva categoría
				</Button>
			</div>

			<Card>
				<CardHeader className="gap-4">
					<div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
						<div>
							<CardTitle>Tus categorías</CardTitle>
							<CardDescription>
								{categories.length} categoría
								{categories.length === 1 ? "" : "s"}
							</CardDescription>
						</div>
						<div className="relative w-full sm:max-w-xs">
							<HugeiconsIcon
								icon={Search01Icon}
								size={17}
								className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
							/>
							<Input
								className="pl-9"
								placeholder="Buscar categoría"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
							/>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{!categories.length ? (
						<div className="py-12 text-center">
							<HugeiconsIcon
								icon={Tag01Icon}
								size={32}
								className="mx-auto text-muted-foreground"
							/>
							<h3 className="mt-3 font-medium">Aún no hay categorías</h3>
							<p className="mt-1 text-sm text-muted-foreground">
								Crea la primera para organizar tus ventas.
							</p>
							<Button className="mt-4" onClick={() => setCreateOpen(true)}>
								Crear categoría
							</Button>
						</div>
					) : !filtered.length ? (
						<p className="py-10 text-center text-sm text-muted-foreground">
							No encontramos categorías con esa búsqueda.
						</p>
					) : (
						<div className="divide-y">
							{filtered.map((category) => (
								<div
									key={category.id}
									className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
								>
									<div className="min-w-0">
										<p className="font-medium">{category.name}</p>
										<p className="text-xs text-muted-foreground">
											Creada{" "}
											{new Date(category.createdAt).toLocaleDateString(
												"es-CO",
												{
													day: "2-digit",
													month: "short",
													year: "numeric",
												},
											)}
										</p>
									</div>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => setEditing(category)}
										>
											<HugeiconsIcon icon={PencilEdit01Icon} size={15} />
											Editar
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => setDeactivateTarget(category)}
										>
											Desactivar
										</Button>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Button
				variant="ghost"
				render={<Link href={`/dashboard/${businessId}/ventas`} />}
			>
				Volver a movimientos
			</Button>

			<CreateCategoryDialog
				businessId={businessId}
				category={editing}
				open={createOpen || Boolean(editing)}
				onOpenChange={(open) => {
					setCreateOpen(open);
					if (!open) setEditing(null);
				}}
			/>
			<DeactivateCategoryDialog
				businessId={businessId}
				category={deactivateTarget}
				open={Boolean(deactivateTarget)}
				onOpenChange={(value) => {
					if (!value) setDeactivateTarget(null);
				}}
			/>
		</div>
	);
}
