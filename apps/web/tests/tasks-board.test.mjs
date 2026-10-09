import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pathFromWeb = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(pathFromWeb(path), "utf8");
const board = await import("../lib/task-board.ts").catch(() => ({}));

const task = (id, overrides = {}) => ({
	id,
	assigneeMemberId: null,
	status: "TODO",
	dueAt: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	...overrides,
});

test("las columnas ordenan por vencimiento ascendente y creación descendente", () => {
	const columns = board.groupTasksByStatus([
		task("sin-fecha-vieja", { createdAt: "2026-01-01T00:00:00.000Z" }),
		task("sin-fecha-nueva", { createdAt: "2026-02-01T00:00:00.000Z" }),
		task("tarde", { dueAt: "2026-05-02T00:00:00.000Z" }),
		task("pronto-vieja", { dueAt: "2026-05-01T00:00:00.000Z" }),
		task("pronto-nueva", {
			dueAt: "2026-05-01T00:00:00.000Z",
			createdAt: "2026-03-01T00:00:00.000Z",
		}),
		task("curso", { status: "IN_PROGRESS" }),
		task("lista", { status: "DONE" }),
	]);

	assert.deepEqual(Object.keys(columns), ["TODO", "IN_PROGRESS", "DONE"]);
	assert.deepEqual(
		columns.TODO.map((item) => item.id),
		["pronto-nueva", "pronto-vieja", "tarde", "sin-fecha-nueva", "sin-fecha-vieja"],
	);
	assert.deepEqual(columns.IN_PROGRESS.map((item) => item.id), ["curso"]);
	assert.deepEqual(columns.DONE.map((item) => item.id), ["lista"]);
});

test("los filtros viajan en el query string y se traducen a la API", () => {
	const filters = board.parseTaskBoardFilters(
		new URLSearchParams("vista=mias&prioridad=HIGH&q=pintar"),
	);
	assert.deepEqual(filters, {
		view: "mine",
		memberId: "",
		priority: "HIGH",
		search: "pintar",
	});
	assert.equal(
		board.taskBoardQueryString(filters),
		"vista=mias&prioridad=HIGH&q=pintar",
	);
	assert.deepEqual(board.toTaskApiFilters(filters), {
		mine: true,
		priority: "HIGH",
		search: "pintar",
	});

	const byMember = board.parseTaskBoardFilters(
		new URLSearchParams("integrante=m1&prioridad=invalida"),
	);
	assert.equal(board.taskBoardQueryString(byMember), "integrante=m1");
	assert.deepEqual(board.toTaskApiFilters(byMember), { assigneeMemberId: "m1" });
	assert.equal(board.taskBoardQueryString(board.parseTaskBoardFilters(new URLSearchParams())), "");
	assert.deepEqual(
		board.toTaskApiFilters(board.parseTaskBoardFilters(new URLSearchParams("vista=sin-asignar"))),
		{ unassigned: true },
	);
});

test("solo propietarios, administradores y el responsable cambian el estado", () => {
	const mine = task("a", { assigneeMemberId: "m1" });
	assert.equal(board.canChangeTaskStatus({ role: "OWNER", memberId: "x", task: mine }), true);
	assert.equal(board.canChangeTaskStatus({ role: "MANAGER", memberId: "x", task: mine }), true);
	assert.equal(board.canChangeTaskStatus({ role: "OPERATOR", memberId: "m1", task: mine }), true);
	assert.equal(board.canChangeTaskStatus({ role: "OPERATOR", memberId: "m2", task: mine }), false);
	assert.equal(board.canChangeTaskStatus({ role: "OPERATOR", memberId: "m1", task: task("b") }), false);
});

test("un operador solo puede asignarse a sí mismo", () => {
	const members = [{ id: "m1" }, { id: "m2" }];
	assert.deepEqual(board.assignableMembers({ role: "OPERATOR", memberId: "m1", members }), [{ id: "m1" }]);
	assert.deepEqual(board.assignableMembers({ role: "MANAGER", memberId: "m1", members }), members);
});

test("el tablero tiene ruta, navegación y tres columnas Kanban", () => {
	assert.equal(existsSync(pathFromWeb("app/dashboard/[businessId]/tareas/page.tsx")), true);
	assert.match(read("app/dashboard/[businessId]/tareas/page.tsx"), /Cargando tareas/);
	assert.match(read("components/app-sidebar.tsx"), /\/tareas/);

	const boardSource = read("components/dashboard/tasks/task-board.tsx");
	for (const part of [
		"Kanban",
		"KanbanBoard",
		"KanbanColumn",
		"KanbanColumnContent",
		"KanbanItem",
		"KanbanOverlay",
	]) {
		assert.match(boardSource, new RegExp(`<${part}\\b`));
	}
	assert.match(read("components/dashboard/tasks/task-card.tsx"), /<KanbanItemHandle\b/);
	assert.match(boardSource, /onValueChange=/);
	assert.match(boardSource, /onValueCommit=/);
	assert.doesNotMatch(boardSource, /KanbanColumnHandle/);
	assert.deepEqual(Object.values(board.taskStatusLabels), [
		"Pendiente",
		"En curso",
		"Completada",
	]);
});

test("la página ofrece reintento, nueva tarea y filtros", () => {
	const page = read("components/dashboard/tasks/tasks-page.tsx");
	for (const label of ["Reintentar", "Nueva tarea", "Mis tareas", "Sin asignar", "Todas"]) {
		assert.match(page, new RegExp(label));
	}
	assert.match(read("components/dashboard/tasks/create-task-dialog.tsx"), /Sin asignar/);
});
