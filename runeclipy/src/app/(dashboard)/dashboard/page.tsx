"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

interface Campaign {
  _id: string;
  title: string;
  slug: string;
  coverImage: string;
  type: string;
  status: string;
  totalBudget: number;
  budgetUsed: number;
  ratePerMillionViews: number;
  totalCreators: number;
  supportedPlatforms: string[];
  createdAt: string;
}

const typeFilters = ["All", "Music", "Clipping", "Logo", "UGC"];
const platformFilters = ["TikTok", "Instagram", "YouTube"];
const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "budget", label: "Highest Budget" },
  { value: "rate", label: "Highest Rate" },
];

export default function DashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState("All");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns");
      const data = await res.json();
      if (data.success) setCampaigns(data.campaigns);
    } catch (err) {
      console.error("Failed to fetch campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCampaigns = campaigns
    .filter((c) => activeType === "All" || c.type === activeType.toLowerCase())
    .sort((a, b) => {
      if (sort === "budget") return b.totalBudget - a.totalBudget;
      if (sort === "rate") return b.ratePerMillionViews - a.ratePerMillionViews;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const budgetPercent = (c: Campaign) => c.totalBudget > 0 ? Math.round((c.budgetUsed / c.totalBudget) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">CAMPAIGNS</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Sort By</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="input-field !w-auto !py-2 !px-3 text-sm"
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Type Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        {typeFilters.map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeType === type
                ? "bg-accent/20 text-accent-light border border-accent/30"
                : "text-text-muted hover:text-text-secondary hover:bg-bg-tertiary/50 border border-transparent"
            )}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Platform Checkboxes */}
      <div className="flex flex-wrap gap-4 mb-6">
        {platformFilters.map((platform) => (
          <label key={platform} className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-bg-tertiary border-border accent-accent" />
            {platform}
          </label>
        ))}
        <span className="text-sm text-text-muted ml-2">
          {filteredCampaigns.length} from {campaigns.length} campaigns
        </span>
      </div>

      {/* Campaign Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card p-0 overflow-hidden animate-pulse">
              <div className="h-40 bg-bg-tertiary" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-bg-tertiary rounded w-3/4" />
                <div className="h-3 bg-bg-tertiary rounded w-1/2" />
                <div className="h-3 bg-bg-tertiary rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="text-center py-20">
          <span className="text-5xl mb-4 block">🎵</span>
          <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
          <p className="text-text-muted text-sm">Check back later for new campaigns!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredCampaigns.map((campaign) => (
            <div key={campaign._id} className="glass-card overflow-hidden group hover:border-accent/20 transition-all">
              {/* Cover */}
              <div className="relative h-40 bg-bg-tertiary overflow-hidden">
                {campaign.coverImage ? (
                  <img
                    src={campaign.coverImage}
                    alt={campaign.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-5xl opacity-30">🎵</div>
                )}
                {/* Badges */}
                <div className="absolute bottom-2 left-2 flex gap-1.5">
                  <span className={`badge badge-${campaign.type}`}>{campaign.type}</span>
                  {budgetPercent(campaign) < 5 && <span className="badge badge-new">New</span>}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-sm mb-3 line-clamp-2 leading-snug min-h-[2.5rem]">{campaign.title}</h3>

                <div className="space-y-2 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-text-muted">Creators</span>
                    <span className="font-medium">{formatNumber(campaign.totalCreators)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-muted">Budget</span>
                    <span className="font-bold text-success">{formatCurrency(campaign.totalBudget)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-text-muted">Budget Used</span>
                    <span className="font-medium">{budgetPercent(campaign)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${budgetPercent(campaign)}%` }} />
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-text-muted uppercase tracking-wider">Rate per 1M Views</div>
                    <div className="text-base font-extrabold gradient-text">{formatCurrency(campaign.ratePerMillionViews)}</div>
                  </div>
                  <Link
                    href={`/dashboard/detail/${campaign._id}`}
                    className="px-4 py-2 rounded-lg bg-error text-white text-xs font-bold hover:bg-error/80 transition-colors"
                  >
                    Details
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
