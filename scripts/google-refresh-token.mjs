/**
 * Obtiene un refresh token de Google Drive para la sincronización de
 * entregables.
 *
 *   node scripts/google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>
 *
 * Abre el enlace que imprime, autoriza con la cuenta dueña de las carpetas y
 * el script recibe la respuesta en un servidor local. Solo hace falta
 * ejecutarlo de nuevo si el token se revoca.
 */

import http from "node:http";
import { URL } from "node:url";

const [clientId, clientSecret] = process.argv.slice(2);

if (!clientId || !clientSecret) {
  console.error(
    "Uso: node scripts/google-refresh-token.mjs <CLIENT_ID> <CLIENT_SECRET>"
  );
  process.exit(1);
}

const PORT = 53682;
const REDIRECT_URI = `http://localhost:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/drive";

const authUrl =
  "https://accounts.google.com/o/oauth2/v2/auth?" +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: SCOPE,
    // Sin esto Google no entrega refresh token en autorizaciones repetidas.
    access_type: "offline",
    prompt: "consent",
  });

console.log("\n1. Abre este enlace en tu navegador:\n");
console.log(authUrl);
console.log("\n2. Autoriza con la cuenta dueña de las carpetas de Drive.");
console.log("   Si aparece un aviso de app no verificada, entra en");
console.log('   "Configuración avanzada" y continúa: la app es tuya.\n');
console.log(`Esperando la respuesta en ${REDIRECT_URI} ...`);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    res.end(`Autorización cancelada: ${error}`);
    console.error("\nAutorización cancelada:", error);
    server.close();
    process.exit(1);
  }
  if (!code) {
    res.end("Esperando el código de autorización...");
    return;
  }

  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await response.json();
    if (!response.ok || !tokens.refresh_token) {
      throw new Error(JSON.stringify(tokens, null, 2));
    }

    res.end("Listo. Ya puedes cerrar esta pestaña y volver a la terminal.");
    console.log("\n=== Copia estos valores ===\n");
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log("\n===========================\n");
    console.log("Trata el refresh token como una contraseña: da acceso");
    console.log("a la cuenta de Drive con la que autorizaste.\n");
  } catch (e) {
    res.end("Error al canjear el código. Revisa la terminal.");
    console.error("\nError al canjear el código:\n", e.message);
    server.close();
    process.exit(1);
  }

  server.close();
  process.exit(0);
});

server.listen(PORT);
