// =====================================================================
// SHADER EFFECTS (WebGL only; the game still runs without them on canvas).
//
// Grade    : runs over the whole game camera. Cool shadows, warm highlights,
//            film grain, vignette, the grey cold look of Foresight, and a short
//            colour-split shudder when a damage tick lands.
// Dissolve : runs over the player's sprite only. While you burn, ember-edged
//            holes eat into the silhouette from its outline inward, and grow as
//            Substance drops. At death it eats the whole body.
//
// Why shaders: these are per-pixel effects. Faking them with sprites looks
// cheap; in a shader they cost almost nothing.
// =====================================================================

import Phaser from 'phaser';

const NOISE = `
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
`;

const GRADE_FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
uniform vec2 uResolution;
uniform float uTime;
uniform float uDesat;     // 0..1 Foresight
uniform float uShock;     // 0..1 damage tick colour split
uniform float uVig;       // vignette strength
uniform float uGrain;
uniform vec3 uShadowTint;
uniform vec3 uHighTint;
${NOISE}
void main() {
  vec2 uv = outTexCoord;
  vec2 off = vec2(uShock * 3.0 / uResolution.x, 0.0);
  vec4 c = texture2D(uMainSampler, uv);
  vec3 col = c.rgb;
  if (uShock > 0.001) {
    col.r = texture2D(uMainSampler, uv + off).r;
    col.b = texture2D(uMainSampler, uv - off).b;
  }
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  // split toning: tint the darks cool and the lights warm
  col = mix(col, col * uShadowTint, (1.0 - smoothstep(0.0, 0.45, l)) * 0.55);
  col = mix(col, col * uHighTint, smoothstep(0.45, 1.0, l) * 0.35);
  // Foresight: cold, nearly grey
  vec3 grey = vec3(l) * vec3(0.82, 0.94, 1.18);
  col = mix(col, grey, uDesat);
  // vignette
  vec2 q = uv - 0.5;
  q.x *= uResolution.x / uResolution.y;
  float v = smoothstep(0.42, 1.08, length(q));
  col *= 1.0 - v * uVig;
  // film grain
  float g = hash(uv * uResolution + vec2(fract(uTime * 7.13) * 911.0, fract(uTime * 3.7) * 577.0)) - 0.5;
  col += g * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;

const DISSOLVE_FRAG = `
precision mediump float;
uniform sampler2D uMainSampler;
varying vec2 outTexCoord;
uniform vec2 uResolution;
uniform vec2 uCenter;     // the sprite's middle, in screen pixels (top-left origin)
uniform float uAmount;    // 0 = whole, 1 = gone
uniform float uBurn;      // ember-edge strength
uniform float uFlash;     // white-hot flash when a tick lands
uniform float uTime;
uniform float uScale;
${NOISE}
void main() {
  vec4 c = texture2D(uMainSampler, outTexCoord);
  if (c.a <= 0.002) { gl_FragColor = vec4(0.0); return; }
  vec2 texel = 1.0 / uResolution;
  // how close this pixel is to the outline (edges burn first)
  float a1 = texture2D(uMainSampler, outTexCoord + vec2(5.0, 0.0) * texel).a;
  float a2 = texture2D(uMainSampler, outTexCoord - vec2(5.0, 0.0) * texel).a;
  float a3 = texture2D(uMainSampler, outTexCoord + vec2(0.0, 5.0) * texel).a;
  float a4 = texture2D(uMainSampler, outTexCoord - vec2(0.0, 5.0) * texel).a;
  float rim = 1.0 - min(min(a1, a2), min(a3, a4));
  vec2 px = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y);
  vec2 local = (px - uCenter) / uScale;
  float n = fbm(local + vec2(0.0, uTime * 1.1));
  float th = uAmount + rim * 0.32 * uBurn;
  if (n < th) { gl_FragColor = vec4(0.0); return; }
  float edge = 1.0 - smoothstep(0.0, 0.16, n - th);
  vec3 ember = mix(vec3(1.0, 0.28, 0.03), vec3(1.0, 0.88, 0.5), edge * edge);
  float e = clamp(edge * uBurn * 1.2, 0.0, 1.0);
  vec3 rgb = mix(c.rgb, ember * c.a, e);
  rgb += vec3(1.0, 0.55, 0.25) * uFlash * c.a * 0.9;
  gl_FragColor = vec4(rgb, c.a);
}
`;

export class GradePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'Grade', fragShader: GRADE_FRAG });
    this.params = {
      desat: 0, shock: 0, vig: 0.55, grain: 0.035,
      shadow: [0.78, 0.86, 1.18], high: [1.12, 1.0, 0.86],
    };
  }

  onPreRender() {
    const p = this.params;
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uDesat', p.desat);
    this.set1f('uShock', p.shock);
    this.set1f('uVig', p.vig);
    this.set1f('uGrain', p.grain);
    this.set3f('uShadowTint', p.shadow[0], p.shadow[1], p.shadow[2]);
    this.set3f('uHighTint', p.high[0], p.high[1], p.high[2]);
  }
}

export class DissolvePipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  constructor(game) {
    super({ game, name: 'Dissolve', fragShader: DISSOLVE_FRAG });
    this.amount = 0;
    this.burn = 0;
    this.flash = 0;
  }

  onDraw(target) {
    const go = this.gameObject;
    if (go && go.scene) {
      // Read the camera at draw time, when it has finished moving for this frame,
      // so the burn pattern stays glued to the body instead of sliding.
      const cam = go.scene.cameras.main;
      this.set2f('uCenter', go.x - cam.worldView.x, go.y - cam.worldView.y - go.displayHeight * 0.45);
    }
    this.set2f('uResolution', this.renderer.width, this.renderer.height);
    this.set1f('uAmount', this.amount);
    this.set1f('uBurn', this.burn);
    this.set1f('uFlash', this.flash);
    this.set1f('uTime', this.game.loop.time / 1000);
    this.set1f('uScale', 9.0);
    this.bindAndDraw(target);
  }
}

// Called once at boot. Returns false on the canvas renderer.
export function registerPipelines(game) {
  const r = game.renderer;
  if (!r || !r.pipelines || game.config.renderType === Phaser.CANVAS) return false;
  r.pipelines.addPostPipeline('Grade', GradePipeline);
  r.pipelines.addPostPipeline('Dissolve', DissolvePipeline);
  return true;
}

export function hasShaders(scene) {
  return !!(scene.renderer && scene.renderer.pipelines && scene.renderer.type === Phaser.WEBGL);
}
