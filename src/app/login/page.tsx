// =============================================================================
// Login Page — Hamdard AI Platform
// Premium branded login with split hero/form layout
// =============================================================================

"use client";

import { Suspense, useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Zap, Lock, BarChart3 } from "lucide-react";
import styles from "./login.module.css";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/chat";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
        if (result.error === "CredentialsSignin") {
          setError("Unable to sign in. Please verify your credentials and try again.");
        } else {
          setError(result.error);
        }
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.loginPage}>
      {/* ── Hero Panel (Left) ──────────────────────────────────────────── */}
      <div className={styles.heroPanel}>
        <div className={styles.heroContent}>
          <div className={styles.heroLogo}>
            <h1 className={styles.heroLogoText}>Hamdard</h1>
            <p className={styles.heroLogoSubtext}>Pakistan</p>
          </div>

          <h2 className={styles.heroTitle}>Enterprise AI Platform</h2>
          <p className={styles.heroDescription}>
            Empowering every employee with secure, governed AI assistance.
            Boost productivity while maintaining complete organizational control.
          </p>

          <div className={styles.heroFeatures}>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}>
                <Zap size={20} />
              </div>
              <span>Multi-model AI — GPT, Gemini & Claude</span>
            </div>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}>
                <Shield size={20} />
              </div>
              <span>Enterprise-grade security & governance</span>
            </div>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}>
                <BarChart3 size={20} />
              </div>
              <span>Real-time usage analytics & cost tracking</span>
            </div>
            <div className={styles.heroFeature}>
              <div className={styles.heroFeatureIcon}>
                <Lock size={20} />
              </div>
              <span>Role-based access control</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Panel (Right) ─────────────────────────────────────────── */}
      <div className={styles.formPanel}>
        <div className={styles.formContainer}>
          <div className={styles.formHeader}>
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSubtitle}>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.loginForm}>
            {error && <div className={styles.errorMessage}>{error}</div>}

            <div className={styles.formGroup}>
              <label htmlFor="email" className={styles.formLabel}>
                Employee ID / Email
              </label>
              <input
                id="email"
                type="text"
                className={styles.formInput}
                placeholder="HAM-101 or email@hamdard.com.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.formLabel}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className={styles.formInput}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: "44px" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-tertiary)",
                    display: "flex",
                    alignItems: "center"
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? "👁" : "👁‍🗨"}
                </button>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.875rem" }}>
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: "16px", height: "16px", cursor: "pointer" }}
              />
              <label htmlFor="remember" style={{ cursor: "pointer", color: "var(--text-secondary)" }}>
                Remember me
              </label>
            </div>

            <button
              type="submit"
              className={styles.loginButton}
              disabled={isLoading}
            >
              {isLoading ? "Signing you in..." : "Sign In"}
            </button>
          </form>

          {/* Register link */}
          <p className={styles.registerLink}>
            Don&apos;t have an account?{" "}
            <Link href="/register" className={styles.registerAnchor}>
              Sign up
            </Link>
          </p>

          <div className={styles.demoNote}>
            <p className={styles.demoNoteTitle}>Demo Credentials</p>
            <p className={styles.demoNoteText}>
              <strong>Super Admin:</strong>{" "}
              <span className={styles.demoCredential}>shaheryar.hamdard@hamdard.com.pk</span>
              <br />
              <strong>Admin:</strong>{" "}
              <span className={styles.demoCredential}>ahmed.raza@hamdard.com.pk</span>
              <br />
              <strong>Employee:</strong>{" "}
              <span className={styles.demoCredential}>usman.ali@hamdard.com.pk</span>
              <br />
              <strong>Password:</strong>{" "}
              <span className={styles.demoCredential}>hamdard123</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
