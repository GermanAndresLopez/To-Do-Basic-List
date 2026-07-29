import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").order("desc").collect();
    return Promise.all(
      projects.map(async (project) => {
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        let totalSubtasks = 0;
        let completedSubtasks = 0;
        for (const task of tasks) {
          const subtasks = await ctx.db
            .query("subtasks")
            .withIndex("by_task", (q) => q.eq("taskId", task._id))
            .collect();
          totalSubtasks += subtasks.length;
          completedSubtasks += subtasks.filter((s) => s.completed).length;
        }

        return {
          ...project,
          taskCount: tasks.length,
          totalSubtasks,
          completedSubtasks,
        };
      })
    );
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    return await ctx.db.get(projectId);
  },
});

export const create = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const trimmed = title.trim();
    if (!trimmed) throw new Error("El título no puede estar vacío");
    return await ctx.db.insert("projects", { title: trimmed });
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, { projectId }) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();
    for (const task of tasks) {
      const subtasks = await ctx.db
        .query("subtasks")
        .withIndex("by_task", (q) => q.eq("taskId", task._id))
        .collect();
      for (const subtask of subtasks) {
        await ctx.db.delete(subtask._id);
      }
      await ctx.db.delete(task._id);
    }
    await ctx.db.delete(projectId);
  },
});
