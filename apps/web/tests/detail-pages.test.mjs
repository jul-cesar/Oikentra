import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
	readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("fiados y préstamos abren su detalle en páginas dedicadas", () => {
	const fiados = read("components/dashboard/fiados/fiados-page.tsx");
	const prestamos = read("components/dashboard/prestamos/prestamos-page.tsx");
	const customerDetail = read(
		"components/dashboard/fiados/customer-detail.tsx",
	);
	const loanDetail = read("components/dashboard/prestamos/loan-detail.tsx");

	assert.match(fiados, /fiados\/\$\{customer\.id\}/);
	assert.match(prestamos, /prestamos\/\$\{loan\.id\}/);
	assert.doesNotMatch(customerDetail, /<Dialog\b/);
	assert.doesNotMatch(loanDetail, /<Dialog\b/);
	read("app/dashboard/[businessId]/fiados/[customerId]/page.tsx");
	read("app/dashboard/[businessId]/prestamos/[loanId]/page.tsx");
});
