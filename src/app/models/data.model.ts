export class Points {
  x: number = null;
  y: number = null;
  w: number = null;
  h: number = null;
}

export class ReferencePoint {
  name = 'center';
  id = 4;
}

export class Toolbar {
  referencePoint = new ReferencePoint();
  linked = true;
  boxSelection = false;
  points = new Points();
}

