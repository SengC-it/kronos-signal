import { LoginForm } from "@/app/login/login-form";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section className="panel" style={{ width: "100%", maxWidth: 420 }}>
        <h1 className="page-title">Operator Login</h1>
        <p className="page-subtitle">Sign in with the Supabase account authorized for this console.</p>
        <LoginForm />
      </section>
    </main>
  );
}
