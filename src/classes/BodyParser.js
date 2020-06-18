import * as CANNON from 'cannon-es';
import { threeToCannon } from 'three-to-cannon';

export default class BodyParser {
    constructor (world, meshlist) {
        const bodies = [];
        meshlist.forEach((mesh) => {
            const shape = threeToCannon(mesh, { type: threeToCannon.Type.MESH});
            const body = new CANNON.Body({ mass: 0 });
            body.addShape(shape);
            world.addBody(body);
            body.position.copy(mesh.position);
            body.quaternion.copy(mesh.quaternion);
            if (mesh.isModel) {
                body.isModel = true;
            }
            bodies.push(body);
        })
        return bodies;
    }
}