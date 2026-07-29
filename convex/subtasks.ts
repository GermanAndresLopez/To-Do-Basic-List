import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: { taskId: v.id("tasks"), name: v.string() },
  handler: async (ctx, { taskId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    return await ctx.db.insert("subtasks", {
      taskId,
      name: trimmed,
      completed: false,
    });
  },
});

export const toggle = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, { subtaskId }) => {
    const subtask = await ctx.db.get(subtaskId);
    if (!subtask) throw new Error("Subtarea no encontrada");
    await ctx.db.patch(subtaskId, { completed: !subtask.completed });
  },
});

export const rename = mutation({
  args: { subtaskId: v.id("subtasks"), name: v.string() },
  handler: async (ctx, { subtaskId, name }) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    await ctx.db.patch(subtaskId, { name: trimmed });
  },
});

export const remove = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, { subtaskId }) => {
    await ctx.db.delete(subtaskId);
  },
});
