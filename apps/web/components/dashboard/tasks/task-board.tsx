"use client";

import { useMemo, useState } from "react";

import {
	Kanban,
	KanbanBoard,
	KanbanColumn,
	KanbanColumnContent,
	KanbanItem,
	KanbanOverlay,
} from "@/components/reui/kanban";
import { toast } from "@/components/ui/toast";
import { TaskCard } from "@/components/dashboard/tasks/task-card";
import { useChangeTaskStatus } from "@/lib/queries/tasks";
import {
	canChangeTaskStatus,
	groupTasksByStatus,
	taskStatusLabels,
} from "@/lib/task-board";
import { taskStatuses, type Task, type TaskStatus } from "@/lib/tasks-api";

const emptyColumnText: Record<TaskStatus, string> = {
	TODO: "Aquí aparecerán las tareas por empezar.",
	IN_PROGRESS: "Aquí aparecerán las tareas que alguien está haciendo.",
	DONE: "Aquí aparecerán las tareas terminadas.",
};

type Columns = Record<string, Task[]>;

export function TaskBoard({
	businessId,
	tasks,
	role,
	memberId,
	memberNames,
	timeZone,
}: {
	businessId: string;
	tasks: Task[];
	role: "OWNER" | "MANAGER" | "OPERATOR";
	memberId: string | undefined;
	memberNames: Map<string, string>;
	timeZone: string;
}) {
	const changeStatus = useChangeTaskStatus(businessId);
	const [now] = useState(() => Date.now());
	const canonical = useMemo(() => groupTasksByStatus(tasks), [tasks]);
	// The drag preview only applies to the task list it was taken from: once the
	// optimistic update or a reload replaces the list, the canonical order wins.
	const [preview, setPreview] = useState<{
		base: Task[];
		columns: Columns;
	} | null>(null);
	const value = preview?.base === tasks ? preview.columns : canonical;
	const canChange = (task: Task) =>
		canChangeTaskStatus({ role, memberId, task });
	const assigneeName = (task: Task) =>
		task.assigneeMemberId
			? (memberNames.get(task.assigneeMemberId) ?? "Integrante")
			: null;

	function move(task: Task, status: TaskStatus) {
		changeStatus.mutate(
			{ taskId: task.id, version: task.version, status },
			{
				onError: (error) =>
					toast.add({
						type: "error",
						title: "No pudimos mover la tarea",
						description: `${error.message} Recargamos el tablero para mostrar el estado actual.`,
						priority: "high",
					}),
			},
		);
	}

	return (
		<Kanban
			value={value}
			onValueChange={(columns) => setPreview({ base: tasks, columns })}
			getItemValue={(task) => task.id}
			restoreOnCancel
			onValueCommit={(_, meta) => {
				const task = tasks.find((item) => item.id === meta.event.active.id);
				// Same-column drops never persist: the canonical order comes back.
				if (!task || meta.overContainer === task.status) {
					setPreview(null);
					return;
				}
				move(task, meta.overContainer as TaskStatus);
			}}
		>
			<KanbanBoard>
				{taskStatuses.map((status) => (
					<KanbanColumn
						key={status}
						value={status}
						className="rounded-xl bg-muted/40 p-3"
					>
						<h2 className="mb-3 flex items-center justify-between text-sm font-semibold">
							{taskStatusLabels[status]}
							<span className="text-xs font-normal text-muted-foreground">
								{value[status]?.length ?? 0}
							</span>
						</h2>
						<KanbanColumnContent value={status} className="min-h-24">
							{value[status]?.length ? null : (
								<p className="px-1 py-4 text-center text-xs text-muted-foreground">
									{emptyColumnText[status]}
								</p>
							)}
							{value[status]?.map((task) => (
								<KanbanItem
									key={task.id}
									value={task.id}
									disabled={!canChange(task)}
									// Cards the member cannot drag stay readable; the missing handle already blocks dragging.
									className="data-[disabled=true]:opacity-100"
									role="group"
									aria-label={task.title}
									tabIndex={-1}
								>
									<TaskCard
										businessId={businessId}
										task={task}
										assigneeName={assigneeName(task)}
										canChangeStatus={canChange(task)}
										timeZone={timeZone}
										now={now}
										onChangeStatus={move}
									/>
								</KanbanItem>
							))}
						</KanbanColumnContent>
					</KanbanColumn>
				))}
			</KanbanBoard>
			<KanbanOverlay>
				{({ value: activeId }) => {
					const task = tasks.find((item) => item.id === activeId);
					return task ? (
						<TaskCard
							businessId={businessId}
							task={task}
							assigneeName={assigneeName(task)}
							canChangeStatus={false}
							timeZone={timeZone}
							now={now}
							onChangeStatus={move}
						/>
					) : null;
				}}
			</KanbanOverlay>
		</Kanban>
	);
}
