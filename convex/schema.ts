import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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
  }).index("by_task", ["taskId"]),
});
