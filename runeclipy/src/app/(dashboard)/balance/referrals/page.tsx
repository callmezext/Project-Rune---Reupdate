"use client";

import { useState, useEffect } from "react";
import { formatCurrency, censorUsername } from "@/lib/utils";

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  totalEarned: number;
  referrals: { _id: string; referredUsername: string; totalEarned: number; joinedAt: string }[];
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referrals")
      .then((r) => r.json())
      .then((d) => { if (d.success) setData(d); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const referralLink = `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${data?.referralCode || ""}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">👥</div></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold gradient-text mb-2">My Referrals</h1>
      <p className="text-sm text-text-muted mb-8">Earn 5% commission on every referral&apos;s campaign earnings</p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5 text-center">
          <div className="text-3xl font-extrabold">{data?.totalReferrals || 0}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">Total Referrals</div>
        </div>
        <div className="glass-card p-5 text-center">
          <div className="text-3xl font-extrabold text-success">{formatCurrency(data?.totalEarned || 0)}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">Total Earned</div>
        </div>
        <div className="glass-card p-5 text-center md:col-span-1 col-span-2">
          <div className="text-xl font-mono font-bold text-accent-light">{data?.referralCode || "—"}</div>
          <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">Your Code</div>
        </div>
      </div>

      {/* Invite Link */}
      <div className="glass-card p-6 mb-8">
        <h3 className="font-bold mb-3">📎 Your Invite Link</h3>
        <div className="flex gap-2">
          <input type="text" readOnly value={referralLink} className="input-field text-xs font-mono flex-1" />
          <button onClick={copyLink} className="btn-gradient !rounded-xl text-sm !px-6 flex-shrink-0">
            {copied ? "✅ Copied!" : "📋 Copy"}
          </button>
        </div>
      </div>

      {/* Referral List */}
      <div className="glass-card p-6">
        <h3 className="font-bold mb-4">Referred Users</h3>
        {!data?.referrals?.length ? (
          <p className="text-sm text-text-muted text-center py-8">No referrals yet. Share your link!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-wider">
                  <th className="pb-3 text-left">#</th>
                  <th className="pb-3 text-left">User</th>
                  <th className="pb-3 text-right">Earned for You</th>
                  <th className="pb-3 text-right">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.referrals.map((ref, i) => (
                  <tr key={ref._id} className="border-b border-border/50 hover:bg-bg-primary/30 transition-colors">
                    <td className="py-3 text-text-muted">{i + 1}</td>
                    <td className="py-3 font-mono">{censorUsername(ref.referredUsername)}</td>
                    <td className="py-3 text-right font-bold text-success">{formatCurrency(ref.totalEarned)}</td>
                    <td className="py-3 text-right text-text-muted">{new Date(ref.joinedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
