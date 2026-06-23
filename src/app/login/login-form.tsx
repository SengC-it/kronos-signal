"use client";

import type React from "react";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("Signing in...");
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage(error.message);
      return;
    }

    window.location.href = "/";
  }

  return (
    <form onSubmit={signIn} style={{ display: "grid", gap: 12 }}>
      <label>
        <span className="muted">Email</span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          required
          style={{ width: "100%", padding: 10, marginTop: 6, borderRadius: 6 }}
        />
      </label>
      <label>
        <span className="muted">Password</span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          required
          style={{ width: "100%", padding: 10, marginTop: 6, borderRadius: 6 }}
        />
      </label>
      <button type="submit" style={{ padding: 12, borderRadius: 6, fontWeight: 700 }}>
        Sign In
      </button>
      {message ? <p className="muted">{message}</p> : null}
    </form>
  );
}
