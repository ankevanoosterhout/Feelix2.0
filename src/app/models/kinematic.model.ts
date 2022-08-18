import { MicroController } from "./hardware.model";
import * as THREE from 'three';

export class ObjectUrl {
  url: string;
  g: string;
}

export class Model {
  id: number;
  name: string;
  active: boolean;
  type: string;
  modelType: number;
  thumbnail: string;
  objectUrls: Array<ObjectUrl>;
  color: number;

  constructor(id: number, type: string, modelType: number, active: boolean, thumbnail: string, objectUrls: Array<ObjectUrl>, color: number) {
    this.id = id;
    this.type = type;
    this.modelType = modelType;
    this.active = active;
    this.thumbnail = thumbnail;
    this.objectUrls = objectUrls;
    this.color = color;
  }
}

export class Vector3 {
  x: number = 0;
  y: number = 0;
  z: number = 0;
}

export class Object3D {
  position = new Vector3();
  rotation = new Vector3();
  objectID: number;
  objectUrls: Array<ObjectUrl> = [];
  obj: any;
  color: number;
  hidden = false;
  lock = false;
}

export class ConnectorGroup {
  axis: string;
  visible: boolean;
  points: Array<Connector> = [];
  limit: number;

  constructor(axis: string, visible: boolean) {
    this.axis = axis;
    this.visible = visible;
  }
}

export class Connector {
  id: string;
  name: string;
  angle: number;
  plane: string;
  vector3 = new THREE.Vector3(0,0,0);

  constructor(id: string, name:string, angle: number, plane: string, vector3: THREE.Vector3) {
    this.id = id;
    this.name = name;
    this.angle = angle;
    this.plane = plane;
    this.vector3 = vector3;
  }
}

export class JointLink {
  id: string;
  name: string;
  type: string;
  modelType: number;
  active: boolean;
  grounded: boolean;
  size: number;
  control: MicroController;
  motor: number;
  object3D = new Object3D();
  selected = false;
  connectors: Array<Connector> = [];

  constructor(id:string, name: string, model: Model) {
    this.id = id;
    this.name = name;
    this.type = model.type;
    this.modelType = model.modelType;
    this.active = model.active;
    this.grounded = false;
    this.object3D.objectUrls = model.objectUrls;
    this.object3D.color = model.color;


      // const Z_connector_a = new Connector(null, 'Yellow:Z:1', 0, 'Z', new THREE.Vector3(1,1,1));
      // const Z_connector_b = new Connector(null, 'Yellow:Z:-1', 0, 'Z', new THREE.Vector3(-1,-1,-1));
      const Z_connector_a = new Connector(null, 'Yellow:Z:1', 0, 'Z', new THREE.Vector3(0,0,1));
      const Z_connector_b = new Connector(null, 'Yellow:Z:-1', 0, 'Z', new THREE.Vector3(0,0,-1));

      this.connectors.push(Z_connector_a, Z_connector_b);

    if (model.type === 'arm') {
      this.size = 40;
    }
    // else if (model.type === 'cube') {
    //   this.size = 15;
    // }

    if (model.type === 'connector') {
      this.size = 15;

      const X_connector_a = new Connector(null, 'Yellow:X:1', 0, 'X', new THREE.Vector3(1,0,0));
      const X_connector_b = new Connector(null, 'Yellow:X:-1', 0, 'X', new THREE.Vector3(-1,0,0));
      const Y_connector_a = new Connector(null, 'Yellow:Y:1', 0, 'Y', new THREE.Vector3(0,1,0));
      const Y_connector_b = new Connector(null, 'Yellow:Y:-1', 0, 'Y', new THREE.Vector3(0,-1,0));

      this.connectors.push(X_connector_a, X_connector_b, Y_connector_a, Y_connector_b);
    }
  }
}

export class Arm {
  id: string;
  grounded: boolean;
  size: number = 1
  object3D = new Object3D();


  constructor(id: string) {
    this.id = id;
  }
}


// export class connectionPoint {
//   parent: any;
//   point: any;

//   constructor(parent: any, point: any) {
//     this.parent = parent;
//     this.point = point;
//   }
// }

export class Point {
  id: string;
  parent_id: string;

  constructor(parent_id: string, id: string) {
    this.id = id;
    this.parent_id = parent_id;
  }
}
