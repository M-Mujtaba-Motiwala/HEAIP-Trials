"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { HamdardLogo } from "@/components/HamdardLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { AlertCircle, Shield, Zap, BarChart3, Lock, Eye, EyeOff } from "lucide-react";

const DEMO_USERS = [
  { role: "Super Admin", email: "superadmin@hamdard.com.pk", password: "admin123" },
  { role: "Admin", email: "admin@hamdard.com.pk", password: "admin123" },
  { role: "Dept Manager", email: "manager@hamdard.com.pk", password: "manager123" },
  { role: "Employee", email: "employee@hamdard.com.pk", password: "employee123" },
  { role: "Contractor", email: "contractor@hamdard.com.pk", password: "contractor123" },
  { role: "Guest", email: "guest@hamdard.com.pk", password: "guest123" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
      } else {
        router.push("/chat");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function fillDemo(email: string, password: string) {
    setEmail(email);
    setPassword(password);
    setError("");
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left Side - Brand Panel */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-[#005830] via-[#061A12] to-slate-950 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#8DC63F]/5 rounded-full -translate-y-32 translate-x-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#005830]/20 rounded-full translate-y-16 -translate-x-16" />

        <div className="text-center relative z-10">
          <HamdardLogo className="w-52 h-52 mx-auto mb-10" />
          <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">Enterprise AI Platform</h1>
          <p className="text-emerald-100/80 text-lg leading-relaxed max-w-md mx-auto mb-12">
            Empowering every Hamdard employee with secure, governed AI intelligence.
          </p>

          <div className="grid grid-cols-1 gap-4 text-left max-w-sm mx-auto">
            {[
              { icon: Zap, label: "Multi-model AI — Groq-powered LLMs" },
              { icon: Shield, label: "Enterprise-grade security & RBAC governance" },
              { icon: BarChart3, label: "Real-time cost analytics & quota management" },
              { icon: Lock, label: "Role-based access control with delegation" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3 text-emerald-100/70 text-sm">
                <div className="w-8 h-8 rounded-lg bg-[#8DC63F]/20 border border-[#8DC63F]/30 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#8DC63F]" />
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8 flex justify-center">
            <HamdardLogo className="w-24 h-24" />
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-[#005830] mb-2">Sign In</h2>
            <p className="text-slate-500">Access your Hamdard AI Platform account</p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@hamdard.com.pk"
                required
                autoFocus
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8DC63F] focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8DC63F] focus:border-transparent bg-slate-50 text-slate-900 placeholder-slate-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#005830] hover:bg-[#004620] disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-[#005830]/20"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <p className="text-xs font-semibold text-slate-500 mb-3">Demo Accounts — click to autofill</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => fillDemo(u.email, u.password)}
                  className="text-left p-2 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 transition-all group"
                >
                  <p className="text-xs font-semibold text-slate-700 group-hover:text-[#005830]">{u.role}</p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">{u.email}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating theme toggle */}
      <div className="fixed bottom-6 right-6 z-50 bg-slate-800 rounded-xl p-1 shadow-lg border border-slate-700">
        <ThemeToggle collapsed />
      </div>
    </div>
  );
}
