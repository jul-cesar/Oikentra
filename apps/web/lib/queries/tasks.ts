import {
	useMutation,
	useQuery,
	useQueryClient,
	type QueryClient,
} from "@tanstack/react-query";

import { agendaQueryKeys } from "@/lib/queries/agenda";
import {
	assignTask,
	changeTaskStatus,
	createTask,
	createTaskComment,
	deleteTask,
	deleteTaskAttachment,
	getTask,
	getTaskAttachmentDownload,
	getTaskAttachments,
	getTaskComments,
	getTasks,
	updateTask,
	uploadTaskAttachment,
	type CreateTaskInput,
	type Task,
	type TaskFilters,
	type TaskStatus,
	type UpdateTaskInput,
} from "@/lib/tasks-api";

export const tasksQueryKeys = {
	all: (businessId: string) => ["tasks", businessId] as const,
	lists: (businessId: string) => ["tasks", businessId, "list"] as const,
	list: (businessId: string, filters: TaskFilters) =>
		["tasks", businessId, "list", filters] as const,
	// Comments and attachments live under the detail key, so invalidating the
	// detail refreshes them too.
	detail: (businessId: string, taskId: string) =>
		["tasks", businessId, "detail", taskId] as const,
	comments: (businessId: string, taskId: string) =>
		["tasks", businessId, "detail", taskId, "comments"] as const,
	attachments: (businessId: string, taskId: string) =>
		["tasks", businessId, "detail", taskId, "attachments"] as const,
};

const statusMutationKey = (businessId: string) =>
	["tasks", businessId, "change-status"] as const;

export function useTasks({
	businessId,
	filters = {},
}: {
	businessId: string;
	filters?: TaskFilters;
}) {
	return useQuery({
		queryKey: tasksQueryKeys.list(businessId, filters),
		queryFn: () => getTasks({ businessId, filters }),
		enabled: Boolean(businessId),
	});
}

export function useTask({
	businessId,
	taskId,
}: {
	businessId: string;
	taskId: string;
}) {
	return useQuery({
		queryKey: tasksQueryKeys.detail(businessId, taskId),
		queryFn: () => getTask({ businessId, taskId }),
		enabled: Boolean(businessId && taskId),
	});
}

export function useTaskComments({
	businessId,
	taskId,
}: {
	businessId: string;
	taskId: string;
}) {
	return useQuery({
		queryKey: tasksQueryKeys.comments(businessId, taskId),
		queryFn: () => getTaskComments({ businessId, taskId }),
		enabled: Boolean(businessId && taskId),
	});
}

export function useTaskAttachments({
	businessId,
	taskId,
}: {
	businessId: string;
	taskId: string;
}) {
	return useQuery({
		queryKey: tasksQueryKeys.attachments(businessId, taskId),
		queryFn: () => getTaskAttachments({ businessId, taskId }),
		enabled: Boolean(businessId && taskId),
	});
}

// Task mutations can move a task in the board, change its detail and, through
// its due date or status, its Agenda entry.
function invalidateTaskViews(queryClient: QueryClient, businessId: string) {
	return Promise.all([
		queryClient.invalidateQueries({ queryKey: tasksQueryKeys.all(businessId) }),
		queryClient.invalidateQueries({ queryKey: agendaQueryKeys.all(businessId) }),
	]);
}

function useTaskMutation<TInput, TResult>(
	businessId: string,
	mutationFn: (input: TInput) => Promise<TResult>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onSuccess: () => invalidateTaskViews(queryClient, businessId),
	});
}

export function useCreateTask(businessId: string) {
	return useTaskMutation(businessId, (input: CreateTaskInput) =>
		createTask({ businessId, input }),
	);
}

export function useUpdateTask(businessId: string) {
	return useTaskMutation(
		businessId,
		({ taskId, input }: { taskId: string; input: UpdateTaskInput }) =>
			updateTask({ businessId, taskId, input }),
	);
}

export function useDeleteTask(businessId: string) {
	return useTaskMutation(businessId, (taskId: string) =>
		deleteTask({ businessId, taskId }),
	);
}

export function useAssignTask(businessId: string) {
	return useTaskMutation(
		businessId,
		(input: {
			taskId: string;
			version: number;
			assigneeMemberId: string | null;
		}) => assignTask({ businessId, ...input }),
	);
}

// Moves the card in every cached list immediately. On failure nothing is
// rolled back: a snapshot could overwrite a later move, so the views reload
// from the server once the last in-flight status change settles.
export function useChangeTaskStatus(businessId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationKey: statusMutationKey(businessId),
		mutationFn: (input: {
			taskId: string;
			version: number;
			status: TaskStatus;
		}) => changeTaskStatus({ businessId, ...input }),
		onMutate: async ({ taskId, status }) => {
			await queryClient.cancelQueries({
				queryKey: tasksQueryKeys.lists(businessId),
			});
			queryClient.setQueriesData<Task[]>(
				{ queryKey: tasksQueryKeys.lists(businessId) },
				(tasks) =>
					tasks?.map((task) =>
						task.id === taskId ? { ...task, status } : task,
					),
			);
		},
		onSettled: () =>
			queryClient.isMutating({ mutationKey: statusMutationKey(businessId) }) ===
			1
				? invalidateTaskViews(queryClient, businessId)
				: undefined,
	});
}

function useTaskDetailMutation<TInput, TResult>(
	businessId: string,
	taskId: string,
	mutationFn: (input: TInput) => Promise<TResult>,
) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: tasksQueryKeys.detail(businessId, taskId),
			}),
	});
}

export function useCreateTaskComment(businessId: string, taskId: string) {
	return useTaskDetailMutation(businessId, taskId, (body: string) =>
		createTaskComment({ businessId, taskId, body }),
	);
}

export function useUploadTaskAttachment(businessId: string, taskId: string) {
	return useTaskDetailMutation(businessId, taskId, (file: File) =>
		uploadTaskAttachment({ businessId, taskId, file }),
	);
}

export function useDeleteTaskAttachment(businessId: string, taskId: string) {
	return useTaskDetailMutation(businessId, taskId, (attachmentId: string) =>
		deleteTaskAttachment({ businessId, taskId, attachmentId }),
	);
}

export function useTaskAttachmentDownload(businessId: string, taskId: string) {
	return useMutation({
		mutationFn: (attachmentId: string) =>
			getTaskAttachmentDownload({ businessId, taskId, attachmentId }),
	});
}
