import { MicroController } from './hardware.model';
import { ComponentObject, Value, ValueComponent, Category, Unit, Value3, Parameters, Parameter, Size, Link } from './component.model';
import { SliderDrawplane } from './drawing-plane-config.model';
import { Scale } from './node.model';
import { v4 as uuid } from 'uuid';

export class Coords {
  x: number = null;
  y: number = null;
}

export class EffectObject {
  id: string = null;
  type: string = null;
  coords = new Coords();
  parameters = new Parameters();
  effect: any = null;
  rendered = false;
  feelixio = 'effect';
  size = new Size();
  combinedVariables = true;
  valid = true;
  xScale: any = null;

  constructor(id: string, effect: any, type: string, coords: Coords) {
    this.id = id;
    this.effect = effect;
    this.type = type;
    this.coords = coords;

    if (!effect.units) { effect.units = { name: 'degrees', PR: 360 }; }
    const unit = effect.units && effect.units.name === 'degrees' ? new Unit('degrees', '&deg;') : new Unit('points per revolution', 'ppr');

    if (effect.units.name === 'cm' || effect.units.name === 'mm') {
      this.parameters.input.push(
        new Parameter(uuid(), 'position', 'P', 'input', false,
        [ new Unit('cm', 'cm'), new Unit('mm', 'mm')], [], null, false,
        new ValueComponent(new Value(Math.round(effect.details.position.start * 100) / 100, []), null,
        new Unit(effect.units.name, effect.units.name), 0)));
    } else {
      const value = unit.name === 'degrees' ?
        Math.round(effect.details.position.start * 100) / 100 : Math.round(effect.details.position.start);
      this.parameters.input.push(
        new Parameter(uuid(), 'position', 'P', 'input', false,
        [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr')], [], null, false,
        new ValueComponent(new Value(value, []), null, unit.name === 'degrees' ?
        new Unit('degrees', '&deg;') : new Unit('points per revolution', 'ppr'), 0)));
    }

    if (effect.type !== 'limit' && effect.type !== 'motion' && effect.type !== 'ease') {
      this.parameters.input.push(
        new Parameter(uuid(), 'align', 'Al', 'input', true,
        [ new Unit('category', 'align') ], ['left', 'center', 'right'], null, false,
        new ValueComponent(null, new Category('left', 'Align', ['left', 'center', 'right']),
        new Unit('category', 'align'), 0)));
    }

    if (effect.type === 'motion' || effect.type === 'ease') {
      this.parameters.input.push(
        new Parameter(uuid(), 'start', 'S', 'input', false,
        [ new Unit('milliseconds', 'ms'), new Unit('seconds', 's')], ['false', 'true'], null, false,
        new ValueComponent(new Value(Math.round(effect.nodes[0].box.left), []),
        new Category('true', 'Start',  ['false', 'true']), new Unit('milliseconds', 'ms'), 0)));

      this.parameters.input.push(
        new Parameter(uuid(), 'duration', 'D', 'input', false,
        [ new Unit('milliseconds', 'ms'), new Unit('seconds', 's')], [], null, false,
        new ValueComponent(new Value( (effect.type === 'ease' ? Math.round(effect.details.duration) : Math.round(effect.nodes[0].box.width))
        , []), null, new Unit('milliseconds', 'ms'), 0)));

      this.parameters.input.push(
        new Parameter(uuid(), 'velocity', 'V', 'input', true, [ new Unit('', '')], [], null, false,
        new ValueComponent(new Value(1.0, [ new Unit('', '') ]), null, new Unit('', ''), 2)));

      if (effect.units && (effect.units.name === 'cm' || effect.units.name === 'mm')) {
          this.parameters.input.push(
            new Parameter(uuid(), 'angle', 'An', 'input', false,
            [ new Unit('cm', 'cm'), new Unit('mm', 'mm')], [], null, false,
            new ValueComponent(new Value( Math.round((effect.path.box.height) * 100) / 100,
            [ new Unit('cm', 'cm'), new Unit('mm', 'mm') ]), null, new Unit(effect.units.name, effect.units.name), 0)));
        } else {
          const height = effect.path ? effect.path.box.height : 1;
          const value = unit.name === 'degrees' ?
            Math.round((height) * 100) / 100 : Math.round(height);
          this.parameters.input.push(
            new Parameter(uuid(), 'angle', 'An', 'input', false,
            [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr')], [], null, false,
            new ValueComponent(new Value(value,
            [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr') ]), null, unit.name === 'degrees' ?
              new Unit('degrees', '&deg;') : new Unit('points per revolution', 'ppr'), 0)));
        }

    } else {

      if (effect.interface.name !== 'Barrier') {
        const width = effect.details.position.end - effect.details.position.start === 0 ? 90 :
          effect.details.position.end - effect.details.position.start;
        if (effect.units.name === 'cm' || effect.units.name === 'mm') {
          this.parameters.input.push(
            new Parameter(uuid(), 'angle', 'An', 'input', false,
            [ new Unit('cm', 'cm'), new Unit('mm', 'mm') ], [], null, false,
            new ValueComponent(new Value(Math.round((width) * 100) / 100,
            [ new Unit('cm', 'cm'), new Unit('mm', 'mm') ]), null, new Unit(effect.units.name, effect.units.name), 0)));
        } else {
          const value = unit.name === 'degrees' ? Math.round((width) * 100) / 100 : Math.round(width);
          this.parameters.input.push(
            new Parameter(uuid(), 'angle', 'An', 'input', false,
            [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr') ], [], null, false,
            new ValueComponent(new Value(value,
            [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr') ]), null, (unit.name !== 'degrees' ?
            new Unit('points per revolution', 'ppr') : new Unit('degrees', '&deg;')), 0)));
        }
      }

      if (effect.interface.name !== 'Damper' && effect.interface.name !== 'Spring') {

        this.parameters.input.push(
          new Parameter(uuid(), 'intensity', 'I', 'input', false,
          [ new Unit('percentages', '&percnt;' ) ], [], null, false, new ValueComponent(
          new Value(100, [ new Unit('percentages', '&percnt;' ) ]), null, new Unit('percentages', '&percnt;'))));

      } else {
        this.parameters.input.push(
          new Parameter(uuid(), 'intensity (l)', 'I(l)', 'input', false,
          [ new Unit('dXdY', '&part;' ) ], [], null, false, new ValueComponent(
          new Value(100, [ new Unit('dXdY', '&part;' ) ]), null, new Unit('dXdY', '&part;' ))));
      }

      this.parameters.input.push(
        new Parameter(uuid(), 'direction', 'CW', 'input', false,
        [ new Unit('category', 'direction') ], ['any', 'clockwise', 'counterclockwise'], null, false,
        new ValueComponent(null, new Category((effect.slug < 2 ? 'clockwise' : effect.details.direction),
          'Direction', effect.slug < 2 ? ['clockwise', 'counterclockwise'] : ['any', 'clockwise', 'counterclockwise']))));
    }

    if (effect.type !== 'motion' && effect.type !== 'ease' && effect.type !== 'constant' && effect.type !== 'limit') {

      this.parameters.input.push(
        new Parameter(uuid(), 'repeat', 'R', 'input', true,
        [ new Unit('repeat', 'x') ], ['', 'byte', 'int8_t', 'int16_t'], null, false,
        new ValueComponent(new Value(1, []), null, new Unit('', ''), null)));
    }

    if (effect.type === 'ease' || effect.type === 'motion')  {
      this.parameters.input.push(
        new Parameter(uuid(), 'loop', 'M', 'input', true,
        [ new Unit('category', 'boolean') ], ['true', 'false'], null, false,
        new ValueComponent(null,
        new Category('false', 'Loop', ['true', 'false']))));
    }

    // if (effect.type !== 'limit' && effect.interface.name !== 'Friction') {
    //   this.parameters.input.push(
    //     new Parameter(uuid(), 'mirror', 'M', 'input', true,
    //     [ new Unit('category', 'boolean') ], ['true', 'false'], null, false,
    //     new ValueComponent(null,
    //     new Category('false', 'Mirror', ['true', 'false']))));
    // }

    if (effect.type !== 'limit' && effect.type !== 'motion' && effect.type !== 'ease') {
      this.parameters.input.push(
        new Parameter(uuid(), 'infinite', 'In', 'input', true,
      [ new Unit('category', 'boolean') ], ['true', 'false'], null, false,
        new ValueComponent(null, new Category('false', 'Infinite', ['true', 'false']))));
    }

    this.parameters.input.push(
      new Parameter(uuid(), 'enabled', 'E', 'input', true,
      [ new Unit('category', 'boolean') ], ['true', 'false'], null, false,
      new ValueComponent(null, new Category('true', 'Enabled', ['true', 'false']))));


    this.parameters.output.push(
      new Parameter(uuid(), 'force', 'F', 'output', false,
      [ new Unit('effect', 'effect')], ['', 'int8_t', 'int16_t'], null, false));

    this.parameters.output.push(
      new Parameter(uuid(), 'offset', 'O', 'output', true,
      [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr') ],
      ['', 'int16_t', 'int8_t'], null, false));


    this.size.width = 260;
    this.size.height = (this.parameters.input.filter(p => !p.hidden).length * 20) + 20;

  }
}


export class MotorObject {
  id: string = null;
  slug = 'motor';
  coords = new Coords();
  parameters = new Parameters();
  microcontroller: MicroController = null;
  feelixio = 'motor';
  incomplete = true;
  size = new Size();
  motorID: string = null;
  combinedVariables = true;
  valid = true;

  constructor(id: string, microcontroller: any, motorID: any, coords: Coords) {
    this.id = id;
    this.microcontroller = microcontroller;
    this.motorID = motorID;
    this.coords = coords;
    this.size.width = 170;
    this.size.height = 70;

    this.parameters.input.push(
      new Parameter(uuid(), 'force', 'F', 'input', false,
      [new Unit('effect', 'effect')], ['', 'uint16_t', 'uint8_t'], null, true, null));

    this.parameters.input.push(
      new Parameter(uuid(), 'offset', 'O', 'input', true,
      [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr') ],
      ['', 'int16_t', 'int8_t'], null, false, null));

    this.parameters.output.push(
      new Parameter(uuid(), 'speed', 'S', 'output', true,
      [ new Unit('RPM', 'rpm') ], ['', 'int8_t', 'int16_t' ], 'right', false,
      new ValueComponent(new Value(0, [ new Unit('RPM', 'rpm')]), null, new Unit('RPM', 'rpm'), 0)));

    // this.parameters.output.push(
    //   new Parameter(uuid(), 'play', null, 'output', false, [ new Unit('play', '')], [], 'right', false, null));

    this.parameters.output.push(
      new Parameter(uuid(), 'position', 'P', 'output', true,
      [ new Unit('points per revolution', 'ppr') ],
      ['', 'int16_t', 'int8_t'], 'right', false, new ValueComponent(new Value(0, [ new Unit('points per revolution', 'ppr')]),
      null, new Unit('points per revolution', 'ppr'), 0)));

    this.parameters.output.push(
      new Parameter(uuid(), 'clockwise', 'D', 'output', true,
      [ new Unit('category', 'boolean') ], ['true', 'false'], 'right', false,
        new ValueComponent(null, new Category('true', 'Value', ['true', 'false']))));

    // this.parameters.input.push(
    //   new Parameter(uuid(), 'sleep', 'S', 'input', true,
    //   [ new Unit('category', 'boolean') ], ['true', 'false'], 'right', false, null));
  }
}

export class Dates {
  created = new Date().getTime();
  modified = null;
  changed = false;
}

export class Configuration {
  field = new Size();
  sliderHorizontal = new SliderDrawplane();
  sliderVertical = new SliderDrawplane();
  yScale: any = null;
  xScale: any = null;
  scale = new Scale();
  rendered = false;
  running = false;
  loaded = false;
}

export class ComponentLink {
  id: string = null;
  input: Link = null;
  output: Link = null;
  valid: boolean = null;
  selected = false;
  inUse = false;

  constructor(id: string, input: Link, output: Link, valid = true) {
    this.id = id;
    this.input = input;
    this.output = output;
    this.valid = valid;
  }
}




export class FeelixioFile {
  // tslint:disable-next-line: variable-name
  _id: string = null;
  name: string = null;
  path = '';
  overwrite = true;
  isActive = false;
  softwareVersion = '1.0.6';
  date = new Dates();
  config = new Configuration();

  effects: Array<EffectObject> = [];
  components: Array<ComponentObject> = [];
  hardware: Array<MotorObject> = [];
  links: Array<ComponentLink> = [];

  constructor(id: string, name = 'untitled') {
    this._id = id;
    this.name = name;
  }
}
