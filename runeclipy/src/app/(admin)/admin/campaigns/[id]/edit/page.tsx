"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.campaign) {
          const c = d.campaign;
          setForm({
            title: c.title || "", type: c.type || "music", totalBudget: c.totalBudget || 0,
            ratePerMillionViews: c.ratePerMillionViews || 500,
            maxEarningsPerCreator: c.maxEarningsPerCreator || 50,
            maxEarningsPerPost: c.maxEarningsPerPost || 25,
            maxSubmissionsPerAccount: c.maxSubmissionsPerAccount || 3,
            minViews: c.minViews || 0, contentType: c.contentType || "both",
            description: c.description || "", coverImage: c.coverImage || "",
            discordInviteUrl: c.discordInviteUrl || "",
            status: c.status || "active",
            allowOldVideos: c.allowOldVideos || false,
            maxVideoAgeHours: c.maxVideoAgeHours || 24,
            earningType: c.earningType || "per_view",
            fixedRatePerPost: c.fixedRatePerPost || 0,
            autoApprove: c.autoApprove || false,
            minEngagementRate: c.minEngagementRate || 2,
            sounds: c.sounds?.length ? c.sounds : [{ title: "", tiktokSoundId: "", soundUrl: "", videoReferenceUrl: "" }],
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) { alert(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  };

  const updateSound = (i: number, field: string, value: string) => {
    const sounds = [...(form?.sounds as Array<Record<string, string>> || [])];
    sounds[i] = { ...sounds[i], [field]: value };
    setForm({ ...form!, sounds });
  };

  const removeSound = (i: number) => {
    const sounds = (form?.sounds as Array<Record<string, string>> || []).filter((_: unknown, idx: number) => idx !== i);
    setForm({ ...form!, sounds });
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">⚙️</div></div>;
  if (!form) return <div className="text-center py-20 text-text-muted">Campaign not found</div>;

  const f = form as Record<string, unknown>;
  const sounds = f.sounds as Array<Record<string, string>> || [];

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Edit Campaign</h1>
          <p className="text-xs text-text-muted mt-1">ID: {id}</p>
        </div>
        <button onClick={() => router.push("/admin/campaigns")} className="text-sm text-text-muted hover:text-text-primary">← Back</button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Basic Info */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">📋 Basic Info</h3>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Title</label>
            <input value={f.title as string} onChange={(e) => setForm({ ...f, title: e.target.value })} className="input-field" required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Status</label>
              <select value={f.status as string} onChange={(e) => setForm({ ...f, status: e.target.value })} className="input-field">
                <option value="active">🟢 Active</option>
                <option value="paused">🟡 Paused</option>
                <option value="ended">🔴 Ended</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Type</label>
              <select value={f.type as string} onChange={(e) => setForm({ ...f, type: e.target.value })} className="input-field">
                <option value="music">🎵 Music</option><option value="clipping">🎬 Clipping</option>
                <option value="logo">🏷️ Logo</option><option value="ugc">📦 UGC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Content</label>
              <select value={f.contentType as string} onChange={(e) => setForm({ ...f, contentType: e.target.value })} className="input-field">
                <option value="video">Video</option><option value="slide">Slide</option><option value="both">Both</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Cover Image URL</label>
            <input value={f.coverImage as string} onChange={(e) => setForm({ ...f, coverImage: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Description</label>
            <textarea value={f.description as string} onChange={(e) => setForm({ ...f, description: e.target.value })} className="input-field min-h-[100px]" />
          </div>
        </div>

        {/* Earning Model */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">💎 Earning Model</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "per_view", icon: "👁️", label: "Per View" },
              { value: "per_post", icon: "📝", label: "Per Post" },
              { value: "both", icon: "⚡", label: "Both" },
            ].map((opt) => (
              <button key={opt.value} type="button"
                onClick={() => setForm({ ...f, earningType: opt.value })}
                className={`p-3 rounded-xl border text-center transition-all text-sm ${
                  f.earningType === opt.value
                    ? "border-accent bg-accent/10 ring-1 ring-accent/30"
                    : "border-border hover:border-border-hover bg-bg-primary/50"
                }`}>
                {opt.icon} {opt.label}
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
              <input type="number" value={f.totalBudget as number} onChange={(e) => setForm({ ...f, totalBudget: +e.target.value })} className="input-field" min={0} />
            </div>
            {(f.earningType === "per_view" || f.earningType === "both") && (
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Rate / 1M Views ($)</label>
                <input type="number" value={f.ratePerMillionViews as number} onChange={(e) => setForm({ ...f, ratePerMillionViews: +e.target.value })} className="input-field" />
              </div>
            )}
            {(f.earningType === "per_post" || f.earningType === "both") && (
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">Fixed Rate / Post ($)</label>
                <input type="number" value={f.fixedRatePerPost as number} onChange={(e) => setForm({ ...f, fixedRatePerPost: +e.target.value })} className="input-field" />
              </div>
            )}
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max / Creator ($)</label>
              <input type="number" value={f.maxEarningsPerCreator as number} onChange={(e) => setForm({ ...f, maxEarningsPerCreator: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max / Post ($)</label>
              <input type="number" value={f.maxEarningsPerPost as number} onChange={(e) => setForm({ ...f, maxEarningsPerPost: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max Submissions / Account</label>
              <input type="number" value={f.maxSubmissionsPerAccount as number} onChange={(e) => setForm({ ...f, maxSubmissionsPerAccount: +e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Min Views Required</label>
              <input type="number" value={f.minViews as number} onChange={(e) => setForm({ ...f, minViews: +e.target.value })} className="input-field" />
            </div>
          </div>
        </div>

        {/* Video Rules */}
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">📏 Video Rules</h3>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" checked={f.allowOldVideos as boolean}
                onChange={(e) => setForm({ ...f, allowOldVideos: e.target.checked })} className="sr-only peer" />
              <div className="w-5 h-5 rounded-md border-2 border-border peer-checked:border-accent peer-checked:bg-accent/20 transition-all flex items-center justify-center">
                {f.allowOldVideos && <span className="text-accent text-xs">✓</span>}
              </div>
            </div>
            <span className="text-sm">Bolehkan video lama</span>
          </label>
          {!f.allowOldVideos && (
            <div className="ml-8 max-w-xs">
              <label className="block text-sm text-text-secondary mb-1.5">Batas Usia Video (jam)</label>
              <input type="number" value={f.maxVideoAgeHours as number}
                onChange={(e) => setForm({ ...f, maxVideoAgeHours: +e.target.value })} className="input-field" min={1} />
            </div>
          )}

          <div className="border-t border-border/30 pt-4 mt-4">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input type="checkbox" checked={f.autoApprove as boolean}
                  onChange={(e) => setForm({ ...f, autoApprove: e.target.checked })} className="sr-only peer" />
                <div className="w-5 h-5 rounded-md border-2 border-border peer-checked:border-success peer-checked:bg-success/20 transition-all flex items-center justify-center group-hover:border-border-hover">
                  {f.autoApprove && <span className="text-success text-xs">✓</span>}
                </div>
              </div>
              <div>
                <span className="text-sm font-medium">🤖 Auto-Approve</span>
                <p className="text-xs text-text-muted mt-0.5">
                  Otomatis approve jika semua check pass dan engagement rate cukup.
                </p>
              </div>
            </label>
            {f.autoApprove && (
              <div className="ml-8 max-w-xs mt-3">
                <label className="block text-sm text-text-secondary mb-1.5">Min Engagement Rate (%)</label>
                <input type="number" value={f.minEngagementRate as number}
                  onChange={(e) => setForm({ ...f, minEngagementRate: +e.target.value })}
                  className="input-field" min={0} max={50} step={0.5} />
              </div>
            )}
          </div>
        </div>

        {/* Sounds */}
        <div className="glass-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold">🎵 Sounds</h3>
            <button type="button" onClick={() => setForm({ ...f, sounds: [...sounds, { title: "", tiktokSoundId: "", soundUrl: "", videoReferenceUrl: "" }] })}
              className="text-xs text-accent-light hover:text-accent px-3 py-1.5 rounded-lg border border-accent/20 hover:border-accent/40 transition-all">+ Add</button>
          </div>
          {sounds.map((sound: Record<string, string>, i: number) => (
            <div key={i} className="p-4 rounded-xl bg-bg-primary/50 border border-border space-y-3 relative">
              {sounds.length > 1 && (
                <button type="button" onClick={() => removeSound(i)} className="absolute top-3 right-3 text-text-muted hover:text-error text-xs">✕</button>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input value={sound.title} onChange={(e) => updateSound(i, "title", e.target.value)} className="input-field text-sm" placeholder="Sound title" />
                <input value={sound.tiktokSoundId} onChange={(e) => updateSound(i, "tiktokSoundId", e.target.value)} className="input-field text-sm" placeholder="Sound ID" />
              </div>
              <input value={sound.soundUrl} onChange={(e) => updateSound(i, "soundUrl", e.target.value)} className="input-field text-sm" placeholder="Sound URL" />
              <input value={sound.videoReferenceUrl} onChange={(e) => updateSound(i, "videoReferenceUrl", e.target.value)} className="input-field text-sm" placeholder="Reference video URL" />
            </div>
          ))}
        </div>

        {/* Discord */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">💬 Discord</h3>
          <input value={f.discordInviteUrl as string} onChange={(e) => setForm({ ...f, discordInviteUrl: e.target.value })} className="input-field" placeholder="https://discord.gg/..." />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-gradient flex-1 !rounded-xl !py-3.5 text-base disabled:opacity-50">
            {saving ? "Saving..." : saved ? "✅ Saved!" : "💾 Save Changes"}
          </button>
          <button type="button" onClick={() => {
            if (confirm("Hapus campaign ini?")) {
              fetch(`/api/campaigns/${id}`, { method: "DELETE" }).then(() => router.push("/admin/campaigns"));
            }
          }} className="px-6 py-3.5 rounded-xl text-sm font-bold bg-error/20 text-error border border-error/30 hover:bg-error/30 transition-all">
            🗑️ Delete
          </button>
        </div>
      </form>
    </div>
  );
}
