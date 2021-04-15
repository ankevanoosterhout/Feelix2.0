export class Coords {
  x: number = null;
  y: number = null;
}

export class Node {
  id: string = null;
  cp: string = null;
  type: string = null;
  pos = new Coords();
  angle = new Coords();
  path: string = null;

  constructor(id: string, path: string, cp: string, type: string, pos: Coords, angle: Coords) {
    this.id = id;
    this.path = path;
    this.cp = cp;
    this.type = type;
    this.pos = pos;
    this.angle = angle;
  }
}

export class Box {
  left: number = null;
  right: number = null;
  width: number = null;
  height: number = null;
  top: number = null;
  bottom: number = null;
}

export class Path {
  id: string = null;
  nodes: Array<Node> = [];
  box = new Box();
  lock = false;

  constructor(id: string) {
    this.id = id;
    this.nodes = [];
  }
}

export class Steps {
  section: number = null;
  steps: Array<Node>;
}

export class Scale {
  scaleX: any = null;
  scaleY: any = null;

  constructor() {}
}

export class EditBounds {
  xMin = 0;
  xMax = 360;
  yMin = 0;
  yMax = 100;
}
