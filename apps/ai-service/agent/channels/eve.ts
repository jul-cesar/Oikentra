import { localDev, vercelOidc } from "eve/channels/auth";
import { eveChannel } from "eve/channels/eve";

import { oikentraInternalAuth } from "../lib/route-auth";

export default eveChannel({
	auth: [
		// Browser traffic reaches this service through the web proxy, which
		// validates Better Auth and forwards Oikentra's internal assertion.
		oikentraInternalAuth(),
		// Lets Vercel runtime/internal callers reach the deployed agent.
		vercelOidc(),
		// Open only while running `eve dev` / `vercel dev`; ignored in production.
		localDev(),
	],
});
