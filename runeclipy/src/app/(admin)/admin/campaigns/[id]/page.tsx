"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

export default function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/campaigns/${id}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setForm(d.campaign); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push("/admin/campaigns");
      else alert("Save failed");
    } catch { alert("Save failed"); }
    finally { setSaving(false); }
  };

  if (loading || !form) return <div className="flex items-center justify-center py-20"><div className="text-4xl animate-pulse">🎵</div></div>;

  const val = (key: string) => (form[key] as string | number) ?? "";
  const set = (key: string, v: string | number) => setForm({ ...form, [key]: v });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-8">Edit Campaign</h1>
      <form onSubmit={handleSave} className="space-y-6">
        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">📋 Basic Info</h3>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Title</label>
            <input value={val("title")} onChange={(e) => set("title", e.target.value)} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Type</label>
              <select value={val("type")} onChange={(e) => set("type", e.target.value)} className="input-field">
                <option value="music">Music</option><option value="clipping">Clipping</option>
                <option value="logo">Logo</option><option value="ugc">UGC</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Status</label>
              <select value={val("status")} onChange={(e) => set("status", e.target.value)} className="input-field">
                <option value="active">Active</option><option value="paused">Paused</option>
                <option value="ended">Ended</option><option value="draft">Draft</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Cover Image URL</label>
            <input value={val("coverImage")} onChange={(e) => set("coverImage", e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">Description</label>
            <textarea value={val("description")} onChange={(e) => set("description", e.target.value)} className="input-field min-h-[120px]" />
          </div>
        </div>

        <div className="glass-card p-6 space-y-4">
          <h3 className="font-bold mb-2">💰 Budget & Rates</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Total Budget ($)</label>
              <input type="number" value={val("totalBudget")} onChange={(e) => set("totalBudget", +e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Rate per 1M Views ($)</label>
              <input type="number" value={val("ratePerMillionViews")} onChange={(e) => set("ratePerMillionViews", +e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max Earning / Creator ($)</label>
              <input type="number" value={val("maxEarningsPerCreator")} onChange={(e) => set("maxEarningsPerCreator", +e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max Earning / Post ($)</label>
              <input type="number" value={val("maxEarningsPerPost")} onChange={(e) => set("maxEarningsPerPost", +e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Max Submissions / Account</label>
              <input type="number" value={val("maxSubmissionsPerAccount")} onChange={(e) => set("maxSubmissionsPerAccount", +e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">Min Views</label>
              <input type="number" value={val("minViews")} onChange={(e) => set("minViews", +e.target.value)} className="input-field" />
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <h3 className="font-bold mb-4">💬 Discord</h3>
          <input value={val("discordInviteUrl")} onChange={(e) => set("discordInviteUrl", e.target.value)} className="input-field" placeholder="https://discord.gg/..." />
        </div>

        <div className="flex gap-3">
          <button type="button" onClick={() => router.push("/admin/campaigns")} className="flex-1 py-3.5 rounded-xl border border-border text-text-secondary hover:bg-bg-tertiary transition-colors">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 btn-gradient !rounded-xl !py-3.5 disabled:opacity-50">
            {saving ? "Saving..." : "💾 Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
