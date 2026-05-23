# AGENT.MD — Antigravity Operational Protocol

> **Strict behavioral rules** for any AI agent modifying the RUNE codebase.
> Violations of these rules risk breaking production deployments.
> Refer to [ANTIGRAVITY.MD](file:///d:/PROJECT/rune/RUNE/ANTIGRAVITY.MD) for CLI execution guidelines and token limit optimization strategies.

---

## 🔒 Safe Modification Rules

### Rule 1: Dependency Analysis Before Shared Component Changes
Before modifying ANY shared file, identify all consumers:

| Shared File | Consumers | Risk Level |
|-------------|-----------|------------|
| `globals.css` | ALL RuneClipy pages and layouts | 🔴 CRITICAL |
| `@/lib/auth.ts` | All API routes + Dashboard/Admin layouts | 🔴 CRITICAL |
| `@/lib/mongodb.ts` | All API routes + Landing page | 🔴 CRITICAL |
| `@/lib/utils.ts` | Most pages (formatCurrency, formatNumber, cn, timeAgo) | 🟡 HIGH |
| `(dashboard)/layout.tsx` | All 7 user dashboard pages | 🟡 HIGH |
| `(admin)/layout.tsx` | All 10 admin pages | 🟡 HIGH |
| `(auth)/layout.tsx` | 3 auth pages | 🟢 MEDIUM |
| `layout.tsx` (root) | ENTIRE application | 🔴 CRITICAL |

**Protocol**: 
1. List all files that import or depend on the target file
2. Check for breaking interface changes (renamed exports, changed function signatures)
3. Make backward-compatible changes first, then migrate consumers
4. Never rename CSS classes without grep-searching the entire `src/` directory

### Rule 2: Never Modify Multiple Layouts Simultaneously
Layouts cascade. Changing `(dashboard)/layout.tsx` and `globals.css` in the same commit can create debugging nightmares. 

**Protocol**: 
- Modify ONE layout per commit
- Test the layout change in isolation before moving to the next

### Rule 3: API Route Compatibility
API routes have consumers in:
- RuneClipy frontend (dashboard pages)
- Discord bot (`bot.js` — makes direct MongoDB queries, not API calls)
- Vercel cron jobs (`/api/cron/`)

**Protocol**:
- Never remove or rename API response fields without checking frontend consumers
- Always maintain `{ success: true, ...data }` and `{ error: "msg" }` response format
- Test API changes with `curl` or browser DevTools before declaring complete

### Rule 4: CSS Token Safety
The design system is token-based. Changing a CSS variable affects EVERY element using it.

**Protocol**:
- To experiment with a new color, add a NEW variable (e.g., `--color-accent-v2`)
- Only replace the old variable after confirming the new one works everywhere
- NEVER change `--color-bg-primary` or `--color-text-primary` without seeing the full app

### Rule 5: Database Schema Safety
Mongoose models are shared between:
- RuneClipy web app (`src/models/`)
- Discord bot (`bot.js` — has duplicated schemas)

**Protocol**:
- Schema changes must be backward-compatible (new fields with defaults only)
- If removing a field, check both `src/models/` AND `bot.js`
- Never change `_id` types or index structures without migration planning

---

## 🧠 Step-by-Step Thinking Requirements

Before executing any refactor, answer these questions:

### Pre-Flight Checklist
```
1. WHAT am I changing?
   → List specific files and line ranges

2. WHY am I changing it?
   → Reference the user request or design spec

3. WHO depends on this?
   → List all consumers (pages, components, API routes, bot)

4. WHAT could break?
   → Identify the blast radius

5. HOW will I verify?
   → Define the verification steps (build, visual check, API test)

6. CAN I do this incrementally?
   → Prefer multiple small, safe changes over one big rewrite
```

### For UI Changes
```
1. Does this change affect responsive behavior?
   → Test at 320px, 768px, 1024px, 1440px widths

2. Does this change affect the admin AND user views?
   → Check globals.css for shared class modifications

3. Am I adding a new CSS class?
   → Check if an existing class already serves this purpose
   → Follow the naming convention: `admin-*` for admin-only, no prefix for shared

4. Am I using hardcoded colors?
   → NEVER. Use design tokens from @theme or CSS variables.
```

---

## 🔄 UI Rollback Protocol

### If a Tailwind Config / globals.css Change Breaks Views

**Step 1: Identify the breaking change**
```bash
git diff src/app/globals.css
```

**Step 2: Revert the specific section**
- If the change was to a `@theme` variable: revert just the variable
- If the change was to a component class: revert the class definition
- If the change was to a `@media` query: check what breakpoints are affected

**Step 3: Clear build cache**
```bash
cd runeclipy
rm -rf .next
npm run build
```

**Step 4: Test affected pages**
- Open each route group layout in the browser
- Check mobile view with DevTools responsive mode
- Verify admin tables and user dashboard cards render correctly

### If a Layout Change Breaks Navigation

**Step 1: Check sidebar state**
- Verify `pathname` matching logic in layout.tsx
- Ensure `isNavActive()` function handles all routes

**Step 2: Check auth guard**
- Verify `/api/auth/session` is still returning correct format
- Check for redirect loops (login → dashboard → login)

**Step 3: Revert layout file**
```bash
git checkout -- src/app/(dashboard)/layout.tsx
# or
git checkout -- src/app/(admin)/layout.tsx
```

---

## 📦 Deployment Rules

### RuneClipy (Vercel)
- Root directory: `runeclipy/`
- Build command: `npm run build`
- Output: `.next/`
- Environment variables: Set in Vercel dashboard

### RUNE Core (standalone)
- No build step — static files served by Express
- Run: `node server.js`

### Discord Bot (Railway)
- Root: `runeclipy-bot/`
- Run: `node bot.js`
- Separate deployment from web app

### Pre-Deploy Checklist
- [ ] `npm run build` passes in `runeclipy/`
- [ ] No TypeScript errors
- [ ] No broken imports
- [ ] All new environment variables documented
- [ ] MEMORY.MD updated with any new routes or models

---

## 🚨 Emergency Protocols

### If Production Is Broken
1. Check Vercel deployment logs: `vercel logs`
2. If latest deploy is broken: trigger revert in Vercel dashboard
3. If database schema changed: check MongoDB Atlas for data integrity
4. If bot is down: check Railway logs, verify `MONGODB_URI` and `DISCORD_BOT_TOKEN`

### If AI Agent Creates Circular Dependencies
1. Stop modifying code immediately
2. Run `npm run build` to identify the circular import
3. Check import chains: A → B → C → A
4. Break the cycle by extracting shared types/interfaces to a separate file

---

*Last updated: 2026-05-19*
