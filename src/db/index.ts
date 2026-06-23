import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let lastConnectionString = "";
let currentPool: any = null;
let currentDrizzle: any = null;

/**
 * در Cloudflare Workers، متغیرهای محیطی از طریق process.env در دسترس نیستند.
 * باید از طریق آبجکت env (که Cloudflare موقع هر request پاس می‌دهد) خوانده شوند.
 * این تابع باید با env.HYPERDRIVE.connectionString صدا زده شود.
 */
export function getLatestDb(env?: any) {
  // اولویت با Hyperdrive binding است (روش درست برای Cloudflare Workers)
  let connectionString =
    env?.HYPERDRIVE?.connectionString ||
    env?.DATABASE_URL ||
    // fallback برای اجرای لوکال (npm run dev) که در آن process.env کار می‌کند
    (typeof process !== "undefined" ? process.env?.DATABASE_URL : "") ||
    "";

  // Re-initialize pool if connection string changed (or on first load)
  if (!currentDrizzle || connectionString !== lastConnectionString) {
    if (currentPool) {
      currentPool.end().catch(() => {});
    }

    lastConnectionString = connectionString;

    if (connectionString) {
      currentPool = new Pool({
        connectionString,
        connectionTimeoutMillis: 15000,
        // Hyperdrive خودش SSL را مدیریت می‌کند، پس این فقط برای اتصال لوکال/مستقیم لازم است
        ssl: connectionString.includes("supabase") || connectionString.includes("neon") || connectionString.includes("aws")
          ? { rejectUnauthorized: false }
          : undefined,
      });
    } else {
      throw new Error(
        "DATABASE_URL پیدا نشد. مطمئن شو Hyperdrive binding (HYPERDRIVE) را در wrangler.jsonc تعریف کرده‌ای و آن را به Worker پاس می‌دهی."
      );
    }

    currentPool.on("error", (err: any) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });

    currentDrizzle = drizzle(currentPool, { schema });
  }

  return currentDrizzle;
}

/**
 * توجه: استفاده از این Proxy فقط برای محیط لوکال (Node.js) که process.env کار می‌کند مناسب است.
 * در کد سمت Worker (روی Cloudflare)، باید مستقیماً getLatestDb(env) را در هر route/handler صدا بزنی
 * تا Hyperdrive binding درست پاس داده شود. مثال:
 *
 *   export default {
 *     async fetch(request, env, ctx) {
 *       const db = getLatestDb(env);
 *       const result = await db.select().from(schema.users);
 *       ...
 *     }
 *   }
 */
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    const underlyingDb = getLatestDb();
    const val = Reflect.get(underlyingDb, prop, receiver);
    if (typeof val === "function") {
      return val.bind(underlyingDb);
    }
    return val;
  }
});
