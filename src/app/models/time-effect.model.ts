import { Path } from './node.model';
import { BeginEnd } from './position-effect.model';
import { Range } from './position-effect.model';
import { Color } from './colors.model';
import { Unit } from './effect.model';

export class Interface {
  name: string = null;
  icon = '../../src/assets/icons/buttons/path.svg';
  type: string = null;
  colors: Array<Color> = [];
  layer = 0;
}


export class Details {
  position = new BeginEnd();
  time = new BeginEnd();
  // parent: Array<string> = [];
  // clockwise = true;
  range = new Range();
  duration: number = null;
  offset = 0;
  loop = false;
  mirror = false;
}



export class TimeEffect {
  id: string = null;
  // tslint:disable-next-line:variable-name
  module_id: string = null;
  type = 'motion';
  nodes: Array<Path> = [];
  details = new Details();
  interface = new Interface();
  units = new Unit();
  componentType = { main: 'effect', sub: 'time' };
  valid = true;

  constructor(id: string, duration: number, units: Unit) {
    this.id = id;
    this.interface.name = 'module';
    this.details.duration = duration;
    this.details.time.start = 0;
    this.details.time.end = duration;
    this.units = units;
    this.interface.colors = [ new Color('turquoise', '#2e93c0', '#52b8d8') ];
  }
}



export class SimpleTimeEffect {
  id: string = null;
  // tslint:disable-next-line:variable-name
  module_id: string = null;
  type: string = null;
  details = new Details();
  interface = new Interface();
  componentType = { main: 'effect', sub: 'time' };
  units = new Unit();
  valid = true;

  constructor(id: string, name: string, type: string, duration: number, startTime: number, icon: string) {
    this.id = id;
    this.interface.name = name;
    this.type = type;
    this.details.duration = duration;
    this.details.position.start = 0;
    this.details.position.end = 0;
    this.details.time.start = startTime;
    this.details.time.end = startTime + duration;
    this.interface.colors = [ new Color('gray', '#808184', '#929497') ];
    this.interface.icon = icon;
  }
}


