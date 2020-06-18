import './assets/css/style.css';
import * as THREE from "three";
import * as CANNON from 'cannon-es';
import OrbitControls from 'orbit-controls-es6';
import InfiniteGridHelper from './classes/InfiniteGridHelper';
import { Sky } from 'three/examples/jsm/objects/Sky';
import Polygon from 'polygon';
import Block from './classes/Block';
import ModelLoader from './classes/ModelLoader';
import BodyParser from './classes/BodyParser';
import GolfBall from './classes/GolfBall';
import debug from 'cannon-es-debugger'

// JSON
import Map from '../Map.json';

// Textures
let fairway = new THREE.TextureLoader().load(require('./assets/textures/fairway.png'));
fairway.wrapS = fairway.wrapT = THREE.RepeatWrapping;
fairway.repeat.set(1, 1);

let fontLoader = new THREE.FontLoader();

class Render {
  constructor (el) {
    this.el = document.querySelector('.renderer');
    this.bbox = this.el.getBoundingClientRect();
    this.map = Map;
    this.modelLoader = null;
    this.dir = new THREE.Vector3();
    this.sph = new THREE.Spherical();
    this.spawn = new THREE.Vector3()
    this.group = new THREE.Group();
    this.meshList = [];
    this.bodyList = [];
    this.pathList = [];

    this.mouse = new THREE.Vector2();
    this.raycaster = new THREE.Raycaster();
    this.tempDir = new THREE.Vector3();
    this.lastDirection = null;

    this.debug = false;
    this.update = this.update.bind(this);
    this.init();
  }

  init () {
    /** Renderer */
    this.clock = new THREE.Clock();
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

    /** Controls */
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.addEventListener('change', () => {
      this.setCompass();
    });

    this.camera.position.set(40, 80, 40);
    this.controls.target.set(40, 0, 40);
    this.controls.update()

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

    /* Init physics world */
    this.world = new CANNON.World();
    this.world.gravity.set(0,-60,0);
    this.world.broadphase = new CANNON.NaiveBroadphase()
    this.world.solver.iterations = 10;

    /* Set mousemove listener */
    this.el.addEventListener('mousemove', (event) => {
      this.mouse.set(
          (event.clientX / window.innerWidth) * 2 - 1,
          -(event.clientY / window.innerHeight) * 2 + 1
      );
    });
    /* Set mousemove listener */
    this.el.addEventListener('click', (event) => {
      this.lastDirection = new THREE.Vector3().copy(this.tempDir);
      this.ball.hit(this.lastDirection, 60);
    });

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

  setCompass () {
    document.querySelector('#compass').style.transform = `rotate(${THREE.Math.radToDeg(this.sph.theta) - 180}deg)`;
  }

  parseMeta (map) {
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
  }

  setBounds (map) {
    let edges = new THREE.EdgesGeometry(new THREE.PlaneBufferGeometry(map.width, map.height));
    let bounds = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff0000 }));
    bounds.rotation.x = -Math.PI * 0.5;
    bounds.position.x += map.width / 2;
    bounds.position.z += map.height / 2;
    this.group.add(bounds);
  }

  parseEntities (entities) {
    entities.forEach((entity) => {
      let mesh;
      let props = {};
      entity.properties = entity.properties || [];
      entity.properties.forEach((p) => { props[p.name] = p.value; })

      switch (entity.name) {
        case 'Tee':
          this.spawn = new THREE.Vector3(entity.x / 30, props.position_y || 10, entity.y / 30)
          break;
        case 'Hole':
          mesh = new THREE.Mesh(
            new THREE.BoxBufferGeometry(1,1,1),
            new THREE.MeshBasicMaterial({
              color: 'red'
            })
          )
          this.group.add(mesh);
          mesh.position.set(entity.x / 30, props.position_y || 1, entity.y / 30);
          mesh.geometry.translate(0, 0.5, 0);
          break;
        case 'Sign':
          mesh = new THREE.Mesh(
            new THREE.BufferGeometry().copy(this.modelLoader.models.filter((obj) => obj.name === 'sign.obj')[0].children[0].geometry),
            new THREE.MeshPhongMaterial({ color: '#EEEEEE' })
          )
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.group.add(mesh);
          mesh.position.set(entity.x / 30, props.position_y || 1, entity.y / 30);
          mesh.geometry.translate(0, 0.5, 0);
          mesh.rotation.copy(new THREE.Euler(0, -Math.PI / 2, 0));
          break;
        default:
          break;
      }
    })
  }

  parsePaths (paths) {
    paths.forEach((path) => {

      let props = {};
      path.properties = path.properties || [];
      path.properties.forEach((p) => { props[p.name] = p.value; })

      let h = props.height || 1;
      let geometry = new THREE.BoxBufferGeometry(path.width / 30, h, path.height / 30);
      let material = this.createShader((path.width / 30) / 4, (path.height / 30) / 4);
      let mesh = new THREE.Mesh(geometry, material);
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.position.set(path.x / 30, 0, path.y / 30)
      mesh.position.x += (path.width / 30) / 2;
      mesh.position.z += (path.height / 30) / 2;
      mesh.position.y += h/2;
      this.group.add(mesh);
      this.meshList.push(mesh);
      this.pathList.push(mesh)
    });
  }

  parseBlocks (blocks) {
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
      this.meshList.push(b.object);
    });

  }

  parseWalls (walls) {
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
        this.meshList.push(mesh);
        //mesh.rotation.z -= Math.PI;
      }
    });
  }

  parseModels (models) {
    models.forEach((model) => {
      // Properties
      let file = 'bush_1.obj';
      let direction = 'e';

      let prop_file = model.properties.filter((p) => p.name === 'file')[0];
      if (prop_file) {
        file = prop_file.value;
      }
      // Direction
      let prop_direction = model.properties.filter((p) => p.name === 'direction')[0];
      if (prop_direction) {
        direction = prop_direction.value;
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


      switch (direction) {
        case 'e':
          m.rotation.copy(new THREE.Euler(0, Math.PI, 0))
          break;
        case 'w':
          m.rotation.copy(new THREE.Euler(0, 0, 0))
          break;
        case 's':
          m.rotation.copy(new THREE.Euler(0, Math.PI / 2, 0))
          break;
        case 'n':
          m.rotation.copy(new THREE.Euler(0, -Math.PI / 2, 0))
          break;
        default:
          break;
      }


      this.group.add(m);
      this.meshList.push(m);
    });
  }

  parseMap (map) {
    /** Info */
    this.parseMeta(map);

    /** Bounds */
    this.setBounds(map);

    /** Entities */
    let entities = map.layers.filter((l) => l.name === 'Entities')
    if (entities.length) {
      this.parseEntities(entities[0].objects)
    }

    /** Paths */
    let paths = map.layers.filter((l) => l.name === 'Paths')
    if (paths.length) {
      this.parsePaths(paths[0].objects);
    }

    /** Blocks */
    let blocks = map.layers.filter((l) => l.name === 'Blocks')
    if (blocks.length) {
      this.parseBlocks(blocks[0].objects);
    }

    /** Walls */
    let walls = map.layers.filter((l) => l.name === 'Walls')
    if (walls.length) {
      this.parseWalls(walls[0].objects);
    }

    /** Models */
    let models = map.layers.filter((l) => l.name === 'Models')
    if (models.length) {
      this.parseModels(models[0].objects);
    }

    /** Add Group to Scene and Offset */
    this.scene.add(this.group);
    //this.group.translateX(-40);
    //this.group.translateZ(-40);

    this.ball = new GolfBall(0.5, new THREE.Vector3(this.spawn.x, 10, this.spawn.z));
    this.scene.add(this.ball.mesh);
    this.world.addBody(this.ball.body);
    this.bodyList = new BodyParser(this.world, this.meshList);

    /** Physics debug */
    document.querySelector('#debug').addEventListener('click', () => {
      this.debug = !this.debug;
    })
    debug(this.scene, this.world.bodies, {
      onUpdate: (body, mesh, shape) => {
        if (this.debug) {
          mesh.material.wireframe = true;
        } else {
          mesh.material.wireframe = false;
        }
      }
    });

    /** Start render */
    this.update();

  }

  rayCast () {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    let intersects = this.raycaster.intersectObjects(this.pathList);
    if (intersects.length > 0) {
        let v = new THREE.Vector3().copy(intersects[0].point).add(intersects[0].face.normal);
        this.updateArrow(v);
    }
  }

  updateArrow (target) {
    if (this.arrowHelper) {
        this.scene.remove(this.arrowHelper);
        this.arrowHelper = null;
    }
    if (!this.ball || this.ball.moving) return;
    
    target.y = this.ball.mesh.position.y;
    this.tempDir = new THREE.Vector3();
    this.tempDir.subVectors(target, this.ball.mesh.position).normalize();
    // Hide arrow if ball moving
    this.arrowHelper = new THREE.ArrowHelper(
        this.tempDir,
        new THREE.Vector3().copy(this.ball.mesh.position),
        4,
        0xff0000,
        0.5,
        0.5
    );
    this.scene.add(this.arrowHelper);
}

  updatePhysics () {
    if (this.clock) {
        this.world.step(1.0 / 60.0, this.clock.elapsedTime, 3);
        this.ball.mesh.position.copy(this.ball.body.position);
        this.ball.mesh.quaternion.copy(this.ball.body.quaternion);

        this.meshList.forEach((m, i) => {
            m.position.copy(this.bodyList[i].position);
            m.quaternion.copy(this.bodyList[i].quaternion);
        });
    }
 }

  resize () {
    this.bbox = this.el.getBoundingClientRect();
    this.camera.aspect = this.bbox.width / this.bbox.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.bbox.width, this.bbox.height);
  }
  

  update (timestamp) {
    requestAnimationFrame(() => this.update());
    this.rayCast();
    this.updatePhysics();
    this.camera.getWorldDirection(this.dir);
    this.sph.setFromVector3(this.dir);
    this.render();
  }

  render () {
    this.renderer.render(this.scene, this.camera);
  }

}

new Render();
