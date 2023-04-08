import { Filter } from "./filter.model";


export enum losses {
  absoluteDifference = 'absoluteDifference',
  computeWeightedLoss = 'computeWeightedLoss',
  cosineDistance = 'cosineDistance',
  hingeLoss = 'hingeLoss',
  huberLoss = 'huberLoss',
  logLoss = 'logLoss',
  meanSquaredError = 'meanSquaredError',
  sigmoidCrossEntropy = 'sigmoidCrossEntropy',
  softmaxCrossEntropy = 'softmaxCrossEntropy'
};

export const LossesLabelMapping: Record<losses, string> = {
  [losses.absoluteDifference]: 'absoluteDifference',
  [losses.computeWeightedLoss]: 'computeWeightedLoss',
  [losses.cosineDistance]: 'cosineDistance',
  [losses.hingeLoss]: 'hingeLoss',
  [losses.huberLoss]: 'huberLoss',
  [losses.logLoss]: 'logLoss',
  [losses.meanSquaredError]: 'meanSquaredError',
  [losses.sigmoidCrossEntropy]: 'sigmoidCrossEntropy',
  [losses.softmaxCrossEntropy]: 'softmaxCrossEntropy'
};

export enum activation {
  elu = 'elu',
  hardSigmoid = 'hardSigmoid',
  linear = 'linear',
  relu = 'relu',
  relu6 = 'relu6',
  selu = 'selu',
  sigmoid = 'sigmoid',
  softmax = 'softmax',
  softplus = 'softplus',
  softsign = 'softsign',
  tanh = 'tanh',
  swish = 'swish',
  mish = 'mish'
};

export const ActivationLabelMapping: Record<activation, string> = {
  [activation.elu]: 'elu',
  [activation.hardSigmoid]: 'hardSigmoid',
  [activation.linear]: 'linear',
  [activation.relu]: 'relu',
  [activation.relu6]: 'relu6',
  [activation.selu]: 'selu',
  [activation.sigmoid]: 'sigmoid',
  [activation.softmax]: 'softmax',
  [activation.softplus]: 'softplus',
  [activation.softsign]: 'softsign',
  [activation.tanh]: 'tahn',
  [activation.swish]: 'swish',
  [activation.mish]: 'mish'
};


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


export class TrainingOptions {
  epochs: number = 100;
  batchSize: number = 32;
}


export class NN_options {
  // layers: Array<any> = []; // custom layers
  task: string; // 'classification', 'regression'
  debug: boolean = false; // determines whether or not to show the training visualization
  learningRate: number = 0.2;
  hiddenUnits: number = 4;
  inputs: Array<any> = [];
  outputs: Array<any> = [];
  trainingOptions = new TrainingOptions();
  activation: activation = activation.sigmoid;
  losses: losses = losses.meanSquaredError;

  constructor(task: string, debug: boolean, learningRate: number, hiddenUnits: number, trainingOptions: TrainingOptions = null) {
    this.task = task;
    this.debug = debug;
    this.learningRate = learningRate;
    this.hiddenUnits = hiddenUnits;
    if (trainingOptions) {
      this.trainingOptions = trainingOptions;
    }
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
  model: any;
  selected: boolean = false;
  filters: Array<Filter> = [];
  multiple = true;

  constructor(id: string, name: string, type: string, options: any) {
    this.id = id;
    this.name = name;
    this.date = new Date().getTime();
    this.type = type;
    this.options = options;
    this.inputs = [
      new ModelVariable('angle', true, true, '#43E6D5'),
      new ModelVariable('velocity', true, true, '#00AEEF'),
      new ModelVariable('direction', true, false, '#E18257'),
      new ModelVariable('target', false, false, '#7778E0')
      // new ModelVariable('time', false, false, '#4390E6')
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
