import { Color } from './effect.model';
import { Path } from './node.model';

export class BeginEnd {
  start: number = null;
  end: number = null;
}

export class Range {
  min: number = null;
  max: number = null;
}

export class Repeat {
  instances = 1;
  index = 0;
}

export class Unit {
  name: string = null;
  PR: number = null;

  constructor(name: string, PR: number) {
    this.name = name;
    this.PR = PR;
  }
}

export class Parameter {
  value: any = null;
  name: string = null;

  constructor(name: string, value: any) {
    this.name = name;
    this.value = value;
  }
}

export class Interface {
  name: string = null;
  icon: string = null;
  type: string = null;
  colors: Array<Color> = [];
  layer = 0;
}

export class Quality {
  level = 1;
  name = 'normal';
  division = 4;
}

export class Details {
  parameter: Parameter = null;
  position = new BeginEnd();
  direction = 'any';
  mirror: string = null;
  repeat = new Repeat();
  linked: string = null;
  linkedMirror = null;
  parent: Array<string> = [];
  infinite = false;
  quality = new Quality();
}


export class Effect {
  id: string = null;
  path: any = null;
  type = 'normal';
  interface = new Interface();
  details = new Details();
  overwrite = true;
  slug: number = null;
  componentType = { main: 'effect', sub: 'position' };
  units: Unit;

  constructor(id: string, name: string, icon: string, slug: number, colors = null, units = new Unit('degrees', 360)) {
    this.id = id;
    this.interface.name = name;
    this.interface.icon = icon;
    this.details.position.start = 0;
    this.details.position.end = 0;
    this.slug = slug;
    this.units = units;
    if (colors !== null) {
      this.interface.colors = colors;
    }
  }
}

