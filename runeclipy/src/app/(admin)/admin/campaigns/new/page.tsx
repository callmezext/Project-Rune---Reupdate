"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCampaignPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    title: "", type: "music", totalBudget: 1000, ratePerMillionViews: 500,
    maxEarningsPerCreator: 50, maxEarningsPerPost: 25, maxSubmissionsPerAccount: 3,
    minViews: 1000, contentType: "both", description: "", coverImage: "", discordInviteUrl: "",
    supportedPlatforms: ["tiktok"],
    sounds: [{ title: "", tiktokSoundId: "", soundUrl: "", videoReferenceUrl: "" }],
    // New fields
    allowOldVideos: false,
    maxVideoAgeHours: 24,
    earningType: "per_view" as "per_view" | "per_post" | "both",
    fixedRatePerPost: 0,
    autoApprove: false,
    minEngagementRate: 2,
    leaderboardBonuses: [{ rank: 1, bonus: 50 }, { rank: 2, bonus: 30 }, { rank: 3, bonus: 15 }] as { rank: number; bonus: number }[],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateSounds();
    if (validationError) { alert(validationError); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      router.push("/admin/campaigns");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally { setSaving(false); }
  };

  // Auto-extract TikTok Sound ID from a music URL
  // e.g. https://www.tiktok.com/music/original-sound-Fritzuuu-7622831414643739412 → 7622831414643739412
  const extractSoundId = (url: string): string => {
    const match = url.match(/(\d{15,25})(?:[?#]|$)/);
    return match ? match[1] : "";
  };

  const updateSound = (i: number, field: string, value: string) => {
    const sounds = [...form.sounds];
    sounds[i] = { ...sounds[i], [field]: value };
    // Auto-fill tiktokSoundId when soundUrl is pasted
    if (field === "soundUrl" && !sounds[i].tiktokSoundId) {
      const extracted = extractSoundId(value);
      if (extracted) sounds[i] = { ...sounds[i], tiktokSoundId: extracted };
    }
    setForm({ ...form, sounds });
  };

  const removeSound = (i: number) => {
    const sounds = form.sounds.filter((_, idx) => idx !== i);
    setForm({ ...form, sounds });
  };

  const validateSounds = (): string | null => {
    if (form.type === "music") {
      const missing = form.sounds.some((s) => !s.tiktokSoundId.trim());
      if (missing) return "Campaign type 'Music' wajib memiliki TikTok Sound ID pada setiap sound. Paste URL sound TikTok untuk auto-extract.";
    }
    return null;
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Create New Campaign</h1>
      <p className="text-sm text-text-muted mb-8">Atur semua detail campaign untuk creator.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">📋 Basic Info</h3>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Campaign Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required placeholder="Contoh: Summer Vibes Beat Campaign" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="music">🎵 Music</option><option value="clipping">🎬 Clipping</option>
                <option value="logo">🏷️ Logo</option><option value="ugc">📦 UGC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Content Type</label>
              <select value={form.contentType} onChange={(e) => setForm({ ...form, contentType: e.target.value })} className="input-field">
                <option value="video">Video Only</option><option value="slide">Slide Only</option><option value="both">Both</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Cover Image URL</label>
            <input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} className="input-field" placeholder="https://images.unsplash.com/..." />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Description (HTML)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field min-h-[120px]" placeholder="<p>Jelaskan campaign secara detail...</p>" />
          </div>
        </div>

        {/* Earning Type */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">💎 Earning Model</h3>
          <p className="text-xs text-text-muted -mt-1 mb-3">Pilih bagaimana creator dibayar untuk campaign ini.</p>

          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "per_view", icon: "👁️", label: "Per View", desc: "Bayar berdasarkan jumlah views" },
              { value: "per_post", icon: "📝", label: "Per Post", desc: "Bayar flat per video yang di-approve" },
              { value: "both", icon: "⚡", label: "Both", desc: "Per view + bonus per post" },
            ].map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => setForm({ ...form, earningType: opt.value as typeof form.earningType })}
                className={`p-4 rounded-xl border text-left transition-all ${
                  form.earningType === opt.value
                    ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                    : "border-border hover:border-border-hover bg-bg-primary/50"
                }`}>
                <div className="text-xl mb-1">{opt.icon}</div>
                <div className="text-sm font-bold">{opt.label}</div>
                <div className="text-[11px] text-text-muted mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Budget & Rates */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">💰 Budget & Rates</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Total Budget ($)</label>
              <input type="number" value={form.totalBudget} onChange={(e) => setForm({ ...form, totalBudget: +e.target.value })} className="input-field" min={100} required />
            </div>

            {(form.earningType === "per_view" || form.earningType === "both") && (
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Rate per 1M Views ($)</label>
                <input type="number" value={form.ratePerMillionViews} onChange={(e) => setForm({ ...form, ratePerMillionViews: +e.target.value })} className="input-field" min={10} required />
              </div>
            )}

            {(form.earningType === "per_post" || form.earningType === "both") && (
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Fixed Rate / Post ($)</label>
                <input type="number" value={form.fixedRatePerPost} onChange={(e) => setForm({ ...form, fixedRatePerPost: +e.target.value })} className="input-field" min={0} step={0.5} />
              </div>
            )}

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max Earning / Creator ($)</label>
              <input type="number" value={form.maxEarningsPerCreator} onChange={(e) => setForm({ ...form, maxEarningsPerCreator: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max Earning / Post ($)</label>
              <input type="number" value={form.maxEarningsPerPost} onChange={(e) => setForm({ ...form, maxEarningsPerPost: +e.target.value })} className="input-field" />
              <p className="text-[10px] text-text-muted mt-1">Cap earning per video (dari views). Tidak berlaku untuk fixed rate per post.</p>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max Submissions / Account</label>
              <input type="number" value={form.maxSubmissionsPerAccount} onChange={(e) => setForm({ ...form, maxSubmissionsPerAccount: +e.target.value })} className="input-field" min={1} />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Min Views Required</label>
              <input type="number" value={form.minViews} onChange={(e) => setForm({ ...form, minViews: +e.target.value })} className="input-field" />
              <p className="text-[10px] text-text-muted mt-1">Video harus punya minimal views ini saat submit.</p>
            </div>
          </div>
        </div>

        {/* Video Rules */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">📏 Video Rules</h3>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5">
              <input
                type="checkbox"
                checked={form.allowOldVideos}
                onChange={(e) => setForm({ ...form, allowOldVideos: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-5 h-5 rounded-md border-2 border-border peer-checked:border-accent peer-checked:bg-accent/20 transition-all flex items-center justify-center group-hover:border-border-hover">
                {form.allowOldVideos ? <span className="text-accent text-xs">✓</span> : null}
              </div>
            </div>
            <div>
              <span className="text-sm font-medium">Bolehkan video lama</span>
              <p className="text-xs text-text-muted mt-0.5">
                Jika dicentang, creator bisa submit video yang di-upload lebih dari batas waktu.
              </p>
            </div>
          </label>

          {!form.allowOldVideos && (
            <div className="ml-8 max-w-xs animate-fadeInUp">
              <label className="block text-sm text-text-secondary mb-1.5">Batas Usia Video (jam)</label>
              <input
                type="number"
                value={form.maxVideoAgeHours}
                onChange={(e) => setForm({ ...form, maxVideoAgeHours: +e.target.value })}
                className="input-field"
                min={1}
                max={720}
              />
              <p className="text-[10px] text-text-muted mt-1">
                Video harus di-upload dalam {form.maxVideoAgeHours} jam terakhir. Default: 24 jam.
              </p>
            </div>
          )}

          <div className="border-t border-border/30 pt-4 mt-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input type="checkbox" checked={form.autoApprove}
                  onChange={(e) => setForm({ ...form, autoApprove: e.target.checked })} className="sr-only peer" />
                <div className="w-5 h-5 rounded-md border-2 border-border peer-checked:border-success peer-checked:bg-success/20 transition-all flex items-center justify-center group-hover:border-border-hover">
                  {form.autoApprove ? <span className="text-success text-xs">✓</span> : null}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">🤖 Auto-Approve</span>
                <p className="text-xs text-text-muted mt-0.5">
                  Otomatis approve submission jika semua check pass dan engagement rate cukup.
                </p>
              </div>
            </label>

            {form.autoApprove && (
              <div className="ml-8 max-w-xs mt-3 animate-fadeInUp">
                <label className="block text-sm text-text-secondary mb-1.5">Min Engagement Rate (%)</label>
                <input type="number" value={form.minEngagementRate}
                  onChange={(e) => setForm({ ...form, minEngagementRate: +e.target.value })}
                  className="input-field" min={0} max={50} step={0.5} />
                <p className="text-[10px] text-text-muted mt-1">Engagement = (likes + comments) / views × 100</p>
              </div>
            )}
          </div>
        </div>

        {/* Sounds */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold">🎵 Campaign Sounds</h3>
              <p className="text-xs text-text-muted mt-0.5">
                Sound yang wajib dipakai creator di video mereka.
                {form.type === "music" && (
                  <span className="ml-1 text-warning font-semibold">⚠️ Type Music — Sound ID wajib diisi.</span>
                )}
              </p>
            </div>
            <button type="button" onClick={() => setForm({ ...form, sounds: [...form.sounds, { title: "", tiktokSoundId: "", soundUrl: "", videoReferenceUrl: "" }] })}
              className="text-xs text-accent-light hover:text-accent px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40 transition-all">+ Add Sound</button>
          </div>

          {/* Sound ID info box for music type */}
          {form.type === "music" && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-info/10 border border-info/20 text-sm">
              <span className="text-info text-base mt-0.5 flex-shrink-0">ℹ️</span>
              <div className="text-info/80 text-xs leading-relaxed">
                <strong className="text-info">Cara mendapatkan Sound ID:</strong><br />
                Buka TikTok → klik sound → salin URL-nya, contoh:<br />
                <code className="font-mono bg-bg-primary/60 px-1 rounded text-[11px]">
                  tiktok.com/music/original-sound-Name-<strong>7622831414643739412</strong>
                </code><br />
                Angka panjang di akhir URL = Sound ID. Paste URL di kolom Sound URL dan ID akan otomatis terisi.
              </div>
            </div>
          )}

          {form.sounds.map((sound, i) => (
            <div key={i} className={`p-4 rounded-xl border space-y-3 relative transition-colors ${
              form.type === "music" && !sound.tiktokSoundId
                ? "bg-warning/5 border-warning/30"
                : "bg-bg-primary/50 border-border"
            }`}>
              {form.sounds.length > 1 && (
                <button type="button" onClick={() => removeSound(i)}
                  className="absolute top-3 right-3 text-text-muted hover:text-error text-xs transition-colors">✕</button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-text-muted uppercase tracking-wide mb-1">Sound Title</label>
                  <input value={sound.title} onChange={(e) => updateSound(i, "title", e.target.value)} className="input-field text-sm" placeholder="Nama sound" />
                </div>
                <div>
                  <label className="block text-[11px] uppercase tracking-wide mb-1">
                    <span className={form.type === "music" && !sound.tiktokSoundId ? "text-warning" : "text-text-muted"}>
                      TikTok Sound ID {form.type === "music" ? "*" : "(opsional)"}
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      value={sound.tiktokSoundId}
                      onChange={(e) => updateSound(i, "tiktokSoundId", e.target.value)}
                      className={`input-field text-sm font-mono ${
                        form.type === "music" && !sound.tiktokSoundId
                          ? "border-warning/50 focus:border-warning/80 bg-warning/5"
                          : ""
                      }`}
                      placeholder="e.g. 7622831414643739412"
                      required={form.type === "music"}
                    />
                    {form.type === "music" && !sound.tiktokSoundId && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-warning text-xs">⚠️</span>
                    )}
                    {sound.tiktokSoundId && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-success text-xs">✓</span>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-text-muted uppercase tracking-wide mb-1">Sound URL (Paste untuk auto-extract ID)</label>
                <input value={sound.soundUrl} onChange={(e) => updateSound(i, "soundUrl", e.target.value)} className="input-field text-sm" placeholder="https://www.tiktok.com/music/nama-sound-7622831414643739412" />
              </div>
              <div>
                <label className="block text-[11px] text-text-muted uppercase tracking-wide mb-1">Reference Video URL (opsional)</label>
                <input value={sound.videoReferenceUrl} onChange={(e) => updateSound(i, "videoReferenceUrl", e.target.value)} className="input-field text-sm" placeholder="https://www.tiktok.com/@user/video/..." />
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard Bonuses */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold">🏆 Leaderboard Bonuses</h3>
              <p className="text-xs text-text-muted mt-0.5">Bonus tambahan untuk top creator di campaign ini.</p>
            </div>
            <button type="button" onClick={() => {
              const nextRank = (form.leaderboardBonuses.length > 0
                ? Math.max(...form.leaderboardBonuses.map(b => b.rank)) + 1
                : 1);
              setForm({ ...form, leaderboardBonuses: [...form.leaderboardBonuses, { rank: nextRank, bonus: 10 }] });
            }} className="text-xs text-accent-light hover:text-accent px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40 transition-all">
              + Add Bonus Slot
            </button>
          </div>

          {form.leaderboardBonuses.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-4">No leaderboard bonuses configured. Click &quot;+ Add Bonus Slot&quot; to add.</p>
          ) : (
            <div className="space-y-2">
              {form.leaderboardBonuses.map((bonus, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-bg-primary/50 border border-border">
                  <span className="text-lg w-8 text-center font-bold flex-shrink-0">
                    {bonus.rank <= 3 ? ["🥇", "🥈", "🥉"][bonus.rank - 1] : `#${bonus.rank}`}
                  </span>
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase mb-1">Rank Position</label>
                      <input type="number" value={bonus.rank} min={1}
                        onChange={(e) => {
                          const bonuses = [...form.leaderboardBonuses];
                          bonuses[i] = { ...bonuses[i], rank: +e.target.value };
                          setForm({ ...form, leaderboardBonuses: bonuses });
                        }} className="input-field !py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-text-muted uppercase mb-1">Bonus ($)</label>
                      <input type="number" value={bonus.bonus} min={0} step={0.5}
                        onChange={(e) => {
                          const bonuses = [...form.leaderboardBonuses];
                          bonuses[i] = { ...bonuses[i], bonus: +e.target.value };
                          setForm({ ...form, leaderboardBonuses: bonuses });
                        }} className="input-field !py-2 text-sm" />
                    </div>
                  </div>
                  <button type="button" onClick={() => {
                    setForm({ ...form, leaderboardBonuses: form.leaderboardBonuses.filter((_, idx) => idx !== i) });
                  }} className="text-text-muted hover:text-error transition-colors text-xs p-1">✕</button>
                </div>
              ))}
              <p className="text-[10px] text-text-muted mt-1">💡 Bonus ini diberikan ke creator berdasarkan ranking views di leaderboard campaign saat campaign berakhir.</p>
            </div>
          )}
        </div>

        {/* Discord */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">💬 Discord</h3>
          <input value={form.discordInviteUrl} onChange={(e) => setForm({ ...form, discordInviteUrl: e.target.value })} className="input-field" placeholder="https://discord.gg/..." />
        </div>

        <button type="submit" disabled={saving} className="btn-gradient w-full !rounded-xl !py-3.5 text-base disabled:opacity-50">
          {saving ? "Creating..." : "🔮 Create Campaign"}
        </button>
      </form>
    </div>
  );
}
