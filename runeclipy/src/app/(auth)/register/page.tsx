"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "otp" | "password">("info");
  const [form, setForm] = useState({ nickname: "", username: "", email: "", referralCode: "" });
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.username.length < 3) { setError("Username must be at least 3 characters"); setLoading(false); return; }
    if (!/^[a-z0-9._]+$/.test(form.username)) { setError("Username can only contain lowercase letters, numbers, dots, underscores"); setLoading(false); return; }

    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, action: "register" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setStep("otp");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, otp, action: "register" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      setStep("password");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) { setError("Password must be at least 6 characters"); setLoading(false); return; }
    if (password !== confirmPassword) { setError("Passwords don't match"); setLoading(false); return; }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = "/api/auth/google";
  };

  // Step indicator
  const steps = ["Account Info", "Verify Email", "Set Password"];
  const currentStepIndex = step === "info" ? 0 : step === "otp" ? 1 : 2;

  return (
    <div className="glass-card p-8 animate-fadeInUp">
      <h1 className="text-2xl font-bold text-center mb-2">Create account</h1>
      <p className="text-sm text-text-secondary text-center mb-6">Join RuneClipy and start earning</p>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i <= currentStepIndex ? "bg-accent text-white" : "bg-bg-tertiary text-text-muted"
            }`}>
              {i < currentStepIndex ? "✓" : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 rounded transition-all ${i < currentStepIndex ? "bg-accent" : "bg-bg-tertiary"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
        </div>
      )}

      {step === "info" && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Nickname</label>
            <input type="text" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })}
              className="input-field" placeholder="Your display name" required maxLength={30} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Username</label>
            <input type="text" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "") })}
              className="input-field font-mono" placeholder="yourname" required maxLength={20} />
            <p className="text-xs text-text-muted mt-1">This will be your referral code. Cannot be changed later.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Email (Gmail)</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input-field" placeholder="you@gmail.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Referral Code <span className="text-text-muted">(optional)</span></label>
            <input type="text" value={form.referralCode}
              onChange={(e) => setForm({ ...form, referralCode: e.target.value.toLowerCase() })}
              className="input-field font-mono" placeholder="friend_username" />
          </div>
          <button type="submit" disabled={loading} className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50">
            {loading ? "Sending OTP..." : "Continue →"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <p className="text-sm text-text-secondary text-center mb-2">
            We sent a 6-digit code to <strong className="text-text-primary">{form.email}</strong>
          </p>
          <div>
            <input type="text" value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="input-field text-center text-2xl tracking-[12px] font-mono font-bold"
              placeholder="000000" maxLength={6} required autoFocus />
          </div>
          <button type="submit" disabled={loading || otp.length < 6} className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50">
            {loading ? "Verifying..." : "Verify Email"}
          </button>
          <button type="button" onClick={() => setStep("info")} className="w-full text-sm text-text-muted hover:text-text-secondary transition-colors">
            ← Back
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="text-center mb-2">
            <span className="text-3xl">✅</span>
            <p className="text-sm text-success font-medium mt-2">Email verified!</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field" placeholder="Min. 6 characters" required minLength={6} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm Password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field" placeholder="Repeat password" required />
          </div>
          <button type="submit" disabled={loading} className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50">
            {loading ? "Creating account..." : "🔮 Create Account"}
          </button>
        </form>
      )}

      {step === "info" && (
        <>
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="px-3 bg-bg-card text-text-muted">or</span></div>
          </div>
          <button onClick={handleGoogleSignup} className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border text-text-secondary hover:text-text-primary hover:border-border-hover transition-all text-sm font-medium">
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Sign up with Google
          </button>
        </>
      )}

      <p className="text-center text-sm text-text-muted mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-accent-light hover:text-accent transition-colors font-medium">Log in</Link>
      </p>
    </div>
  );
}
