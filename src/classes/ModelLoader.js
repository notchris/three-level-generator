import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader';
import Models from '../../data/Models.json';

export default class ModelLoader {
    constructor (renderer) {
        let index = 0;
        this.files = Models;
        this.models = [];
        let objLoader = new OBJLoader();
        const loadNextFile = () => {
          if (index > this.files.length - 1) {
              console.log('completed loading models')
              renderer.parseMap(renderer.map)
              return;
          }
          objLoader.load(`../../src/assets/models/${this.files[index]}`, (object) => {
            object.name = this.files[index];
            this.models.push(object);
            index++;
            loadNextFile();
          });
        }
        loadNextFile();
        return this;
    }
}