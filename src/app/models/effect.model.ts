import { Dates } from './file.model';
import { Path } from './node.model';

export class Color {
  name = 'Light gray';
  hash = '#858585';

  constructor(name: string, hash: string) {
    this.name = name;
    this.hash = hash;
  }
}

export class Repeat {
  instances = 1;
  index = 0;
}

export class GridSettings {
  spacingX = 20;
  spacingY = 20;
  subDivisionsX = 2;
  subDivisionsY = 2;
  color = new Color('Light gray', '#666666');
}

export class Unit {
  name: string = null;
  PR: number = null;

  constructor(name: string, PR: number) {
    this.name = name;
    this.PR = PR;
  }
}

export class Coords {
  x: number = null;
  y: number = null;
}

export class Guide {
  id: string = null;
  axis: string = null;
  coords = new Coords();
}

export class Grid {
  snap = false;
  visible = false;
  settings = new GridSettings();
  translation = 1.0;
  // units = new Unit('degrees', 360);
  xUnit = new Unit('degrees', 360);
  yUnit = new Unit('voltage (%)', 100);
  guides: Array<Guide> = [];
  guidesVisible = true;
  lockGuides = false;
}

export class Range {
  start: number = 0;
  end: number = 360;
}

export class XY {
  x: any = null;
  y: any = null;
  uniform = true;

  constructor(x: any, y: any) {
    this.x = x;
    this.y = y;
  }
}

export class Size {
  x: number = null;
  y: number = null;
  width: number = null;
  height: number = null;

  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

export class Details {
  id: string = null;
  name: string = null;
  effectID: string = null;
  direction = 'any';
  scale = new XY(100,100);
  position = new Size(0,0,0,0);
  flip = new XY(false, false);
  repeat = new Repeat();
  infinite = false;
  // quality = new Quality();

  constructor(id: string, effectID: string, name: string) {
    this.id = id;
    this.effectID = effectID;
    this.name = name;
  }
}


export class Effect {
  id: string = null;
  name: string = 'effect-1';
  date = new Dates();
  type = 'torque';
  rotation = 'dependent';
  paths: Array<Path> = [];
  grid = new Grid();
  scale: any = null;
  colors: Array<Color> = [];
  range = new Range();
  size = new Size(0,0,0,0);

  constructor(id: string) {
    this.id = id;
    this.colors.push(new Color('Blue', '#003fc1'));
    this.colors.push(new Color('LightBlue', '#9bbef5'));
    this.date.created = new Date().getTime();
  }
}



export class LibraryEffect {
  id: string;
  // feelixio = 'effect';
  effect: Effect = null;

  constructor(id: string, effect: Effect) {
    this.id = id;
    this.effect = effect;
  }
}
