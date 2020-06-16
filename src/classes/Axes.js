import { AxesHelper } from 'three';

export default class Axes {
    constructor (scene, size) {
        this.scene = scene;
        this.size = size;
        this.helper = new AxesHelper(this.size);
        this.helper.position.y = 0.1;
        this.scene.add(this.helper);
        return this;
    }

    update (size) {
        this.scene.remove(this.helper);
        this.helper = null;
        this.size = size;
        this.helper = new AxesHelper(this.size);
        this.helper.position.y = 0.1;
        this.scene.add(this.helper);
    }
}