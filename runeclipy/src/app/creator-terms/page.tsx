import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Creator Terms of Use — RuneClipy" };

export default function CreatorTermsPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-8 inline-block">← Home</Link>
        <h1 className="text-3xl font-extrabold mb-2 gradient-text">Creator Terms of Use</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: April 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">1. Acceptance</h2>
            <p className="text-text-secondary text-sm leading-relaxed">By using RuneClipy, you agree to these terms. If you do not agree, do not use the service.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">2. Eligibility</h2>
            <p className="text-text-secondary text-sm leading-relaxed">You must be at least 18 years old or have parental consent to use RuneClipy. You must provide accurate information during registration.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">3. Content Guidelines</h2>
            <p className="text-text-secondary text-sm leading-relaxed">All submitted content must be original and comply with platform guidelines. Content that violates copyright, contains explicit material, or promotes hate will be removed and the creator may be banned.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">4. Earnings & Payments</h2>
            <p className="text-text-secondary text-sm leading-relaxed">Earnings are calculated based on verified views according to the campaign rate. A platform service fee is applied to all withdrawals. Minimum withdrawal thresholds apply. Payments are processed within 24-48 hours after request.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">5. Account Verification</h2>
            <p className="text-text-secondary text-sm leading-relaxed">You must verify ownership of your social media accounts through our bio-code verification process. Submitting content from unverified accounts will result in rejection.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">6. Prohibited Activities</h2>
            <p className="text-text-secondary text-sm leading-relaxed">Botting, view manipulation, multi-accounting, and fraud are strictly prohibited. Violations will result in permanent ban and forfeiture of all earnings.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">7. Referral Program</h2>
            <p className="text-text-secondary text-sm leading-relaxed">You may earn referral commissions by inviting new creators. Self-referral and manipulation of the referral system is prohibited.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
