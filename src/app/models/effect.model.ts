import { Path } from './node.model';
import { Details } from './position-effect.model';

export class Color {
  name = 'Light gray';
  hash = '#858585';

  constructor(name: string, hash: string) {
    this.name = name;
    this.hash = hash;
  }
}

export class GridSettings {
  spacingX = 20;
  spacingY = 20;
  subDivisionsX = 2;
  subDivisionsY = 2;
  color = new Color('Light gray', '#666666');
}

export class Unit {
  name = 'degrees';
  PR = 360;
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
  units = new Unit();
  guides: Array<Guide> = [];
  guidesVisible = true;
  lockGuides = false;
}

export class Range {
  start: number = 0;
  end: number = 360;
}

export class Effect {
  id: string = null;
  name: string = 'effect-1';
  type = 'torque';
  xUnit = new Unit();
  yUnit = new Unit();
  paths: Array<Path> = [];
  details = new Details();
  grid = new Grid();
  scale: any = null;
  colors: Array<Color> = [];
  range = new Range();

  constructor(id: string) {
    this.id = id;
    this.colors.push(new Color('Blue', '#003fc1'));
    this.colors.push(new Color('LightBlue', '#9bbef5'));
  }
}



export class LibraryEffect {
  id: string;
  feelixio = 'effect';
  effect: Effect = null;
  paths: Array<Path> = [];

  constructor(id: string, effect: Effect, units: Unit) {
    this.id = id;
    this.effect = effect;
    this.effect.xUnit = units;
  }
}
