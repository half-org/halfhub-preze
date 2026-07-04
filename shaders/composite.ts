export const compositeVert = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

/**
 * The single composite pass (FXScene/Nuke pattern): merges the current and
 * next section render targets through an angled, noise-displaced wipe
 * modulated by scroll velocity, then grades (contrast, grain, vignette) and
 * applies the global world fade (uVisible).
 */
export const compositeFrag = /* glsl */ `
uniform sampler2D tMap1;
uniform sampler2D tMap2;
uniform float uProgress;
uniform float uVelocity;
uniform float uTime;
uniform float uVisible;
uniform float uAngle;
uniform float uContrast;
uniform float uGrain;
uniform float uVignette;
uniform float uDisplace;
uniform float uSeamGlow;
uniform float uSeamWidth;
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

void main() {
  float vel = clamp(abs(uVelocity), 0.0, 1.5);

  // angled boundary, displaced by scrolling noise + scroll velocity
  float boundary = vUv.y + (vUv.x - 0.5) * uAngle;
  float n = noise(vUv * 6.0 + vec2(0.0, uTime * 0.4)) - 0.5;
  boundary += n * (uDisplace + vel * 0.12);

  // remap progress so the wipe fully clears the screen incl. margins
  float p = mix(-0.3, 1.3, uProgress);
  float m = smoothstep(p - 0.08, p + 0.08, boundary); // 1 = current, 0 = next

  // refract UVs near the seam, stronger mid-transition and at speed
  vec2 duv = vec2(n) * 0.03 * (vel + uProgress * (1.0 - uProgress) * 2.0);
  vec3 c1 = texture2D(tMap1, vUv + duv * (1.0 - m)).rgb;
  vec3 c2 = texture2D(tMap2, vUv - duv * m).rgb;
  vec3 color = mix(c2, c1, m);

  // luminous wipe front: a noisy teal seam + soft halo riding the boundary,
  // alive only mid-transition — the black between sections reads as energy
  float act = uProgress * (1.0 - uProgress) * 4.0;
  float sd = (boundary - p) / uSeamWidth;
  float core = exp(-sd * sd * 4.0);
  float halo = exp(-sd * sd * 0.3);
  float organic = 0.65 + 0.7 * noise(vUv * 9.0 + vec2(uTime * 0.6, -uTime * 0.3));
  color += vec3(0.27, 0.94, 0.85) * (core * 0.9 + halo * 0.11) * act * uSeamGlow * organic;

  // grade: contrast, animated grain, vignette
  color = (color - 0.5) * uContrast + 0.5;
  color += (hash(vUv * 917.0 + fract(uTime) * 13.0) - 0.5) * uGrain;
  float vig = 1.0 - smoothstep(1.25 - uVignette, 1.25, length((vUv - 0.5) * vec2(1.2, 1.0)) * 2.0);
  color *= vig;

  gl_FragColor = vec4(color * uVisible, 1.0);
}
`
