import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pathFromWeb = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(pathFromWeb(path), "utf8");

export function assertDashboardVisualPolicy(paths) {
	for (const path of paths) {
		const source = read(path);
		assert.doesNotMatch(source, /\brounded-3xl\b/, `${path} usa rounded-3xl`);
		assert.doesNotMatch(
			source,
			/\bshadow-(?:md|xl|2xl)\b/,
			`${path} usa una sombra decorativa`,
		);
	}
}

test("dashboard shell owns canonical gutters", () => {
	const shell = read("components/dashboard/dashboard-shell.tsx");

	assert.match(shell, /px-3 py-5 sm:px-4 sm:py-8 lg:px-8/);
});

test("dashboard page exposes default and wide widths", () => {
	const componentPath = pathFromWeb(
		"components/dashboard/dashboard-page.tsx",
	);
	assert.equal(existsSync(componentPath), true, "falta DashboardPage");

	const page = read("components/dashboard/dashboard-page.tsx");
	assert.match(page, /width = "default"/);
	assert.match(page, /max-w-5xl/);
	assert.match(page, /max-w-none/);
	assert.match(page, /mx-auto w-full space-y-5 sm:space-y-6/);
});

test("shared primitives match the approved baseline", () => {
	const card = read("components/ui/card.tsx");
	const input = read("components/ui/input.tsx");
	const dialog = read("components/ui/dialog.tsx");

	assert.match(card, /rounded-xl/);
	assert.match(input, /h-8 w-full min-w-0 rounded-lg/);
	assert.match(dialog, /rounded-xl border bg-popover p-6/);
	assert.match(dialog, /shadow-lg/);
});

test("home and summary screens follow Caja hierarchy", () => {
	const paths = [
		"app/dashboard/page.tsx",
		"components/dashboard/dashboard/dashboard-page.tsx",
		"components/dashboard/resumen-general/resumen-general-page.tsx",
		"components/dashboard/business-dashboard.tsx",
	];
	assertDashboardVisualPolicy(paths);

	for (const path of paths.slice(1)) {
		const source = read(path);
		assert.match(source, /components\/dashboard\/dashboard-page/);
		assert.match(source, /<DashboardPage/);
		assert.match(source, /text-3xl font-semibold tracking-tight/);
		assert.match(source, /text-sm text-muted-foreground/);
	}

	const dashboard = read("components/dashboard/dashboard/dashboard-page.tsx");
	assert.match(dashboard, /rounded-xl border bg-card p-5/);
	assert.doesNotMatch(dashboard, /hover:shadow-md/);

	const statistics = read("components/dashboard/business-dashboard.tsx");
	assert.match(statistics, /rounded-2xl/);
});

test("agenda follows the wide Caja hierarchy", () => {
	const path = "components/dashboard/agenda/agenda-page.tsx";
	const agenda = read(path);

	assertDashboardVisualPolicy([path]);
	assert.match(agenda, /components\/dashboard\/dashboard-page/);
	assert.match(agenda, /<DashboardPage width="wide">/);
	assert.match(agenda, /text-3xl font-semibold tracking-tight/);
	assert.match(agenda, /text-sm text-muted-foreground/);
	assert.doesNotMatch(agenda, /max-w-5xl/);
	assert.doesNotMatch(agenda, /shadow-sm/);
});

test("task screens follow the dashboard visual contract", () => {
	const paths = [
		"components/dashboard/tasks/tasks-page.tsx",
		"components/dashboard/tasks/create-task-page.tsx",
		"components/dashboard/tasks/task-detail.tsx",
		"components/dashboard/tasks/task-board.tsx",
		"components/dashboard/tasks/task-card.tsx",
		"components/dashboard/tasks/edit-task-dialog.tsx",
		"components/dashboard/tasks/task-attachments.tsx",
		"components/dashboard/tasks/attachment-dropzone.tsx",
		"components/dashboard/tasks/task-comments.tsx",
	];
	assertDashboardVisualPolicy(paths);

	const list = read(paths[0]);
	const create = read(paths[1]);
	const detail = read(paths[2]);
	const card = read(paths[4]);

	assert.match(list, /<DashboardPage width="wide">/);
	assert.match(create, /<DashboardPage>/);
	assert.match(detail, /<DashboardPage className="max-w-3xl">/);
	for (const source of [list, create, detail]) {
		assert.match(source, /text-3xl font-semibold tracking-tight/);
		assert.match(source, /text-sm text-muted-foreground/);
	}
	assert.match(card, /min-w-0 flex-1/);
	assert.match(card, /rounded-full/);
});

test("customers and portfolio follow the Caja hierarchy", () => {
	const paths = [
		"components/dashboard/customers/customers-page.tsx",
		"components/dashboard/customers/create-customer-dialog.tsx",
		"components/dashboard/cartera/cartera-page.tsx",
	];
	assertDashboardVisualPolicy(paths);

	const customers = read(paths[0]);
	const portfolio = read(paths[2]);
	assert.match(customers, /<DashboardPage width="wide">/);
	assert.match(portfolio, /<DashboardPage>/);
	for (const source of [customers, portfolio]) {
		assert.match(source, /text-3xl font-semibold tracking-tight/);
		assert.match(source, /text-sm text-muted-foreground/);
		assert.match(source, /tabular-nums/);
	}
	assert.match(customers, /min-w-0/);
	assert.match(customers, /truncate font-medium/);
	assert.match(portfolio, /rounded-2xl bg-primary/);
	assert.doesNotMatch(portfolio, /space-y-6 px-3 py-5/);
});
