import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getConfig } from "../config/config";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | undefined;
let db: ReturnType<typeof createDatabase> | undefined;

function createDatabase() {
	client = postgres(getConfig().databaseUrl);
	return drizzle(client, { schema });
}

export function getDb() {
	return (db ??= createDatabase());
}

export function getDatabaseClient() {
	getDb();
	return client!;
}
