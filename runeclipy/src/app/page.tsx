import Link from "next/link";
import GlitchText from "@/components/landing/GlitchText";
import ParallaxBg from "@/components/landing/ParallaxBg";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Campaign from "@/models/Campaign";
import Submission from "@/models/Submission";
import Logo from "@/components/Logo";
import { cookies } from "next/headers";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { translations } from "@/lib/translations";

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
  
  // Read language cookie for server-side translation
  const cookieStore = await cookies();
  const lang = cookieStore.get("RUNECLIPY_LANG")?.value === "id" ? "id" : "en";
  const t = translations[lang];

  return (
    <main className="min-h-screen bg-[#07050f] text-gray-100 relative overflow-hidden font-sans">
      
      {/* ═══ Futuristic Background Grid & Ambient Lighting ═══ */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Cyber Neon Gradient Orbs */}
        <div className="absolute top-[-25%] left-[-15%] w-[700px] h-[700px] rounded-full bg-purple-600/10 blur-[130px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute top-[35%] right-[15%] w-[400px] h-[400px] rounded-full bg-pink-500/8 blur-[110px] animate-pulse" style={{ animationDuration: '6s' }} />
        
        {/* Matrix Grid Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.003)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.003)_1px,transparent_1px)] bg-[size:45px_45px] opacity-80" />
        
        {/* Parallax Starfield/Flares */}
        <ParallaxBg />
      </div>

      {/* ═══ Header Navbar (Glassmorphic Floating) ═══ */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#07050f]/65 border-b border-white/[0.04]">
        <nav className="flex items-center justify-between px-3 sm:px-8 md:px-12 py-3.5 sm:py-4 max-w-7xl mx-auto">
          <Link href="/" className="hover:opacity-95 transition-opacity">
            <Logo iconSize={22} textSize="text-sm min-[360px]:text-lg sm:text-2xl" />
          </Link>
          <div className="flex items-center gap-1.5 xs:gap-2.5 sm:gap-4">
            <LanguageSwitcher />
            <Link href="/login" className="px-2.5 xs:px-3 sm:px-5 py-1.5 sm:py-2 text-[11px] xs:text-xs sm:text-sm font-semibold text-gray-400 hover:text-white transition-colors duration-300">
              {t.login}
            </Link>
            <Link href="/register" className="relative group overflow-hidden px-3 xs:px-4 sm:px-6 py-1.5 sm:py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-[11px] xs:text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-600/20 hover:shadow-cyan-500/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10"> {t.signup}</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* ═══ Hero Section ═══ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 md:px-12 pt-14 sm:pt-20 md:pt-32 pb-16 sm:pb-24">
        <div className="text-center max-w-4xl mx-auto">
          
          {/* Pulsing Status Badge */}
          <div className="animate-fadeInUp inline-flex items-center gap-2.5 px-4 py-2 sm:py-2.5 rounded-full bg-white/[0.02] border border-purple-500/20 text-xs sm:text-sm font-medium mb-8 sm:mb-10 backdrop-blur-md shadow-xl max-w-full">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </span>
            <span className="text-gray-300 tracking-wide truncate">
              {stats.paidOut > 0 ? (
                <>{t.paidOutPrefix}<span className="text-cyan-400 font-extrabold">${formatStat(stats.paidOut)}</span>{t.paidOutSuffix}</>
              ) : t.networkActive}
            </span>
          </div>

          {/* Main Title with futuristic glowing highlights */}
          <h1 className="animate-fadeInUp text-3xl min-[360px]:text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-black leading-[1.1] sm:leading-[1.05] mb-6 sm:mb-8 tracking-tight text-white" style={{ animationDelay: "0.1s" }}>
            {t.heroTitlePart1}<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-500">{t.heroTitlePart2}</span>{" "}
            <br className="hidden sm:block" />
            {t.heroTitlePart3}<GlitchText>{t.heroTitlePart4}</GlitchText>
          </h1>

          {/* Subtitle */}
          <p className="animate-fadeInUp text-sm sm:text-lg md:text-xl text-gray-400 leading-relaxed mb-8 sm:mb-12 max-w-2xl mx-auto" style={{ animationDelay: "0.2s" }}>
            {t.heroSubtitle}
          </p>

          {/* CTA Buttons with cool micro-animations */}
          <div className="animate-fadeInUp flex flex-col sm:flex-row justify-center gap-4 mb-16 sm:mb-20 px-4 sm:px-0" style={{ animationDelay: "0.3s" }}>
            <Link href="/register" className="relative group overflow-hidden px-8 sm:px-10 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 text-sm sm:text-base font-extrabold text-white shadow-xl shadow-purple-600/30 hover:shadow-cyan-500/40 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-3">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:rotate-12 transition-transform duration-300 sm:w-[20px] sm:h-[20px]">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
              <span className="relative z-10">{t.startEarningNow}</span>
            </Link>
            
            <Link href="/dashboard" className="px-8 sm:px-10 py-3 sm:py-4 rounded-2xl border border-white/[0.07] bg-white/[0.01] hover:bg-white/[0.04] text-gray-300 hover:text-white hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 font-bold flex items-center justify-center gap-2.5 transform hover:-translate-y-1 text-sm sm:text-base">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              {t.exploreCampaigns}
            </Link>
          </div>

          {/* Platform Performance metrics */}
          <div className="animate-fadeInUp grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 md:gap-6 max-w-2xl mx-auto px-3 sm:px-0" style={{ animationDelay: "0.4s" }}>
            {[
              {
                value: stats.creators > 0 ? formatStat(stats.creators) : "0",
                label: t.creatorsJoined,
                colorClass: "from-cyan-400 to-blue-500",
                shadowClass: "shadow-cyan-500/10",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                ),
              },
              {
                value: stats.paidOut > 0 ? `$${formatStat(stats.paidOut)}` : "$0",
                label: t.totalPaidOut,
                colorClass: "from-emerald-400 to-teal-500",
                shadowClass: "shadow-emerald-500/10",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                ),
              },
              {
                value: stats.campaigns > 0 ? formatStat(stats.campaigns) : "0",
                label: t.activeCampaigns,
                colorClass: "from-purple-400 to-pink-500",
                shadowClass: "shadow-purple-500/10",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400">
                    <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
                  </svg>
                ),
              },
            ].map((stat) => (
              <div key={stat.label} className={`backdrop-blur-md bg-white/[0.02] border border-white/[0.04] p-5 sm:p-4 md:p-6 rounded-2xl text-center group hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-300 shadow-lg ${stat.shadowClass} flex sm:flex-col items-center sm:justify-center gap-4 sm:gap-0`}>
                <div className="w-10 h-10 rounded-xl bg-[#0d091e] border border-white/[0.03] flex items-center justify-center opacity-85 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0 sm:mb-3">
                  {stat.icon}
                </div>
                <div className="text-left sm:text-center min-w-0">
                  <div className={`text-xl sm:text-2xl md:text-3xl font-black bg-gradient-to-r ${stat.colorClass} bg-clip-text text-transparent sm:mb-1.5 leading-tight`}>
                    {stat.value}
                  </div>
                  <div className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-widest font-bold group-hover:text-gray-400 transition-colors duration-300">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ How It Works ═══ */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-8 md:px-12 py-16 sm:py-24">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-center mb-4 tracking-tight scroll-animate">
          {t.howToClaimTitle}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">{t.howToClaimHighlight}</span>
        </h2>
        <p className="text-gray-400 text-center mb-16 sm:text-base scroll-animate scroll-animate-delay-1 max-w-md mx-auto text-sm">
          {t.howToClaimSubtitle}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            {
              step: "01",
              title: t.step1Title,
              desc: t.step1Desc,
              color: "border-cyan-500/25",
              glow: "group-hover:border-cyan-400/40",
              delayClass: "",
              icon: (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-cyan-400">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              ),
            },
            {
              step: "02",
              title: t.step2Title,
              desc: t.step2Desc,
              color: "border-pink-500/25",
              glow: "group-hover:border-pink-400/40",
              delayClass: "scroll-animate-delay-1",
              icon: (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-pink-400">
                  <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                </svg>
              ),
            },
            {
              step: "03",
              title: t.step3Title,
              desc: t.step3Desc,
              color: "border-emerald-500/25",
              glow: "group-hover:border-emerald-400/40",
              delayClass: "scroll-animate-delay-2",
              icon: (
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                  <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              ),
            },
          ].map((item) => (
            <div key={item.step} className={`backdrop-blur-md bg-white/[0.015] border ${item.color} ${item.glow} p-6 sm:p-8 rounded-3xl text-center group hover:-translate-y-2 transition-all duration-500 shadow-xl relative scroll-animate ${item.delayClass}`}>
              <div className="absolute top-4 right-6 text-3xl font-black text-white/[0.03] group-hover:text-white/[0.08] transition-colors duration-500 font-mono">{item.step}</div>
              <div className="w-14 h-14 rounded-2xl bg-[#0f0b24] border border-white/[0.05] flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:border-purple-500/30 transition-all duration-300">
                {item.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">{item.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Features Grid ═══ */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 md:px-12 py-16 sm:py-24">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-center mb-4 tracking-tight scroll-animate">
          {t.featuresTitle}<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">{t.featuresHighlight}</span>
        </h2>
        <p className="text-gray-400 text-center mb-16 sm:text-base scroll-animate scroll-animate-delay-1 max-w-lg mx-auto text-sm">
          {t.featuresSubtitle}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {[
            {
              title: t.feat1Title, desc: t.feat1Desc,
              delayClass: "",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-cyan-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            },
            {
              title: t.feat2Title, desc: t.feat2Desc,
              delayClass: "scroll-animate-delay-1",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-emerald-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            },
            {
              title: t.feat3Title, desc: t.feat3Desc,
              delayClass: "scroll-animate-delay-2",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-400"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            },
            {
              title: t.feat4Title, desc: t.feat4Desc,
              delayClass: "scroll-animate-delay-3",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-pink-400"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            },
            {
              title: t.feat5Title, desc: t.feat5Desc,
              delayClass: "",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-blue-400"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            },
            {
              title: t.feat6Title, desc: t.feat6Desc,
              delayClass: "scroll-animate-delay-1",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-purple-400"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            },
            {
              title: t.feat7Title, desc: t.feat7Desc,
              delayClass: "scroll-animate-delay-2",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-emerald-400"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            },
            {
              title: t.feat8Title, desc: t.feat8Desc,
              delayClass: "scroll-animate-delay-3",
              icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-amber-400"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 7 7 7 7"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5C17 4 17 7 17 7"/><path d="M4 22h16"/><path d="M10 22V8a4 4 0 0 0-4-4"/><path d="M14 22V8a4 4 0 0 1 4-4"/></svg>
            },
          ].map((f) => (
            <div key={f.title} className={`backdrop-blur-md bg-white/[0.015] border border-white/[0.04] p-5 sm:p-6 rounded-2xl group hover:border-purple-500/30 hover:-translate-y-1 transition-all duration-300 scroll-animate ${f.delayClass}`}>
              <div className="w-11 h-11 rounded-xl bg-purple-950/20 border border-white/[0.04] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-purple-500/25 transition-all duration-300">
                {f.icon}
              </div>
              <h3 className="font-bold text-base mb-2 text-white">{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ Premium CTA Section ═══ */}
      <section className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 md:px-12 py-16 sm:py-20 scroll-animate">
        <div className="backdrop-blur-md bg-white/[0.02] border border-purple-500/20 rounded-3xl p-6 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5" />
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black mb-4 text-white">{t.ctaTitle}</h2>
            <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm sm:text-base leading-relaxed">
              {t.ctaSubtitle}
            </p>
            <Link href="/register" className="relative group overflow-hidden px-8 sm:px-10 py-3 sm:py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 text-sm sm:text-base font-extrabold text-white shadow-xl shadow-purple-600/35 hover:shadow-cyan-500/40 transition-all duration-300 inline-flex items-center justify-center gap-3">
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-cyan-500 via-pink-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[20px] sm:h-[20px]">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              <span className="relative z-10">{t.joinRuneClipy}</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ Footer ═══ */}
      <footer className="relative z-10 border-t border-white/[0.04] bg-[#05040a]/80 backdrop-blur-md scroll-animate">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 py-12 sm:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-purple-500/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <span className="text-lg font-black tracking-widest text-white">{t.brand}</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                {t.footerDesc}
              </p>
            </div>
            
            <div>
              <h4 className="text-xs font-bold mb-3.5 text-gray-300 uppercase tracking-widest">{t.legal}</h4>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><Link href="/privacy-policy" className="text-gray-500 hover:text-white transition-colors">{t.privacyPolicy}</Link></li>
                <li><Link href="/creator-terms" className="text-gray-500 hover:text-white transition-colors">{t.creatorTerms}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-bold mb-3.5 text-gray-300 uppercase tracking-widest">{t.company}</h4>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><Link href="/support" className="text-gray-500 hover:text-white transition-colors">{t.supportPortal}</Link></li>
                <li><Link href="/contact" className="text-gray-500 hover:text-white transition-colors">{t.contactUs}</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-xs font-bold mb-3.5 text-gray-300 uppercase tracking-widest">{t.resources}</h4>
              <ul className="flex flex-col gap-2.5 text-sm">
                <li><Link href="/dashboard" className="text-gray-500 hover:text-white transition-colors">{t.activeCampaigns}</Link></li>
                <li><a href="https://discord.gg/runeclipy" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-white transition-colors flex items-center gap-1.5">{t.discordServer} <i className="fa-brands fa-discord"></i></a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-500">
            <p>© 2026 RuneClipy System. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="/creator-terms" className="hover:text-gray-400 transition-colors">{t.terms}</Link>
              <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">{t.privacy}</Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ═══ Inline Client-Side Intersection Observer Script ═══ */}
      <script dangerouslySetInnerHTML={{ __html: `
        (function() {
          const initScrollAnimate = () => {
            const observer = new IntersectionObserver((entries) => {
              entries.forEach(entry => {
                if (entry.isIntersecting) {
                  entry.target.classList.add('animate-active');
                  observer.unobserve(entry.target); // Trigger only once
                }
              });
            }, {
              threshold: 0.05,
              rootMargin: '0px 0px -40px 0px'
            });

            document.querySelectorAll('.scroll-animate').forEach(el => {
              observer.observe(el);
            });
          };

          // Safe execution check for Next.js client hydration
          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initScrollAnimate);
          } else {
            initScrollAnimate();
          }
        })();
      ` }} />
    </main>
  );
}
