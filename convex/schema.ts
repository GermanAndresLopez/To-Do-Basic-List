import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Review state of a subtask's deliverable.
 * Absent (undefined) means nothing has been submitted yet.
 */
export const reviewStatus = v.union(
  v.literal("revision"),
  v.literal("aprobado"),
  v.literal("devuelto")
);

export default defineSchema({
  projects: defineTable({
    title: v.string(),
  }),
  tasks: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    // Sequential, human-readable id scoped to its project (1, 2, 3...).
    // Optional so existing rows stay valid until they are backfilled.
    number: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_project_number", ["projectId", "number"]),
  subtasks: defineTable({
    taskId: v.id("tasks"),
    name: v.string(),
    completed: v.boolean(),
    status: v.optional(reviewStatus),
    // Corrections written by the admin when returning a deliverable.
    feedback: v.optional(v.string()),
  }).index("by_task", ["taskId"]),
  attachments: defineTable({
    subtaskId: v.id("subtasks"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    // Only the newest upload for a subtask is active; older ones are kept
    // as history so a returned deliverable can still be looked up.
    active: v.boolean(),
    // Mirror of the file in the shared SharePoint folders.
    syncStatus: v.union(
      v.literal("pendiente"),
      v.literal("enviado"),
      v.literal("error"),
      v.literal("sin_configurar")
    ),
    syncFolder: v.optional(
      v.union(v.literal("Revision"), v.literal("Finales"))
    ),
    syncError: v.optional(v.string()),
  }).index("by_subtask", ["subtaskId"]),
  adminSessions: defineTable({
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),
});
