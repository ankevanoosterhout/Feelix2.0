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

export class ModelVariable {
  name: string;
  active: boolean;
  color: string;
  visible = false;

  constructor(name: string, active: boolean, visible: boolean, color: string) {
    this.name = name;
    this.active = active;
    this.visible = visible;
    this.color = color;
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
  name: string;
  labels: Array<Label> = [];
  open = false;
  active = false;

  constructor(name: string) {
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
  inputs: Array<ModelVariable> = [];
  outputs: Array<Classifier> = [];
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
      new ModelVariable('angle', true, true, '#43E6D5'),
      new ModelVariable('velocity', true, true, '#00AEEF'),
      new ModelVariable('direction', true, false, '#E18257'),
      new ModelVariable('target', false, false, '#7778E0'),
      new ModelVariable('time', false, false, '#4390E6')
    ]
  }
}



export class Bounds {
  xMin = 0;
  xMax = 1000;
  yMin = -2;
  yMax = 2;
}



export class Data  {
  inputs: Array<any> = [];
  outputs: Array<any> = [];
}


export class DataSet {
  id: String;
  name: String;
  date: any;
  d = new Data();
  open = true;
  selected = false;
  bounds = new Bounds();
  offsetTime = 0;

  constructor(id: String, name: String) {
    this.id = id;
    this.date = new Date().getTime();
    this.name = name;
  }
}
