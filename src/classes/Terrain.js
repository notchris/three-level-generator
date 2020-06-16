import * as THREE from 'three';
import SimplexNoise from 'simplex-noise';

export default class Terrain {
    constructor(context) {
        this.context = context;
        this.scene = context.scene;
        this.materialShader = null;
        this.simplex = null;
        this.seed = null;

        let m = new THREE.Matrix4();
        m.makeRotationX(-Math.PI * 0.5);
        this.plane = new THREE.Plane( new THREE.Vector3( 0, 0, -1 ), 0.8 );
        this.plane.applyMatrix4(m);

        /** Textures */
        let sand = new THREE.TextureLoader().load(require('../assets/textures/sand.png'));
        let grass = new THREE.TextureLoader().load(require('../assets/textures/grass_007.png'));
        let rough = new THREE.TextureLoader().load(require('../assets/textures/gravel_001.png'));
        let stone = new THREE.TextureLoader().load(require('../assets/textures/rock_001.png'));
        let fairway = new THREE.TextureLoader().load(require('../assets/textures/fairway.png'));
        sand.wrapS = sand.wrapT = THREE.RepeatWrapping;
        sand.repeat.set(4, 4)
        //sand.minFilter = THREE.LinearFilter;
        grass.wrapS = grass.wrapT = THREE.RepeatWrapping;
        grass.repeat.set(4, 4)
        //grass.minFilter = THREE.LinearFilter;
        rough.wrapS = rough.wrapT = THREE.RepeatWrapping;
        rough.repeat.set(4, 4)
        //rough.minFilter = THREE.LinearFilter;
        stone.wrapS = stone.wrapT = THREE.RepeatWrapping;
        stone.repeat.set(4, 4)
        //stone.minFilter = THREE.LinearFilter;
        fairway.wrapS = fairway.wrapT = THREE.RepeatWrapping;
        fairway.repeat.set(4, 4)
        //fairway.minFilter = THREE.LinearFilter;

        /** Terrain Base Material */
        this.material = new THREE.MeshPhongMaterial({
            color: 'white',
            flatShading: true
        });

        /** Terrain Material Shader */
        this.material.onBeforeCompile = shader => {

            shader.uniforms.textureSand = { type: "t", value: sand };
            shader.uniforms.textureGrass = { type: "t", value: grass };
            shader.uniforms.textureRough = { type: "t", value: rough };
            shader.uniforms.textureStone = { type: "t", value: stone };
            shader.uniforms.textureFairway = { type: "t", value: fairway };

            // Vertex Shader

            shader.vertexShader = shader.vertexShader.replace(
                `#include <common>`,
                `
            #include <common>
            varying float vAmount;
            varying vec2 vUV;
            `
            );
            shader.vertexShader = shader.vertexShader.replace(
                `#include <begin_vertex>`,
                `
            #include <begin_vertex>
            vUV = uv;
            vAmount = position.z;
            `
            );

            // Fragment Shader
            shader.fragmentShader = shader.fragmentShader.replace(
                `#include <common>`,
                `
            #include <common>
            uniform sampler2D textureSand;
            uniform sampler2D textureGrass;
            uniform sampler2D textureFairway;
            uniform sampler2D textureRough;
            uniform sampler2D textureStone;
            varying vec2 vUV;
            varying float vAmount;
            `
            );
            shader.fragmentShader = shader.fragmentShader.replace(
                `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
                `
            vec4 sand = (smoothstep(-10.0, -10.0, vAmount) - smoothstep(0.0, 2.0, vAmount)) * texture2D( textureSand, vUV * 10.0 );
            vec4 stone = (smoothstep(0.0, 2.0, vAmount) - smoothstep(2.0, 4.0, vAmount)) * texture2D( textureStone, vUV * 20.0 );
            vec4 rough = (smoothstep(2.0, 4.0, vAmount) - smoothstep(4.0, 6.0, vAmount)) * texture2D( textureRough, vUV * 20.0 );
            vec4 grass = (smoothstep(4.0, 6.0, vAmount) - smoothstep(6.0, 8.0, vAmount)) * texture2D( textureGrass, vUV * 50.0 );
            vec4 fairway = (smoothstep(4.0, 6.0, vAmount) - smoothstep(6.0, 8.0, vAmount)) * texture2D( textureFairway, vUV * 20.0 );
            gl_FragColor = vec4( outgoingLight, diffuseColor.a ) * (sand + stone + rough + fairway);
            `
            );

            this.materialShader = shader;
        }

        document.querySelector('#generate').addEventListener('click', () => {
            this.generate();
        })

        return this;
    }

    raise (box) {
        let m = new THREE.Matrix4();
        m.makeRotationX(Math.PI * 0.5);
        box.applyMatrix4(m);
        for (let i = 0; i < this.geometry.vertices.length; i += 1) {
            if (box.containsPoint(this.geometry.vertices[i])) {
                this.geometry.vertices[i].z += 1;
            }
        }
        this.geometry.verticesNeedUpdate = true;
        this.geometry.uvsNeedUpdate = true;
        this.geometry.normalsNeedUpdate = true;
    }

    lower (box) {
        let m = new THREE.Matrix4();
        m.makeRotationX(Math.PI * 0.5);
        box.applyMatrix4(m);
        for (let i = 0; i < this.geometry.vertices.length; i += 1) {
            if (box.containsPoint(this.geometry.vertices[i])) {
                this.geometry.vertices[i].z -= 1;
            }
        }
        this.geometry.verticesNeedUpdate = true;
        this.geometry.uvsNeedUpdate = true;
        this.geometry.normalsNeedUpdate = true;
    }

    flatten (box) {
        let zs = []
        let is = [];
        let m = new THREE.Matrix4();
        m.makeRotationX(Math.PI * 0.5);
        box.applyMatrix4(m);
        for (let i = 0; i < this.geometry.vertices.length; i += 1) {
            if (box.containsPoint(this.geometry.vertices[i])) {
                zs.push(this.geometry.vertices[i].z)
                is.push(i);
            }
        }
        let max;

        if (this.modeArray(zs).length > 1) {
            max = Math.min(...this.modeArray(zs))
        } else {
            max = this.modeArray(zs)[0] || 0;
        }
        if (max && is.length) {
            for (let j = 0; j < is.length; j += 1) {
                this.geometry.vertices[is[j]].z = max;3
            }
        }
        this.geometry.verticesNeedUpdate = true;
        this.geometry.uvsNeedUpdate = true;
        this.geometry.normalsNeedUpdate = true;

    }

    modeArray (array) {
        if (array.length == 0) return null;
        let modeMap = {},
            maxCount = 1,
            modes = [];

        for (let i = 0; i < array.length; i++) {
            let el = array[i];

            if (modeMap[el] == null) modeMap[el] = 1;
            else modeMap[el]++;

            if (modeMap[el] > maxCount) {
                modes = [el];
                maxCount = modeMap[el];
            } else if (modeMap[el] == maxCount) {
                modes.push(el);
                maxCount = modeMap[el];
            }
        }
        return modes;
    }

    generate () {
        this.seed = Math.random();
        console.log(this.seed)
        this.simplex = new SimplexNoise(this.seed);
        if (this.wireframe) this.scene.remove(this.wireframe);
        if (this.mesh) this.scene.remove(this.mesh);
        if (this.points) this.scene.remove(this.points);

        let data = this.generateTexture();
        /** Geometry */
        
        this.geometry = new THREE.PlaneGeometry(
            data.width,
            data.height,
            data.width,
            data.height
        );

        for(let j=0; j < data.height; j += 1) {
            for (let i = 0; i < data.width; i += 1) {
                const n =  (j*(data.height) + i)
                const nn = (j*(data.height + 1) + i)
                const col = data.data[n * 4] // red
                const v1 = this.geometry.vertices[nn]
                v1.z = this.map(col,0,255,-5,5)
             }
        }

        this.geometry.verticesNeedUpdate = true
        this.geometry.uvsNeedUpdate = true;
        this.geometry.normalsNeedUpdate = true;

        /** Wirerame */
        this.wireframe = new THREE.Mesh(this.geometry, new THREE.MeshBasicMaterial({
            wireframe: true,
            transparent: true,
            opacity: 0.3,
            color: 'black'
        }))
        this.wireframe.position.y = 0.01;
        this.scene.add(this.wireframe);
        //this.wireframe.visible = false;

        this.mesh = new THREE.Mesh(
            this.geometry,
            this.material
        );
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);


        /** Points */
        this.points = new THREE.Points(this.geometry, new THREE.PointsMaterial({
            size: 0.25,
            color: "yellow"
        }));
        this.scene.add(this.points);
        this.points.visible = false;

        this.mesh.rotation.x = -Math.PI * 0.5;
        this.wireframe.rotation.x = -Math.PI * 0.5;
        this.points.rotation.x = -Math.PI * 0.5;

        let grass = 0x79b52a;
        let water = 0x2f7bba;
        let dirt = 0x5e4f3b;
        
        this.geometry.faces.forEach(f=>{
            const a = this.geometry.vertices[f.a]
            const b = this.geometry.vertices[f.b]
            const c = this.geometry.vertices[f.c]
            const avg = (a.z+b.z+c.z)/3
            if(avg < 0) {
                a.z = 0
                b.z = 0
                c.z = 0
            }
            const max = Math.max(a.z,Math.max(b.z,c.z))
            if(max <=3)   return f.color.set(water)
            if(max <=4)   return f.color.set(dirt)
            if(max <=5)   return f.color.set(grass)
        })
        
        this.geometry.colorsNeedUpdate = true
        this.geometry.verticesNeedUpdate = true
        this.geometry.computeFlatVertexNormals()

        this.context.update()

    }

    map (val, smin, smax, emin, emax) {
        const t =  (val-smin)/(smax-smin)
        return (emax-emin)*t + emin
    }

    noise (nx, ny) {
        return this.map(this.simplex.noise2D(nx,ny),-1,1,0,1);
    }

    octave(nx, ny, octaves) {
        let val = 2;
        let freq = 1;
        let max = .5;
        let amp = 2;
        for (let i = 0; i < octaves; i++) {
          val += this.noise(nx * freq, ny * freq) * amp;
          val = Math.round(val * 2) / 2
          max += amp;
          amp /= 2;
          freq *= 1;
        }
        return val / max;
      }

    generateTexture () {
        const canvas = document.getElementById('canvas')
        const c = canvas.getContext('2d')
        c.fillStyle = 'black'
        c.fillRect(0,0,canvas.width, canvas.height)
    
        for(let i = 0; i<canvas.width; i += 1) {
            for(let j=0; j < canvas.height; j += 1) {
                let v =  this.octave(i/canvas.width,j/canvas.height,16)
                const per = (100*v).toFixed(2)+'%'
                c.fillStyle = `rgb(${per},${per},${per})`
                c.fillRect(i,j,1,1)
            }
        }

        c.rect(0, 0, canvas.width, canvas.height);

        return c.getImageData(0,0,canvas.width,canvas.height);
    }

}