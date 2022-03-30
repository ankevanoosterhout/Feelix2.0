import { Classifier } from "./ml5js.model";


export class FilterType {
  name: string;
  slug: string;
  explanation: string;
  interpolate: number = 10;

  constructor(name: string, slug: string, explanation: string) {
    this.name = name;
    this.slug = slug;
    this.explanation = explanation;
  }
}

export class VariableObject {
  label: string;
  value: Array<number> = [ 0,0,0,0,0,0,0,0,0,0,0,0 ];
  prevValue: number;
  frequency: number;
}


export class Filter {
  id: string;
  type: FilterType;
  controlVariable: string;
  classifier: Classifier;
  motor_id: string;
  microcontrollerPath: string;
  open = true;
  functionVariable = new VariableObject();

  constructor(id: string, type: FilterType) {
    this.id = id;
    this.type = type;
  }
}





