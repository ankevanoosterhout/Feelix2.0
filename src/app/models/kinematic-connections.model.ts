// export class KeyConstruct {
//   object_id: string;
//   connection_id: string;
//   // axis: string;

//   constructor(object_id: string, connection_id: string) {
//     this.object_id = object_id;
//     this.connection_id = connection_id;
//     // this.axis = axis;
//   }
// }


// export class KinematicConnection {

//   key: string;
//   values: Array<KeyConstruct> = [];

//   constructor(key: string) {
//     this.key = key;
//   }
// }


// export class KinematicConnectionList {
//   key: string;
//   list: Array<KinematicConnection> = [];

//   constructor(key: string) {
//     this.key = key;
//   }
// }


export class Link {
  id: string;
  connJoints: Array<string>;
  closure: boolean;


  constructor(id: string, closure: boolean, connJoints: Array<string>) {
    this.id = id;
    this.closure = closure;
    this.connJoints = connJoints;
  }
}


export class Joint {
  id: string;
  links: Array<Link>;
  // axis: string;

  constructor(id: string, links: Array<Link>) {
    this.id = id;
    this.links = links;
    // this.axis = axis;
  }
}


export class Root {

  key: string;
  links: Array<Link> = [];
  joints: Array<Joint> = [];

  constructor(key: string) {
    this.key = key;
  }
}


// export class Roots {
//   key: string;
//   list: Array<Root> = [];

//   constructor(key: string) {
//     this.key = key;
//   }
// }
