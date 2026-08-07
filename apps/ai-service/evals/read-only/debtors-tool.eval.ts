import { defineEval } from "eve/evals";

export default defineEval({
	description: "Uses debtor listing for collection questions.",
	tags: ["read-only", "requires-business-data"],
	async test(t) {
		if (!process.env.OIKENTRA_AGENT_BUSINESS_ID) {
			t.skip(
				"Requires OIKENTRA_AGENT_BUSINESS_ID and a seeded business service.",
			);
			return;
		}

		await t.send("¿Quiénes me deben y a quién debería cobrar primero?");

		t.succeeded();
		t.calledTool("list_debtors");
		t.maxToolCalls(2);
	},
});
