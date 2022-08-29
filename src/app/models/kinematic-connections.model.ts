export class Link {
  id: string;
  connJoints: Array<string>;
  connPoints: Array<string>;
  closure: boolean;


  constructor(id: string, closure: boolean, connJoints: Array<string>, connPoints: Array<string>) {
    this.id = id;
    this.closure = closure;
    this.connJoints = connJoints;
    this.connPoints = connPoints;
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

