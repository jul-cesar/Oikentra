"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PlusSignIcon, Search01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { TaskBoard } from "@/components/dashboard/tasks/task-board";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useMembers, usePublicUsers } from "@/lib/queries/members";
import { useTasks } from "@/lib/queries/tasks";
import {
	parseTaskBoardFilters,
	taskBoardQueryString,
	taskPriorityLabels,
	toTaskApiFilters,
	type TaskBoardFilters,
	type TaskView,
} from "@/lib/task-board";
import { taskPriorities } from "@/lib/tasks-api";

const views: { value: TaskView; label: string }[] = [
	{ value: "all", label: "Todas" },
	{ value: "mine", label: "Mis tareas" },
	{ value: "unassigned", label: "Sin asignar" },
];

export function TasksPage({
	businessId,
	role,
	userId,
	timeZone,
}: {
	businessId: string;
	role: "OWNER" | "MANAGER" | "OPERATOR";
	userId: string | undefined;
	timeZone: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const filters = parseTaskBoardFilters(searchParams);
	const [search, setSearch] = useState(filters.search);
	const members = useMembers(businessId);
	const users = usePublicUsers(
		(members.data ?? []).map((member) => member.userId),
	);
	const tasks = useTasks({ businessId, filters: toTaskApiFilters(filters) });

	function update(next: Partial<TaskBoardFilters>) {
		const query = taskBoardQueryString({ ...filters, ...next });
		router.replace(query ? `${pathname}?${query}` : pathname);
	}

	useEffect(() => {
		if (search === filters.search) return;
		const timer = setTimeout(() => {
			const query = taskBoardQueryString({ ...filters, search: search.trim() });
			router.replace(query ? `${pathname}?${query}` : pathname);
		}, 300);
		return () => clearTimeout(timer);
	}, [search, filters, pathname, router]);

	const memberOptions = useMemo(
		() =>
			(members.data ?? []).map((member) => ({
				id: member.id,
				userId: member.userId,
				name:
					users.data?.find((user) => user.id === member.userId)?.name ??
					"Integrante",
			})),
		[members.data, users.data],
	);
	const memberNames = useMemo(
		() => new Map(memberOptions.map((member) => [member.id, member.name])),
		[memberOptions],
	);
	const memberId = memberOptions.find((member) => member.userId === userId)?.id;

	return (
		<div className="mx-auto max-w-6xl space-y-6">
			<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
				<div>
					<p className="text-sm font-medium">Trabajo del equipo</p>
					<h1 className="mt-2 text-3xl font-semibold tracking-tight">Tareas</h1>
					<p className="mt-2 text-muted-foreground">
						Organiza, asigna y completa el trabajo de tu negocio.
					</p>
				</div>
				<Button render={<Link href={`/dashboard/${businessId}/tareas/nueva`} />}>
					<HugeiconsIcon icon={PlusSignIcon} size={18} aria-hidden="true" />
					Nueva tarea
				</Button>
			</div>
			<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
				<div className="flex gap-1" role="group" aria-label="Vista de tareas">
					{views.map((view) => (
						<Button
							key={view.value}
							size="sm"
							variant={filters.view === view.value ? "default" : "outline"}
							aria-pressed={filters.view === view.value}
							onClick={() =>
								update({
									view: view.value,
									memberId: view.value === "all" ? filters.memberId : "",
								})
							}
						>
							{view.label}
						</Button>
					))}
				</div>
				<div className="grid flex-1 gap-3 sm:grid-cols-3">
					<Select
						value={filters.view === "all" ? filters.memberId || "ALL" : "ALL"}
						onValueChange={(value) =>
							update({
								view: "all",
								memberId: value === "ALL" ? "" : value,
							})
						}
					>
						<SelectTrigger aria-label="Filtrar por integrante">
							<SelectValue placeholder="Todos los integrantes" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">Todos los integrantes</SelectItem>
							{memberOptions.map((member) => (
								<SelectItem key={member.id} value={member.id}>
									{member.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={filters.priority || "ALL"}
						onValueChange={(value) =>
							update({
								priority:
									value === "ALL" ? "" : (value as TaskBoardFilters["priority"]),
							})
						}
					>
						<SelectTrigger aria-label="Filtrar por prioridad">
							<SelectValue placeholder="Todas las prioridades" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">Todas las prioridades</SelectItem>
							{taskPriorities.map((priority) => (
								<SelectItem key={priority} value={priority}>
									{taskPriorityLabels[priority]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<div className="relative">
						<HugeiconsIcon
							icon={Search01Icon}
							size={17}
							className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
						/>
						<Input
							className="pl-9"
							aria-label="Buscar tareas"
							placeholder="Buscar tarea"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
						/>
					</div>
				</div>
			</div>
			{tasks.isLoading ? (
				<div
					className="grid gap-4 sm:grid-cols-3"
					role="status"
					aria-label="Cargando tareas"
				>
					{[0, 1, 2].map((column) => (
						<Skeleton key={column} className="h-64 rounded-xl" />
					))}
				</div>
			) : tasks.error ? (
				<div className="mx-auto max-w-lg py-16 text-center">
					<p className="text-muted-foreground">No pudimos cargar tus tareas.</p>
					<Button
						variant="outline"
						className="mt-4"
						onClick={() => void tasks.refetch()}
					>
						Reintentar
					</Button>
				</div>
			) : (
				<>
					{tasks.data?.length ? null : (
						<p className="text-center text-sm text-muted-foreground">
							No hay tareas con estos filtros. Crea una con «Nueva tarea».
						</p>
					)}
					<TaskBoard
						businessId={businessId}
						tasks={tasks.data ?? []}
						role={role}
						memberId={memberId}
						memberNames={memberNames}
						timeZone={timeZone}
					/>
				</>
			)}
		</div>
	);
}
