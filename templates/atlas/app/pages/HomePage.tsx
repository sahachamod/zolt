import { useState } from "react";
import AuthPanel from "../components/AuthPanel";

type Provider = "local" | "asgardeo" | "keycloak" | "oidc" | "none";
const provider = (import.meta.env.VITE_AUTH_PROVIDER ?? "local") as Provider;
const tenant = import.meta.env.VITE_DEFAULT_TENANT_ID ?? "default";

export default function HomePage() {
  const [notice, setNotice] = useState("");

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 px-6 py-16 text-slate-950 dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-brand-500/15 to-transparent" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="animate-fade-in">
          <p className="font-semibold uppercase tracking-[0.25em] text-brand-600">Tenant {tenant} · Zolt security</p>
          <h1 className="mt-5 max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">Secure by default. Yours by design.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">Start with local Argon2id credentials, or switch to Asgardeo, Keycloak, or any standards-compliant OIDC provider through environment configuration.</p>
          <div className="mt-9 flex flex-wrap gap-3 text-sm font-medium">
            {["Argon2id", "PKCE", "OIDC discovery", "Server-only secrets"].map((item) => <span className="rounded-full border border-slate-300 bg-white/70 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/70" key={item}>{item}</span>)}
          </div>
          {notice && <p className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-950" role="status">{notice}</p>}
        </section>
        <AuthPanel
          provider={provider}
          onLocalSubmit={({ mode }) => setNotice(`Connect ${mode} to your user repository using server/auth.ts. Credentials were not stored in this browser preview.`)}
          onExternalSubmit={(selected) => setNotice(`Connect the ${selected} button to your server authorization route. OIDC helpers are ready in @zolt/auth.`)}
        />
      </div>
    </main>
  );
}
