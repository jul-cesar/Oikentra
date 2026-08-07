import { verifyInternalAssertion } from "@oikentra/internal-auth";
import {
	UnauthenticatedError,
	withAuthChallenges,
	type AuthFn,
} from "eve/channels/auth";

const AI_SERVICE_AUDIENCE = "ai-service";
const BUSINESS_ID_HEADER = "x-oikentra-business-id";

function readRequiredPublicKey() {
	const value =
		process.env.OIKENTRA_INTERNAL_AUTH_PUBLIC_KEY_B64?.trim() ??
		process.env.INTERNAL_AUTH_PUBLIC_KEY_B64?.trim();

	if (!value) {
		throw new Error(
			"INTERNAL_AUTH_PUBLIC_KEY_B64 is required to authenticate Oikentra AI requests.",
		);
	}

	return value;
}

function readInternalAuthToken(request: Request) {
	return request.headers.get("x-internal-auth")?.trim() || null;
}

function readActiveBusinessId(request: Request) {
	return request.headers.get(BUSINESS_ID_HEADER)?.trim() || null;
}

export function oikentraInternalAuth(): AuthFn<Request> {
	return withAuthChallenges(
		async (request) => {
			const token = readInternalAuthToken(request);

			// Let vercelOidc/localDev handle non-proxied dev/runtime traffic.
			if (!token) return null;

			const businessId = readActiveBusinessId(request);
			if (!businessId) {
				throw new UnauthenticatedError({
					code: "business_required",
					message: "An active business is required.",
				});
			}

			try {
				const assertion = await verifyInternalAssertion({
					token,
					publicKeyBase64: readRequiredPublicKey(),
					audience: AI_SERVICE_AUDIENCE,
				});

				return {
					authenticator: "oikentra-internal-auth",
					principalType: "user",
					principalId: assertion.userId,
					attributes: {
						userId: assertion.userId,
						sessionId: assertion.sessionId,
						businessId,
						internalAuthToken: token,
					},
				};
			} catch (error) {
				if (error instanceof UnauthenticatedError) throw error;
				throw new UnauthenticatedError({
					code: "invalid_internal_auth",
					message: "A valid authenticated session is required.",
				});
			}
		},
		[{ scheme: "Bearer" }],
	);
}
