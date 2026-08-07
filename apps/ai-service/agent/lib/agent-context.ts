import type { ToolContext } from "eve/tools";

type AuthAttributes = Record<string, unknown>;

export type OikentraAgentContext = {
	userId: string;
	businessId: string;
	sessionId: string;
	timezone: string;
	currency: string;
	internalAuthToken?: string;
};

function stringAttribute(attributes: AuthAttributes | undefined, key: string) {
	const value = attributes?.[key];
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolveOikentraContext(ctx: ToolContext): OikentraAgentContext {
	const current = ctx.session.auth.current;
	const attributes = current?.attributes as AuthAttributes | undefined;

	const userId =
		stringAttribute(attributes, "userId") ??
		current?.principalId ??
		process.env.OIKENTRA_AGENT_USER_ID?.trim() ??
		process.env.INTERNAL_AUTH_DEV_USER_ID?.trim();

	const businessId =
		stringAttribute(attributes, "businessId") ??
		process.env.OIKENTRA_AGENT_BUSINESS_ID?.trim();

	if (!userId) {
		throw new Error(
			"OIKENTRA_AGENT_USER_ID is required when route auth does not provide a user.",
		);
	}

	if (!businessId) {
		throw new Error(
			"OIKENTRA_AGENT_BUSINESS_ID is required until app route auth forwards the active business.",
		);
	}

	return {
		userId,
		businessId,
		sessionId: stringAttribute(attributes, "sessionId") ?? ctx.session.id,
		timezone:
			stringAttribute(attributes, "timezone") ??
			process.env.OIKENTRA_AGENT_TIMEZONE?.trim() ??
			"America/Bogota",
		currency:
			stringAttribute(attributes, "currency") ??
			process.env.OIKENTRA_AGENT_CURRENCY?.trim() ??
			"COP",
		internalAuthToken: stringAttribute(attributes, "internalAuthToken"),
	};
}
