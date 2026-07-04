/**
 * Hero "loom" shaders — a calm field of horizontal threads.
 *
 * The left side ripples with slow turbulence (the unformed idea), easing to
 * perfectly straight, faintly teal lines on the right (the delivered
 * product) — chaos in → order out, told with continuous lines instead of
 * particles. A faint brightening at the vertical center marks the brand seam.
 *
 * One LineSegments draw call; all motion lives in the vertex shader, driven
 * by (uTime, row, x) — no state, fully deterministic.
 */

/** Compact GLSL simplex noise (Ashima/IQ public-domain implementation). */
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
`

export const waveVert = /* glsl */ `
uniform float uTime;
uniform float uSpanX;
uniform float uBandH;
uniform float uAmpChaos;
uniform float uAmpOrder;
uniform float uNoiseFreq;
uniform float uSpeed;
uniform float uSeamBoost;
uniform vec3 uPointer;
uniform float uPointerRadius;
uniform float uPointerAmp;
varying float vOrder;
varying float vShade;
varying float vEdge;

${noiseGLSL}

void main() {
  // geometry is normalized: position.x = 0..1 along the thread, position.y = row 0..1
  float x = (position.x - 0.5) * 2.0 * uSpanX;
  float row = position.y;
  float baseY = (row - 0.5) * uBandH;

  // 0 = turbulent left (idea), 1 = straight right (delivery)
  float order = smoothstep(-uSpanX * 0.4, uSpanX * 0.5, x);
  float amp = mix(uAmpChaos, uAmpOrder, order);

  float t = uTime * uSpeed;
  float n = snoise(vec3(x * uNoiseFreq, row * 5.0, t));
  n += 0.45 * snoise(vec3(x * uNoiseFreq * 2.6, row * 9.0 + 31.7, t * 1.5));
  float y = baseY + n * amp;

  // gentle swell toward the camera under the pointer
  float pd = distance(vec2(x, baseY), uPointer.xy);
  float g = exp(-(pd * pd) / (uPointerRadius * uPointerRadius));
  float z = g * uPointerAmp;
  y += g * uPointerAmp * 0.3 * n;

  vOrder = order;
  // per-vertex light: noise breathes, the brand seam glows faintly at x = 0
  vShade = (0.72 + 0.28 * n) * (1.0 + exp(-(x * x) / 0.5) * uSeamBoost);
  vEdge = 1.0 - smoothstep(uSpanX * 0.7, uSpanX, abs(x));

  gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, z, 1.0);
}
`

export const waveFrag = /* glsl */ `
uniform float uOpacity;
varying float vOrder;
varying float vShade;
varying float vEdge;

void main() {
  // graphite threads on the idea side, soft teal-white where they run straight
  vec3 chaos = vec3(0.4, 0.43, 0.42);
  vec3 order = vec3(0.62, 0.93, 0.87);
  vec3 color = mix(chaos, order, smoothstep(0.25, 1.0, vOrder));
  float a = uOpacity * vEdge * (0.2 + 0.4 * vOrder) * vShade;
  gl_FragColor = vec4(color * vShade, a);
}
`
