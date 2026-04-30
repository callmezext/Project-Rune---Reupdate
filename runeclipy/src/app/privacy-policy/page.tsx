import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy Policy — RuneClipy" };

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-bg-primary">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-text-muted hover:text-text-secondary transition-colors mb-8 inline-block">← Home</Link>
        <h1 className="text-3xl font-extrabold mb-2 gradient-text">Privacy Policy</h1>
        <p className="text-sm text-text-muted mb-8">Last updated: April 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">1. Information We Collect</h2>
            <p className="text-text-secondary text-sm leading-relaxed">We collect information you provide during registration (name, email, username), social media profiles you connect, and content submission data including video URLs and performance metrics.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">2. How We Use Information</h2>
            <p className="text-text-secondary text-sm leading-relaxed">Your data is used to operate the platform, process payments, verify account ownership, calculate earnings, and communicate important updates. We do not sell your personal data to third parties.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">3. Data Security</h2>
            <p className="text-text-secondary text-sm leading-relaxed">We employ industry-standard security measures including encrypted sessions, hashed passwords, and secure connections to protect your data.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">4. Cookies</h2>
            <p className="text-text-secondary text-sm leading-relaxed">We use session cookies to maintain your login state. These cookies are essential for the platform to function and cannot be disabled.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">5. Third-Party Services</h2>
            <p className="text-text-secondary text-sm leading-relaxed">We integrate with TikTok for content verification, Google for authentication, and payment processors for payouts. Each service has its own privacy policy.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">6. Your Rights</h2>
            <p className="text-text-secondary text-sm leading-relaxed">You may request access to, correction of, or deletion of your personal data by contacting our support team. Account deletion is irreversible.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-bold mb-3">7. Contact</h2>
            <p className="text-text-secondary text-sm leading-relaxed">For privacy concerns, contact us at support@runeclipy.com or through our Discord community.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
