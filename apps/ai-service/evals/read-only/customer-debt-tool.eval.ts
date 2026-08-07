import { defineEval } from "eve/evals";

export default defineEval({
	description: "Uses customer search before consulting a named customer's debt.",
	tags: ["read-only", "requires-business-data"],
	async test(t) {
		if (!process.env.OIKENTRA_AGENT_BUSINESS_ID) {
			t.skip("Requires OIKENTRA_AGENT_BUSINESS_ID and a seeded business service.");
			return;
		}

		await t.send("¿Cuánto me debe Julio?");

		t.succeeded();
		t.calledTool("find_customer");
		t.toolOrder(["find_customer"]);
		t.maxToolCalls(3);
	},
});
