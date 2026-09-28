import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pathFromWeb = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFileSync(pathFromWeb(path), "utf8");

test("la agenda tiene ruta, navegación y calendario conectado a la API", () => {
	const routePath = pathFromWeb("app/dashboard/[businessId]/agenda/page.tsx");
	const pagePath = pathFromWeb("components/dashboard/agenda/agenda-page.tsx");
	const apiPath = pathFromWeb("lib/agenda-api.ts");

	assert.equal(existsSync(routePath), true, "falta la ruta de agenda");
	assert.equal(existsSync(pagePath), true, "falta la página de agenda");
	assert.equal(existsSync(apiPath), true, "falta el cliente API de agenda");
	assert.match(read("components/app-sidebar.tsx"), /\/agenda/);
	assert.match(
		read("components/dashboard/agenda/agenda-page.tsx"),
		/EventCalendar/,
	);
	assert.match(read("lib/agenda-api.ts"), /\/agenda/);
});

test("el calendario abre en Mes y ofrece los modos Mes, Semana y Día", () => {
	const page = read("components/dashboard/agenda/agenda-page.tsx");

	assert.match(page, /defaultView="month"/);
	assert.match(page, /views=\{\["month", "week", "day"\]\}/);
	assert.match(page, /day: "Día"/);
});

test("el modal usa controles shadcn y recordatorios con más anticipación", () => {
	const page = read("components/dashboard/agenda/agenda-page.tsx");

	assert.match(page, /<DatePicker/);
	assert.match(page, /<TimeSelect/);
	assert.match(page, /<Switch/);
	assert.match(page, /5 minutos antes/);
	assert.match(page, /30 minutos antes/);
	assert.match(page, /3 horas antes/);
	assert.doesNotMatch(page, /<select/);
	assert.doesNotMatch(page, /type="date"/);
	assert.doesNotMatch(page, /type="time"/);
});
