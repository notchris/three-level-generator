import { Sphere, Body } from 'cannon-es';
import { SphereBufferGeometry, MeshPhongMaterial, Mesh } from 'three';

export default class GolfBall {
    constructor (size, spawn) {
        this.size = size;
        this.spawn = spawn;
        this.moving = false;

        //this.physics = new Material();
        const shape = new Sphere(this.size);
        this.body = new Body({ mass: 3 });
        this.body.addShape(shape);


        // Mesh
        this.mesh = new Mesh(
            new SphereBufferGeometry(this.size, 32, 32),
            new MeshPhongMaterial({
                color: '#F1F1F1',
                flatShading: true
            })
        );
        this.mesh.castShadow = true;
        this.mesh.geometry.computeBoundingBox();

        this.setSpawn();

        return this;
    }

    setSpawn () {
        this.body.position.copy(this.spawn);
        this.body.velocity.set(0,0,0);
        this.body.angularVelocity.set(0,0,0);
        this.body.linearDamping = 0.9;
        this.mesh.position.copy(this.spawn);
    }

    hit (direction, force) {
        if (this.moving) return;
        this.body.velocity.set(direction.x * force / 2, 0, direction.z * force / 2);
    }
}