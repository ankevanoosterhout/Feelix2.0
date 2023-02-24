import { MicroController } from "./hardware.model";
import * as THREE from 'three';
import { Root } from "./kinematic-connections.model";
import { Dates } from "./file.model";


export enum JointType {
  revolute,
  continuous,
  prismatic,
  fixed
}

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
  origin = new Vector3();
  linkObjectUrls: Array<ObjectUrl>;
  rpy = new Vector3();
  baseSize = new ConnectorSize(1.5, 1, 25.075, 23.575, new THREE.Vector3(0,1,0));
  linkSize = new ConnectorSize(2.5, 1, 29, 26.5, new THREE.Vector3(0,1,0));
  startAngle = 0;

  constructor(id: number, type: string, active: boolean, thumbnail: string, objectUrls: Array<ObjectUrl>,
              color: number, rpy: Vector3, baseSize: ConnectorSize, linkSize: ConnectorSize, angle = 0, link = null) {
    this.id = id;
    this.type = type;
    this.active = active;
    this.thumbnail = thumbnail;
    this.objectUrls = objectUrls;
    this.color = color;
    if (link !== null) {
      this.linkObjectUrls = link;
    }
    this.rpy.x = rpy.x;
    this.rpy.y = rpy.y;
    this.rpy.z = rpy.z;
    this.startAngle = angle;
    this.baseSize = baseSize;
    this.linkSize = linkSize;
  }
}

export class Vector3 {
  x: number = 0;
  y: number = 0;
  z: number = 0;

  constructor (x: number = null, y: number = null, z: number = null) {
    if (x && y && z) {
      this.x = x;
      this.y = y;
      this.z = z;
    }
  }
}

export class Object3D {
  // position = new Vector3();
  // rotation = new Vector3();
  objectID: number;
  objectUrls: Array<ObjectUrl> = [];
  // obj: any;
  color: number;
  hidden = false;
  lock = false;
}


export class ConnectorSize {
  original: number;
  scale: number;
  value: number;
  offset: number;
  axis: Vector3;

  constructor(original: number, scale: number, value: number, offset: number, axis: THREE.Vector3) {
    this.original = original;
    this.scale = scale;
    this.value = value;
    this.offset = offset;
    this.axis = axis;
  }
}



export class Connector {
  id: string;
  connID: string;
  object: string;
  name: string;
  angle: number;
  plane: string;
  block_id: string;
  connected = false;
  size = new ConnectorSize(2.5, 1, 2.5, 26.5, new THREE.Vector3(0,1,0));
  vector3 = new THREE.Vector3(0,0,0);
  processed = false;

  constructor(id: string, name:string, angle: number, plane: string, vector3: THREE.Vector3) {
    this.id = id;
    this.name = name;
    this.angle = angle;
    this.plane = plane;
    this.vector3 = vector3;
  }
}

export class Limits {
  min: number = -1.797693134862315E+308 * 1.001;
  max: number = 1.797693134862315E+308 * 1.001;
}


export class Dimensions {
  origin = new Vector3();
  rpy = new Vector3();
}

export class JointConfig {
  active: boolean;
  grounded: boolean = false;
  control: MicroController;
  motorIndex: number;
}



export class URFD_Joint {
  id: string;
  name: string = 'joint';
  parent: URFD_Link;
  child: URFD_Link;
  type: JointType;
  dimensions = new Dimensions();
  axis = new Vector3();
  DoF: any;
  limits = new Limits();
  object3D = new Object3D();
  config = new JointConfig();
  size = new ConnectorSize(1.5, 1, 25.075, 23.575, new THREE.Vector3(0,1,0));
  angle: number;
  modelID: number;
  selected = false;

  constructor(id: string, model: Model, parent = false) {
    this.id = id;
    this.config.active = model.active;
    if (this.config.active) {
      this.name = 'actuator';
    }
    this.object3D.objectUrls = model.objectUrls;
    this.object3D.color = model.color;
    this.type = JointType.revolute;
    this.axis.z = 1;
    this.angle = model.startAngle;
    this.dimensions.origin = model.origin;
    this.dimensions.rpy = model.rpy;
    if (parent) {
      this.dimensions.rpy.z += model.startAngle;
    }

    this.size = model.baseSize;
    this.modelID = model.id;
  }
}


export class URFD_Link {
  id: string;
  name: string = 'link';
  type: JointType;
  parent: URFD_Joint;
  children: Array<any>;
  dimensions = new Dimensions();
  size = new ConnectorSize(2.5, 1, 29, 26.5, new THREE.Vector3(0,1,0));
  object3D = new Object3D();
  modelID: number;
  selected = false;

  constructor(id: string, model: Model, parent = false) {
    this.id = id;
    if (this.id.length > 43) {
      this.id.slice(0, -5);
    }
    this.object3D.objectUrls = model.linkObjectUrls;
    this.object3D.color = 0x222222;
    this.dimensions.origin = model.origin;
    this.type = JointType.revolute;
    this.dimensions.rpy = model.rpy;
    if (!parent) {
      this.dimensions.rpy.z += model.startAngle;
    }
    this.size = model.linkSize;
    this.modelID = model.id;
  }
}


export class JointLink {
  id: string;
  name: string; //move to in config
  // type: string;
  modelType: number;
  active: boolean;
  grounded: boolean;
  size: number;
  control: MicroController;
  isMotor = false;
  isJoint = false;
  motor: number;
  angle = 0;
  limits = new Limits();
  object3D = new Object3D();
  selected = false;
  connectors: Array<Connector> = [];
  sceneObject: THREE.Object3D = null;

  constructor(id:string, model: Model) {
    this.id = id;
    this.grounded = false;

    if (model) {
      this.name = model.type === 'arm' || model.type === 'connector' ? 'link' : model.type;
      // this.type = model.type;
      this.active = model.active;
      this.object3D.objectUrls = model.objectUrls;
      this.object3D.color = model.color;

        // const Z_connector_a = new Connector(null, 'Yellow:Z:1', 0, 'Z', new THREE.Vector3(1,1,1));
        // const Z_connector_b = new Connector(null, 'Yellow:Z:-1', 0, 'Z', new THREE.Vector3(-1,-1,-1));
        const Z_connector_a = new Connector(null, 'Yellow:Z:1', 0, 'Z', new THREE.Vector3(0,0,1));
        const Z_connector_b = new Connector(null, 'Yellow:Z:-1', 0, 'Z', new THREE.Vector3(0,0,-1));

        this.connectors.push(Z_connector_a, Z_connector_b);

      if (model.type === 'motor') {
        this.isMotor = true;
        this.isJoint = true;

      } else if (model.type === 'joint') {
        this.isJoint = true;

      } else if (model.type === 'arm') {
        this.size = 40;

      } else if (model.type === 'connector') {
        this.size = 15;
        const X_connector_a = new Connector(null, 'Yellow:X:1', 0, 'X', new THREE.Vector3(1,0,0));
        const X_connector_b = new Connector(null, 'Yellow:X:-1', 0, 'X', new THREE.Vector3(-1,0,0));
        const Y_connector_a = new Connector(null, 'Yellow:Y:1', 0, 'Y', new THREE.Vector3(0,1,0));
        const Y_connector_b = new Connector(null, 'Yellow:Y:-1', 0, 'Y', new THREE.Vector3(0,-1,0));

        this.connectors.push(X_connector_a, X_connector_b, Y_connector_a, Y_connector_b);
      }
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


export class Point {
  id: string;
  parent_id: string;

  constructor(parent_id: string, id: string) {
    this.id = id;
    this.parent_id = parent_id;
  }
}



export class ModelFile {
  id: string;
  name: string;
  path: string;
  softwareVersion = '2.2.1';
  date = new Dates();
  joints: Array<JointLink> = [];
  links: Array<Root> = [];
  isActive: boolean = false;
  overwrite: boolean = true;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}
