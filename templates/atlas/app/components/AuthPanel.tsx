import { useState, type FormEvent } from "react";

type Provider = "local" | "asgardeo" | "keycloak" | "oidc" | "none";

interface AuthPanelProps {
  provider: Provider;
  onLocalSubmit?: (input: { email: string; password: string; mode: "sign-in" | "register" }) => Promise<void> | void;
  onExternalSubmit?: (provider: Exclude<Provider, "local" | "none">) => Promise<void> | void;
}

const providerNames = { asgardeo: "WSO2 Asgardeo", keycloak: "Keycloak", oidc: "OpenID Connect" } as const;

export default function AuthPanel({ provider, onLocalSubmit, onExternalSubmit }: AuthPanelProps) {
  const [mode, setMode] = useState<"sign-in" | "register">("sign-in");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submitLocal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onLocalSubmit?.({ email: String(data.get("email")), password: String(data.get("password")), mode });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (provider === "none") {
    return <p className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">Authentication is disabled. Set <code>AUTH_PROVIDER</code> in <code>.env</code> to enable it.</p>;
  }

  if (provider !== "local") {
    return (
      <section className="rounded-3xl border border-white/10 bg-slate-900 p-8 text-white shadow-2xl shadow-brand-950/20" aria-labelledby="auth-heading">
        <span className="inline-flex rounded-full bg-brand-500/15 px-3 py-1 text-sm font-medium text-brand-50">Enterprise SSO</span>
        <h2 id="auth-heading" className="mt-5 text-3xl font-bold">Continue with {providerNames[provider]}</h2>
        <p className="mt-3 text-slate-300">Authorization Code flow with PKCE is configured from server-only environment values.</p>
        <button className="mt-8 w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 transition hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60" onClick={() => void onExternalSubmit?.(provider)} type="button">
          Sign in securely
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-950/10 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="auth-heading">
      <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800" role="tablist" aria-label="Authentication mode">
        {(["sign-in", "register"] as const).map((value) => (
          <button className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${mode === value ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500 dark:text-slate-300"}`} key={value} onClick={() => setMode(value)} role="tab" aria-selected={mode === value} type="button">
            {value === "sign-in" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <h2 id="auth-heading" className="mt-7 text-3xl font-bold">{mode === "sign-in" ? "Welcome back" : "Start building"}</h2>
      <p className="mt-2 text-slate-500 dark:text-slate-400">Passwords are hashed server-side with Argon2id.</p>
      <form className="mt-7 space-y-5" onSubmit={submitLocal}>
        <label className="block text-sm font-medium">Email<input className="mt-2 block w-full rounded-xl border-slate-300 bg-transparent px-4 py-3 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700" name="email" type="email" autoComplete="email" required /></label>
        <label className="block text-sm font-medium">Password<input className="mt-2 block w-full rounded-xl border-slate-300 bg-transparent px-4 py-3 focus:border-brand-500 focus:ring-brand-500 dark:border-slate-700" name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={12} required /></label>
        {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
        <button className="w-full rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white transition hover:bg-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60" disabled={busy} type="submit">
          {busy ? "Please wait…" : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
    </section>
  );
}
