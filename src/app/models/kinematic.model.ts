import { MicroController } from "./hardware.model";


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
  type: string;

  constructor(id: string, name: string, angle: number, type: string) {
    this.id = id;
    this.name = name;
    this.angle = angle;
    this.type = type;
  }
}

export class Joint {
  id: string;
  name: string;
  type: string;
  modelType: number;
  active: boolean;
  grounded: boolean;
  control: MicroController;
  motor: number;
  object3D = new Object3D();
  selected = false;
  connectors: Array<ConnectorGroup> = [];

  constructor(id:string, name: string, model: Model, id_list: Array<string>) {
    this.id = id;
    this.name = name;
    this.type = model.type;
    this.modelType = model.modelType;
    this.active = model.active;
    this.grounded = false;
    this.object3D.objectUrls = model.objectUrls;
    this.object3D.color = model.color;

    if (model.type === 'motor' || model.type === 'joint') {
      const connectorGroupX = new ConnectorGroup('X', true);
      // const X_connector_a = new Connector(id_list[0], 'point 1', 0, 'i');
      // const X_connector_b = new Connector(id_list[1], 'point 2', 90, 'o');
      // connectorGroupX.points.push(X_connector_a, X_connector_b);
      connectorGroupX.limit = model.type === 'motor' ? 6 : 3;
      this.connectors.push(connectorGroupX);

      const connectorGroupZ = new ConnectorGroup('Z', true);
      const Z_connector_a = new Connector(id_list[2], 'point 1', 0, 't');
      const Z_connector_b = new Connector(id_list[3], 'point 2', 0, 'b');
      connectorGroupZ.limit = 2;
      connectorGroupZ.points.push(Z_connector_a, Z_connector_b);

      this.connectors.push(connectorGroupZ);
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
