"use client";

// =============================================================================
// Employee Self-Registration Page — Hamdard AI Platform
// =============================================================================

import { useState } from "react";
import Link from "next/link";
import styles from "./register.module.css";
import { ShieldCheck, CheckCircle2, UserPlus } from "lucide-react";

const DEPARTMENTS = [
  { code: "EXEC", name: "Executive Office" },
  { code: "IT", name: "IT Department" },
  { code: "MKT", name: "Marketing" },
  { code: "FIN", name: "Finance & Accounts" },
  { code: "HR", name: "Human Resources" },
  { code: "SCM", name: "Supply Chain" },
  { code: "PROD", name: "Production" },
  { code: "QA", name: "Quality Assurance" },
  { code: "RND", name: "Research & Development" },
  { code: "SALES", name: "Sales" },
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    employeeId: "",
    password: "",
    confirmPassword: "",
    departmentCode: "IT",
    designation: "",
    userType: "EMPLOYEE",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password strength helper
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: "", color: "" };
    if (pass.length < 6) return { label: "Too short (min 6 chars)", color: "#D32F2F" };
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    if (hasLetters && hasNumbers) return { label: "Strong password", color: "#2E7D32" };
    return { label: "Moderate (add numbers/letters)", color: "#FF8F00" };
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic format validations
    if (!/^[a-zA-Z0-9._%+-]+@hamdard\.com\.pk$/.test(formData.email)) {
      setError("Please use a valid company email ending with @hamdard.com.pk");
      return;
    }

    if (!/^HAM-\d+$/.test(formData.employeeId)) {
      setError("Employee ID must follow the corporate pattern, e.g., HAM-102");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          employeeId: formData.employeeId,
          password: formData.password,
          departmentCode: formData.departmentCode,
          designation: formData.designation,
          userType: formData.userType
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Registration failed.");
      }

      setSuccessMessage(data.message || "Account created successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.heroSection}>
        <div className={styles.brandHeader}>
          <div className={styles.brandLogo}>H</div>
          <div>
            <div className={styles.brandTitle}>Hamdard Pakistan</div>
            <div className={styles.brandSubtitle}>Enterprise AI Platform</div>
          </div>
        </div>

        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Join the Next Era of <br />
            <span className={styles.heroTitleGradient}>Enterprise AI Intelligence</span>
          </h1>
          <p className={styles.heroText}>
            Register your employee identity to access Hamdard&apos;s secure, governed AI assistant tools, customizable models, and departmental analytics.
          </p>
        </div>

        <div className={styles.heroFooter}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <ShieldCheck size={16} /> ISO 27001 & Enterprise dRBAC Secured
          </div>
        </div>
      </div>

      <div className={styles.formSection}>
        <div className={styles.formCard}>
          {successMessage ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>
                <CheckCircle2 size={36} />
              </div>
              <h2 className={styles.formTitle}>Registration Submitted</h2>
              <p className={styles.formSubtitle} style={{ marginTop: "8px" }}>
                {successMessage}
              </p>
              <div className={styles.loginLink} style={{ marginTop: "24px" }}>
                <Link href="/login" className={styles.submitBtn} style={{ textDecoration: "none", display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
                  Continue to Sign In
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className={styles.formTitle}>Create your account</h2>
              <p className={styles.formSubtitle}>Enter your corporate details for registration review</p>

              {error && <div className={styles.errorBanner}>{error}</div>}

              <form onSubmit={handleSubmit} className={styles.formGrid}>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label className={styles.label}>Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shaheryar Ahmed"
                    className={styles.input}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Employee ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HAM-102"
                    className={styles.input}
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Corporate Email</label>
                  <input
                    type="email"
                    required
                    placeholder="name@hamdard.com.pk"
                    className={styles.input}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Department</label>
                  <select
                    className={styles.select}
                    value={formData.departmentCode}
                    onChange={(e) => setFormData({ ...formData, departmentCode: e.target.value })}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept.code} value={dept.code}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Designation</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineer"
                    className={styles.input}
                    value={formData.designation}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className={styles.input}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                  {strength.label && (
                    <span style={{ fontSize: "0.75rem", color: strength.color, marginTop: "4px", fontWeight: 500 }}>
                      {strength.label}
                    </span>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Confirm Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    className={styles.input}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  />
                </div>

                <div className={styles.fullWidth}>
                  <button type="submit" disabled={loading} className={styles.submitBtn}>
                    <UserPlus size={18} />
                    {loading ? "Creating your account..." : "Create Account"}
                  </button>
                </div>
              </form>

              <div className={styles.loginLink}>
                Already have an account? <Link href="/login">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
