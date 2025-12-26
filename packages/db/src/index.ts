import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg, { type PoolConfig } from "pg";

import * as schema from "./schema.js";

const poolConfig: PoolConfig = {
	connectionString: process.env.DATABASE_URL,
	keepAlive: true,
	keepAliveInitialDelayMillis: 10000,
};

export const pool = new pg.Pool(poolConfig);
export type DB = NodePgDatabase<typeof schema>;
export const db: DB = drizzle(pool, {
	schema,
	// logger: env.SERVER_ENV === "development",
});
export async function checkDatabaseConnection(): Promise<boolean> {
	try {
		const client = await pool.connect();
		await client.query("SELECT 1");
		client.release();
		return true;
	} catch (error) {
		console.error("Database connection check failed:", error);
		return false;
	}
}

export async function executeTransaction<T>(
	db: DB,
	callback: (tx: DB) => Promise<T>,
): Promise<T> {
	return await db.transaction(callback);
}
