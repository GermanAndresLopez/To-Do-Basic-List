import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .order("asc")
      .collect();

    return Promise.all(
      tasks.map(async (task) => {
        const subtasks = await ctx.db
          .query("subtasks")
          .withIndex("by_task", (q) => q.eq("taskId", task._id))
          .order("asc")
          .collect();
        return {
          ...task,
          subtasks,
          totalSubtasks: subtasks.length,
          completedSubtasks: subtasks.filter((s) => s.completed).length,
        };
      })
    );
  },
});

export const create = mutation({
  args: { projectId: v.id("projects"), name: v.string() },
  handler: async (ctx, { projectId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    return await ctx.db.insert("tasks", { projectId, name: trimmed });
  },
});

export const rename = mutation({
  args: { taskId: v.id("tasks"), name: v.string() },
  handler: async (ctx, { taskId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    await ctx.db.patch(taskId, { name: trimmed });
  },
});

export const remove = mutation({
  args: { taskId: v.id("tasks") },
  handler: async (ctx, { taskId }) => {
    const subtasks = await ctx.db
      .query("subtasks")
      .withIndex("by_task", (q) => q.eq("taskId", taskId))
      .collect();
    for (const subtask of subtasks) {
      await ctx.db.delete(subtask._id);
    }
    await ctx.db.delete(taskId);
  },
});
