"use client";

import Link from "next/link";
import {
	Attachment01Icon,
	Comment01Icon,
	DragDropVerticalIcon,
	MoreVerticalIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { KanbanItemHandle } from "@/components/reui/kanban";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTaskAttachments, useTaskComments } from "@/lib/queries/tasks";
import { taskPriorityLabels, taskStatusLabels } from "@/lib/task-board";
import { taskStatuses, type Task, type TaskStatus } from "@/lib/tasks-api";
import { cn } from "@/lib/utils";

const priorityStyles = {
	LOW: "bg-muted text-muted-foreground",
	MEDIUM: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
	HIGH: "bg-red-500/15 text-red-700 dark:text-red-400",
} as const;

export function TaskCard({
	businessId,
	task,
	assigneeName,
	canChangeStatus,
	timeZone,
	now,
	onChangeStatus,
}: {
	businessId: string;
	task: Task;
	assigneeName: string | null;
	canChangeStatus: boolean;
	timeZone: string;
	now: number;
	onChangeStatus: (task: Task, status: TaskStatus) => void;
}) {
	// ponytail: two small requests per card for the counts; add counts to the list response if boards get large.
	const comments = useTaskComments({ businessId, taskId: task.id });
	const attachments = useTaskAttachments({ businessId, taskId: task.id });
	const overdue =
		task.status !== "DONE" &&
		task.dueAt !== null &&
		new Date(task.dueAt).getTime() < now;

	return (
		<div className="rounded-lg border bg-card p-3 text-card-foreground shadow-xs">
			<div className="flex items-start gap-1">
				{canChangeStatus ? (
					<KanbanItemHandle
						render={
							<button
								type="button"
								aria-label={`Arrastrar la tarea ${task.title}`}
							/>
						}
						className="-ml-1 mt-0.5 rounded text-muted-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
					>
						<HugeiconsIcon
							icon={DragDropVerticalIcon}
							size={16}
							aria-hidden="true"
						/>
					</KanbanItemHandle>
				) : null}
				<Link
					href={`/dashboard/${businessId}/tareas/${task.id}`}
					className="min-w-0 flex-1 text-sm font-medium outline-none hover:underline focus-visible:underline"
				>
					{task.title}
				</Link>
				{canChangeStatus ? (
					<DropdownMenu>
						<DropdownMenuTrigger
							render={<Button variant="ghost" size="icon-xs" />}
						>
							<HugeiconsIcon
								icon={MoreVerticalIcon}
								size={14}
								aria-hidden="true"
							/>
							<span className="sr-only">
								Cambiar estado de la tarea {task.title}
							</span>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-44">
							{taskStatuses
								.filter((status) => status !== task.status)
								.map((status) => (
									<DropdownMenuItem
										key={status}
										onClick={() => onChangeStatus(task, status)}
									>
										Mover a {taskStatusLabels[status]}
									</DropdownMenuItem>
								))}
						</DropdownMenuContent>
					</DropdownMenu>
				) : null}
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
				<span
					className={cn("rounded-full px-2 py-0.5", priorityStyles[task.priority])}
				>
					{taskPriorityLabels[task.priority]}
				</span>
				<span className="text-muted-foreground">
					{assigneeName ?? "Sin asignar"}
				</span>
			</div>
			<div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
				{task.dueAt ? (
					<span className={cn(overdue && "font-medium text-destructive")}>
						{new Intl.DateTimeFormat("es-CO", {
							day: "numeric",
							month: "short",
							timeZone,
						}).format(new Date(task.dueAt))}
						{overdue ? " · Vencida" : ""}
					</span>
				) : null}
				<span
					className="inline-flex items-center gap-1"
					aria-label={`${comments.data?.length ?? 0} comentarios`}
				>
					<HugeiconsIcon icon={Comment01Icon} size={13} aria-hidden="true" />
					{comments.data?.length ?? 0}
				</span>
				<span
					className="inline-flex items-center gap-1"
					aria-label={`${attachments.data?.length ?? 0} adjuntos`}
				>
					<HugeiconsIcon icon={Attachment01Icon} size={13} aria-hidden="true" />
					{attachments.data?.length ?? 0}
				</span>
			</div>
		</div>
	);
}
