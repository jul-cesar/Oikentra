"use client";

import { useMemo } from "react";
import Link from "next/link";

import { TaskAttachments } from "@/components/dashboard/tasks/task-attachments";
import { TaskComments } from "@/components/dashboard/tasks/task-comments";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { useMembers, usePublicUsers } from "@/lib/queries/members";
import { useChangeTaskStatus, useTask } from "@/lib/queries/tasks";
import {
	canChangeTaskStatus,
	taskErrorMessage,
	taskPriorityLabels,
	taskStatusLabels,
} from "@/lib/task-board";
import { taskStatuses, type TaskStatus } from "@/lib/tasks-api";

function formatDate({ value, timeZone }: { value: string; timeZone: string }) {
	return new Intl.DateTimeFormat("es-CO", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone,
	}).format(new Date(value));
}

export function TaskDetail({
	businessId,
	taskId,
	role,
	userId,
	timeZone,
}: {
	businessId: string;
	taskId: string;
	role: "OWNER" | "MANAGER" | "OPERATOR";
	userId: string | undefined;
	timeZone: string;
}) {
	const task = useTask({ businessId, taskId });
	const changeStatus = useChangeTaskStatus(businessId);
	const members = useMembers(businessId);
	const users = usePublicUsers(
		(members.data ?? []).map((member) => member.userId),
	);
	const names = useMemo(
		() =>
			new Map(
				(members.data ?? []).map((member) => [
					member.id,
					users.data?.find((user) => user.id === member.userId)?.name ??
						"Integrante",
				]),
			),
		[members.data, users.data],
	);
	const authorNames = useMemo(
		() =>
			new Map(
				(members.data ?? []).flatMap((member) => {
					const name = users.data?.find((user) => user.id === member.userId)?.name;
					return name ? [[member.userId, name] as const] : [];
				}),
			),
		[members.data, users.data],
	);
	const memberId = members.data?.find((member) => member.userId === userId)?.id;
	const backHref = `/dashboard/${businessId}/tareas`;

	if (task.isLoading) {
		return (
			<div
				className="mx-auto max-w-3xl space-y-4"
				role="status"
				aria-label="Cargando tarea"
			>
				<Skeleton className="h-10 w-2/3" />
				<Skeleton className="h-40 rounded-xl" />
			</div>
		);
	}
	if (task.error || !task.data) {
		return (
			<div className="mx-auto max-w-lg py-16 text-center">
				<p className="text-muted-foreground">
					No pudimos cargar esta tarea. Puede que ya no exista.
				</p>
				<div className="mt-4 flex justify-center gap-2">
					<Button variant="outline" onClick={() => void task.refetch()}>
						Reintentar
					</Button>
					<Button variant="ghost" render={<Link href={backHref} />}>
						Volver al tablero
					</Button>
				</div>
			</div>
		);
	}

	const data = task.data;
	const canChange = canChangeTaskStatus({ role, memberId, task: data });
	const overdue =
		data.status !== "DONE" &&
		data.dueAt !== null &&
		// eslint-disable-next-line react-hooks/purity -- display-only comparison, refreshed on every refetch
		new Date(data.dueAt).getTime() < Date.now();

	function move(status: TaskStatus) {
		changeStatus.mutate(
			{ taskId: data.id, version: data.version, status },
			{
				onError: (error) =>
					toast.add({
						type: "error",
						title: "No pudimos cambiar el estado",
						description: taskErrorMessage(error),
						priority: "high",
					}),
			},
		);
	}

	return (
		<div className="mx-auto max-w-3xl space-y-8">
			<div>
				<Link
					href={backHref}
					className="text-sm text-muted-foreground hover:underline"
				>
					← Volver al tablero
				</Link>
				<h1 className="mt-3 text-3xl font-semibold tracking-tight">
					{data.title}
				</h1>
				{data.description ? (
					<p className="mt-3 whitespace-pre-wrap text-muted-foreground">
						{data.description}
					</p>
				) : null}
			</div>
			<dl className="grid gap-4 rounded-xl border p-4 text-sm sm:grid-cols-2">
				<div>
					<dt className="text-muted-foreground">Estado</dt>
					<dd className="mt-1">
						{canChange ? (
							<Select
								value={data.status}
								onValueChange={(value) => {
									if (value !== data.status) move(value as TaskStatus);
								}}
							>
								<SelectTrigger aria-label="Cambiar estado de la tarea">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{taskStatuses.map((status) => (
										<SelectItem key={status} value={status}>
											{taskStatusLabels[status]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						) : (
							taskStatusLabels[data.status]
						)}
					</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Prioridad</dt>
					<dd className="mt-1">{taskPriorityLabels[data.priority]}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Responsable</dt>
					<dd className="mt-1">
						{data.assigneeMemberId
							? (names.get(data.assigneeMemberId) ?? "Integrante")
							: "Sin asignar"}
					</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">Vencimiento</dt>
					<dd className={overdue ? "mt-1 font-medium text-destructive" : "mt-1"}>
						{data.dueAt
							? `${formatDate({ value: data.dueAt, timeZone })}${overdue ? " · Vencida" : ""}`
							: "Sin fecha"}
					</dd>
				</div>
				{!canChange ? (
					<p className="text-muted-foreground sm:col-span-2">
						Solo el responsable, o un propietario o administrador, puede cambiar
						el estado.
					</p>
				) : null}
			</dl>
			<TaskAttachments businessId={businessId} taskId={taskId} role={role} />
			<TaskComments
				businessId={businessId}
				taskId={taskId}
				authorNames={authorNames}
				timeZone={timeZone}
			/>
		</div>
	);
}
