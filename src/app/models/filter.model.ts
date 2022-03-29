import { Classifier } from "./ml5js.model";


export class FilterType {
  name: string;
  type: string;
  explanation: string;
  interpolate: number = 10;

  constructor(name: string, type: string, explanation: string) {
    this.name = name;
    this.type = type;
  }
}

export class VariableObject {
  label: string;
  value: Array<number> = [ 0,0,0,0,0,0,0,0,0,0,0,0 ];
  prevValue: Array<number> = [ 0,0,0,0,0,0,0,0,0,0,0,0 ];
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





