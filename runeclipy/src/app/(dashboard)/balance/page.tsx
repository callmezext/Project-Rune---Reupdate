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
  { type: "bank", label: "Bank Transfer", icon: "🏦", placeholder: "Nomor rekening" },
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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">My Balance</h1>
        <button onClick={() => setShowWithdraw(true)} className="btn-gradient !rounded-xl text-sm !py-2.5">
          💸 Withdraw
        </button>
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

      {/* Info Cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <div className="glass-card p-5 flex items-start gap-3">
          <span className="text-xl">⏱️</span>
          <div>
            <div className="text-sm font-bold mb-1">Minimum Withdrawal</div>
            <p className="text-xs text-text-muted">Minimum $10.00. Fee 3% dari total withdrawal.</p>
          </div>
        </div>
        <div className="glass-card p-5 flex items-start gap-3">
          <span className="text-xl">📋</span>
          <div>
            <div className="text-sm font-bold mb-1">Processing Time</div>
            <p className="text-xs text-text-muted">1-3 hari kerja setelah admin approve.</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">Transaction History</h2>
        {!data?.transactions?.length ? (
          <p className="text-sm text-text-muted text-center py-8">Belum ada transaksi</p>
        ) : (
          <div className="space-y-1">
            {data.transactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-bg-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{typeIcons[tx.type] || "📄"}</span>
                  <div>
                    <div className="text-sm font-medium capitalize">{tx.type.replace(/_/g, " ")}</div>
                    <div className="text-xs text-text-muted">{tx.description || timeAgo(new Date(tx.createdAt))}</div>
                  </div>
                </div>
                <div className="text-right">
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
          <div className="glass-card p-8 max-w-md w-full animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
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
                  <label className="block text-sm text-text-secondary mb-1.5">Jumlah ($)</label>
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
                    <div className="flex justify-between border-t border-border pt-1 font-bold"><span>Kamu terima</span><span className="text-success">${netAmount}</span></div>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Metode Pembayaran</label>
                  <div className="grid grid-cols-3 gap-2">
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
                      {selectedMethod === "paypal" ? "Email PayPal" :
                       selectedMethod === "bank" ? "Nomor Rekening + Nama Bank" :
                       "Nomor HP"}
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
    </div>
  );
}
