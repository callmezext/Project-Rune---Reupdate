"use client";

import { useState, useEffect, useCallback } from "react";
import { timeAgo } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";

interface ConnectedAccount {
  _id: string;
  platform: string;
  username: string;
  profileUrl: string;
  verificationCode: string;
  isVerified: boolean;
  verifiedAt: string;
  connectedAt: string;
}

export default function AccountsPage() {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [profileLink, setProfileLink] = useState("");
  const [step, setStep] = useState<"link" | "verify">("link");
  const [verifyCode, setVerifyCode] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [currentBio, setCurrentBio] = useState("");
  const [copied, setCopied] = useState(false);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const [canRequestManual, setCanRequestManual] = useState(false);
  const [manualRequested, setManualRequested] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (data.success) setAccounts(data.accounts);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    setHint("");
    setCurrentBio("");
    setCanRequestManual(false);
    setManualRequested(false);
    setSuccessMsg("");
    try {
      const res = await fetch("/api/accounts/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: profileLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVerifyCode(data.verificationCode);
      setStep("verify");
      setVerifyAttempts(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally { setActionLoading(false); }
  };

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(verifyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [verifyCode]);

  const handleVerify = async () => {
    setActionLoading(true);
    setError("");
    setHint("");
    setCurrentBio("");
    setCanRequestManual(false);
    setSuccessMsg("");
    setVerifyAttempts(prev => prev + 1);
    try {
      const res = await fetch("/api/accounts/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: profileLink }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        if (data.hint) setHint(data.hint);
        if (data.currentBio) setCurrentBio(data.currentBio);
        if (data.canRequestManual) setCanRequestManual(true);
        return;
      }
      setSuccessMsg(data.message || t("successMsgVerified"));
      setTimeout(() => {
        setShowModal(false);
        setStep("link");
        setProfileLink("");
        setVerifyAttempts(0);
        setSuccessMsg("");
        fetchAccounts();
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally { setActionLoading(false); }
  };

  const handleRequestManualVerify = async () => {
    setActionLoading(true);
    setError("");
    setHint("");
    try {
      const res = await fetch("/api/accounts/request-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileUrl: profileLink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setManualRequested(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm(t("disconnectAccount"))) return;
    try {
      await fetch("/api/accounts/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id }),
      });
      fetchAccounts();
    } catch (err) { console.error(err); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold gradient-text">{t("accountsTitle")}</h1>
          <p className="text-sm text-text-muted mt-1">{t("accountsSubtitle")}</p>
        </div>
        <button onClick={() => { setShowModal(true); setStep("link"); setError(""); setHint(""); setCurrentBio(""); setCanRequestManual(false); setManualRequested(false); setSuccessMsg(""); }}
          className="btn-gradient !rounded-xl text-sm !py-2.5 flex items-center gap-2">
          + {t("btnConnectAccount")}
        </button>
      </div>

      {/* Accounts List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse flex items-center gap-4">
              <div className="w-12 h-12 bg-bg-tertiary rounded-full" />
              <div className="flex-1 space-y-2"><div className="h-4 bg-bg-tertiary rounded w-1/3" /><div className="h-3 bg-bg-tertiary rounded w-1/4" /></div>
            </div>
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <span className="text-5xl mb-4 block">🔗</span>
          <h3 className="text-lg font-semibold mb-2">{t("noAccountsConnected")}</h3>
          <p className="text-text-muted text-sm mb-6">{t("noAccountsDesc")}</p>
          <button onClick={() => setShowModal(true)} className="btn-gradient !rounded-xl text-sm !py-2.5">+ {t("btnConnectAccount")}</button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map((acc) => (
            <div key={acc._id} className="glass-card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-bg-tertiary flex items-center justify-center text-2xl flex-shrink-0">
                🎵
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{acc.username}</span>
                  {acc.isVerified ? (
                    <span className="badge badge-active text-[10px]">{t("verifiedBadge")}</span>
                  ) : (
                    <span className="badge badge-paused text-[10px]">{t("pendingBadge")}</span>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {t("connectedAgo")} {acc.connectedAt ? timeAgo(new Date(acc.connectedAt)) : "recently"}
                </p>
              </div>
              <button onClick={() => handleDisconnect(acc._id)}
                className="text-text-muted hover:text-error transition-colors text-lg" title="Disconnect">
                🔗
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Connect Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="glass-card p-8 max-w-md w-full animate-fadeInUp max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold gradient-text">{t("connectModalTitle")}</h2>
              <button onClick={() => setShowModal(false)} className="text-text-muted hover:text-text-primary text-xl">×</button>
            </div>

            {/* Success message */}
            {successMsg && (
              <div className="mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm text-center">
                <span className="text-2xl block mb-2">✅</span>
                {successMsg}
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm">
                {error}
              </div>
            )}

            {/* Show current bio detected by server */}
            {currentBio && (
              <div className="mb-4 p-3 rounded-xl bg-bg-primary border border-border text-xs">
                <p className="text-text-muted mb-1 font-medium">{t("bioDetectedTitle")}</p>
                <p className="text-text-secondary italic">&ldquo;{currentBio}&rdquo;</p>
              </div>
            )}

            {/* Show hints */}
            {hint && (
              <div className="mb-4 p-3 rounded-xl bg-accent-light/10 border border-accent-light/20 text-text-secondary text-xs whitespace-pre-line">
                {hint}
              </div>
            )}

            {step === "link" ? (
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">{t("fieldProfileLink")}</label>
                  <input type="url" value={profileLink} onChange={(e) => setProfileLink(e.target.value)}
                    className="input-field" placeholder="https://www.tiktok.com/@yourusername" required />
                </div>
                <button type="submit" disabled={actionLoading}
                  className="btn-pink w-full !rounded-xl text-sm !py-3 btn-gradient disabled:opacity-50">
                  {actionLoading ? t("btnProcessing") : t("btnStartVerification")}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {!manualRequested ? (
                  <>
                    <div className="text-center p-6 rounded-xl bg-bg-primary border border-border">
                      <p className="text-sm text-text-secondary mb-3">{t("bioInstructionsCode")}</p>
                      <div className="text-3xl font-mono font-extrabold tracking-[8px] gradient-text mb-3">{verifyCode}</div>
                      <button onClick={handleCopyCode}
                        className="text-xs text-accent-light hover:underline transition-all">
                        {copied ? t("btnCopied") : t("btnCopyCode")}
                      </button>
                    </div>

                    {/* Step-by-step instructions */}
                    <div className="p-4 rounded-xl bg-bg-primary/50 border border-border/50 text-xs text-text-muted space-y-2">
                      <p className="font-semibold text-text-secondary">{t("stepsHeader")}</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>{t("stepItem1")}</li>
                        <li>{t("stepItem2")}</li>
                        <li>{t("stepItem3")}</li>
                        <li><strong>{t("stepItem4")}</strong></li>
                        <li>{t("stepItem5")}</li>
                        <li>{t("stepItem6")}</li>
                      </ol>
                    </div>

                    <button onClick={handleVerify} disabled={actionLoading}
                      className="btn-gradient w-full !rounded-xl text-sm !py-3 disabled:opacity-50 relative">
                      {actionLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          {t("btnCheckingBio")}
                        </span>
                      ) : verifyAttempts > 0 ? (
                        `🔄 ${t("btnTryAgainVerify")} (${t("pendingBadge")} ${verifyAttempts})`
                      ) : (
                        t("btnAddedVerify")
                      )}
                    </button>

                    {/* Manual verification request button */}
                    {canRequestManual && (
                      <button onClick={handleRequestManualVerify}
                        className="w-full text-sm py-2.5 rounded-xl border border-accent-light/30 text-accent-light hover:bg-accent-light/10 transition-all">
                        {t("btnRequestManual")}
                      </button>
                    )}

                    <button onClick={() => { setStep("link"); setError(""); setHint(""); setCurrentBio(""); setCanRequestManual(false); }}
                      className="w-full text-sm text-text-muted hover:text-text-secondary">← {t("btnBack")}</button>
                  </>
                ) : (
                  /* Manual verification info */
                  <div className="text-center space-y-4">
                    <div className="p-6 rounded-xl bg-accent-light/5 border border-accent-light/20">
                      <span className="text-4xl block mb-3">📩</span>
                      <h3 className="font-bold text-text-primary mb-2">{t("manualRequestSentTitle")}</h3>
                      <p className="text-sm text-text-muted mb-4">
                        {t("manualRequestSentDesc")}
                      </p>
                      <div className="p-3 rounded-lg bg-bg-primary border border-border text-xs text-text-muted text-left space-y-1">
                        <p>{t("manualRequestInfo1")}</p>
                        <p>{t("manualRequestInfo2")}</p>
                        <p>{t("manualRequestInfo3")}</p>
                      </div>
                    </div>
                    <button onClick={() => { setShowModal(false); setStep("link"); setManualRequested(false); }}
                      className="btn-gradient w-full !rounded-xl text-sm !py-3">
                      {t("btnModalClose")}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
