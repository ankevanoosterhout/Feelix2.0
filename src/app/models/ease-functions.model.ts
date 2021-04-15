export class Point {
  x: number = null;
  y: number = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

export class Curve {
  id: string = null;
  name: string = null;
  type: string = null;
  points: Array<Point> = null;

  constructor(name: string, type: string, p0X: number,  p0Y: number, p1X: number, p1Y: number,
              p2X: number, p2Y: number, p3X: number, p3Y: number) {
    this.name = name;
    this.type = type;
    this.points = [
      { x: p0X, y: p0Y },
      { x: p1X, y: p1Y },
      { x: p2X, y: p2Y },
      { x: p3X, y: p3Y }
    ];
  }
}
