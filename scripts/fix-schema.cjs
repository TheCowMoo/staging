#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const schemaPath = path.join(__dirname, "..", "drizzle", "schema.ts");
const content = fs.readFileSync(schemaPath, "utf8");

const additions = `
// ─── BTAM Case Notes ──────────────────────────────────────────────────────────
export const btamCaseNotes = mysqlTable("btam_case_notes", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  authorId: int("authorId").notNull(),
  noteType: mysqlEnum("noteType", ["observation", "interview", "external_report", "law_enforcement", "legal", "hr", "general"]).notNull(),
  content: text("content").notNull(),
  isPrivileged: boolean("isPrivileged").default(false).notNull(),
  attachments: json("attachments"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type BtamCaseNote = typeof btamCaseNotes.$inferSelect;
export type InsertBtamCaseNote = typeof btamCaseNotes.$inferInsert;

// ─── BTAM Status History ──────────────────────────────────────────────────────
export const btamStatusHistory = mysqlTable("btam_status_history", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  changedBy: int("changedBy").notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
  previousStatus: varchar("previousStatus", { length: 64 }),
  newStatus: varchar("newStatus", { length: 64 }),
  previousConcernLevel: varchar("previousConcernLevel", { length: 32 }),
  newConcernLevel: varchar("newConcernLevel", { length: 32 }),
  reason: text("reason"),
});
export type BtamStatusHistory = typeof btamStatusHistory.$inferSelect;
export type InsertBtamStatusHistory = typeof btamStatusHistory.$inferInsert;

// ─── Micro Drill Assignments ──────────────────────────────────────────────────
export const microDrillAssignments = mysqlTable("micro_drill_assignments", {
  id: int("id").autoincrement().primaryKey(),
  orgId: int("org_id"),
  assignedByUserId: int("assigned_by_user_id").notNull(),
  assignedToUserId: int("assigned_to_user_id"),
  assignedToName: varchar("assigned_to_name", { length: 255 }),
  assignedToEmail: varchar("assigned_to_email", { length: 320 }),
  drillId: int("drill_id").notNull(),
  drillCategory: varchar("drill_category", { length: 255 }).notNull(),
  drillTitle: varchar("drill_title", { length: 255 }).notNull(),
  assignedDate: timestamp("assigned_date").defaultNow().notNull(),
  completionDate: timestamp("completion_date"),
  dueDate: timestamp("due_date"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "expired"]).default("pending").notNull(),
  step1Choice: varchar("step1_choice", { length: 10 }),
  step2Choices: json("step2_choices"),
  considerationsChecked: json("considerations_checked"),
  completedAt: timestamp("completed_at"),
  completedByName: varchar("completed_by_name", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type MicroDrillAssignment = typeof microDrillAssignments.$inferSelect;
export type InsertMicroDrillAssignment = typeof microDrillAssignments.$inferInsert;

// ─── Facility Floor Maps ──────────────────────────────────────────────────────
export const facilityFloorMaps = mysqlTable("facility_floor_maps", {
  id: int("id").autoincrement().primaryKey(),
  facilityId: int("facility_id").notNull(),
  orgId: int("org_id"),
  name: varchar("name", { length: 255 }).notNull(),
  floor: varchar("floor", { length: 100 }),
  imageUrl: text("image_url"),
  fileKey: text("file_key"),
  mapData: json("map_data"),
  annotations: json("annotations"),
  width: int("width"),
  height: int("height"),
  createdByUserId: int("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type FacilityFloorMap = typeof facilityFloorMaps.$inferSelect;
export type InsertFacilityFloorMap = typeof facilityFloorMaps.$inferInsert;

// ─── Incident Communications ─────────────────────────────────────────────────
export const incidentCommunications = mysqlTable("incident_communications", {
  id: int("id").autoincrement().primaryKey(),
  incidentId: int("incident_id").notNull(),
  senderRole: mysqlEnum("sender_role", ["admin", "reporter"]).notNull(),
  senderName: varchar("sender_name", { length: 255 }),
  message: text("message").notNull(),
  isFromAdmin: boolean("is_from_admin").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type IncidentCommunication = typeof incidentCommunications.$inferSelect;
export type InsertIncidentCommunication = typeof incidentCommunications.$inferInsert;

// ─── Notifications ────────────────────────────────────────────────────────────
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  orgId: int("org_id"),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  link: varchar("link", { length: 512 }),
  metadata: json("metadata"),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;
`;

fs.writeFileSync(schemaPath, content + additions);
console.log("Appended 6 missing table definitions to drizzle/schema.ts");