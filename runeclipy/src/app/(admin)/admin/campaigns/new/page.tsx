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
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const updateSound = (i: number, field: string, value: string) => {
    const sounds = [...form.sounds];
    sounds[i] = { ...sounds[i], [field]: value };
    setForm({ ...form, sounds });
  };

  const removeSound = (i: number) => {
    const sounds = form.sounds.filter((_, idx) => idx !== i);
    setForm({ ...form, sounds });
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
                {form.allowOldVideos && <span className="text-accent text-xs">✓</span>}
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
                  {form.autoApprove && <span className="text-success text-xs">✓</span>}
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
              <p className="text-xs text-text-muted mt-0.5">Sound yang wajib dipakai creator di video mereka.</p>
            </div>
            <button type="button" onClick={() => setForm({ ...form, sounds: [...form.sounds, { title: "", tiktokSoundId: "", soundUrl: "", videoReferenceUrl: "" }] })}
              className="text-xs text-accent-light hover:text-accent px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40 transition-all">+ Add Sound</button>
          </div>
          {form.sounds.map((sound, i) => (
            <div key={i} className="p-4 rounded-xl bg-bg-primary/50 border border-border space-y-3 relative">
              {form.sounds.length > 1 && (
                <button type="button" onClick={() => removeSound(i)}
                  className="absolute top-3 right-3 text-text-muted hover:text-error text-xs transition-colors">✕</button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input value={sound.title} onChange={(e) => updateSound(i, "title", e.target.value)} className="input-field text-sm" placeholder="Sound title" />
                <input value={sound.tiktokSoundId} onChange={(e) => updateSound(i, "tiktokSoundId", e.target.value)} className="input-field text-sm" placeholder="TikTok Sound ID (optional)" />
              </div>
              <input value={sound.soundUrl} onChange={(e) => updateSound(i, "soundUrl", e.target.value)} className="input-field text-sm" placeholder="TikTok sound URL — https://www.tiktok.com/music/..." />
              <input value={sound.videoReferenceUrl} onChange={(e) => updateSound(i, "videoReferenceUrl", e.target.value)} className="input-field text-sm" placeholder="Reference video URL (optional)" />
            </div>
          ))}
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
