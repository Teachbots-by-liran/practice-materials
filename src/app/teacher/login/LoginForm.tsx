"use client";

import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const r = await fetch("/api/teacher/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        setBusy(false);
        if (r.ok) window.location.href = next;
        else setError((await r.json().catch(() => ({}))).error ?? "Couldn't sign in.");
      }}
      className="space-y-4"
    >
      <div>
        <label htmlFor="pw" className="form-label">
          Password
        </label>
        <input id="pw" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={!password || busy}
        className="w-full rounded-xl bg-indigo-600 text-white font-semibold py-2.5 hover:bg-indigo-700 disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
