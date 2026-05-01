import Link from "next/link";
import HeroScene from "@/components/landing/HeroScene";
import GlitchText from "@/components/landing/GlitchText";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-bg-primary relative overflow-hidden">
      {/* ═══ Background Gradient Orbs ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-accent/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink/5 blur-[120px]" />
      </div>

      {/* ═══ Navbar ═══ */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔮</span>
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

      {/* ═══ Hero Section ═══ */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div className="animate-fadeInUp">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Creators have earned $5M+ on campaigns
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] mb-6">
              Turn your <span className="gradient-text">content</span> into{" "}
              <GlitchText>real earnings</GlitchText>
            </h1>
            <p className="text-lg text-text-secondary leading-relaxed mb-8 max-w-lg">
              Join thousands of creators. Use trending sounds, create short-form videos,
              and get paid for every verified view your content generates.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/register" className="btn-gradient text-base !py-3.5 !px-8 !rounded-2xl flex items-center gap-2">
                🚀 Start Earning
              </Link>
              <Link href="/dashboard" className="px-8 py-3.5 rounded-2xl border border-border text-text-secondary hover:text-text-primary hover:border-border-hover transition-all font-medium">
                Explore Campaigns
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-8 mt-12">
              {[
                { value: "100K+", label: "Creators" },
                { value: "$5M+", label: "Paid Out" },
                { value: "200+", label: "Campaigns" },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-extrabold gradient-text">{stat.value}</div>
                  <div className="text-xs text-text-muted mt-1 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — 3D Scene */}
          <div className="relative h-[400px] md:h-[500px] animate-fadeIn" style={{ animationDelay: "0.3s" }}>
            <HeroScene />
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
              icon: "🔗",
              title: "Link Account",
              desc: "Connect your TikTok profile to verify ownership of your content.",
            },
            {
              step: "02",
              icon: "🎬",
              title: "Submit Content",
              desc: "Create videos using campaign sounds, then submit your link to start tracking.",
            },
            {
              step: "03",
              icon: "💰",
              title: "Get Paid",
              desc: "Earn automatically for every verified view your content generates.",
            },
          ].map((item) => (
            <div key={item.step} className="glass-card p-8 text-center group">
              <div className="text-xs font-mono text-accent-light mb-4 tracking-widest">STEP {item.step}</div>
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
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
            { icon: "🤖", title: "Auto View Tracking", desc: "Views checked automatically every hour. No manual work needed." },
            { icon: "🛡️", title: "Anti-Cheat Detection", desc: "Bot views and fake engagement are filtered out to keep campaigns fair." },
            { icon: "⚡", title: "Multiple Earning Models", desc: "Get paid per view, per post, or both — depending on the campaign." },
            { icon: "💸", title: "Fast Withdrawals", desc: "Cash out via Dana, GoPay, OVO, PayPal, or Bank Transfer. Min $10." },
            { icon: "🎵", title: "Sound Matching", desc: "Our AI matches your video's sound to campaign requirements automatically." },
            { icon: "📊", title: "Real-time Analytics", desc: "Track your earnings, views, and campaign performance in real-time." },
            { icon: "🔗", title: "Verified Profiles", desc: "Only verified TikTok accounts can submit — no fake submissions." },
            { icon: "🏆", title: "Creator Leaderboard", desc: "Compete with other creators and climb campaign leaderboards." },
          ].map((f) => (
            <div key={f.title} className="glass-card p-6 group hover:border-accent/20 transition-all duration-300">
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{f.icon}</div>
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
            <Link href="/register" className="btn-pink text-base !py-3.5 !px-10 !rounded-2xl inline-flex items-center gap-2 btn-gradient">
              🔮 Join RuneClipy
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
                <span className="text-xl">🔮</span>
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
