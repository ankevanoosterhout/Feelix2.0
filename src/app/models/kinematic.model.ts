import { MicroController } from "./hardware.model";



export class Vector3 {
  x: number = 0;
  y: number = 0;
  z: number = 0;
}

export class Object3D {
  position = new Vector3();
  rotation = new Vector3();
  objectID: number;
  OBJ: any;
}

export class Joint {
  id: string;
  name: string;
  active: boolean;
  grounded: boolean;
  control: MicroController;
  motor: number;
  object3D = new Object3D();

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
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
