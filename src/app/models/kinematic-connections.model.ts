export class LinkedJoint {
  id: string;
  connector: string;
  plane: string;

  constructor(id: string, connector: string, plane: string) {
    this.id = id;
    this.connector = connector;
    this.plane = plane;
  }
}


export class Link {
  id: string;
  joints: Array<LinkedJoint> = [];
  closure = false;


  constructor(id: string, joints: Array<LinkedJoint>) {
    this.id = id;
    this.joints = joints;
  }
}

export class LinkGroup {
  links: Array<Link> = [];
}


export class Joint {
  id: string;
  linkGroup: Array<LinkGroup> = [ new LinkGroup(), new LinkGroup() ];
  // axis: string;

  constructor(id: string) {
    this.id = id;
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

