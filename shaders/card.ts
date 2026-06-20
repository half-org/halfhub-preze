/**
 * Glassy service-card shader (pure procedural, no textures).
 * One ShaderMaterial per card sharing this source; per-card uniforms:
 *   uColor   — service accent (THREE.Color)
 *   uActive  — proximity to scroll focus (0..1), raises presence, relaxes wave
 *   uHover   — lerped pointer hover (0..1), lifts brightness/border
 *   uMouse   — smoothed pointer (sx, sy) for interior parallax
 *   uSeed    — per-card phase offset so cards never animate in unison
 *   uAspect  — cardW / cardH (rounded-rect SDF works in width units)
 *   uFresnel — fresnel power (design data)
 *   uScan    — 1 = diagonal scan-line on, 0 = off (low GPU tier)
 *   uWaveAmp — vertex wave amplitude (halved on mobile)
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

export const cardFrag = /* glsl */ `
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

  // animated interior noise field, accent-tinted, pointer-parallaxed
  vec2 nuv = vUv * vec2(5.0, 3.2) + uMouse * vec2(0.35, 0.25) + uSeed;
  float n = noise(nuv + uTime * 0.1);
  n += noise(nuv * 2.7 - uTime * 0.06) * 0.5;
  col += uColor * n * (0.035 + uActive * 0.03 + uHover * 0.05);

  // slow diagonal scan-line highlight (disabled on low tier via uScan)
  float s = (vUv.x + vUv.y) * 0.5;
  float sweep = fract(uTime * 0.06 + uSeed * 0.13);
  float band = (1.0 - smoothstep(0.0, 0.10, abs(s - sweep))) * uScan;
  col += uColor * band * (0.05 + uActive * 0.05);

  // fresnel edge tint
  col += uColor * fres * (0.05 + uActive * 0.06 + uHover * 0.05);

  // border glow — hover and focus push it
  col += uColor * border * (0.35 + uActive * 0.35 + uHover * 0.6);

  // presence: focused card sits brighter, hover lifts everything
  col *= 0.55 + 0.45 * uActive;
  col *= 1.0 + uHover * 0.25;

  float alpha = mask * (0.75 + 0.25 * uActive);
  gl_FragColor = vec4(col, alpha);
}
`
