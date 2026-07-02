<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# What this site is

Presentational website for **HALF**, a software studio (webs, web/mobile/desktop apps, APIs, AI integration, automation). Czech default (`/`), English mirror (`/en`). Tagline: "Druhá polovina vašeho nápadu."

**Business goal, in priority order:**
1. Show off — the site itself is the portfolio piece (immersive WebGL, awwwards-style).
2. Explain what HALF builds.
3. **Extract from visitors what they do manually that HALF could automate.** Clients usually don't know what to ask for — the site must help them discover it. This drives: the hero's chaos→order metaphor and rotating "— pořád ručně?" hooks, the AI automation-map wizard (section 06), and the free-demo offer. When adding features, prefer ones that serve this extraction goal.

# Architecture map

One scroll-world page: DOM sections overlay a fullscreen WebGL canvas (React Three Fiber), composited with a shader wipe between per-section THREE.Scenes.

- `lib/sections.ts` — **single source of truth** for section order/heights (in viewport-heights). Ranges derive from it and are shared by DOM and canvas; they can never disagree. Constraint: every middle section's normalized height must exceed `2*TRANSITION_W` (see comment there).
- `lib/design-data.json` — all visual tuning (camera paths per section, hero particle physics, field colors/density, composite grain/vignette). Tweak numbers here, not in code.
- `components/canvas/World.tsx` — camera rig + render spine (priority 1). Scenes in `components/canvas/scenes/`: HeroScene (GPGPU), ServicesScene, ReferencesScene, FieldScene (shared by the back-half sections).
- `components/dom/*` — one section component + CSS module each. Kickers are numbered `// 01`–`// 08` in JSX; renumber all when inserting a section.
- Scroll: Lenis via `lib/scroll.ts` (`scrollState` read in rAF loops — no React state per frame). DOM scroll-linked effects follow the AiReadySection pattern: CSS holds the FINAL visible state; a rAF loop writes opacity/transform; the loop is skipped under `prefers-reduced-motion` (so reduced-motion/no-JS just show everything).

## Hero (the production line)

`components/canvas/scenes/HeroScene.tsx` + `shaders/particles.ts`. GPGPU ping-pong sim. The HΛLF wordmark sits center-stage, permanently assembled from resident particles (baked bins in `public/assets/particles/logo-*.bin`, regenerate via `node scripts/bake-particles.mjs`); `hero.travelRatio` of the particles are travelers on an endless belt — turbulent dust in from the left, processed inside the wordmark, out to the right as crisp data lanes (chaos in → HALF → order out). Belt phase is deterministic from `(seed, uTime)` via the shared `beltGLSL` snippet, evaluated identically by the sim, points and seed shaders — no extra state textures; travelers teleport across the wrap seam while faded out. Pointer repels particles; the wordmark's bottom half dissolves harder (brand split motif). All tuning in `design-data.json → hero` (`travelRatio`, `beltPeriod`, `phaseA/B`, `laneCount`…).

DOM hero (`components/dom/Hero.tsx`): scroll-driven per-word headline dissolve + rotating extraction hook (questions derived from `lib/audit-data.ts` tasks) deep-linking to `#audit`.

# Copy rules

- Every user-facing string lives in `lib/content.ts` (or `lib/audit-data.ts` / `lib/wizard-data.ts`) with **both `cs` and `en`** variants.
- Never invent factual claims (client counts, savings, deadlines). Derive from existing approved copy, or propose new copy to the owner for approval before shipping.
- Voice: short, confident, no fluff; mono-font kickers; the "half" split motif (solid/outline headings via `splitHalf`).

# Gotchas

- Section rooms are fixed heights — natural-flow content (CTA section) must never grow past its room. The wizard terminal is height-capped with an internal scroll for exactly this; verify worst case (step 3 with all 7 symptoms selected) after touching it. The wizard result is rule-based (`lib/wizard-data.ts buildPlan`) — a future AI backend replaces that function, not the component.
- Anything rendered on the server must be deterministic (no `Math.random` in render paths — seeds via index hashes, see `Hero.tsx` `seed()`).
- Per-frame work goes through refs + direct style/uniform writes; `setState` only on discrete changes (active index, etc.).
- `useFrame` priorities: HeroScene sim runs at 0, World renders at 1 and owns the screen output.

# Commands & verification

- `npm run dev` (localhost:3000), `npx tsc --noEmit`, `npx next build`.
- No test suite — verify by driving the real site headless with `playwright-core` (devDependency): launch the cached Chrome for Testing build, screenshot scroll positions / interactions, and read `window.__dbg` (World, dev only). Sweep pattern: scroll in 0.25–0.5 viewport steps, screenshot, look for dead/empty stretches.
- Headless SwiftShader runs the WebGL at ~5 fps — interaction physics appear ~10× weaker than on real GPUs. Verify mechanics via the debug globals, aesthetics via screenshots, and judge "feel" on real hardware.
- After layout changes, re-check both `/` and `/en`.
