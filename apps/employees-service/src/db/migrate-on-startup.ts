import { existsSync } from "node:fs";

import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationsFolder = "./drizzle";

if (!existsSync(`${migrationsFolder}/meta/_journal.json`)) {
	console.log("[migrations] No migrations found; skipping.");
} else {
	const databaseUrl = process.env.DATABASE_URL;
	if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations");

	const client = postgres(databaseUrl, { max: 1 });
	try {
		console.log("[migrations] Applying pending migrations...");
		await migrate(drizzle(client), { migrationsFolder });
		console.log("[migrations] Migrations complete.");
	} finally {
		await client.end();
	}
}
