# CLAUDE.MD — Code Standards & Prevention Ledger

> **MANDATORY READ**: This file governs all code changes across the RUNE monorepo.
> Any AI agent or human contributor must follow these rules before writing or modifying code.

---

## 📁 Project Structure & Routing Strategy

```
RUNE/ (monorepo root)
├── server.js                     # Express API for TikTok Scraper tools
├── modules/
│   ├── tiktok-stalk.js           # Puppeteer profile scraper
│   └── tiktok-video.js           # Puppeteer video scraper
├── public/                       # RUNE Core — Static vanilla HTML/CSS/JS frontend
│   ├── index.html                # Single-page app (tabs: Profile Stalk / Video Info)
│   ├── style.css                 # Dark glassmorphism theme (vanilla CSS, 691 lines)
│   └── app.js                    # Frontend logic — fetch API, render, copy, toggles
│
├── runeclipy/                    # RuneClipy — Next.js 16 App Router (TailwindCSS v4)
│   ├── src/app/
│   │   ├── (admin)/              # Route Group: Admin Panel (sidebar layout, role=admin)
│   │   │   ├── admin/            # /admin/* pages
│   │   │   │   ├── page.tsx             # Admin Dashboard (stat cards + charts + tables)
│   │   │   │   ├── campaigns/           # Campaign CRUD (/admin/campaigns, /admin/campaigns/[id], /admin/campaigns/new)
│   │   │   │   ├── submissions/         # Submission review (/admin/submissions)
│   │   │   │   ├── users/               # User management (/admin/users)
│   │   │   │   ├── accounts/            # Connected accounts (/admin/accounts)
│   │   │   │   ├── payouts/             # Payout processing (/admin/payouts)
│   │   │   │   ├── finance/             # Financial overview (/admin/finance)
│   │   │   │   ├── activity-log/        # Admin audit trail (/admin/activity-log)
│   │   │   │   ├── discord/             # Discord bot control (/admin/discord)
│   │   │   │   └── settings/            # Platform settings (/admin/settings)
│   │   │   └── layout.tsx               # Admin sidebar + role gate
│   │   │
│   │   ├── (auth)/               # Route Group: Auth Pages (centered card layout)
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── forgot-password/
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/          # Route Group: User Dashboard (sidebar + notifications)
│   │   │   ├── dashboard/               # Campaign listing (/dashboard)
│   │   │   ├── campaigns/               # My submissions (/campaigns)
│   │   │   ├── analytics/               # User analytics (/analytics)
│   │   │   ├── leaderboard/             # Global leaderboard (/leaderboard)
│   │   │   ├── accounts/                # TikTok account management (/accounts)
│   │   │   ├── balance/                 # Balance & withdrawals (/balance)
│   │   │   ├── profile/                 # User profile (/profile)
│   │   │   └── layout.tsx               # Dashboard sidebar + notification bell
│   │   │
│   │   ├── api/                  # 15+ API route groups
│   │   ├── campaign/             # Public campaign detail page
│   │   ├── creator/              # Public creator profiles
│   │   ├── creator-terms/        # Legal: Creator terms
│   │   ├── privacy-policy/       # Legal: Privacy policy
│   │   ├── globals.css           # ALL styles (design tokens + components + admin + responsive)
│   │   ├── layout.tsx            # Root layout (Inter + JetBrains Mono, Sonner toaster)
│   │   └── page.tsx              # Landing page (server component, real DB stats, 3D hero)
│   │
│   ├── src/components/landing/   # HeroScene (R3F/Three.js), GlitchText
│   ├── src/lib/                  # Shared utilities (auth, mongodb, utils, rate-limit, etc.)
│   └── src/models/               # 10 Mongoose models
│
├── runeclipy-bot/                # Standalone Discord Bot (Node.js, NOT TypeScript)
│   ├── bot.js                    # 389-line bot: slash commands, MongoDB polling
│   └── package.json
│
├── CLAUDE.MD                     # THIS FILE — Code Standards
├── DESIGN.MD                     # Design System
├── MEMORY.MD                     # Application State & Context
├── AGENT.MD                      # Agent Operational Protocol
└── ANTIGRAVITY.MD                # CLI & Token Optimization Guidelines
```

---

## 🧱 Code Style Rules

### Universal
- **Semicolons**: Required in all JavaScript/TypeScript files
- **Quotes**: Double quotes for JSX/HTML attributes, single/double consistently per file
- **Indentation**: 2 spaces (entire project)
- **Trailing commas**: Yes in multi-line objects/arrays
- **Max line length**: 120 characters soft limit

### RUNE Core (public/)
- Vanilla JS — no build tools, no transpilation
- All DOM queries use `document.getElementById` or `document.querySelector`
- All styles in a single `style.css` file using CSS custom properties
- No external CSS frameworks

### RuneClipy (runeclipy/)
- TypeScript strict mode
- TailwindCSS v4 with `@theme` block in `globals.css` (NOT `tailwind.config.js`)
- Path aliases: `@/` → `src/` (configured in `tsconfig.json`)
- React components: Named exports only for shared, default exports for pages
- Pages use `"use client"` ONLY when they require `useState`/`useEffect`/browser APIs

### Import Order (RuneClipy)
```typescript
// 1. External packages
import { NextRequest } from "next/server";
import { useState } from "react";

// 2. Internal libraries
import connectDB from "@/lib/mongodb";
import { getSession } from "@/lib/auth";

// 3. Models
import User from "@/models/User";

// 4. Components
import { SomeComponent } from "@/components/SomeComponent";

// 5. Types (if separate)
import type { SomeType } from "@/types";
```

---

## ⚠️ Critical Next.js 16 Rules

1. **`params` is a `Promise`** — always `await params` in dynamic routes
2. **`cookies()` is async** — always `await cookies()`
3. **Model registration**: `mongoose.models.X || mongoose.model("X", schema)` pattern ALWAYS
4. **`connectDB()` before any DB operation** — never skip this call

---

## 🛡️ Error Boundary Implementation

### API Routes
```typescript
try {
  // ... logic
} catch (error) {
  console.error("Descriptive error context:", error);
  return NextResponse.json({ error: "User-facing message" }, { status: 500 });
}
```

### Client Components
- Always handle `loading`, `error`, and `empty` states
- Use `admin-shimmer` class for skeleton loading
- Use `admin-empty` class for empty states

---

## 🚫 Do Not Repeat Ledger

| Date | Bug Description | Root Cause | Prevention |
|------|----------------|------------|------------|
| 2026-05-10 | Neon button glow caused overflow on mobile | Unbounded `box-shadow` with no `overflow: hidden` on parent | Always scope glow effects within container with `overflow: hidden` |
| 2026-05-10 | Dashboard profile summary broke on narrow screens | Fixed-width avatar + absolute positioning | Use flexbox with `min-w-0` and `truncate` for adaptive layouts |
| 2026-05-12 | Bot schemas out of sync with web models | Schema fields added to bot.js but not to src/models/ | Update both simultaneously, document in commit message |
| 2026-05-16 | Vercel deploy failed — root directory misconfigured | Vercel root was set to `/` instead of `/runeclipy` | Verify `vercel.json` and Vercel dashboard root dir setting |

---

## 📏 File Size Limits

- **Page components**: Max ~500 lines. If larger, extract sub-components.
- **API routes**: Max ~200 lines. Complex logic goes to `/lib/`.
- **CSS files**: `globals.css` is already 750 lines — add new sections with clear comment headers.
- **Utility files**: Max ~300 lines per file.

---

*Last updated: 2026-05-19*
