"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

/**
 * Mirrors a deliverable into the shared SharePoint folders.
 *
 * The app talks to a Power Automate flow ("When an HTTP request is received"
 * -> "Create file") instead of Microsoft Graph, so no Azure app registration
 * is needed. Set POWER_AUTOMATE_WEBHOOK_URL in the Convex environment to turn
 * this on; until then uploads are stored in Convex and flagged as unconfigured.
 */
export const upload = internalAction({
  args: {
    attachmentId: v.id("attachments"),
    folder: v.union(v.literal("Revision"), v.literal("Finales")),
  },
  handler: async (ctx, { attachmentId, folder }) => {
    const webhookUrl = process.env.POWER_AUTOMATE_WEBHOOK_URL;

    if (!webhookUrl) {
      await ctx.runMutation(internal.deliverables.recordSync, {
        attachmentId,
        syncStatus: "sin_configurar",
      });
      return;
    }

    const attachment = await ctx.runQuery(
      internal.deliverables.getAttachment,
      { attachmentId }
    );
    if (!attachment) return;

    try {
      const blob = await ctx.storage.get(attachment.storageId);
      if (!blob) throw new Error("El archivo ya no está en el almacenamiento");

      const contentBase64 = Buffer.from(await blob.arrayBuffer()).toString(
        "base64"
      );

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder,
          fileName: attachment.fileName,
          contentType: attachment.contentType,
          contentBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Power Automate respondió ${response.status}: ${await response.text()}`
        );
      }

      await ctx.runMutation(internal.deliverables.recordSync, {
        attachmentId,
        syncStatus: "enviado",
        syncFolder: folder,
      });
    } catch (error) {
      await ctx.runMutation(internal.deliverables.recordSync, {
        attachmentId,
        syncStatus: "error",
        syncFolder: folder,
        syncError: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
