import type { Env } from "hono";

export type AuthContext = {
	userId: string;
	sessionId: string;
};

export type BusinessContext = {
	id: string;
	name: string;
	currencyCode: string;
	timezone: string;
	status: string;
};

export type AppBindings = Env & {
	Variables: {
		requestId: string;
		auth: AuthContext;
		business: BusinessContext;
	};
};
