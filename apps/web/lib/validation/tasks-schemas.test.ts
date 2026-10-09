import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { addTaskAttachmentFiles } from "./tasks-schemas";

const file = (name: string, type = "image/png", size = 100) =>
	({ name, type, size }) as File;

describe("addTaskAttachmentFiles", () => {
	it("keeps valid files and reports invalid ones", () => {
		const result = addTaskAttachmentFiles([], [
			file("a.png"),
			file("b.svg", "image/svg+xml"),
			file("c.pdf", "application/pdf", 11 * 1024 * 1024),
		]);
		assert.deepEqual(result.files.map((f) => f.name), ["a.png"]);
		assert.equal(result.errors.length, 2);
	});

	it("never exceeds 10 attachments", () => {
		const current = Array.from({ length: 9 }, (_, i) => file(`${i}.png`));
		const result = addTaskAttachmentFiles(current, [file("x.png"), file("y.png")]);
		assert.equal(result.files.length, 10);
		assert.deepEqual(result.errors, ["Máximo 10 adjuntos por tarea."]);
	});
});
