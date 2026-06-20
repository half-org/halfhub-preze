/**
 * GPGPU logo-particle shaders (hero scene).
 *
 * Positions live in a ping-pong float texture pair; `simFrag` advances them
 * each frame (curl-noise drift + pointer repulsion + spring to baked home
 * positions), `pointsVert`/`pointsFrag` draw them as soft additive points.
 *
 * Brand motif: the wordmark is split at y = 0 — the bottom half dissolves
 * harder (more curl drift, ~40% weaker spring) than the solid top half.
 */

/** Fullscreen-triangle passthrough for the simulation passes. */
export const simVert = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Seeds the position targets from the baked home texture (one-shot). */
export const homeCopyFrag = /* glsl */ `
uniform sampler2D tHome;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(tHome, vUv);
}
`

/**
 * Compact GLSL simplex noise (Ashima/IQ public-domain implementation) +
 * curl noise built from three offset scalar fields.
 */
const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 snoiseVec3(vec3 x) {
  return vec3(
    snoise(x),
    snoise(vec3(x.y - 19.1, x.z + 33.4, x.x + 47.2)),
    snoise(vec3(x.z + 74.2, x.x - 124.5, x.y + 99.4))
  );
}

vec3 curlNoise(vec3 p) {
  const float e = 0.1;
  vec3 dx = vec3(e, 0.0, 0.0);
  vec3 dy = vec3(0.0, e, 0.0);
  vec3 dz = vec3(0.0, 0.0, e);

  vec3 px0 = snoiseVec3(p - dx);
  vec3 px1 = snoiseVec3(p + dx);
  vec3 py0 = snoiseVec3(p - dy);
  vec3 py1 = snoiseVec3(p + dy);
  vec3 pz0 = snoiseVec3(p - dz);
  vec3 pz1 = snoiseVec3(p + dz);

  float x = py1.z - py0.z - pz1.y + pz0.y;
  float y = pz1.x - pz0.x - px1.z + px0.z;
  float z = px1.y - px0.y - py1.x + py0.x;

  return normalize(vec3(x, y, z) * (1.0 / (2.0 * e)));
}
`

/**
 * Simulation step. All forces are tuned as per-frame deltas at 60fps and
 * scaled by uDelta for frame-rate independence (JS premultiplies the design
 * values into per-frame magnitudes). Alpha channel carries the seed through.
 */
export const simFrag = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tHome;
uniform float uTime;
uniform float uDelta;
uniform float uNoiseFreq;
uniform float uNoiseAmp;
uniform float uSpring;
uniform float uSplitDissolve;
uniform vec3 uPointer;
uniform float uPointerRadius;
uniform float uPointerForce;
varying vec2 vUv;

${noiseGLSL}

void main() {
  vec4 pos4 = texture2D(tPos, vUv);
  vec4 home4 = texture2D(tHome, vUv);
  vec3 pos = pos4.xyz;
  vec3 home = home4.xyz;
  float seed = home4.w;

  // brand motif: the bottom half drifts/dissolves harder than the top
  float bottom = step(home.y, 0.0);
  float dissolve = 1.0 + bottom * uSplitDissolve;

  // organic curl-noise drift
  vec3 vel = curlNoise(pos * uNoiseFreq + uTime * 0.05) * uNoiseAmp * dissolve;

  // pointer repulsion (uPointer is in logo-local space, on the z=0 plane)
  vec3 toPointer = pos - uPointer;
  float d = length(toPointer);
  float falloff = 1.0 - smoothstep(0.0, uPointerRadius, d);
  vel += (toPointer / max(d, 1e-4)) * falloff * falloff * uPointerForce;

  // spring back to the baked wordmark, ~40% weaker on the dissolving half
  vel += (home - pos) * uSpring * (1.0 - bottom * 0.4);

  float dt = clamp(uDelta * 60.0, 0.25, 2.0);
  gl_FragColor = vec4(pos + vel * dt, seed);
}
`

/**
 * Points vertex shader. `position` is a (u, v, 0) lookup into the sim
 * texture. Color mix factor comes from per-frame displacement (speed) plus
 * a seeded breathing pulse; bottom half reads slightly dimmer.
 */
export const pointsVert = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tPrev;
uniform float uDPR;
uniform float uSize;
uniform float uTime;
uniform float uPulseSpeed;
varying float vMix;
varying float vAlpha;

void main() {
  vec4 cur = texture2D(tPos, position.xy);
  vec4 prv = texture2D(tPrev, position.xy);
  float seed = cur.w;

  float speed = length(cur.xyz - prv.xyz);
  float pulse = 0.5 + 0.5 * sin(uTime * uPulseSpeed * 6.2831 + seed * 6.2831);

  vec4 mvPosition = modelViewMatrix * vec4(cur.xyz, 1.0);
  float size = (uSize * uDPR) * (900.0 / max(-mvPosition.z, 0.001));
  gl_PointSize = clamp(size * (0.8 + 0.4 * pulse) * (0.6 + 0.8 * fract(seed * 5.71)), 1.0, 24.0);

  vMix = clamp(speed * 60.0, 0.0, 1.0) * 0.85 + pulse * 0.15;

  float bottom = 1.0 - smoothstep(-0.04, 0.04, cur.y);
  vAlpha = (1.0 - bottom * 0.35) * (0.55 + 0.45 * fract(seed * 9.13));

  gl_Position = projectionMatrix * mvPosition;
}
`

/** Soft round point, accent → white by activity, premultiplied additive. */
export const pointsFrag = /* glsl */ `
uniform vec3 uColor;
uniform vec3 uColorHot;
uniform float uOpacity;
varying float vMix;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float disc = 1.0 - smoothstep(0.08, 0.5, length(c));
  vec3 color = mix(uColor, uColorHot, vMix);
  gl_FragColor = vec4(color, 1.0) * disc * vAlpha * uOpacity;
}
`
