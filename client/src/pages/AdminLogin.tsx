import { useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { Spinner } from "@/components/ui/spinner";
import { hasAdminAccess } from "@/lib/adminAuthGuard";
import { loginAdminWithPassword } from "@/lib/authAdminLogin";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void hasAdminAccess().then((ok) => {
      if (cancelled) return;
      if (ok) {
        setLocation("/admin");
        return;
      }
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (!isSupabaseConfigured) {
      alert(
        "Supabase não está configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env."
      );
      return;
    }

    setLoading(true);
    try {
      await loginAdminWithPassword(email, password);
      setLocation("/admin");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível entrar no painel.";
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Spinner className="size-6 text-zinc-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
        <header className="mb-8 flex flex-col items-center text-center">
          <BrandLogo className="mb-4 h-12 w-auto" />
          <h1 className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-700">
            Painel administrativo
          </h1>
          <p className="mt-1 text-xs text-zinc-500">Acesso restrito</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-email" className="mb-1 block text-xs font-medium text-zinc-600">
              E-mail
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="h-9 w-full rounded-md border border-zinc-200 bg-white pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1 block text-xs font-medium text-zinc-600">
              Senha
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="h-9 w-full rounded-md border border-zinc-200 bg-white pr-3 pl-9 text-sm text-zinc-900 outline-none focus:border-zinc-400"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-zinc-800 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Spinner className="size-4 text-white" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
