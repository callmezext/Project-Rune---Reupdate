"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, timeAgo, cn } from "@/lib/utils";

interface BalanceData {
  campaignBalance: number;
  referralBalance: number;
  transactions: {
    _id: string; type: string; amount: number; status: string;
    description: string; createdAt: string; netAmount?: number; paymentFee?: number;
  }[];
}

const paymentMethods = [
  { type: "dana", label: "Dana", icon: "💳", placeholder: "08xxxxxxxxxxxx" },
  { type: "gopay", label: "GoPay", icon: "🟢", placeholder: "08xxxxxxxxxxxx" },
  { type: "ovo", label: "OVO", icon: "🟣", placeholder: "08xxxxxxxxxxxx" },
  { type: "paypal", label: "PayPal", icon: "🅿️", placeholder: "email@example.com" },
  { type: "bank", label: "Bank Transfer", icon: "🏦", placeholder: "Account number + Bank name" },
];

export default function BalancePage() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [methodDetail, setMethodDetail] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const r = await fetch("/api/balance");
      const d = await r.json();
      if (d.success) setData(d);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const totalBalance = (data?.campaignBalance || 0) + (data?.referralBalance || 0);

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) return;
    setWithdrawing(true);
    setWithdrawResult(null);
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, paymentMethod: { type: selectedMethod, detail: methodDetail } }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setWithdrawResult({ success: true, message: d.message });
      fetchBalance();
      setTimeout(() => { setShowWithdraw(false); setWithdrawResult(null); setWithdrawAmount(""); }, 3000);
    } catch (err) {
      setWithdrawResult({ success: false, message: err instanceof Error ? err.message : "Failed" });
    } finally { setWithdrawing(false); }
  };

  const fee = parseFloat(withdrawAmount) > 0 ? parseFloat((parseFloat(withdrawAmount) * 0.03).toFixed(2)) : 0;
  const netAmount = parseFloat(withdrawAmount) > 0 ? parseFloat((parseFloat(withdrawAmount) - fee).toFixed(2)) : 0;

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">💰</div></div>;

  const typeIcons: Record<string, string> = { campaign_earning: "🎵", referral_earning: "👥", payout: "💸", refund: "↩️" };
  const statusColors: Record<string, string> = { pending: "text-warning", completed: "text-success", failed: "text-error" };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold">My Balance</h1>
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <button onClick={() => setShowRules(true)} className="text-sm text-text-muted hover:text-accent-light transition-colors flex items-center gap-1">
            📖 Rules & Info
          </button>
          <button onClick={() => setShowWithdraw(true)} className="btn-gradient !rounded-xl text-sm !py-2.5">
            💸 Withdraw
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="glass-card p-6 bg-gradient-to-br from-accent/10 to-transparent">
          <span className="text-2xl mb-2 block">💎</span>
          <div className="text-3xl font-extrabold gradient-text">{formatCurrency(totalBalance)}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">Total Balance</div>
        </div>
        <div className="glass-card p-6">
          <span className="text-2xl mb-2 block">🎵</span>
          <div className="text-2xl font-extrabold">{formatCurrency(data?.campaignBalance || 0)}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">Campaign Earnings</div>
        </div>
        <div className="glass-card p-6">
          <span className="text-2xl mb-2 block">👥</span>
          <div className="text-2xl font-extrabold text-accent-light">{formatCurrency(data?.referralBalance || 0)}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">Referral Earnings</div>
          <Link href="/balance/referrals" className="text-[10px] text-accent-light hover:underline mt-2 block">View referrals →</Link>
        </div>
      </div>

      {/* Rules & Info Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">💵</span>
          <div>
            <div className="text-sm font-bold mb-0.5">Min. Withdraw</div>
            <p className="text-xs text-text-muted">Minimum <span className="text-accent-light font-semibold">$10.00</span></p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">💳</span>
          <div>
            <div className="text-sm font-bold mb-0.5">Fee</div>
            <p className="text-xs text-text-muted"><span className="text-accent-light font-semibold">3%</span> of the total withdrawal</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⏱️</span>
          <div>
            <div className="text-sm font-bold mb-0.5">Processing</div>
            <p className="text-xs text-text-muted">1-3 business days after approval</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🔄</span>
          <div>
            <div className="text-sm font-bold mb-0.5">Auto Check</div>
            <p className="text-xs text-text-muted">Views are checked automatically every day</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Transaction History</h2>
        {!data?.transactions?.length ? (
          <p className="text-sm text-text-muted text-center py-8">No transactions yet</p>
        ) : (
          <div className="space-y-1">
            {data.transactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-primary/30 transition-colors gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-lg flex-shrink-0">{typeIcons[tx.type] || "📄"}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium capitalize truncate">{tx.type.replace(/_/g, " ")}</div>
                    <div className="text-xs text-text-muted truncate">{tx.description || timeAgo(new Date(tx.createdAt))}</div>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={cn("font-bold text-sm", tx.type === "payout" ? "text-warning" : "text-success")}>
                    {tx.type === "payout" ? "-" : "+"}{formatCurrency(tx.amount)}
                  </div>
                  <div className={cn("text-[10px] capitalize", statusColors[tx.status])}>{tx.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowWithdraw(false)}>
          <div className="glass-card p-5 sm:p-8 max-w-md w-full animate-fadeInUp max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold gradient-text">💸 Withdraw</h2>
              <button onClick={() => setShowWithdraw(false)} className="text-text-muted hover:text-text-primary text-xl">×</button>
            </div>

            {withdrawResult ? (
              <div className={cn("p-4 rounded-xl text-center", withdrawResult.success ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
                <div className="text-2xl mb-2">{withdrawResult.success ? "✅" : "❌"}</div>
                <p className="text-sm font-medium">{withdrawResult.message}</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Amount */}
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">Amount ($)</label>
                  <input type="number" value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-field text-lg font-bold text-center" placeholder="0.00"
                    min={10} max={totalBalance} step={0.01} />
                  <div className="flex justify-between mt-1.5 text-[10px] text-text-muted">
                    <span>Min: $10.00</span>
                    <button onClick={() => setWithdrawAmount(totalBalance.toFixed(2))} className="text-accent-light hover:underline">
                      Max: {formatCurrency(totalBalance)}
                    </button>
                  </div>
                </div>

                {/* Fee Preview */}
                {parseFloat(withdrawAmount) > 0 && (
                  <div className="p-3 rounded-xl bg-bg-primary/50 border border-border text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-text-muted">Withdraw</span><span>${withdrawAmount}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Fee (3%)</span><span className="text-error">-${fee}</span></div>
                    <div className="flex justify-between border-t border-border pt-1 font-bold"><span>You receive</span><span className="text-success">${netAmount}</span></div>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Payment Method</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {paymentMethods.map((m) => (
                      <button key={m.type} type="button"
                        onClick={() => setSelectedMethod(m.type)}
                        className={cn("p-2.5 rounded-xl border text-center transition-all text-xs",
                          selectedMethod === m.type
                            ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                            : "border-border hover:border-border-hover"
                        )}>
                        <div className="text-base mb-0.5">{m.icon}</div>
                        <div>{m.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detail */}
                {selectedMethod && (
                  <div>
                    <label className="block text-sm text-text-secondary mb-1.5">
                      {selectedMethod === "paypal" ? "PayPal Email" :
                       selectedMethod === "bank" ? "Account Number + Bank Name" :
                       "Phone Number"}
                    </label>
                    <input value={methodDetail} onChange={(e) => setMethodDetail(e.target.value)}
                      className="input-field" placeholder={paymentMethods.find(m => m.type === selectedMethod)?.placeholder} />
                  </div>
                )}

                <button onClick={handleWithdraw}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) < 10 || !selectedMethod || !methodDetail || withdrawing}
                  className="btn-gradient w-full !rounded-xl !py-3 text-sm disabled:opacity-40">
                  {withdrawing ? "Processing..." : `Withdraw ${formatCurrency(netAmount)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Rules & Information Modal */}
      {showRules && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowRules(false)}>
          <div className="glass-card p-8 max-w-lg w-full animate-fadeInUp max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold gradient-text">📖 Rules & Information</h2>
              <button onClick={() => setShowRules(false)} className="text-text-muted hover:text-text-primary text-xl">×</button>
            </div>

            <div className="space-y-5">
              {/* Withdrawal Rules */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">💸 Withdrawal Terms</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">1.</span>
                    <span>Minimum withdrawal is <strong className="text-accent-light">$10.00</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">2.</span>
                    <span>Admin fee is <strong className="text-accent-light">3%</strong> of total withdrawal amount</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">3.</span>
                    <span>Payment processed in <strong>1-3 business days</strong> after approval</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">4.</span>
                    <span>Supported methods: <strong>Dana, GoPay, OVO, PayPal, Bank Transfer</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">5.</span>
                    <span>Make sure payment details (phone number/email/account number) are correct before requesting</span>
                  </div>
                </div>
              </div>

              {/* Earning Rules */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">🎵 Earning Terms</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">1.</span>
                    <span>Earnings are calculated based on <strong>real views</strong> of submitted videos</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">2.</span>
                    <span>Rate per 1 million views varies by campaign (see campaign details)</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">3.</span>
                    <span>Each campaign has a <strong>maximum earning limit per creator & per post</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">4.</span>
                    <span>Views are checked <strong>automatically every day</strong> by the system</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">5.</span>
                    <span>Video must meet the <strong>minimum views</strong> specified by the campaign</span>
                  </div>
                </div>
              </div>

              {/* General Rules */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">⚠️ General Rules</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>Using <strong>bots, fake views, or any manipulation</strong> is strictly prohibited. Accounts will be <strong className="text-error">permanently banned</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>Videos must be <strong>original content</strong>, not re-uploaded from other creators</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>One TikTok account can only be connected to <strong>one RuneClipy account</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>Deleted videos from TikTok will not have their earnings counted</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>Admin reserves the right to <strong>reject submissions</strong> that do not meet campaign guidelines</span>
                  </div>
                </div>
              </div>

              {/* Referral Info */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">👥 Referral Program</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">•</span>
                    <span>Get <strong className="text-accent-light">10%</strong> of the first earning of every person you invite</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">•</span>
                    <span>There is no limit to the number of people you can refer</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">•</span>
                    <span>Referral earnings can be withdrawn along with campaign earnings</span>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setShowRules(false)} className="btn-gradient w-full !rounded-xl !py-3 text-sm mt-6">
              Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
