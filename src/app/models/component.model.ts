import { Coords } from './effect.model';
import { v4 as uuid } from 'uuid';



export class Link {
  // id: string = null;
  parameter: any = null;
  component: any = null;

  constructor(parameter: any, component: any) {
    this.parameter = parameter;
    this.component = component;
  }
}

export class Size {
  width: number = null;
  height: number = null;
  offsetX: number = null;
  offsetY: number = null;
}

export class Unit {
  name = 'percentage';
  symbol = '&#37;';

  constructor(name = 'percentage', symbol = '&#37;') {
    this.name = name;
    this.symbol = symbol;
  }
}


export class Parameter {
  id: string = null;
  value: any = null;
  defaultVal: any = null;
  name: string = null;
  slug: string = null;
  required = false;
  type: string = null;
  hidden = true;
  unitOptions: Array<Unit> = [];
  categoryOptions: Array<string> = [];
  displayPosition: string = null;

  // tslint:disable-next-line:max-line-length
  constructor(id: string, name: string, slug: string, type: string, hidden: boolean, unitOptions: Array<Unit>,
              categoryOptions: Array<string>, displayPosition: string, required = false, defaultVal = null) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.type = type;
    this.unitOptions = unitOptions;
    this.categoryOptions = categoryOptions;
    this.required = required;
    this.hidden = hidden;
    this.defaultVal = defaultVal;
    this.displayPosition = displayPosition;
    if (this.displayPosition === null) {
      this.displayPosition = this.type === 'input' ? 'left' : 'right';
    }
    if (this.required) { this.hidden = false; }
  }
}

export class Parameters {
  input: Array<Parameter> = [];
  output: Array<Parameter> = [];
}



export class Value3 {
  start: number = null;
  end: number = null;
  val: number = null;
  unitOptions: Array<Unit> = [];

  constructor(start: number, end: number, val: number, unitOptions = []) {
    this.start = start;
    this.end = end;
    this.val = val;
    this.unitOptions = unitOptions;
  }
}

export class Value6 {
  val: number = null;
  start: number = null;
  end: number = null;
  val2: number = null;
  start2: number = null;
  end2: number = null;
  unitOptions: Array<Unit> = [];
  unitOptions2: Array<Unit> = [];

  constructor(start: number, end: number, val: number, start2: number, end2: number, val2: number, unitOptions = [], unitOptions2 = []) {
    this.start = start;
    this.end = end;
    this.val = val;
    this.start2 = start2;
    this.end2 = end2;
    this.val2 = val2;
    this.unitOptions = unitOptions;
    this.unitOptions2 = unitOptions2;
  }
}

export class Category {
  val: string = null;
  categoryOptions: Array<any> = [];
  units: Unit = null;

  constructor(val: string, name = 'Value', categoryOptions = ['left', 'center', 'right']) {
    this.val = val;
    this.units = new Unit('category', name);
    this.categoryOptions = categoryOptions;
  }
}

export class Value {
  val: number = null;
  unitOptions: Array<Unit> = [];

  constructor(val: number, unitOptions =
    [ new Unit('', ''), new Unit('percentages', '&percnt;'), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr') ]) {
    this.val = val;
    this.unitOptions = unitOptions;
  }
}


export class Operator {
  operator = new Unit('plus', '&#43;');
  selectedInput = 0;
  unitOptions: Array<Unit> = [];
  units: Unit = null;

  constructor(operator: Unit, unitOptions: Array<Unit>, units: Unit) {
    this.operator = operator;
    this.unitOptions = unitOptions;
    this.units = units;
  }
}

export class ValueComponent {
  type: any = null;
  category: Category = null;
  units = new Unit();
  decimals = 0;
  variableType = 'int';

  constructor(value: any, category: any, units = new Unit('', ''), decimals = 0) {
    this.type = value;
    this.category = category;
    this.units = units;
    this.decimals = decimals;
  }
}

export class ParameterDetails {
  name: string = null;
  slug: string = null;
  position: string = null;
  unitOptions: Array<Unit> = [];
  defaultVal: any = null;
  hidden = false;

  constructor(name: string, slug: string, position: string, unitOptions: Array<Unit>, defaultVal: any, hidden = false) {
    this.name = name;
    this.slug = slug;
    this.position = position;
    this.unitOptions = unitOptions;
    this.defaultVal = defaultVal;
    this.hidden = hidden;
  }
}


export class ComponentObject {
  id = 'tmpObj';
  feelixio = 'component';
  type: string = null;
  coords = new Coords();
  parameters = new Parameters();
  component: any = null;
  size = new Size();
  icon: string = null;
  valid = true;
  port: any = null;

  constructor(component: any, type: string, icon: string, inputs: Array<ParameterDetails>,
              outputs: Array<ParameterDetails>, coords = new Coords()) {

    this.component = component;
    this.type = type;
    this.coords = coords;
    this.icon = './assets/icons/effects/' + icon;

    const options = [];
    const categoryOptions = [];
    if (component.type !== undefined && component.type !== null && component.type.unitOptions !== null) {
      for (const unit of component.type.unitOptions) {
        options.push(unit);
      }
    }
    if (component.category !== null && component.category !== undefined && component.category.categoryOptions !== null) {
      for (const category of component.category.categoryOptions) {
        categoryOptions.push(category);
      }
    }
    if (options.length === 0 && categoryOptions.length > 0) {
      options.push(new Unit('category', type));
    }

    for (const input of inputs) {
      this.parameters.input.push(
        new Parameter(uuid(), input.name, input.slug, 'input', input.hidden,
        input.unitOptions.length > 0 ? input.unitOptions : options, categoryOptions, input.position, false, input.defaultVal));
    }
    for (const output of outputs) {
      this.parameters.output.push(
        new Parameter(uuid(), output.name, output.slug, 'output', output.hidden, output.unitOptions.length > 0 ?
        output.unitOptions : options, categoryOptions, output.position, false, output.defaultVal));
    }
  }
}
