import { defineEval } from "eve/evals";

export default defineEval({
	description: "Uses period comparison for sales-vs-yesterday questions.",
	tags: ["read-only", "requires-business-data"],
	async test(t) {
		if (!process.env.OIKENTRA_AGENT_BUSINESS_ID) {
			t.skip(
				"Requires OIKENTRA_AGENT_BUSINESS_ID and a seeded business service.",
			);
			return;
		}

		await t.send("¿Vendí más hoy que ?");

		t.succeeded();
		t.calledTool("compare_business_periods");
		t.maxToolCalls(2);
	}, 
});
