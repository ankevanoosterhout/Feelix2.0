export class KeyConstruct {
  object_id: string;
  connection_id: string;
  // axis: string;

  constructor(object_id: string, connection_id: string) {
    this.object_id = object_id;
    this.connection_id = connection_id;
    // this.axis = axis;
  }
}


export class KinematicConnection {

  key: string;
  values: Array<KeyConstruct> = [];

  constructor(key: string) {
    this.key = key;
  }
}


export class KinematicConnectionList {
  key: string;
  list: Array<KinematicConnection> = [];

  constructor(key: string) {
    this.key = key;
  }
}
