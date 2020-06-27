import * as THREE from "three";
import OrbitControls from 'orbit-controls-es6';
import { ThreeBSP } from 'three-js-csg-es6'
require('./LevelGen');

export default class Render {
    constructor () {
      this.el = document.querySelector('.renderer');
      this.bbox = this.el.getBoundingClientRect();
      this.group = new THREE.Object3D();
      this.level = window.level;
      this.update = this.update.bind(this);
      this.init();
      this.update();
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
      this.camera = new THREE.PerspectiveCamera(40, this.bbox.width / this.bbox.height, 0.1, 1000);
      this.camera.position.set(40, 40, 40);

      /** Controls */
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);

  
  
      /** Ambient Light */
      this.scene.add(new THREE.AmbientLight(0x222222, 1));
      this.light = new THREE.DirectionalLight(0xffffff, 0.7);
      this.light.position.set(20, 100, 0);
      this.light.castShadow = true;
      this.light.shadow.camera.left = -this.size;
      this.light.shadow.camera.right = this.size;
      this.light.shadow.camera.top = 100;
      this.light.shadow.camera.bottom = -100;
      this.light.shadow.camera.far = 10000;
      this.light.shadow.camera.near = 1;
      this.light.shadow.camera.bias = -0.0005;
      this.scene.add(this.light);

      /** Parse Level */
      const group = new THREE.Object3D();
      this.parseLevel(group);
      this.scene.add(group);
     
  
    }

    parseLevel(group) {
      let i, len, o;
    
      const ref = this.level.objects
      const results = [];

      // Tunnel
      const material_tunnel = new THREE.MeshPhongMaterial({color: 0x333333})
      const material_tunnel_keep = new THREE.MeshPhongMaterial({color: 0x333333})
      // Room
      const material_room = new THREE.MeshPhongMaterial({color: 0x999999})
      const material_room_prefab = new THREE.MeshPhongMaterial({color: 'hotpink'})
      // Door
      const material_door = new THREE.MeshPhongMaterial({color: 0xFF0000})
      const material_door_keep = new THREE.MeshPhongMaterial({color: 0x00FF00})
      // Anterome
      const material_anterome = new THREE.MeshPhongMaterial({color: 'hotpink'})
      const material_anterome_keep = new THREE.MeshPhongMaterial({color: 'dodgerblue'})

      for (i = 0, len = ref.length; i < len; i += 1) {
        o = ref[i]
        let depth = o.height;
        let width = o.width;
        let height = 8;
        let material;
        if (o.type === 'door') {
          if (!o.KEEP) {
            material = material_door;

          } else {
            material = material_door_keep;
          }
        } else if (o.type === 'room') {
          height = 16;
          if (o.prefab) {
            material = material_room_prefab;
          } else {
            material = material_room;
          }
        } else if (o.type === 'anteroom') {
          height = 16;
          if (o.KEEP) {
            material = material_anterome_keep;
          } else {
            material = material_anterome;
          }
        } else if (o.type === 'tunnel') {
          if (o.KEEP) {
            material = material_tunnel_keep;

          } else {
            material = material_tunnel;
          }
        }

        if (o.type === 'room' || o.type === 'anteroom'){
          const a = new THREE.BoxGeometry(width, height, depth);
          const b = new THREE.BoxGeometry(width, height, depth);
          b.scale(0.9, 0.9, 0.9);
          b.translate(0, 1, 0)
          const aBSP = new ThreeBSP(a);
          const bBSP = new ThreeBSP(b);
          const sub = aBSP.subtract(bBSP);
          const newMesh = sub.toMesh();
          newMesh.geometry.translate(width/2, height/2, depth/2);
          newMesh.material = material || new THREE.MeshPhongMaterial();
          newMesh.position.set(o.x, 0, o.y);
          group.add(newMesh)
        } else {
          const g = new THREE.BoxBufferGeometry(width, height, depth);
          g.translate(width/2, height/2, depth/2);
          const mesh = new THREE.Mesh(
            g,
            material || new THREE.MeshPhongMaterial()
          )
          mesh.position.set(o.x, 0, o.y);
          group.add(mesh)
        }
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
      this.render();
    }
  
    render () {
      this.renderer.render(this.scene, this.camera);
    }
  
  }