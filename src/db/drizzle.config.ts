import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local first (this project's convention), fall back to .env
loadEnv({ path: ".env.local" });
loadEnv();

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.SQL_DATABASE_URL ||
  "";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: {
    url: connectionString,
    ssl: connectionString.includes("supabase") ? { rejectUnauthorized: false } : false,
  },
  verbose: true,
});
