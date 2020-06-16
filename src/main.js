import './assets/css/style.css';
import * as THREE from "three";
import OrbitControls from 'orbit-controls-es6';
import InfiniteGridHelper from './classes/InfiniteGridHelper';
import { Sky } from 'three/examples/jsm/objects/Sky';
import Polygon from 'polygon';
import Block from './classes/Block';
import ModelLoader from './classes/ModelLoader';

// JSON
import Map from '../Map.json';

// Textures
let fairway = new THREE.TextureLoader().load(require('./assets/textures/fairway.png'));
fairway.wrapS = fairway.wrapT = THREE.RepeatWrapping;
fairway.repeat.set(1, 1);

class Render {
  constructor (el) {
    this.el = document.querySelector('.renderer');
    this.bbox = this.el.getBoundingClientRect();
    this.map = Map;
    this.modelLoader = null;
    this.dir = new THREE.Vector3();
    this.sph = new THREE.Spherical();
    this.group = new THREE.Group();
    this.update = this.update.bind(this);
    this.init();
  }

  init () {
    /** Renderer */
    this.renderer = new THREE.WebGLRenderer({
      antialias: true
    });
    this.renderer.setSize(this.bbox.width, this.bbox.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.width = 1024;
    this.renderer.shadowMap.height = 1024;
    this.el.appendChild(this.renderer.domElement);

    /** Watch renderer resize */
    const Observer = new ResizeObserver(() => {
      this.resize()
    });
    Observer.observe(this.el);

    /** Scene */
    this.scene = new THREE.Scene();
    //this.scene.fog = new THREE.FogExp2(0xFFFFFF, 0.03);

    /** Camera */
    this.camera = new THREE.PerspectiveCamera(40, this.bbox.width / this.bbox.height, 1, 10000);
    this.camera.position.set(0, 80, 40);

    /** Controls */
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('change', () => {
      this.update();
    });

    /** Lights */
    this.scene.add(new THREE.AmbientLight(0x222222, 1));
    this.light = new THREE.DirectionalLight(0xffffff, 0.7);
    this.light.position.set(40, 80, 40);
    this.light.position.multiplyScalar(1.5);
    this.light.castShadow = true;
    this.light.shadow.camera.left = -50;
    this.light.shadow.camera.right = 50;
    this.light.shadow.camera.top = 50;
    this.light.shadow.camera.bottom = -50;
    this.light.shadow.camera.far = 1000;
    this.scene.add(this.light);

    /** Sky */
    const sky = new Sky();
    sky.scale.setScalar( 45000 );
    this.scene.add(sky);
    let effectController = {
      turbidity: 10,
      rayleigh: 2,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.8,
      luminance: 0.9,
      inclination: 0.4, // elevation / inclination
      azimuth: 0.25, // Facing front,
      sun: ! true
    };
    let uniforms = sky.material.uniforms;
    uniforms[ "turbidity" ].value = effectController.turbidity;
    uniforms[ "rayleigh" ].value = effectController.rayleigh;
    uniforms[ "luminance" ].value = effectController.luminance;
    uniforms[ "mieCoefficient" ].value = effectController.mieCoefficient;
    uniforms[ "mieDirectionalG" ].value = effectController.mieDirectionalG;
    uniforms[ "sunPosition" ].value.set(40000, 40000, 40000);

    /** Grid */
    this.grid = new InfiniteGridHelper(this.scene, 1, 10);
    this.grid.mesh.position.y = -0.05;

    /* Load Models */
    this.modelLoader = new ModelLoader(this);

  }

  createShader (scaleX, scaleY) {
      let shaderMaterial = null;
      let material = new THREE.MeshPhongMaterial({
        color: 'white',
        flatShading: true
      });

      material.onBeforeCompile = shader => {
        // Textures
        shader.uniforms.textureFairway = { type: "t", value: fairway };
        shader.uniforms.scaleX = { value: scaleX };
        shader.uniforms.scaleY = { value: scaleY }

        // Vertex Shader
        shader.vertexShader = shader.vertexShader.replace(
            `#include <common>`,
            `
        #include <common>
        varying vec2 vUV;
        `
        );
        shader.vertexShader = shader.vertexShader.replace(
            `#include <begin_vertex>`,
            `
        #include <begin_vertex>
        vUV = uv;
        `
        );

        // Fragment Shader
        shader.fragmentShader = shader.fragmentShader.replace(
            `#include <common>`,
            `
        #include <common>
        uniform sampler2D textureFairway;
        uniform float scaleX;
        uniform float scaleY;
        varying vec2 vUV;
        `
        );
        shader.fragmentShader = shader.fragmentShader.replace(
            `gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,
            `
            vec2 uv_coord = vUV;
            uv_coord.x *= scaleX;
            uv_coord.y *= scaleY;
            gl_FragColor = vec4( outgoingLight, diffuseColor.a ) * texture2D( textureFairway, uv_coord );
            `
        );

        shaderMaterial = shader;
    }
    return material;
  }

  parseMap (map) {
    /** Info */
    console.log(map)
    let info = document.querySelector('#info');
    let title = map.properties.filter((p) => p.name === 'title')[0].value;
    let par = map.properties.filter((p) => p.name === 'par')[0].value;
    let hole = map.properties.filter((p) => p.name === 'hole')[0].value;
    info.innerHTML = `
      <div><span>Map: ${title}</span></div>
      <div><span>Hole: ${hole}</span></div>
      <div><span>Par: ${par}</span></div>
    `

    /** Bounds */
    let edges = new THREE.EdgesGeometry(new THREE.PlaneBufferGeometry(map.width, map.height));
    let bounds = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    bounds.rotation.x = -Math.PI * 0.5;
    bounds.position.x += map.width / 2;
    bounds.position.z += map.height / 2;

    this.group.add(bounds);

    /** Entities */
    let entities = map.layers.filter((l) => l.name === 'Entities')[0].objects;

    entities.forEach((entity) => {
      let mesh;
      let y = 1;
      let prop;
      switch (entity.name) {
        case 'Tee':
          prop = entity.properties.filter((p) => p.name === 'position_y')[0];
          if (prop) {
            y = prop.value;
          }
          mesh = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1,1,1),
            new THREE.MeshBasicMaterial({
              color: 'limegreen'
            })
          )
          this.group.add(mesh);
          mesh.position.set(entity.x / 30, y, entity.y / 30);
          mesh.geometry.translate(0, 0.5, 0);
          break;
        case 'Hole':
          prop = entity.properties.filter((p) => p.name === 'position_y')[0];
          if (prop) {
            y = prop.value;
          }
          mesh = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1,1,1),
            new THREE.MeshBasicMaterial({
              color: 'red'
            })
          )
          this.group.add(mesh);
          mesh.position.set(entity.x / 30, y, entity.y / 30);
          mesh.geometry.translate(0, 0.5, 0);
          break;
        default:
          break;
      }
    })

    /** Paths */
    let paths = map.layers.filter((l) => l.name === 'Paths')[0].objects;
    paths.forEach((path) => {
      let h = 1;
      let prop_height = path.properties.filter((p) => p.name === 'height')[0];
      if (prop_height) {
        h = prop_height.value;
      }
      let geometry = new THREE.BoxBufferGeometry(path.width / 30, h, path.height / 30);
      geometry.translate(0, h/2, 0);
      let material = this.createShader((path.width / 30) / 4, (path.height / 30) / 4);
      let mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.position.set(path.x / 30, 0, path.y / 30)
      mesh.position.x += (path.width / 30) / 2;
      mesh.position.z += (path.height / 30) / 2;

      this.group.add(mesh);
    });

    /** Blocks */
    let blocks = map.layers.filter((l) => l.name === 'Blocks')[0].objects;
    blocks.forEach((block) => {
      let type = 'cube';
      let direction = 'e';

      // Type
      let prop_type = block.properties.filter((p) => p.name === 'type')[0];
      if (prop_type) {
        type = prop_type.value;
      }
      // Direction
      let prop_direction = block.properties.filter((p) => p.name === 'direction')[0];
      if (prop_direction) {
        direction = prop_direction.value;
      }
      let b = new Block(this.group, type, null);
      b.object.position.set(block.x / 30, 2, block.y / 30);
      b.object.position.x += 1;
      b.object.position.z += 1;

      switch (direction) {
        case 'e':
          b.object.rotation.copy(new THREE.Euler(0, Math.PI, 0))
          break;
        case 'w':
          b.object.rotation.copy(new THREE.Euler(0, 0, 0))
          break;
        case 's':
          b.object.rotation.copy(new THREE.Euler(0, Math.PI / 2, 0))
          break;
        case 'n':
          b.object.rotation.copy(new THREE.Euler(0, -Math.PI / 2, 0))
          break;
        default:
          break;
      }
    });

    /** Walls */
    let walls = map.layers.filter((l) => l.name === 'Walls')[0].objects;
    walls.forEach((wall) => {
      if (!wall.polygon) {
        let geometry = new THREE.BoxBufferGeometry(wall.width / 30, 2, wall.height / 30);
        let mesh = new THREE.Mesh(geometry, new THREE.MeshPhongMaterial({color: 'gray'}))
        this.group.add(mesh);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        mesh.geometry.translate(0, 1, 0)
        mesh.position.set(wall.x / 30, 0, wall.y / 30)
        mesh.position.x += (wall.width / 30) / 2;
        mesh.position.z += (wall.height / 30) / 2;
      } else {
        let points = wall.polygon;
        let poly = new Polygon(points.map((p) => [p.x, p.y]));
        let shape = new THREE.Shape();
        shape.moveTo(points[0].x / 30, points[0].y / 30);
        for (let i = 1; i < points.length; i += 1) {
          shape.lineTo(points[i].x / 30, points[i].y / 30);
        }
        shape.lineTo(points[0].x / 30, points[0].y / 30);
        let extrudeSettings = {
          steps: 2,
          depth: 2,
          bevelEnabled: false,
          bevelThickness: 0,
          bevelSize: 0,
          bevelOffset: 0,
          bevelSegments: 0
        };
        let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        let material = new THREE.MeshPhongMaterial({color: 'gray'});
        let mesh = new THREE.Mesh( geometry, material ) ;
        this.group.add(mesh);
        mesh.rotation.x += Math.PI * 0.5;
        mesh.position.set(wall.x / 30, 0, wall.y / 30)
        mesh.position.y += 2
        //mesh.rotation.z -= Math.PI;
      }
    });

    /** Models */
    let models = map.layers.filter((l) => l.name === 'Models')[0].objects;
    models.forEach((model) => {
      // Type
      let file = 'bush_1.obj';
      let prop_file = model.properties.filter((p) => p.name === 'file')[0];
      if (prop_file) {
        file = prop_file.value;
      }
      let m = new THREE.Mesh(
        new THREE.BufferGeometry().copy(this.modelLoader.models.filter((obj) => obj.name === file)[0].children[0].geometry),
        new THREE.MeshPhongMaterial({ color: 'hotpink' })
      )
      m.castShadow = true;
      m.receiveShadow = true;
      m.position.set(model.x / 30, 0, model.y / 30);
      m.position.y = 1;
      m.geometry.translate(0, 0.5, 0)
      this.group.add(m);
    });

    /** All Models */
    /*let modelGroup = new THREE.Group();
    let i,m,temparray,chunk = 10;
    for (i=0,m=this.modelLoader.models.length; i<m; i+=chunk) {
        temparray = this.modelLoader.models.slice(i,i+chunk);
        for (let t = 0; t < temparray.length; t += 1) {
          let m = new THREE.Mesh(
            new THREE.BufferGeometry().copy(temparray[t].children[0].geometry),
            new THREE.MeshPhongMaterial({ color: `#${Math.floor(Math.random()*16777215).toString(16)}` })
          )
          m.castShadow = true;
          m.receiveShadow = true;
          m.position.set((t * 10) + 1, 0, i);
          m.position.y = 1;
          m.geometry.translate(0, 0.5, 0)
          modelGroup.add(m);
        }
    }
    this.group.add(modelGroup);
    modelGroup.translateZ(12);
    */

    /** Add Group to Scene and Offset */
    this.scene.add(this.group);
    this.group.translateX(-40);
    this.group.translateZ(-40);

    /** Update */
    window.setTimeout(() => {
      this.update();
    }, 500)
  }

  resize () {
    this.bbox = this.el.getBoundingClientRect();
    this.camera.aspect = this.bbox.width / this.bbox.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.bbox.width, this.bbox.height);
    this.update();
  }

  update (timestamp) {
    this.renderer.render(this.scene, this.camera);
    this.camera.getWorldDirection(this.dir);
    this.sph.setFromVector3(this.dir);
    document.querySelector('#compass').style.transform = `rotate(${THREE.Math.radToDeg(this.sph.theta) - 180}deg)`;
  }

}

new Render();
