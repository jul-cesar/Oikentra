import { defineEval } from "eve/evals";

export default defineEval({
	description: "Answers simple greetings without consulting business data.",
	tags: ["read-only", "fast"],
	async test(t) {
		await t.send("Hola");

		t.succeeded();
		t.usedNoTools();
	},
});
