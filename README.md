# HALF — presentational website

Immersive WebGL presentational site for the HALF software studio, in the
Active Theory style: one scroll-world, GPU particle logo, shader section
transitions, composite post-processing. Built per the `immersive-webgl-site`
skill (hybrid architecture: real SSR HTML content + WebGL layer).

## Stack

Next.js 16 (App Router) · React 19 · three 0.184 · @react-three/fiber 9.6 ·
lenis · gsap. No Tailwind — CSS modules + tokens in `app/globals.css`.

## Commands

```bash
npm run dev                      # dev server
npm run build                    # production build
node scripts/bake-particles.mjs  # regenerate particle position bins
```

## Architecture

- `app/(cs)/` + `app/(en)/en/` — two root layouts (CZ default, EN), shared
  shell in `components/RootShell.tsx`. All copy lives in `lib/content.ts`.
- `components/canvas/` — single persistent R3F `<Canvas>` behind the DOM.
  `World.tsx` renders per-section `THREE.Scene`s into render targets and
  composites them through `shaders/composite.ts` (angled displaced wipe
  between sections + grade + global fade-in). Frameloop is driven manually
  (`CanvasScene.tsx` Driver) — fps cap by GPU tier, pauses when hidden.
- `components/dom/` — semantic HTML sections (SEO/a11y baseline and the
  reduced-motion fallback), loader, nav.
- `lib/sections.ts` — single source of truth for section heights/ranges;
  `lib/design-data.json` — camera paths and shader uniforms ("design is
  data"); `lib/gpu-tier.ts` — adaptive quality policy (DPR, particle counts,
  effects); `lib/loader-state.ts` — milestone-gated loader.
- `public/assets/particles/logo-{128,256,512}.bin` — pre-baked HΛLF logo
  particle positions (Float32 RGBA), picked by GPU tier at load time.
  Regenerate with the bake script after changing `lib/logo-polys.json`.

## Conventions

- The DOM layer has `pointer-events: none`; interactive elements need
  `data-interactive` (or be a/button/input).
- Canvas scenes follow the `SceneProps` contract (`lib/types.ts`): portal
  into the provided scene, read `scrollState`/`pointerState` per-frame, never
  render to screen (only `World` at useFrame priority 1 touches the canvas;
  the hero's GPGPU sim may render to its own FBOs but must restore
  `setRenderTarget(null)`).
- `prefers-reduced-motion` / no WebGL2 / tier 0 → the three.js bundle is
  never imported; the HTML experience stands alone.
