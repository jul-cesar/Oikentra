import assert from "node:assert/strict";

import { getAttachmentPreview } from "./attachment-preview";

assert.deepEqual(getAttachmentPreview("image/png", 1_572_864), {
	kind: "image",
	size: "1.5 MB",
});
assert.deepEqual(getAttachmentPreview("application/pdf", 512_000), {
	kind: "pdf",
	size: "500 KB",
});
