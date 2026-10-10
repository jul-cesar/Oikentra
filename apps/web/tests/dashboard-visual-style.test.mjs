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
