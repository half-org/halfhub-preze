/**
 * GPGPU "production line" hero shaders.
 *
 * The HΛLF wordmark sits center-stage, permanently assembled from resident
 * particles. A share of particles are travelers on an endless belt: they
 * drift in from the left as loose, turbulent dust (manual chaos), get
 * processed inside the wordmark (snap to their letter slot, light up), and
 * exit right as crisp, laser-straight data lanes that fade out — the studio's
 * story told by the scene itself: chaos in → HALF → order out.
 *
 * Everything is deterministic from (seed, time): a traveler's belt phase is
 * `fract(seed * 13.7 + uTime / uPeriod)`, so both the sim and the points
 * shader can evaluate the same path with the shared `belt` snippet below —
 * no extra state textures. Positions ping-pong in one float texture; the
 * brand's split motif keeps the wordmark's bottom half dissolving harder.
 */

/** Fullscreen-triangle passthrough for the simulation passes. */
export const simVert = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/** Seed pass — placed after beltGLSL so it can start in belt steady state. */

/**
 * Shared belt math. Declares its own uniforms — include once per shader.
 * Segments of a traveler's phase φ:  [0, A) entry · [A, B) dwell · [B, 1) exit.
 */
const beltGLSL = /* glsl */ `
uniform float uPeriod;
uniform float uPhaseA;
uniform float uPhaseB;
uniform float uTravelRatio;
uniform float uFieldW;
uniform float uEntryScatter;
uniform float uLanes;
uniform float uLaneSpan;

float beltTraveler(float seed) {
  return step(fract(seed * 7.91), uTravelRatio);
}

float beltPhase(float seed, float time) {
  return fract(seed * 13.7 + time / uPeriod);
}

/* Path target + noise/spring regime for the sim. */
void beltDynamics(vec3 home, float seed, float time,
                  out vec3 target, out float ampMul, out float k) {
  float traveler = beltTraveler(seed);
  float phi = beltPhase(seed, time);

  // resident: the wordmark itself, breathing gently
  target = home;
  ampMul = 0.14;
  k = 0.03;
  if (traveler < 0.5) return;

  float spawnX = -uFieldW * 1.08;
  float exitX = uFieldW * 1.08;
  float scatterY = (fract(seed * 5.13) - 0.5) * 2.0 * uEntryScatter;
  float scatterZ = (fract(seed * 9.71) - 0.5) * 0.6;
  float laneY = ((floor(fract(seed * 3.77) * uLanes) + 0.5) / uLanes) * 2.0 * uLaneSpan - uLaneSpan;

  if (phi < uPhaseA) {
    // entry: loose dust converging on its letter slot
    float s = phi / uPhaseA;
    target = vec3(
      mix(spawnX, home.x, s),
      mix(scatterY, home.y, smoothstep(0.2, 0.9, s)),
      mix(scatterZ, home.z, smoothstep(0.4, 0.9, s))
    );
    ampMul = 1.0 - s * 0.8;
    k = mix(0.012, 0.05, s);
  } else if (phi < uPhaseB) {
    // dwell: processed inside the wordmark
    ampMul = 0.14;
    k = 0.055;
  } else {
    // exit: slide out of the letter first, then snap into a data lane
    float s = (phi - uPhaseB) / (1.0 - uPhaseB);
    target = vec3(
      mix(home.x, exitX, s),
      mix(home.y, laneY, smoothstep(0.25, 0.65, s)),
      mix(home.z, 0.0, smoothstep(0.25, 0.6, s))
    );
    ampMul = 0.04;
    k = 0.09;
  }
}

/* Color stage (0 chaos → 0.5 wordmark → 1 lane) + visibility for points. */
void beltLook(float seed, float time, out float glow, out float alpha) {
  float traveler = beltTraveler(seed);
  float phi = beltPhase(seed, time);

  glow = 0.5;
  alpha = 1.0;
  if (traveler < 0.5) return;

  if (phi < uPhaseA) {
    float s = phi / uPhaseA;
    glow = s * 0.45;
    // fade in just after the wrap so the teleport is invisible
    alpha = smoothstep(0.0, 0.1, phi) * mix(0.4, 0.95, s);
  } else if (phi < uPhaseB) {
    glow = 0.5;
  } else {
    float s = (phi - uPhaseB) / (1.0 - uPhaseB);
    glow = mix(0.6, 1.0, smoothstep(0.15, 0.5, s));
    alpha = 1.0 - smoothstep(0.7, 0.98, s);
  }
}
`

/**
 * Seeds the position targets at each particle's belt target for t = 0, so
 * the loader reveals the machine already running (no initial transient).
 */
export const homeCopyFrag = /* glsl */ `
uniform sampler2D tLogo;
varying vec2 vUv;

${beltGLSL}

void main() {
  vec4 home4 = texture2D(tLogo, vUv);
  vec3 target;
  float ampMul;
  float k;
  beltDynamics(home4.xyz, home4.w, 0.0, target, ampMul, k);
  gl_FragColor = vec4(target, 0.0);
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
 * Simulation step. Per-frame force magnitudes are premultiplied in JS at a
 * 60fps base and scaled by uDelta for frame-rate independence. When a
 * traveler's phase wraps (exit → entry) it teleports to its new spawn point
 * while invisible (beltLook fades both wrap ends to zero).
 */
export const simFrag = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tLogo;
uniform float uTime;
uniform float uDelta;
uniform float uNoiseFreq;
uniform float uNoiseAmp;
uniform float uSplitDissolve;
uniform vec3 uPointer;
uniform float uPointerRadius;
uniform float uPointerForce;
varying vec2 vUv;

${beltGLSL}
${noiseGLSL}

void main() {
  vec3 pos = texture2D(tPos, vUv).xyz;
  vec4 home4 = texture2D(tLogo, vUv);
  vec3 home = home4.xyz;
  float seed = home4.w;

  vec3 target;
  float ampMul;
  float k;
  beltDynamics(home, seed, uTime, target, ampMul, k);

  // teleport across the wrap seam instead of streaking backwards
  if (beltTraveler(seed) > 0.5) {
    float phiNow = beltPhase(seed, uTime);
    float phiPrev = beltPhase(seed, uTime - uDelta);
    if (phiNow < phiPrev) pos = target;
  }

  // brand motif: the wordmark's bottom half drifts/dissolves harder
  float bottom = step(home.y, 0.0);
  float nearHome = 1.0 - smoothstep(0.2, 0.6, length(pos - home));
  ampMul *= 1.0 + bottom * nearHome * uSplitDissolve;
  k *= 1.0 - bottom * nearHome * 0.4;

  vec3 vel = curlNoise(pos * uNoiseFreq + uTime * 0.05) * uNoiseAmp * ampMul;

  // pointer repulsion (uPointer is in logo-local space, on the z=0 plane)
  vec3 toPointer = pos - uPointer;
  float d = length(toPointer);
  float falloff = 1.0 - smoothstep(0.0, uPointerRadius, d);
  vel += (toPointer / max(d, 1e-4)) * falloff * falloff * uPointerForce;

  vel += (target - pos) * k;

  float dt = clamp(uDelta * 60.0, 0.25, 2.0);
  gl_FragColor = vec4(pos + vel * dt, 0.0);
}
`

/**
 * Points vertex shader. `position` is a (u, v, 0) lookup into the sim
 * texture; seed and the wordmark home come from tLogo. Stage (chaos →
 * wordmark → lane) drives size, alpha and the color ramp.
 */
export const pointsVert = /* glsl */ `
uniform sampler2D tPos;
uniform sampler2D tPrev;
uniform sampler2D tLogo;
uniform float uDPR;
uniform float uSize;
uniform float uTime;
uniform float uSimTime;
uniform float uPulseSpeed;
varying float vMix;
varying float vAlpha;
varying float vGlow;

${beltGLSL}

void main() {
  vec3 cur = texture2D(tPos, position.xy).xyz;
  vec3 prv = texture2D(tPrev, position.xy).xyz;
  vec4 home4 = texture2D(tLogo, position.xy);
  float seed = home4.w;

  float glow;
  float alpha;
  beltLook(seed, uSimTime, glow, alpha);
  vGlow = glow;

  float speed = length(cur - prv);
  float pulse = 0.5 + 0.5 * sin(uTime * uPulseSpeed * 6.2831 + seed * 6.2831);

  vec4 mvPosition = modelViewMatrix * vec4(cur, 1.0);
  float size = (uSize * uDPR) * (900.0 / max(-mvPosition.z, 0.001));
  // chaos reads soft and airy, the lanes fine and precise
  size *= mix(1.15, 1.0, smoothstep(0.1, 0.5, glow));
  size *= mix(1.0, 0.85, smoothstep(0.55, 1.0, glow));
  gl_PointSize = clamp(size * (0.8 + 0.4 * pulse) * (0.6 + 0.8 * fract(seed * 5.71)), 1.0, 24.0);

  vMix = clamp(speed * 60.0, 0.0, 1.0) * 0.85 + pulse * 0.15;

  // the wordmark's bottom half reads slightly dimmer (split motif)
  float bottom = 1.0 - smoothstep(-0.04, 0.04, cur.y);
  float logoZone = smoothstep(0.3, 0.5, glow) * (1.0 - smoothstep(0.55, 0.8, glow));
  vAlpha = alpha * (1.0 - bottom * logoZone * 0.35) * (0.55 + 0.45 * fract(seed * 9.13));

  gl_Position = projectionMatrix * mvPosition;
}
`

/** Soft round point; dust → accent → bright lane, white flash by activity. */
export const pointsFrag = /* glsl */ `
uniform vec3 uColorChaos;
uniform vec3 uColor;
uniform vec3 uColorLane;
uniform vec3 uColorHot;
uniform float uOpacity;
varying float vMix;
varying float vAlpha;
varying float vGlow;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float disc = 1.0 - smoothstep(0.08, 0.5, length(c));
  vec3 color = mix(uColorChaos, uColor, smoothstep(0.08, 0.48, vGlow));
  color = mix(color, uColorLane, smoothstep(0.55, 1.0, vGlow));
  color = mix(color, uColorHot, vMix * (0.3 + 0.5 * vGlow));
  // the outgoing data lanes glow a touch hotter than the wordmark
  color *= 1.0 + smoothstep(0.6, 1.0, vGlow) * 0.5;
  gl_FragColor = vec4(color, 1.0) * disc * vAlpha * uOpacity;
}
`
