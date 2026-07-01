/**
 * Glassy service-card shader (pure procedural, no textures).
 *
 * The fragment source is assembled per service by `cardFrag(serviceIdx, detail)`:
 * a shared glass-shell block (rounded-rect SDF mask, fresnel, border glow,
 * quiet noise + scanline) plus exactly ONE bespoke animated pictogram function
 * — so each of the 7 materials compiles a lean variant with no runtime branch.
 * `detail=false` (GPU tier <= 1) compiles a simplified pictogram: fewer
 * elements, no flicker/glow extras.
 *
 * One ShaderMaterial per card; per-card uniforms (contract unchanged):
 *   uColor   — service accent (THREE.Color)
 *   uActive  — proximity to scroll focus (0..1), raises presence, relaxes wave
 *   uHover   — lerped pointer hover (0..1), lifts brightness/border
 *   uMouse   — smoothed pointer (sx, sy) for interior parallax
 *   uSeed    — per-card phase offset so cards never animate in unison
 *   uAspect  — cardW / cardH (rounded-rect SDF works in width units)
 *   uFresnel — fresnel power (design data)
 *   uScan    — 1 = diagonal scan-line on, 0 = off (low GPU tier)
 *   uWaveAmp — vertex wave amplitude (halved on mobile)
 *
 * Pictogram grammar: thin crisp SDF strokes with fwidth AA, drawn in a soft
 * white-cyan ink; the service accent (uColor) is reserved for highlights —
 * packets, glows, fills — never a full recolor. Every `picto()` returns
 * vec2(ink, accent) intensities in card space (x in [-0.5, 0.5]).
 */

export const cardVert = /* glsl */ `
uniform float uTime;
uniform float uActive;
uniform float uWaveAmp;
uniform float uSeed;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;
  float rest = 1.0 - uActive;

  // gentle traveling wave, fading out as the card reaches focus
  float wave = sin(uv.x * 5.4 + uv.y * 2.6 + uTime * 1.1 + uSeed);
  p.z += wave * uWaveAmp * rest;

  // slight horizontal bend — the card relaxes flat when active
  float cx = uv.x - 0.5;
  p.z -= cx * cx * 0.5 * rest;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

/* ------------------------------------------------------------------ */
/* Shared fragment header: uniforms + SDF/stroke helpers               */
/* ------------------------------------------------------------------ */

const FRAG_COMMON = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform float uHover;
uniform float uActive;
uniform vec2 uMouse;
uniform float uAspect;
uniform float uFresnel;
uniform float uScan;
uniform float uSeed;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

// rounded-rectangle SDF; p and b in "width units" (x spans -0.5..0.5)
float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float sdBox(vec2 p, vec2 b) {
  vec2 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
}

// segment SDF, safe for degenerate (a == b) segments
float sdSeg(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1.0e-6), 0.0, 1.0);
  return length(pa - ba * h);
}

// crisp anti-aliased stroke centered on d == 0, half-width w
float stroke(float d, float w) {
  float aa = clamp(fwidth(d), 0.0012, 0.01);
  return 1.0 - smoothstep(w - aa, w + aa, abs(d));
}

// anti-aliased fill of an SDF interior
float fillSd(float d) {
  float aa = clamp(fwidth(d), 0.0012, 0.01);
  return 1.0 - smoothstep(0.0, aa, d);
}

// soft gaussian-ish glow around d == 0 (outside included)
float glowSd(float d, float r) {
  float dd = max(d, 0.0);
  return exp(-dd * dd / (r * r));
}
`

/* ------------------------------------------------------------------ */
/* Per-service pictogram functions — each defines vec2 picto(q, t)     */
/* returning vec2(ink, accent). Card space: x in [-0.5, 0.5],          */
/* y in [-0.5/aspect, 0.5/aspect] (~[-0.31, 0.31] at 3.4x2.1).         */
/* ------------------------------------------------------------------ */

// 01 web — browser chrome, traffic dots + URL bar, skeleton bars loading in
const PICTO_WEB = /* glsl */ `
float barLen(float i) {
  return i < 0.5 ? 0.50 : i < 1.5 ? 0.34 : i < 2.5 ? 0.44 : 0.26;
}

vec2 picto(vec2 q, float t) {
  float ink = 0.0;
  float acc = 0.0;

  // window chrome
  ink += stroke(sdRoundedBox(q, vec2(0.305, 0.20), 0.03), 0.0055);

  // toolbar separator
  ink += stroke(sdSeg(q, vec2(-0.305, 0.12), vec2(0.305, 0.12)), 0.0035) * 0.65;

  // traffic-light dots, third one accent-tinted
  for (int i = 0; i < 3; i++) {
    float dd = length(q - vec2(-0.258 + float(i) * 0.036, 0.16)) - 0.010;
    ink += fillSd(dd) * 0.8;
    if (i == 2) acc += fillSd(dd) * 0.7;
  }

  // URL-bar pill
  ink += stroke(sdSeg(q, vec2(-0.115, 0.16), vec2(0.245, 0.16)) - 0.014, 0.003) * 0.5;

  // skeleton bars sweep in staggered (page loading), loop with a fade-out
#if DETAIL
  const int BARS = 4;
#else
  const int BARS = 3;
#endif
  float cycle = fract(t * 0.28);
  float fade = 1.0 - smoothstep(0.82, 0.98, cycle);
  for (int i = 0; i < BARS; i++) {
    float fi = float(i);
    float rev = smoothstep(0.0, 0.26, cycle - fi * 0.09);
    if (rev < 0.002) continue;
    float yb = 0.052 - fi * 0.062;
    vec2 tip = vec2(-0.255 + barLen(fi) * rev, yb);
    float db = sdSeg(q, vec2(-0.255, yb), tip) - 0.0125;
    ink += fillSd(db) * 0.32 * fade;
#if DETAIL
    // bright loading head while the bar reveals
    acc += glowSd(length(q - tip), 0.02) * fade * (1.0 - step(0.999, rev)) * 0.8;
#endif
  }

  return vec2(ink, acc);
}
`

// 02 webapps — dashboard: rising bars in one panel, self-drawing sparkline in the other
const PICTO_WEBAPPS = /* glsl */ `
float sparkY(float i) {
  return i < 0.5 ? -0.075 : i < 1.5 ? 0.02 : i < 2.5 ? -0.03 : i < 3.5 ? 0.08 : 0.04;
}

vec2 picto(vec2 q, float t) {
  float ink = 0.0;
  float acc = 0.0;

  // two panels
  ink += stroke(sdRoundedBox(q - vec2(-0.16, -0.015), vec2(0.135, 0.16), 0.02), 0.005);
  ink += stroke(sdRoundedBox(q - vec2(0.165, -0.015), vec2(0.135, 0.16), 0.02), 0.005);
#if DETAIL
  // header strip
  ink += stroke(sdRoundedBox(q - vec2(0.0, 0.195), vec2(0.30, 0.026), 0.015), 0.004) * 0.55;
#endif

  // rising bars, each breathing to its own height
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    float bx = -0.252 + fi * 0.062;
    float hMax = 0.10 + 0.13 * hash(vec2(fi, 7.0));
    float h = hMax * (0.55 + 0.45 * sin(t * 1.4 + fi * 1.9));
    ink += fillSd(sdBox(q - vec2(bx, -0.135 + h * 0.5), vec2(0.016, h * 0.5))) * 0.30;
    // bright cap on each bar (accent)
    acc += stroke(sdSeg(q, vec2(bx - 0.016, -0.135 + h), vec2(bx + 0.016, -0.135 + h)), 0.0035) * 0.8;
  }

  // sparkline drawing itself left to right, then fading to restart
  float rev = fract(t * 0.2);
  float ease = smoothstep(0.04, 0.7, rev);
  float fade = 1.0 - smoothstep(0.88, 1.0, rev);
  float headX = mix(0.06, 0.275, ease);
  vec2 head = vec2(0.06, sparkY(0.0));
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 pa = vec2(0.06 + fi * 0.05375, sparkY(fi));
    vec2 pb = vec2(0.06 + (fi + 1.0) * 0.05375, sparkY(fi + 1.0));
    float f = clamp((headX - pa.x) / (pb.x - pa.x), 0.0, 1.0);
    if (f < 0.001) continue;
    vec2 pe = mix(pa, pb, f);
    ink += stroke(sdSeg(q, pa, pe), 0.0045) * 0.85 * fade;
    head = pe;
  }
  acc += glowSd(length(q - head), 0.022) * fade * 0.9;

  return vec2(ink, acc);
}
`

// 03 mobile — phone outline + notch; two screen cards swap in a swipe loop
const PICTO_MOBILE = /* glsl */ `
vec2 picto(vec2 q, float t) {
  float ink = 0.0;
  float acc = 0.0;

  // phone body + notch dot
  ink += stroke(sdRoundedBox(q, vec2(0.115, 0.215), 0.045), 0.0055);
  ink += fillSd(length(q - vec2(0.0, 0.178)) - 0.008) * 0.7;

  // screen region clips the sliding cards
  float dScreen = sdRoundedBox(q - vec2(0.0, 0.008), vec2(0.09, 0.132), 0.018);
  float clipS = fillSd(dScreen);

  // swipe phase: card B slides in over card A, holds, slides back out
  float ph = fract(t * 0.24);
  float k = smoothstep(0.12, 0.4, ph) - smoothstep(0.6, 0.88, ph);

  // incoming card B (accent-tinted), occludes what is under it
  vec2 cb = vec2(mix(0.26, 0.0, k), 0.008);
  float dB = sdRoundedBox(q - cb, vec2(0.07, 0.102), 0.014);
  float occl = smoothstep(0.0, 0.01, dB);

  // resting card A slides aside and dims
  vec2 ca = vec2(mix(0.0, -0.05, k), 0.008);
  float dA = sdRoundedBox(q - ca, vec2(0.07, 0.102), 0.014);
  float fadeA = mix(0.9, 0.35, k);
  ink += stroke(max(dA, dScreen), 0.0045) * fadeA * occl;
#if DETAIL
  // content hint inside card A
  ink += stroke(sdSeg(q - ca, vec2(-0.042, 0.05), vec2(0.042, 0.05)), 0.0035) * 0.5 * fadeA * occl * clipS;
  ink += stroke(sdSeg(q - ca, vec2(-0.042, 0.005), vec2(0.018, 0.005)), 0.0035) * 0.5 * fadeA * occl * clipS;
#endif

  float mB = stroke(max(dB, dScreen), 0.0045);
  ink += mB * 0.55;
  acc += mB * 0.65 + fillSd(max(dB, dScreen)) * 0.12;

  // pagination dots track the swipe
  float dotA = fillSd(length(q - vec2(-0.02, -0.168)) - 0.007);
  float dotB = fillSd(length(q - vec2(0.02, -0.168)) - 0.007);
  ink += dotA * mix(0.85, 0.3, k) + dotB * mix(0.3, 0.85, k);
  acc += dotA * (1.0 - k) * 0.5 + dotB * k * 0.5;

  return vec2(ink, acc);
}
`

// 04 api — pentagon of nodes, packets traveling edges, destination flare
const PICTO_API = /* glsl */ `
vec2 nodeP(float i) {
  float a = 1.5708 + i * 1.25664; // 2*PI/5
  return vec2(cos(a) * 0.26, sin(a) * 0.18);
}

vec2 picto(vec2 q, float t) {
  float ink = 0.0;
  float acc = 0.0;

#if DETAIL
  // faint cross links for network depth
  ink += stroke(sdSeg(q, nodeP(0.0), nodeP(2.0)), 0.0022) * 0.16;
  ink += stroke(sdSeg(q, nodeP(1.0), nodeP(3.0)), 0.0022) * 0.16;
#endif

  // ring edges + traveling packets
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 pa = nodeP(fi);
    vec2 pb = nodeP(mod(fi + 1.0, 5.0));
    ink += stroke(sdSeg(q, pa, pb), 0.003) * 0.32;

#if DETAIL
    bool hasPk = (i == 0 || i == 1 || i == 3);
#else
    bool hasPk = (i == 0 || i == 3);
#endif
    if (hasPk) {
      float fr = fract(t * (0.2 + fi * 0.045) + fi * 0.37);
      vec2 pk = mix(pa, pb, fr);
      acc += glowSd(length(q - pk), 0.02) * 0.9;
      // flare the destination node on arrival
      acc += glowSd(length(q - pb), 0.05) * smoothstep(0.8, 1.0, fr) * 0.7;
    }
  }

  // nodes
  for (int i = 0; i < 5; i++) {
    float dn = length(q - nodeP(float(i))) - 0.015;
    ink += fillSd(dn) * 0.9;
#if DETAIL
    ink += stroke(dn - 0.011, 0.0025) * 0.35; // orbit ring
#endif
    acc += glowSd(dn, 0.03) * 0.2;
  }

  return vec2(ink, acc);
}
`

// 05 desktop — two OS windows, front one drifting with a filling progress bar
const PICTO_DESKTOP = /* glsl */ `
vec2 picto(vec2 q, float t) {
  float ink = 0.0;
  float acc = 0.0;

#if DETAIL
  vec2 drift = vec2(sin(t * 0.6), cos(t * 0.47)) * 0.008;
#else
  vec2 drift = vec2(0.0);
#endif
  vec2 cF = vec2(-0.055, -0.042) + drift;
  vec2 hF = vec2(0.215, 0.148);
  float dF = sdRoundedBox(q - cF, hF, 0.02);

  // back window, dimmer, occluded by the front one
  float dB = sdRoundedBox(q - vec2(0.075, 0.06), vec2(0.20, 0.132), 0.02);
  ink += stroke(dB, 0.0045) * 0.32 * smoothstep(-0.002, 0.008, dF);

  // front window + title bar + traffic dots
  ink += stroke(dF, 0.0055);
  float tby = cF.y + hF.y - 0.05;
  ink += stroke(sdSeg(q, vec2(cF.x - hF.x, tby), vec2(cF.x + hF.x, tby)), 0.0035) * 0.6;
  for (int i = 0; i < 3; i++) {
    vec2 c = vec2(cF.x - hF.x + 0.034 + float(i) * 0.031, cF.y + hF.y - 0.026);
    ink += fillSd(length(q - c) - 0.0085) * 0.8;
  }

  // progress bar fills, flashes on complete, resets
  vec2 p0 = vec2(cF.x - 0.15, cF.y - 0.048);
  vec2 p1 = vec2(cF.x + 0.15, cF.y - 0.048);
  ink += stroke(sdSeg(q, p0, p1) - 0.011, 0.0028) * 0.4;
  float fr = fract(t * 0.17);
  float ff = smoothstep(0.02, 0.82, fr);
  vec2 pe = mix(p0, p1, ff);
  float flash = smoothstep(0.82, 0.9, fr) * (1.0 - smoothstep(0.9, 1.0, fr));
  float vanish = 1.0 - smoothstep(0.96, 1.0, fr);
  acc += fillSd(sdSeg(q, p0, pe) - 0.0065) * (0.7 + flash * 0.6) * vanish;
#if DETAIL
  acc += glowSd(length(q - pe), 0.018) * (1.0 - step(0.82, fr)) * 0.5;
#endif

  return vec2(ink, acc);
}
`

// 06 ai — 3-layer network, forward-pass brightness wave, edge flicker
const PICTO_AI = /* glsl */ `
#if DETAIL
#define ROWS_A 4
#define ROWS_B 5
#else
#define ROWS_A 3
#define ROWS_B 4
#endif

vec2 nodeAt(int c, int r) {
  float n = (c == 1) ? float(ROWS_B) : float(ROWS_A);
  return vec2(-0.22 + float(c) * 0.22, (float(r) - (n - 1.0) * 0.5) * 0.082);
}

vec2 picto(vec2 q, float t) {
  float ink = 0.0;
  float acc = 0.0;

  // full bipartite links between adjacent layers
  for (int i = 0; i < ROWS_A; i++) {
    for (int j = 0; j < ROWS_B; j++) {
      float l1 = stroke(sdSeg(q, nodeAt(0, i), nodeAt(1, j)), 0.0022);
      float l2 = stroke(sdSeg(q, nodeAt(1, j), nodeAt(2, i)), 0.0022);
      ink += (l1 + l2) * 0.09;
#if DETAIL
      // occasional edge flicker
      float tick = floor(t * 3.0);
      acc += l1 * step(0.94, hash(vec2(float(i) * 3.1 + float(j) * 7.7, tick))) * 0.45;
      acc += l2 * step(0.94, hash(vec2(float(j) * 5.3 + float(i) * 2.9, tick + 13.0))) * 0.45;
#endif
    }
  }

  // neurons — brightness wave sweeps left to right (forward pass)
  for (int c = 0; c < 3; c++) {
    float wave = 0.5 + 0.5 * sin(t * 2.1 - float(c) * 1.7);
    for (int r = 0; r < ROWS_B; r++) {
      if (c != 1 && r >= ROWS_A) continue;
      float dn = length(q - nodeAt(c, r)) - 0.0125;
      ink += fillSd(dn) * (0.35 + 0.6 * wave);
      acc += glowSd(dn, 0.028) * wave * 0.45;
    }
  }

  return vec2(ink, acc);
}
`

// 07 automation — rotating gear, orbiting conveyor packet, ticking progress
const PICTO_AUTOMATION = /* glsl */ `
vec2 picto(vec2 q, float t) {
  float ink = 0.0;
  float acc = 0.0;
  vec2 g = q - vec2(0.0, 0.032);

  // gear ring: teeth from angular repetition, rotating continuously
  float ang = atan(g.y, g.x) + t * 0.5;
  float teeth = clamp(sin(ang * 8.0) * 3.0, -1.0, 1.0);
  float ring = abs(length(g) - (0.102 + 0.02 * teeth)) - 0.0055;
  float gear = fillSd(ring);
  ink += gear;
  acc += gear * smoothstep(0.4, 1.0, teeth) * 0.35;

  // hub + axle
  ink += stroke(length(g) - 0.04, 0.0045);
  ink += fillSd(length(g) - 0.011) * 0.75;

  // elliptical conveyor with an orbiting square packet
  vec2 ell = vec2(0.30, 0.185);
#if DETAIL
  ink += stroke((length(g / ell) - 1.0) * 0.185, 0.0022) * 0.22;
#endif
  float th = -t * 0.55;
  float dPk = sdBox(g - vec2(cos(th), sin(th)) * ell, vec2(0.015, 0.015));
  ink += stroke(dPk, 0.0035) * 0.6;
  acc += fillSd(dPk) * 0.8;
#if DETAIL
  acc += glowSd(dPk, 0.025) * 0.35;
#endif

  // ticking progress bar beneath
  vec2 b0 = vec2(-0.14, -0.247);
  vec2 b1 = vec2(0.14, -0.247);
  ink += stroke(sdSeg(q, b0, b1) - 0.009, 0.0028) * 0.38;
  float tickF = floor(fract(t * 0.14) * 8.0) / 8.0;
  acc += fillSd(sdSeg(q, b0, mix(b0, b1, tickF)) - 0.005) * 0.7;

  return vec2(ink, acc);
}
`

/* ------------------------------------------------------------------ */
/* Shared glass shell + pictogram composite                            */
/* ------------------------------------------------------------------ */

const FRAG_MAIN = /* glsl */ `
void main() {
  // card space in width units: x in [-0.5, 0.5], y in [-0.5/aspect, 0.5/aspect]
  vec2 p = vec2(vUv.x - 0.5, (vUv.y - 0.5) / uAspect);
  float radius = 0.06; // ~0.06 of card width
  float d = sdRoundedBox(p, vec2(0.5, 0.5 / uAspect), radius);

  // anti-aliased card mask
  float mask = 1.0 - smoothstep(-0.006, 0.0, d);
  if (mask < 0.001) discard;

  // edge fresnel approximation from distance to border (d = 0 at border)
  float edge = clamp(-d / 0.16, 0.0, 1.0); // 0 at border -> 1 deep inside
  float fres = pow(1.0 - edge, uFresnel);

  // thin border glow band hugging the edge
  float border = smoothstep(-0.03, -0.006, d);

  // very dark glass base
  vec3 col = vec3(0.04);

  // quiet interior noise, dimmed so the pictogram owns the card
  vec2 nuv = vUv * vec2(5.0, 3.2) + uMouse * vec2(0.35, 0.25) + uSeed;
  float n = noise(nuv + uTime * 0.1);
  n += noise(nuv * 2.7 - uTime * 0.06) * 0.5;
  col += uColor * n * (0.015 + uActive * 0.015 + uHover * 0.02);

  // slow diagonal scan-line highlight (disabled on low tier via uScan), halved
  float s = (vUv.x + vUv.y) * 0.5;
  float sweep = fract(uTime * 0.06 + uSeed * 0.13);
  float band = (1.0 - smoothstep(0.0, 0.10, abs(s - sweep))) * uScan;
  col += uColor * band * (0.025 + uActive * 0.025);

  // pictogram — slight pointer parallax, per-card phase via uSeed
  vec2 pq = p - uMouse * vec2(0.018, 0.012);
  vec2 pic = min(picto(pq, uTime * 0.9 + uSeed), vec2(1.3));
  float presence = (0.45 + 0.55 * uActive) * (1.0 + uHover * 0.35);
  col += vec3(0.72, 0.88, 0.92) * pic.x * presence * 0.85; // soft white-cyan ink
  col += uColor * pic.y * presence * 0.75;                 // accent highlights

  // fresnel edge tint
  col += uColor * fres * (0.05 + uActive * 0.06 + uHover * 0.05);

  // border glow — hover and focus push it
  col += uColor * border * (0.35 + uActive * 0.35 + uHover * 0.6);

  // presence: focused card sits brighter, hover lifts everything
  col *= 0.55 + 0.45 * uActive;
  col *= 1.0 + uHover * 0.25;

  float lum = max(pic.x, pic.y) * presence;
  float alpha = mask * min(0.75 + 0.25 * uActive + lum * 0.15, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`

const PICTO_SOURCES = [
  PICTO_WEB, // 01 web
  PICTO_WEBAPPS, // 02 webapps
  PICTO_MOBILE, // 03 mobile
  PICTO_API, // 04 api
  PICTO_DESKTOP, // 05 desktop
  PICTO_AI, // 06 ai
  PICTO_AUTOMATION, // 07 automation
]

/**
 * Build the fragment shader for a service card.
 * @param serviceIdx index into lib/content.ts SERVICES order (0..6)
 * @param detail     false on low GPU tier — compiles the simplified pictogram
 */
export function cardFrag(serviceIdx: number, detail = true): string {
  const picto = PICTO_SOURCES[serviceIdx % PICTO_SOURCES.length] ?? PICTO_WEB
  return `#define DETAIL ${detail ? 1 : 0}\n${FRAG_COMMON}\n${picto}\n${FRAG_MAIN}`
}
