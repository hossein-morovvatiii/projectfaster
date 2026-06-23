import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../src/db/index";
import { users, cards, groups } from "../../../src/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Host-isolated, auto-seeding default credentials to avoid empty databases
// Host-isolated, auto-seeding default credentials to avoid empty databases
const DEFAULT_SQL_USERS = [
  { id: 9991, uid: null, username: "admin", password: "admin", name: "مدیر سیستم", isAdmin: true, role: "super_admin", parentId: null, isSuspended: false },
  { id: 9992, uid: null, username: "editor", password: "editor", name: "ادیتور ارشد", isAdmin: false, role: "editor", parentId: null, isSuspended: false }
];

let isInitialized = false;

// Automatically handles table creation for Supabase so users don't need to run manual SQL migrations
async function ensureTablesAndDefaults() {
  if (!isInitialized) {
    try {
      // 1. Double check and create the 'users' table if it does not exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          uid TEXT UNIQUE,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          name TEXT NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE NOT NULL,
          role TEXT DEFAULT 'editor' NOT NULL,
          parent_id INTEGER,
          is_suspended BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      // Ensure existing databases get the role and parent_id column dynamically
      try {
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'editor' NOT NULL;`);
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id INTEGER;`);
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image TEXT;`);
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS access_limit TEXT DEFAULT 'all_time' NOT NULL;`);
        await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP;`);
      } catch (colErr) {
        console.warn("Column addition helper skipped or failed", colErr);
      }

      // 2. Double check and create the 'groups' table if it does not exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS groups (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      // 3. Double check and create the 'cards' table if it does not exist
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS cards (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          title TEXT NOT NULL,
          "desc" TEXT NOT NULL,
          group_name TEXT NOT NULL,
          tags TEXT NOT NULL,
          completed BOOLEAN DEFAULT FALSE NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      isInitialized = true;
      console.log("Supabase/PostgreSQL database tables verified or successfully created.");
    } catch (err: any) {
      console.error("Warning: could not complete automatic table creation step", err);
      throw new Error(`خطا در ایجاد خودکار جدول‌ها در دیتابیس Supabase: ${err.message || err}`);
    }
  }

  // Auto-seed default accounts
  try {
    const list = await db.select().from(users).limit(5);
    if (list.length === 0) {
      console.log("Database 'users' table is empty. Auto-seeding default users...");
      for (const du of DEFAULT_SQL_USERS) {
        await db.insert(users).values({
          id: du.id,
          uid: du.uid,
          username: du.username,
          password: du.password,
          name: du.name,
          isAdmin: du.isAdmin,
          role: du.role,
          parentId: du.parentId,
          isSuspended: du.isSuspended,
        }).onConflictDoNothing();
      }
    }
  } catch (err: any) {
    console.error("Failed to seed default users:", err);
    throw new Error(`خطا در نمونه‌سازی کاربران پیش‌فرض دیتابیس: ${err.message || err}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL || process.env.SQL_DATABASE_URL || "";
    
    // Fallback environment scan for connection strings named as custom keys
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

    if (!connectionString) {
      return NextResponse.json({
        success: false,
        error: "DATABASE_URL_MISSING",
        error_fa: "خطای دیتابیس: آدرس دیتابیس (DATABASE_URL) تعریف نشده است. لطفاً یک متغیر با نام exact 'DATABASE_URL' در بخش Variables and secrets با مقدار لینک اتصال Supabase بسازید."
      });
    }

    if (connectionString.includes("[YOUR-PASSWORD]") || connectionString.includes("[YOUR_PASSWORD]") || connectionString.includes("YOUR-PASSWORD")) {
      return NextResponse.json({
        success: false,
        error: "PLACEHOLDER_PASSWORD_DETECTED",
        error_fa: "خطای دیتابیس: شما عبارت پیش‌فرض [YOUR-PASSWORD] را با رمز عبور واقعی دیتابیس خود در Supabase جایگزین نکرده‌اید! لطفاً در منوی Variables and secrets رمز عبور واقعی دیتابیس فیزیکی خود را وارد کنید تا اتصال کار کند."
      });
    }

    const colonMatch = connectionString.match(/postgres([^:@\/]+)@/);
    if (colonMatch) {
      return NextResponse.json({
        success: false,
        error: "MISSING_PASSWORD_COLON",
        error_fa: `خطای دیتابیس: به نظر می‌رسد زمان وارد کردن رمز عبور در آدرس دیتابیس، علامت دو نقطه (:) (که جداکننده لغت postgres و پسورد شماست) را جا انداخته‌اید یا پاک کرده‌اید! آدرس دیتابیس شما در حال حاضر به شکل postgres${colonMatch[1]}@ است. لطفاً در بخش Secrets آن را به صورت postgres:${colonMatch[1]}@ اصلاح و ذخیره کنید.`
      });
    }

    const body = await req.json();
    const { action, payload, table } = body;

    // Read the current authenticated user's credentials from requests headers if present
    const usernameHeader = req.headers.get("x-user-username") || "";

    // 1. Ensure Postgres default users are seeded before handling any query
    await ensureTablesAndDefaults();

    // 2. Route traffic based on "table"
    const isUsersTable = table === "hossien_users";

    if (isUsersTable) {
      if (action === "fetch") {
        // Retrieve the entire list of users from Cloud SQL PostgreSQL
        const allUsers = await db.select().from(users);
        const mappedUsers = allUsers.map((u: any) => ({
          id: u.id.toString(),
          username: u.username,
          password: u.password,
          name: u.name,
          is_admin: u.isAdmin || u.role === "super_admin",
          role: u.role || "editor",
          parent_id: u.parentId ? u.parentId.toString() : null,
          is_suspended: u.isSuspended,
          profile_image: u.profileImage,
          access_limit: u.accessLimit || "all_time",
          valid_until: u.validUntil ? u.validUntil.toISOString() : null,
          created_at: u.createdAt,
        }));

        return NextResponse.json({ success: true, data: mappedUsers });
      }

      if (action === "upsert") {
        const { id, username, password, name, is_admin, role, parent_id, is_suspended, profile_image, access_limit, valid_until } = payload;
        
        // Find existing user by ID (represented as string in frontend, need integer)
        let userIdNum = parseInt(id);
        let exists = false;
        
        if (!isNaN(userIdNum)) {
          const checkUser = await db.select().from(users).where(eq(users.id, userIdNum));
          if (checkUser.length > 0) exists = true;
        }

        const finalRole = role || (is_admin ? "super_admin" : "editor");
        const finalParentId = parent_id ? parseInt(parent_id) : null;
        const finalValidUntil = valid_until ? new Date(valid_until) : null;

        if (exists && !isNaN(userIdNum)) {
          // Update user
          await db.update(users)
            .set({
              username: username,
              password: password,
              name: name,
              isAdmin: finalRole === "super_admin",
              role: finalRole,
              parentId: finalParentId,
              isSuspended: !!is_suspended,
              profileImage: profile_image || null,
              accessLimit: access_limit || "all_time",
              validUntil: finalValidUntil,
            })
            .where(eq(users.id, userIdNum));
            
          return NextResponse.json({ success: true, data: { ...payload, role: finalRole, parent_id: finalParentId, valid_until: finalValidUntil ? finalValidUntil.toISOString() : null } });
        } else {
          // Insert new user
          const result = await db.insert(users)
            .values({
              username: username,
              password: password,
              name: name,
              isAdmin: finalRole === "super_admin",
              role: finalRole,
              parentId: finalParentId,
              isSuspended: !!is_suspended,
              profileImage: profile_image || null,
              accessLimit: access_limit || "all_time",
              validUntil: finalValidUntil,
            })
            .returning();
            
          const saved = result[0];
          return NextResponse.json({
            success: true,
            data: {
              id: saved.id.toString(),
              username: saved.username,
              password: saved.password,
              name: saved.name,
              is_admin: saved.isAdmin || saved.role === "super_admin",
              role: saved.role,
              parent_id: saved.parentId ? saved.parentId.toString() : null,
              is_suspended: saved.isSuspended,
              profile_image: saved.profileImage,
              access_limit: saved.accessLimit,
              valid_until: saved.validUntil ? saved.validUntil.toISOString() : null,
              created_at: saved.createdAt,
            }
          });
        }
      }

      if (action === "delete") {
        const { id } = payload;
        const userIdNum = parseInt(id);
        if (!isNaN(userIdNum)) {
          await db.delete(users).where(eq(users.id, userIdNum));
          return NextResponse.json({ success: true });
        }
        return NextResponse.json({ success: false, error: "INVALID_ID" });
      }
    }

    // Default table: "cards" / Videos
    // To implement Workspace Partitioning: "میخوام هرکاربری مدیر ثبت میکنه workspace خودش رو داشته باشه و تمامی ویدیو هاش رو یوزر خودش ثبت بشه"
    // We MUST filter and fetch ONLY cards belonging to the logged-in user or their brand parent!
    
    // Resolve logged in user from headers
    if (!usernameHeader) {
      console.warn("No x-user-username header passed to /api/supabase");
    }

    // Lookup user in DB to find their integer ID and role
    let currentDbUser = null;
    if (usernameHeader) {
      const userResult = await db.select().from(users).where(eq(users.username, usernameHeader));
      if (userResult.length > 0) {
        currentDbUser = userResult[0];
      }
    }

    // Default/fallback user is the default admin if no header is found
    if (!currentDbUser) {
      const defaultAdmin = await db.select().from(users).where(eq(users.username, "admin"));
      if (defaultAdmin.length > 0) {
        currentDbUser = defaultAdmin[0];
      }
    }

    // If still no user, return empty or unauthorized
    if (!currentDbUser) {
      return NextResponse.json({ success: false, error: "USER_NOT_FOUND" });
    }

    const currentUserId = currentDbUser.id;
    const currentUserRole = currentDbUser.role || (currentDbUser.isAdmin ? "super_admin" : "editor");
    
    // Determine which workspace ID we are targeting
    // For editor and viewer, target the parent admin's ID. Otherwise, target themselves.
    const targetWorkspaceOwnerId = (currentUserRole === "editor" || currentUserRole === "viewer")
      ? (currentDbUser.parentId || currentUserId)
      : currentUserId;

    if (action === "fetch") {
      let userCards;
      
      // Super admin can access and collaborate on EVERYTHING ("مدیر کل: میتونه همکاری بکنه")
      if (currentUserRole === "super_admin") {
        userCards = await db.select().from(cards);
      } else {
        userCards = await db.select().from(cards).where(eq(cards.userId, targetWorkspaceOwnerId));
      }
      
      const mapped = userCards.map((c: any) => ({
        id: c.id,
        user_id: c.userId,
        url: c.url,
        title: c.title,
        description: c.desc,
        group_name: c.groupName,
        tags: c.tags,
        completed: c.completed,
        created_at: c.createdAt,
      }));

      return NextResponse.json({ success: true, data: mapped });
    }

    if (action === "upsert") {
      const { id, title, description, video_url, group_name, tags, completed } = payload;

      // 1. Viewer Role Security Guard ("Viewer هم فقط میتونه ببینه و غیر از دیدن هیچ کاری نمیتونه بکنه")
      if (currentUserRole === "viewer") {
        return NextResponse.json({
          success: false,
          error: "UNAUTHORIZED_ROLE",
          error_fa: "خطای دسترسی: کاربر با نقش Viewer مجاز به ثبت، ویرایش یا تغییر وضعیت ویدیو نیست."
        });
      }

      // Check if this card already exists in the Postgres DB
      const existing = await db.select().from(cards).where(eq(cards.id, id));
      const exists = existing.length > 0;

      // 2. Editor Role Security Guards ("ادیتور فقط میتونه ویدیو اپلود بکنه ... ولی نمیتونه نه حذف نه ویرایش بکنه و نه ویدیو هارو رو (انجام شد) بزاره")
      if (currentUserRole === "editor") {
        if (exists) {
          return NextResponse.json({
            success: false,
            error: "UNAUTHORIZED_ROLE",
            error_fa: "خطای دسترسی: کاربران ادیتور امکان ویرایش ویدیوهای ثبت‌شده قبلی را ندارند."
          });
        }
        if (completed) {
          return NextResponse.json({
            success: false,
            error: "UNAUTHORIZED_ROLE",
            error_fa: "خطای دسترسی: ادیتورها مجاز به تغییر وضعیت انجام شده (نماد تیک نهایی) ویدیو نیستند."
          });
        }
      }

      if (exists) {
        // Update (ensure standard users don't override other workspaces)
        let updateQuery = db.update(cards)
          .set({
            url: video_url || "",
            title: title || "",
            desc: description || "",
            groupName: group_name || "عمومی",
            tags: tags || "",
            completed: !!completed,
          });

        if (currentUserRole === "super_admin") {
          await updateQuery.where(eq(cards.id, id));
        } else {
          await updateQuery.where(and(eq(cards.id, id), eq(cards.userId, targetWorkspaceOwnerId)));
        }
      } else {
        // Insert
        await db.insert(cards)
          .values({
            id: id,
            userId: targetWorkspaceOwnerId, // Save card in the parent brand workspace partition!
            url: video_url || "",
            title: title || "",
            desc: description || "",
            groupName: group_name || "عمومی",
            tags: tags || "",
            completed: !!completed,
          });
      }

      return NextResponse.json({ success: true, data: payload });
    }

    if (action === "delete") {
      const { id } = payload;

      // Editor or Viewer cannot delete! ("نه حذف و نه ویرایش")
      if (currentUserRole === "editor" || currentUserRole === "viewer") {
        return NextResponse.json({
          success: false,
          error: "UNAUTHORIZED_ROLE",
          error_fa: "خطای دسترسی: کاربران ادیتور یا بیننده اجازه حذف ویدیوها را ندارند."
        });
      }

      if (currentUserRole === "super_admin") {
        await db.delete(cards).where(eq(cards.id, id));
      } else {
        await db.delete(cards).where(and(eq(cards.id, id), eq(cards.userId, targetWorkspaceOwnerId)));
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "INVALID_ACTION" });
  } catch (error: any) {
    console.error("Database Proxy Error:", error);
    const connectionString = process.env.DATABASE_URL || "";
    let extraSuggestion = "";
    if (connectionString.includes("[") || connectionString.includes("]")) {
      extraSuggestion = " دقت کنید که علامت‌های کروشه '[' و ']' نیز باید حذف شوند و فقط رمز عبور قرار گیرد.";
    }
    const colonMatch = connectionString.match(/postgres([^:@\/]+)@/);
    if (colonMatch) {
      extraSuggestion += ` همچنین به نظر می‌رسد دونقطه (:) بعد از کلمه postgres فراموش شده است (به صورت postgres${colonMatch[1]}@ وارد شده، در حالی که باید به صورت postgres:${colonMatch[1]}@ باشد).`;
    }
    return NextResponse.json({
      success: false,
      error: "SERVER_ERROR",
      message: error.message || "An unexpected error occurred during database operation",
      error_fa: `اتصال به دیتابیس Supabase برقرار نشد. متن خطا: ${error.message || ""}.${extraSuggestion} لطفاً صحت نام دیتابیس، آدرس سرور پورت، و عدم بسته‌بودن پورت ۵۴۳۲ یا ۶۵۴۳ را چک کنید.`
    });
  }
}
