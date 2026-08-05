import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAdmin } from "./admin";

export const create = mutation({
  args: { token: v.string(), taskId: v.id("tasks"), name: v.string() },
  handler: async (ctx, { token, taskId, name }) => {
    await requireAdmin(ctx, token);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    return await ctx.db.insert("subtasks", {
      taskId,
      name: trimmed,
      completed: false,
    });
  },
});

/**
 * Ticking a subtask off stays open to everyone: it is how the people doing
 * the work report progress, unlike editing the plan itself.
 */
export const toggle = mutation({
  args: { subtaskId: v.id("subtasks") },
  handler: async (ctx, { subtaskId }) => {
    const subtask = await ctx.db.get(subtaskId);
    if (!subtask) throw new Error("Subtarea no encontrada");
    await ctx.db.patch(subtaskId, { completed: !subtask.completed });
  },
});

export const rename = mutation({
  args: { token: v.string(), subtaskId: v.id("subtasks"), name: v.string() },
  handler: async (ctx, { token, subtaskId, name }) => {
    await requireAdmin(ctx, token);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("El nombre no puede estar vacío");
    await ctx.db.patch(subtaskId, { name: trimmed });
  },
});

export const remove = mutation({
  args: { token: v.string(), subtaskId: v.id("subtasks") },
  handler: async (ctx, { token, subtaskId }) => {
    await requireAdmin(ctx, token);

    const attachments = await ctx.db
      .query("attachments")
      .withIndex("by_subtask", (q) => q.eq("subtaskId", subtaskId))
      .collect();
    for (const attachment of attachments) {
      await ctx.storage.delete(attachment.storageId);
      await ctx.db.delete(attachment._id);
    }

    await ctx.db.delete(subtaskId);
  },
});
