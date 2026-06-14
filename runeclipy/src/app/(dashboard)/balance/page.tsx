"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, timeAgo, cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface BalanceData {
  campaignBalance: number;
  referralBalance: number;
  transactions: {
    _id: string; type: string; amount: number; status: string;
    description: string; createdAt: string; netAmount?: number; paymentFee?: number;
  }[];
}

export default function BalancePage() {
  const { t } = useLanguage();
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [methodDetail, setMethodDetail] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showRules, setShowRules] = useState(false);

  const paymentMethods = [
    { type: "dana", label: "Dana", icon: "💳", placeholder: "08xxxxxxxxxxxx" },
    { type: "gopay", label: "GoPay", icon: "🟢", placeholder: "08xxxxxxxxxxxx" },
    { type: "ovo", label: "OVO", icon: "🟣", placeholder: "08xxxxxxxxxxxx" },
    { type: "paypal", label: "PayPal", icon: "🅿️", placeholder: "email@example.com" },
    { type: "bank", label: "Bank Transfer", icon: "🏦", placeholder: t("fieldBankDetails") },
  ];

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
        <h1 className="text-2xl font-bold">{t("balanceTitle")}</h1>
        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
          <button onClick={() => setShowRules(true)} className="text-sm text-text-muted hover:text-accent-light transition-colors flex items-center gap-1">
            {t("btnRulesInfo")}
          </button>
          <button onClick={() => setShowWithdraw(true)} className="btn-gradient !rounded-xl text-sm !py-2.5">
            {t("btnWithdraw")}
          </button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid md:grid-cols-3 gap-5 mb-8">
        <div className="glass-card p-6 bg-gradient-to-br from-accent/10 to-transparent">
          <span className="text-2xl mb-2 block">💎</span>
          <div className="text-3xl font-extrabold gradient-text">{formatCurrency(totalBalance)}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{t("totalBalanceCard")}</div>
        </div>
        <div className="glass-card p-6">
          <span className="text-2xl mb-2 block">🎵</span>
          <div className="text-2xl font-extrabold">{formatCurrency(data?.campaignBalance || 0)}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{t("campaignEarningCard")}</div>
        </div>
        <div className="glass-card p-6">
          <span className="text-2xl mb-2 block">👥</span>
          <div className="text-2xl font-extrabold text-accent-light">{formatCurrency(data?.referralBalance || 0)}</div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider mt-1">{t("referralEarningCard")}</div>
          <Link href="/balance/referrals" className="text-[10px] text-accent-light hover:underline mt-2 block">{t("viewReferralsLink")}</Link>
        </div>
      </div>

      {/* Rules & Info Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="glass-card p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">💵</span>
          <div>
            <div className="text-sm font-bold mb-0.5">{t("minWithdrawLabel")}</div>
            <p className="text-xs text-text-muted">{t("minWithdrawValue")} <span className="text-accent-light font-semibold">$10.00</span></p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">💳</span>
          <div>
            <div className="text-sm font-bold mb-0.5">{t("feeLabel")}</div>
            <p className="text-xs text-text-muted"><span className="text-accent-light font-semibold">3%</span> {t("feeValue")}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">⏱️</span>
          <div>
            <div className="text-sm font-bold mb-0.5">{t("processingLabel")}</div>
            <p className="text-xs text-text-muted">{t("processingValue")}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-start gap-3">
          <span className="text-xl flex-shrink-0">🔄</span>
          <div>
            <div className="text-sm font-bold mb-0.5">{t("autoCheckLabel")}</div>
            <p className="text-xs text-text-muted">{t("autoCheckValue")}</p>
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold mb-4">{t("transHistoryHeader")}</h2>
        {!data?.transactions?.length ? (
          <p className="text-sm text-text-muted text-center py-8">{t("noTransactions")}</p>
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
              <h2 className="text-lg font-bold gradient-text">{t("withdrawModalHeader")}</h2>
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
                  <label className="block text-sm text-text-secondary mb-1.5">{t("fieldAmount")}</label>
                  <input type="number" value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="input-field text-lg font-bold text-center" placeholder="0.00"
                    min={10} max={totalBalance} step={0.01} />
                  <div className="flex justify-between mt-1.5 text-[10px] text-text-muted">
                    <span>{t("limitMin")}</span>
                    <button onClick={() => setWithdrawAmount(totalBalance.toFixed(2))} className="text-accent-light hover:underline">
                      {t("limitMax")}{formatCurrency(totalBalance)}
                    </button>
                  </div>
                </div>

                {/* Fee Preview */}
                {parseFloat(withdrawAmount) > 0 && (
                  <div className="p-3 rounded-xl bg-bg-primary/50 border border-border text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-text-muted">Withdraw</span><span>${withdrawAmount}</span></div>
                    <div className="flex justify-between"><span className="text-text-muted">Fee (3%)</span><span className="text-error">-${fee}</span></div>
                    <div className="flex justify-between border-t border-border pt-1 font-bold"><span>{t("youReceive")}</span><span className="text-success">${netAmount}</span></div>
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label className="block text-sm text-text-secondary mb-2">{t("paymentMethodLabel")}</label>
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
                      {selectedMethod === "paypal" ? t("fieldPayPalEmail") :
                       selectedMethod === "bank" ? t("fieldBankDetails") :
                       t("fieldPhoneNumber")}
                    </label>
                    <input value={methodDetail} onChange={(e) => setMethodDetail(e.target.value)}
                      className="input-field" placeholder={paymentMethods.find(m => m.type === selectedMethod)?.placeholder} />
                  </div>
                )}

                <button onClick={handleWithdraw}
                  disabled={!withdrawAmount || parseFloat(withdrawAmount) < 10 || !selectedMethod || !methodDetail || withdrawing}
                  className="btn-gradient w-full !rounded-xl !py-3 text-sm disabled:opacity-40">
                  {withdrawing ? t("btnProcessing") : `${t("btnWithdraw")} ${formatCurrency(netAmount)}`}
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
              <h2 className="text-lg font-bold gradient-text">{t("rulesModalHeader")}</h2>
              <button onClick={() => setShowRules(false)} className="text-text-muted hover:text-text-primary text-xl">×</button>
            </div>

            <div className="space-y-5">
              {/* Withdrawal Rules */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">{t("rulesTab1")}</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">1.</span>
                    <span>{t("rulesW1")}<strong className="text-accent-light">$10.00</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">2.</span>
                    <span>{t("rulesW2")}<strong className="text-accent-light">3%</strong>{t("rulesW2_post")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">3.</span>
                    <span>{t("rulesW3")}<strong>{t("processingValue").replace("after approval", "")}</strong>{t("rulesW3_post")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">4.</span>
                    <span>{t("rulesW4")}<strong>{t("rulesW4_methods")}</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">5.</span>
                    <span>{t("rulesW5")}</span>
                  </div>
                </div>
              </div>

              {/* Earning Rules */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">{t("rulesTab2")}</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">1.</span>
                    <span>{t("rulesE1")}<strong>{t("rulesE1_highlight")}</strong>{t("rulesE1_post")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">2.</span>
                    <span>{t("rulesE2")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">3.</span>
                    <span>{t("rulesE3")}<strong>{t("rulesE3_highlight")}</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">4.</span>
                    <span>{t("rulesE4")}<strong>{t("rulesE4_highlight")}</strong>{t("rulesE4_post")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">5.</span>
                    <span>{t("rulesE5")}<strong>{t("rulesE5_highlight")}</strong>{t("rulesE5_post")}</span>
                  </div>
                </div>
              </div>

              {/* General Rules */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">{t("rulesTab3")}</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>{t("rulesG1")}<strong>{t("rulesG1_highlight")}</strong>{t("rulesG1_post")}<strong className="text-error">{t("rulesG1_highlight2")}</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>{t("rulesG2")}<strong>{t("rulesG2_highlight")}</strong>{t("rulesG2_post")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>{t("rulesG3")}<strong>{t("rulesG3_highlight")}</strong></span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>{t("rulesG4")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-error/5 border border-error/20">
                    <span className="text-error font-bold mt-0.5">!</span>
                    <span>{t("rulesG5")}<strong>{t("rulesG5_highlight")}</strong>{t("rulesG5_post")}</span>
                  </div>
                </div>
              </div>

              {/* Referral Info */}
              <div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2">{t("rulesTab4")}</h3>
                <div className="space-y-2 text-xs text-text-secondary">
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">•</span>
                    <span>{t("rulesR1")}<strong>{t("rulesR1_highlight")}</strong>{t("rulesR1_post")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">•</span>
                    <span>{t("rulesR2")}</span>
                  </div>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-bg-primary/50 border border-border">
                    <span className="text-accent-light font-bold mt-0.5">•</span>
                    <span>{t("rulesR3")}</span>
                  </div>
                </div>
              </div>
            </div>

            <button onClick={() => setShowRules(false)} className="btn-gradient w-full !rounded-xl !py-3 text-sm mt-6">
              {t("rulesBtnUnderstand")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
