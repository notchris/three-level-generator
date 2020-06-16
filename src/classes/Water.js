import { Mesh, PlaneBufferGeometry } from 'three';
import ShaderToyMaterial from 'three-shadertoy-material';

export default class Water {
    constructor () {
        this.mesh = new Mesh(
            new PlaneBufferGeometry(100, 100, 10, 10),
            new ShaderToyMaterial(`
            #define NOISE fbm
            #define NUM_NOISE_OCTAVES 2
            #define SPEED 0.5
            // #define SMOOTH 1
            
            
            float hash(float n) { return fract(sin(n) * 1e4); }
            float hash(vec2 p) { return  (sin(iTime*3.0*SPEED)*0.02) + fract(1e4 * sin(17.0 * p.x + p.y * 0.1) * (0.1 + abs(sin(p.y * 13.0 + p.x)))); }
            
            float noise(float x) {
                float i = floor(x);
                float f = fract(x);
                float u = f * f * (3.0 - 2.0 * f);
                return mix(hash(i), hash(i + 1.0), u);
            }
            
            
            float noise(vec2 x) {
                vec2 i = floor(x);
                vec2 f = fract(x);
            
              // Four corners in 2D of a tile
              float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                vec2 u = f * f * (3.0 - 2.0 * f);
              return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
            }
            
            
            float noise(vec3 x) {
                const vec3 step = vec3(110, 241, 171);
            
                vec3 i = floor(x);
                vec3 f = fract(x);
                float n = dot(i, step);
            
                vec3 u = f * f * (3.0 - 2.0 * f);
                return mix(mix(mix( hash(n + dot(step, vec3(0, 0, 0))), hash(n + dot(step, vec3(1, 0, 0))), u.x),
                               mix( hash(n + dot(step, vec3(0, 1, 0))), hash(n + dot(step, vec3(1, 1, 0))), u.x), u.y),
                           mix(mix( hash(n + dot(step, vec3(0, 0, 1))), hash(n + dot(step, vec3(1, 0, 1))), u.x),
                               mix( hash(n + dot(step, vec3(0, 1, 1))), hash(n + dot(step, vec3(1, 1, 1))), u.x), u.y), u.z);
            }
            
            
            float fbm(float x) {
              float v = 0.0;
              float a = 0.5;
              float shift = float(100);
              for (int i = 0; i < NUM_NOISE_OCTAVES; ++i) {
                v += a * noise(x);
                x = x * 2.0 + shift;
                a *= 0.5;
              }
              return v;
            }
            
            
            float fbm(vec2 x) {
              float v = 0.0;
              float a = 0.5;
              vec2 shift = vec2(100);
                mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
              for (int i = 0; i < NUM_NOISE_OCTAVES; ++i) {
                v += a * noise(x);
                x = rot * x * 2.0 + shift;
                a *= 0.5;
              }
              return v;
            }
            
            
            float fbm(vec3 x) {
              float v = 0.0;
              float a = 0.5;
              vec3 shift = vec3(100);
              for (int i = 0; i < NUM_NOISE_OCTAVES; ++i) {
                v += a * noise(x);
                x = x * 2.0 + shift;
                a *= 0.5;
              }
              return v;
            }
            
            
            void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
                vec2 coord = fragCoord.xy * 0.05 - vec2(iTime * 0.5, iResolution.y / 2.0);
                float speed = 0.1*SPEED;
                float limit = 0.1;
                float border = 0.005;
                float c = NOISE(coord - speed*iTime ) * NOISE(coord + speed*iTime );
                //vec3 color = vec3(c, c, c);
                vec3 color = vec3(step(limit-border,c), step(limit, c), 1);
                color = vec3(c, c, 1.0);
                fragColor.rgb = clamp(color, 0.0, 2.0);
            }
            `)
          )
          this.mesh.geometry.rotateX(-Math.PI * 0.5);
          this.mesh.position.y -= 0.1;
          return this.mesh;
    }
}