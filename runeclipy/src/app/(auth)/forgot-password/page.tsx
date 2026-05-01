"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp" | "newpass">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to send reset code");
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
    if (newPassword !== confirmPassword) { setError("Passwords don't match"); setLoading(false); return; }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Reset failed");
      setSuccess("Password reset successfully! Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const steps = ["Enter Email", "Verify Code", "New Password"];
  const currentStep = step === "email" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="glass-card p-8 animate-fadeInUp">
      <h1 className="text-2xl font-bold text-center mb-2">Reset Password</h1>
      <p className="text-sm text-text-secondary text-center mb-6">We&apos;ll help you get back into your account</p>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i <= currentStep ? "bg-accent text-white" : "bg-bg-tertiary text-text-muted"
            }`}>
              {i < currentStep ? "✓" : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 rounded transition-all ${i < currentStep ? "bg-accent" : "bg-bg-tertiary"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {success && (
        <div className="mb-6 p-3 rounded-xl bg-success/10 border border-success/20 text-success text-sm flex items-center gap-2">
          <span>✅</span> {success}
        </div>
      )}

      {step === "email" && (
        <form onSubmit={handleSendReset} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@email.com"
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50">
            {loading ? "Sending..." : "Send Reset Code"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <div className="space-y-4">
          <p className="text-sm text-text-secondary text-center mb-2">
            We sent a reset code to <strong className="text-text-primary">{email}</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Reset Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input-field text-center text-2xl tracking-[12px] font-mono font-bold"
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
            />
          </div>
          <button
            onClick={() => { if (otp.length === 6) setStep("newpass"); else setError("Enter the 6-digit code"); }}
            disabled={otp.length < 6}
            className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50"
          >
            Continue →
          </button>
          <button type="button" onClick={() => { setStep("email"); setOtp(""); }} className="w-full text-sm text-text-muted hover:text-text-secondary transition-colors">
            ← Back
          </button>
        </div>
      )}

      {step === "newpass" && (
        <form onSubmit={handleVerifyAndReset} className="space-y-4">
          <div className="text-center mb-2">
            <span className="text-3xl">🔑</span>
            <p className="text-sm text-accent-light font-medium mt-2">Set your new password</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="input-field" placeholder="Min. 6 characters" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field" placeholder="Repeat password" required />
          </div>
          <button type="submit" disabled={loading} className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50">
            {loading ? "Resetting..." : "🔐 Reset Password"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-text-muted mt-6">
        Remember your password?{" "}
        <Link href="/login" className="text-accent-light hover:text-accent transition-colors font-medium">Log in</Link>
      </p>
    </div>
  );
}
