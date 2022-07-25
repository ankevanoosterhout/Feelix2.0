import { MicroController } from "./hardware.model";


export class Model {
  id: number;
  name: string;
  active: boolean;
  type: string;
  thumbnail: string;
  objectUrl: string;
  color: number;

  constructor(id: number, type: string, active: boolean, thumbnail: string, objectUrl: string, color: number) {
    this.id = id;
    this.type = type;
    this.active = active;
    this.thumbnail = thumbnail;
    this.objectUrl = objectUrl;
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
  objectUrl: string;
  obj: any;
  color: number;
  hidden = false;
  lock = false;
}

export class Joint {
  id: string;
  name: string;
  type: string;
  active: boolean;
  grounded: boolean;
  control: MicroController;
  motor: number;
  object3D = new Object3D();
  selected = false;

  constructor(id: string, name: string, type: string, active: boolean, objectUrl: string, color: number) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.active = active;
    this.grounded = false;
    this.object3D.objectUrl = objectUrl;
    this.object3D.color = color;
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
