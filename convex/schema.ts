import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    title: v.string(),
  }),
  tasks: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
  }).index("by_project", ["projectId"]),
  subtasks: defineTable({
    taskId: v.id("tasks"),
    name: v.string(),
    completed: v.boolean(),
  }).index("by_task", ["taskId"]),
});
