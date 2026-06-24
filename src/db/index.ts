import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let lastConnectionString = "";
let currentPool: any = null;
let currentDrizzle: any = null;

export function getLatestDb() {
  let connectionString =
    process.env.DATABASE_URL ||
    process.env.SUPABASE_DATABASE_URL ||
    process.env.SQL_DATABASE_URL ||
    "";

  // Fallback: search process.env for any key whose value starts with postgres:// or postgresql://
  if (!connectionString) {
    const keys = Object.keys(process.env);
    for (const key of keys) {
      const val = process.env[key] || "";
      if (val.startsWith("postgres://") || val.startsWith("postgresql://")) {
        connectionString = val;
        break;
      }
    }
  }

  // Re-initialize pool if connection string changed (or on first load)
  if (!currentDrizzle || connectionString !== lastConnectionString) {
    if (currentPool) {
      currentPool.end().catch(() => {});
    }

    lastConnectionString = connectionString;

    if (connectionString) {
      const isPlaceholder =
        connectionString.includes("[YOUR-PASSWORD]") ||
        connectionString.includes("[YOUR_PASSWORD]") ||
        connectionString.includes("YOUR-PASSWORD");

      currentPool = new Pool({
        connectionString: isPlaceholder
          ? "postgresql://postgres:PLACEHOLDER@localhost:5432/postgres"
          : connectionString,
        connectionTimeoutMillis: 15000,
        ssl: connectionString.includes("supabase") || connectionString.includes("neon") || connectionString.includes("aws")
          ? { rejectUnauthorized: false }
          : undefined,
      });
    } else {
      currentPool = new Pool({
        host: process.env.SQL_HOST || "localhost",
        user: process.env.SQL_USER || "postgres",
        password: process.env.SQL_PASSWORD || "postgres",
        database: process.env.SQL_DB_NAME || "postgres",
        connectionTimeoutMillis: 15000,
      });
    }

    currentPool.on("error", (err: any) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });

    currentDrizzle = drizzle(currentPool, { schema });
  }

  return currentDrizzle;
}

// Proxy all property accesses to the dynamically loaded drizzle instance
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    const underlyingDb = getLatestDb();
    const val = Reflect.get(underlyingDb, prop, receiver);
    // If the value is a function (like db.select, db.insert, etc), bind it to the real db context
    if (typeof val === "function") {
      return val.bind(underlyingDb);
    }
    return val;
  }
});
