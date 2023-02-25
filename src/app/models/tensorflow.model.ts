import { Filter } from "./filter.model";

export class Input {
  id: String;
  name: String;
  active = true;

  constructor(id: String, name: String) {
    this.id = id;
    this.name = name;
  }
}

export class NN_options {
  // layers: Array<any> = []; // custom layers
  task: string; // 'classification', 'regression', 'imageClassificaiton'
  debug: boolean = false; // determines whether or not to show the training visualization
  learningRate: number = 0.2;
  hiddenUnits: number = 4;
  inputs: Array<any> = [];
  outputs: Array<any> = [];

  constructor(task: string, debug: boolean, learningRate: number, hiddenUnits: number) {
    this.task = task;
    this.debug = debug;
    this.learningRate = learningRate;
    this.hiddenUnits = hiddenUnits;
  }
}


export class Model {
  id: string;
  name: string;
  date: any;
  type: string;
  inputs: Array<any> = [];
  outputs: Array<any> = [];
  options: any;
  trainingOptions: any;
  model: any;
  selected: boolean = false;
  filters: Array<Filter> = [];
  multiple = false;

  constructor(id: string, name: string, type: string, options: any, trainingOptions: any) {
    this.id = id;
    this.name = name;
    this.trainingOptions = trainingOptions;
    this.date = new Date().getTime();
    this.type = type;
    this.options = options;
    this.inputs = [
      { name: 'angle', active: true },
      { name: 'velocity', active: true },
      { name: 'direction', active: true },
      { name: 'target', active: false },
      { name: 'time', active: false }
    ]
  }
}



export class Label {
  name: string;
  confidence: number;
  prediction: number;

  constructor(name: string) {
    this.name = name;
  }
}


export class Classifier  {
  name: String;
  labels: Array<Label> = [];
  open = false;

  constructor(name: String) {
    this.name = name;
  }
}



export class Data  {
  inputs: Array<any> = [];
  outputs: Array<any> = [];

  constructor() {}
}


export class DataSet {
  id: String;
  name: String;
  date: any;
  d = new Data();
  open = true;
  selected = false;

  constructor(id: String, name: String) {
    this.id = id;
    this.date = new Date().getTime();
    this.name = name;
  }
}
