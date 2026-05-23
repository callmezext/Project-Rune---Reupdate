import Link from "next/link";
import GlitchText from "@/components/landing/GlitchText";
import ParallaxBg from "@/components/landing/ParallaxBg";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import Submission from "@/models/Submission";

function formatStat(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M+`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K+`;
  return n.toString();
}

async function getPlatformStats() {
  try {
    await connectDB();
    const [totalCreators, totalCampaigns, totalPaidOut] = await Promise.all([
      User.countDocuments({ isDeleted: { $ne: true } }),
      Campaign.countDocuments(),
      Submission.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: null, total: { $sum: "$earned" } } },
      ]),
    ]);
    return {
      creators: totalCreators,
      campaigns: totalCampaigns,
      paidOut: totalPaidOut[0]?.total || 0,
    };
  } catch {
    return { creators: 0, campaigns: 0, paidOut: 0 };
  }
}

export default async function LandingPage() {
  const stats = await getPlatformStats();

  return (
    <main className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* ═══ Animated Background ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink/5 blur-[120px]" />
        <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] rounded-full bg-accent/3 blur-[100px] animate-pulse" />
        <ParallaxBg />
      </div>

      {/* ═══ Navbar ═══ */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-pink flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-wider">
            <span className="gradient-text">RuneClipy</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors rounded-xl hover:bg-bg-tertiary/50">
            Log in
          </Link>
          <Link href="/register" className="btn-gradient text-sm !py-2.5 !px-6 !rounded-xl">
            Sign up
          </Link>
        </div>
      </nav>

      {/* ═══ Hero Section — Redesigned ═══ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-28 pb-24">
        <div className="text-center max-w-4xl mx-auto">
          {/* Status Badge */}
          <div className="animate-fadeInUp inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-accent/10 to-pink/10 border border-accent/20 text-sm font-medium mb-8 backdrop-blur-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
            </span>
            <span className="text-text-secondary">
              {stats.paidOut > 0 ? (
                <>Creators have earned <span className="text-accent-light font-bold">${formatStat(stats.paidOut)}</span> on campaigns</>
              ) : "Platform is live — join and start earning"}
            </span>
          </div>

          {/* Main Heading */}
          <h1 className="animate-fadeInUp text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.05] mb-8 tracking-tight" style={{ animationDelay: "0.1s" }}>
            Turn your{" "}
            <span className="gradient-text">content</span>
            <br className="hidden sm:block" />
            into <GlitchText>real earnings</GlitchText>
          </h1>

          {/* Subheading */}
          <p className="animate-fadeInUp text-lg md:text-xl text-text-secondary leading-relaxed mb-10 max-w-2xl mx-auto" style={{ animationDelay: "0.2s" }}>
            Join creators worldwide. Use trending sounds, create short-form videos,
            and get paid for every verified view your content generates.
          </p>

          {/* CTA Buttons */}
          <div className="animate-fadeInUp flex flex-wrap justify-center gap-4 mb-16" style={{ animationDelay: "0.3s" }}>
            <Link href="/register" className="btn-gradient text-base !py-4 !px-10 !rounded-2xl flex items-center gap-2.5 group">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              Start Earning Now
            </Link>
            <Link href="/dashboard" className="px-10 py-4 rounded-2xl border border-border text-text-secondary hover:text-text-primary hover:border-accent/30 hover:bg-accent/5 transition-all font-medium flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Explore Campaigns
            </Link>
          </div>

          {/* Live Stats — Glass Cards */}
          <div className="animate-fadeInUp grid grid-cols-3 gap-2 sm:gap-4 max-w-xl mx-auto" style={{ animationDelay: "0.4s" }}>
            {[
              {
                value: stats.creators > 0 ? formatStat(stats.creators) : "0",
                label: "Creators",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-light">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
              },
              {
                value: stats.paidOut > 0 ? `$${formatStat(stats.paidOut)}` : "$0",
                label: "Paid Out",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                ),
              },
              {
                value: stats.campaigns > 0 ? formatStat(stats.campaigns) : "0",
                label: "Campaigns",
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-pink">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                ),
              },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-2 sm:p-4 text-center group hover:border-accent/20">
                <div className="flex justify-center mb-2 opacity-60 group-hover:opacity-100 transition-opacity">
                  {stat.icon}
                </div>
                <div className="text-base sm:text-2xl md:text-3xl font-extrabold gradient-text mb-1">{stat.value}</div>
                <div className="text-[9px] sm:text-[10px] text-text-muted uppercase tracking-widest font-semibold">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-20">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
          The easiest way to <span className="gradient-text">get paid</span>
        </h2>
        <p className="text-text-secondary text-center mb-16 max-w-lg mx-auto">
          Three simple steps to start earning from your content
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: "01",
              title: "Link Account",
              desc: "Connect your TikTok profile to verify ownership of your content.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-light">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              ),
            },
            {
              step: "02",
              title: "Submit Content",
              desc: "Create videos using campaign sounds, then submit your link to start tracking.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-pink">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              ),
            },
            {
              step: "03",
              title: "Get Paid",
              desc: "Earn automatically for every verified view your content generates.",
              icon: (
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-8 text-center group">
              <div className="text-xs font-mono text-accent-light mb-4 tracking-widest">STEP {item.step}</div>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-bg-tertiary to-bg-secondary flex items-center justify-center mx-auto mb-5 border border-border/50 group-hover:scale-110 group-hover:border-accent/30 transition-all duration-300">
                {item.icon}
              </div>
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Features Grid ═══ */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 md:px-12 py-20">
        <h2 className="text-3xl md:text-4xl font-extrabold text-center mb-4">
          Built for <span className="gradient-text">serious creators</span>
        </h2>
        <p className="text-text-secondary text-center mb-16 max-w-lg mx-auto">
          Everything you need to maximize your earnings
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              title: "Auto View Tracking", desc: "Views checked automatically every hour. No manual work needed.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent-light"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            },
            {
              title: "Anti-Cheat Detection", desc: "Bot views and fake engagement are filtered out to keep campaigns fair.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-success"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            },
            {
              title: "Multiple Earning Models", desc: "Get paid per view, per post, or both — depending on the campaign.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-warning"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            },
            {
              title: "Fast Withdrawals", desc: "Cash out via Dana, GoPay, OVO, PayPal, or Bank Transfer. Min $10.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-pink"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            },
            {
              title: "Sound Matching", desc: "Our AI matches your video's sound to campaign requirements automatically.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-info"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            },
            {
              title: "Real-time Analytics", desc: "Track your earnings, views, and campaign performance in real-time.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-accent-light"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            },
            {
              title: "Verified Profiles", desc: "Only verified TikTok accounts can submit — no fake submissions.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-success"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            },
            {
              title: "Creator Leaderboard", desc: "Compete with other creators and climb campaign leaderboards.",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-warning"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 22V8a4 4 0 0 0-4-4"/><path d="M14 22V8a4 4 0 0 1 4-4"/></svg>
            },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6 group hover:border-accent/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-bg-primary/60 border border-border/50 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:border-accent/30 transition-all duration-300">
                {f.icon}
              </div>
              <h3 className="font-bold text-sm mb-1.5">{f.title}</h3>
              <p className="text-xs text-text-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 py-20">
        <div className="glass-card p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-pink/5" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to start earning?</h2>
            <p className="text-text-secondary mb-8 max-w-md mx-auto">
              Join the community of creators turning their content into real payouts.
            </p>
            <Link href="/register" className="btn-gradient text-base !py-3.5 !px-10 !rounded-2xl inline-flex items-center gap-2.5">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              Join RuneClipy
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="relative z-10 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent to-pink flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span className="font-bold gradient-text">RuneClipy</span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed">
                Performance-based creator platform. Get paid for every view.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3 text-text-secondary uppercase tracking-wider">Legal</h4>
              <div className="flex flex-col gap-2">
                <Link href="/privacy-policy" className="text-sm text-text-muted hover:text-text-primary transition-colors">Privacy Policy</Link>
                <Link href="/creator-terms" className="text-sm text-text-muted hover:text-text-primary transition-colors">Creator Terms of Use</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3 text-text-secondary uppercase tracking-wider">Company</h4>
              <div className="flex flex-col gap-2">
                <Link href="/support" className="text-sm text-text-muted hover:text-text-primary transition-colors">Support</Link>
                <Link href="/contact" className="text-sm text-text-muted hover:text-text-primary transition-colors">Contact Us</Link>
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-3 text-text-secondary uppercase tracking-wider">Resources</h4>
              <div className="flex flex-col gap-2">
                <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-primary transition-colors">Explore Campaigns</Link>
                <a href="https://discord.gg/runeclipy" target="_blank" className="text-sm text-text-muted hover:text-text-primary transition-colors">Discord</a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-text-muted">© 2026 RuneClipy. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/creator-terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Creator Terms</Link>
              <Link href="/privacy-policy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
