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


// export class Link {
//   id: string;
//   closure: boolean;

//   constructor(id: string, closure: boolean) {
//     this.id = id;
//     this.closure = closure;
//   }
// }


// export class KeyConstruct {
//   object_id: string;
//   link: Array<string>;
//   // axis: string;

//   constructor(object_id: string, connection_id: string) {
//     this.object_id = object_id;
//     this.connection_id = connection_id;
//     // this.axis = axis;
//   }
// }


// export class Root {

//   key: string;
//   links: Array<string> = [];
//   objects: Array<KeyConstruct> = [];

//   constructor(key: string) {
//     this.key = key;
//   }
// }


// export class Roots {
//   key: string;
//   list: Array<KinematicConnection> = [];

//   constructor(key: string) {
//     this.key = key;
//   }
// }
