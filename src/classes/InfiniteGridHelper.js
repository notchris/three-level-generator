import { Color, PlaneBufferGeometry, ShaderMaterial, DoubleSide, Mesh} from 'three';

export default class InfiniteGridHelper {
    constructor (scene, size1, size2, color, distance) {
        this.scene = scene;
        this.color = color || new Color('white');
        this.size1 = size1 || 10;
        this.size2 = size2 || 100;
        this.distance = distance || 8000;

        const geometry = new PlaneBufferGeometry(2, 2, 1, 1);
        const material = new ShaderMaterial({
            side: DoubleSide,
            uniforms: {
                uSize1: {
                    value: this.size1
                },
                uSize2: {
                    value: this.size2
                },
                uColor: {
                    value: this.color
                },
                uDistance: {
                    value: this.distance
                }
            },
            transparent: true,
            vertexShader: `
               
               varying vec3 worldPosition;
               
               uniform float uDistance;
               
               void main() {
                    vec3 pos = position.xzy * uDistance;
                    pos.xz += cameraPosition.xz;
                    worldPosition = pos;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
               }
               `,
    
            fragmentShader: `
               
               varying vec3 worldPosition;
               
               uniform float uSize1;
               uniform float uSize2;
               uniform vec3 uColor;
               uniform float uDistance;
                
                float getGrid(float size) {
                    vec2 r = worldPosition.xz / size;
                    vec2 grid = abs(fract(r - 0.5) - 0.5) / fwidth(r);
                    float line = min(grid.x, grid.y);
                    return 1.0 - min(line, 1.0);
                }
                
               void main() {
                      float d = 1.0 - min(distance(cameraPosition.xz, worldPosition.xz) / uDistance, 1.0);
                      float g1 = getGrid(uSize1);
                      float g2 = getGrid(uSize2);
                      gl_FragColor = vec4(uColor.rgb, mix(g2, g1, g1) * pow(d, 3.0));
                      gl_FragColor.a = mix(0.5 * gl_FragColor.a, gl_FragColor.a, g2);
                      if ( gl_FragColor.a <= 0.0 ) discard;
               }
               
               `,
    
            extensions: {
                derivatives: true
            }
    
        });

        this.mesh = new Mesh(geometry, material);
        this.mesh.frustumCulled = false;
        this.scene.add(this.mesh);
        return this;
    }
}