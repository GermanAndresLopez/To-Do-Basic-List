"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

/** A localhost URL works in development but never from another device. */
const isLocalUrl =
  !!convexUrl && /127\.0\.0\.1|localhost/.test(convexUrl);

function SetupNotice({ reason }: { reason: "missing" | "local" }) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <h1 className="text-[17px] font-semibold text-ink">
          Falta conectar la base de datos
        </h1>
        <p className="mt-2 text-[14px] leading-relaxed text-ink-secondary">
          {reason === "missing" ? (
            <>
              La variable de entorno{" "}
              <code className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[13px]">
                NEXT_PUBLIC_CONVEX_URL
              </code>{" "}
              no está definida en este despliegue.
            </>
          ) : (
            <>
              Esta app está apuntando a{" "}
              <code className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[13px]">
                {convexUrl}
              </code>
              , una dirección local que solo funciona en la computadora donde
              corre el backend. Desde otro dispositivo nunca habrá datos.
            </>
          )}
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-secondary">
          Configura{" "}
          <code className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[13px]">
            NEXT_PUBLIC_CONVEX_URL
          </code>{" "}
          con la URL de tu deployment de producción de Convex (termina en{" "}
          <code className="rounded bg-surface-hover px-1.5 py-0.5 font-mono text-[13px]">
            .convex.cloud
          </code>
          ) y vuelve a desplegar.
        </p>
      </div>
    </main>
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) return <SetupNotice reason="missing" />;
  if (isLocalUrl && process.env.NODE_ENV === "production") {
    return <SetupNotice reason="local" />;
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
