"use node";

import { createSign } from "node:crypto";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Mints an access token from whichever credentials are configured.
 *
 * A service account is the sturdier option but can only write to a Shared
 * Drive, since service accounts have no storage quota of their own. A refresh
 * token works with any Google account, including a personal one, and the files
 * end up owned by that account. Returns null when neither is set up.
 */
async function getAccessToken(): Promise<string | null> {
  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    const key = JSON.parse(serviceAccountKey) as {
      client_email: string;
      private_key: string;
    };
    const now = Math.floor(Date.now() / 1000);
    const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const claims = base64url(
      JSON.stringify({
        iss: key.client_email,
        scope: DRIVE_SCOPE,
        aud: TOKEN_URL,
        iat: now,
        exp: now + 3600,
      })
    );

    const signer = createSign("RSA-SHA256");
    signer.update(`${header}.${claims}`);
    const signature = base64url(signer.sign(key.private_key));

    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${header}.${claims}.${signature}`,
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Google rechazó la cuenta de servicio: ${await response.text()}`
      );
    }
    return ((await response.json()) as { access_token: string }).access_token;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Google rechazó el refresh token: ${await response.text()}`
      );
    }
    return ((await response.json()) as { access_token: string }).access_token;
  }

  return null;
}

function folderIdFor(folder: "Revision" | "Finales") {
  return folder === "Revision"
    ? process.env.GOOGLE_DRIVE_REVISION_FOLDER_ID
    : process.env.GOOGLE_DRIVE_FINALES_FOLDER_ID;
}

/** Copies a freshly uploaded deliverable into the review folder on Drive. */
export const upload = internalAction({
  args: { attachmentId: v.id("attachments") },
  handler: async (ctx, { attachmentId }) => {
    const folderId = folderIdFor("Revision");

    let accessToken: string | null = null;
    try {
      accessToken = await getAccessToken();
    } catch (error) {
      await ctx.runMutation(internal.deliverables.recordDriveSync, {
        attachmentId,
        driveStatus: "error",
        driveError: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    if (!accessToken || !folderId) {
      await ctx.runMutation(internal.deliverables.recordDriveSync, {
        attachmentId,
        driveStatus: "sin_configurar",
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
      const bytes = Buffer.from(await blob.arrayBuffer());

      const boundary = `convex-${Date.now()}`;
      const metadata = JSON.stringify({
        name: attachment.fileName,
        parents: [folderId],
      });

      const body = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
            `--${boundary}\r\nContent-Type: ${attachment.contentType}\r\n\r\n`
        ),
        bytes,
        Buffer.from(`\r\n--${boundary}--`),
      ]);

      const response = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": `multipart/related; boundary=${boundary}`,
          },
          body: new Uint8Array(body),
        }
      );

      if (!response.ok) {
        throw new Error(`Drive respondió ${response.status}: ${await response.text()}`);
      }

      const file = (await response.json()) as {
        id: string;
        webViewLink?: string;
      };

      await ctx.runMutation(internal.deliverables.recordDriveSync, {
        attachmentId,
        driveStatus: "sincronizado",
        driveFileId: file.id,
        driveLink: file.webViewLink,
        driveFolder: "Revision",
      });
    } catch (error) {
      await ctx.runMutation(internal.deliverables.recordDriveSync, {
        attachmentId,
        driveStatus: "error",
        driveError: error instanceof Error ? error.message : String(error),
      });
    }
  },
});

/** Moves an approved deliverable from the review folder to the final one. */
export const moveToFinal = internalAction({
  args: { attachmentId: v.id("attachments") },
  handler: async (ctx, { attachmentId }) => {
    const attachment = await ctx.runQuery(
      internal.deliverables.getAttachment,
      { attachmentId }
    );
    // Nothing reached Drive, so there is nothing to move.
    if (!attachment?.driveFileId) return;

    const from = folderIdFor("Revision");
    const to = folderIdFor("Finales");
    if (!from || !to) return;

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) return;

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${attachment.driveFileId}` +
          `?addParents=${to}&removeParents=${from}&supportsAllDrives=true&fields=id,webViewLink`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        }
      );

      if (!response.ok) {
        throw new Error(`Drive respondió ${response.status}: ${await response.text()}`);
      }

      const file = (await response.json()) as {
        id: string;
        webViewLink?: string;
      };

      await ctx.runMutation(internal.deliverables.recordDriveSync, {
        attachmentId,
        driveStatus: "sincronizado",
        driveFileId: file.id,
        driveLink: file.webViewLink,
        driveFolder: "Finales",
      });
    } catch (error) {
      await ctx.runMutation(internal.deliverables.recordDriveSync, {
        attachmentId,
        driveStatus: "error",
        driveError: error instanceof Error ? error.message : String(error),
      });
    }
  },
});
