import { defineEval } from "eve/evals";

export default defineEval({
	description: "Uses cash movement listing for recent movement questions.",
	tags: ["read-only", "requires-business-data"],
	async test(t) {
		if (!process.env.OIKENTRA_AGENT_BUSINESS_ID) {
			t.skip(
				"Requires OIKENTRA_AGENT_BUSINESS_ID and a seeded business service.",
			);
			return;
		}

		await t.send("Muéstrame los últimos movimientos de caja.");

		t.succeeded();
		t.calledTool("list_cash_movements");
		t.maxToolCalls(2);
	},
});
