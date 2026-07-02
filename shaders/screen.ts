/**
 * Screenshot-in-glass shader for the references deck: a real client-site
 * screenshot held inside a HALF glass panel. Per-plane uniforms:
 *   uMap      — screenshot texture (may be null until lazily loaded)
 *   uLoaded   — 0 = quiet procedural placeholder, 1 = show the screenshot
 *               (lerped on the CPU so the shot fades in, never pops)
 *   uColor    — client-brand accent (THREE.Color)
 *   uActive   — proximity to scroll focus (0..1), presence + relaxes wave
 *   uHover    — lerped pointer hover (0..1), brightens border, lifts vignette
 *   uAspect   — planeW / planeH (rounded-rect SDF works in width units)
 *   uVignette — dark multiply vignette strength toward edges (~0.42) so
 *               light client sites sit comfortably on the pure #000 world
 *   uScan     — 1 = subtle moving scanline on, 0 = off (low GPU tier)
 *   uWaveAmp  — vertex wave amplitude (reduced on mobile)
 *   uSeed     — per-plane phase offset so planes never animate in unison
 */

export const screenVert = /* glsl */ `
uniform float uTime;
uniform float uActive;
uniform float uWaveAmp;
uniform float uSeed;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 p = position;
  float rest = 1.0 - uActive;

  // gentle traveling wave that settles flat as the panel reaches focus
  float wave = sin(uv.x * 4.6 + uv.y * 2.2 + uTime * 0.9 + uSeed);
  p.z += wave * uWaveAmp * rest;

  // slight horizontal bend — the glass relaxes when active
  float cx = uv.x - 0.5;
  p.z -= cx * cx * 0.42 * rest;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`

export const screenFrag = /* glsl */ `
uniform sampler2D uMap;
uniform float uLoaded;
uniform vec3 uColor;
uniform float uTime;
uniform float uHover;
uniform float uActive;
uniform float uAspect;
uniform float uVignette;
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

void main() {
  // panel space in width units: x in [-0.5, 0.5], y scaled by aspect
  vec2 p = vec2(vUv.x - 0.5, (vUv.y - 0.5) / uAspect);
  float radius = 0.035;
  float d = sdRoundedBox(p, vec2(0.5, 0.5 / uAspect), radius);

  // anti-aliased panel mask
  float mask = 1.0 - smoothstep(-0.005, 0.0, d);
  if (mask < 0.001) discard;

  // screenshot — sampler decodes sRGB to linear (SRGB8_ALPHA8); re-encode
  // here because the RT + composite pipeline is raw (no output transform)
  vec3 shot = texture2D(uMap, vUv).rgb;
  shot = pow(shot, vec3(1.0 / 2.2));

  // quiet procedural placeholder while the texture streams in:
  // dim panel + faint accent grid + breathing noise
  vec2 cell = abs(fract(vUv * vec2(12.0, 12.0 / uAspect)) - 0.5);
  float grid = smoothstep(0.44, 0.5, max(cell.x, cell.y));
  float n = noise(vUv * vec2(18.0, 18.0 / uAspect) + uTime * 0.12 + uSeed);
  float breath = 0.85 + 0.15 * sin(uTime * 1.3 + uSeed);
  vec3 ph = vec3(0.045) + uColor * (grid * 0.045 + n * 0.02) * breath;

  vec3 col = mix(ph, shot, uLoaded);

  // dark multiply vignette toward edges; deepens as the panel loses focus
  // (bright client sites must not wash over the DOM text they pass behind),
  // hover lifts it slightly
  float r = length(vec2(vUv.x - 0.5, (vUv.y - 0.5) * 0.85));
  float vigStrength = uVignette * (1.0 + (1.0 - uActive) * 0.8);
  float vig = 1.0 - vigStrength * smoothstep(0.18, 0.72, r);
  vig = min(vig + uHover * 0.1, 1.0);
  col *= vig;

  // very subtle moving scanline (disabled on low tier via uScan)
  float sweep = fract(uTime * 0.05 + uSeed * 0.17);
  float band = (1.0 - smoothstep(0.0, 0.12, abs(vUv.y - sweep))) * uScan;
  col += uColor * band * (0.02 + uActive * 0.015);

  // fresnel-ish edge tint from distance to border (d = 0 at border)
  float edge = clamp(-d / 0.14, 0.0, 1.0); // 0 at border -> 1 deep inside
  float fres = pow(1.0 - edge, 2.6);
  col += uColor * fres * (0.04 + uActive * 0.03 + uHover * 0.06);

  // thin border glow hugging the edge — hover pushes it hardest
  float border = smoothstep(-0.02, -0.005, d);
  col += uColor * border * (0.22 + uActive * 0.25 + uHover * 0.55);

  // presence: unfocused panels recede hard into the dark — screenshots are
  // bright, so the linear 50% dim used by the service cards is not enough
  // here (the resting ghost sits behind the DOM text column on desktop)
  col *= 0.08 + 0.92 * pow(uActive, 1.5);
  col *= 1.0 + uHover * 0.08;

  float alpha = mask * (0.55 + 0.45 * uActive);
  gl_FragColor = vec4(col, alpha);
}
`
