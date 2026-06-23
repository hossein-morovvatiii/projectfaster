import { pgTable, serial, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").unique(), // Firebase Auth UID (for Google login fallback if used)
  username: text("username").notNull().unique(), // Unique login identifier
  password: text("password").notNull(), // Ssh-hashed or plain password (as used in standard)
  name: text("name").notNull(), // Display name
  isAdmin: boolean("is_admin").default(false).notNull(), // Admin role
  role: text("role").default("editor").notNull(), // 'super_admin' | 'admin' | 'editor' | 'viewer'
  parentId: integer("parent_id"), // ID of the brand admin who created this account
  isSuspended: boolean("is_suspended").default(false).notNull(), // Suspension status
  profileImage: text("profile_image"), // URL of user's profile image
  accessLimit: text("access_limit").default("all_time").notNull(), // '1' | '2' | '3' | '6' | 'all_time'
  validUntil: timestamp("valid_until"), // Expiration date/time for user access
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cards = pgTable("cards", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  desc: text("desc").notNull(),
  groupName: text("group_name").notNull(),
  tags: text("tags").notNull(), // Stored as comma-separated tags or JSON
  completed: boolean("completed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
