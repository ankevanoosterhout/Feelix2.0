import { Filter } from "./filter.model";
import * as tf from '@tensorflow/tfjs';
import { MicroController } from "./hardware.model";


export enum Activation {
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

export const ActivationLabelMapping: Record<Activation, string> = {
  [Activation.elu]: 'elu',
  [Activation.hardSigmoid]: 'hardSigmoid',
  [Activation.linear]: 'linear',
  [Activation.relu]: 'relu',
  [Activation.relu6]: 'relu6',
  [Activation.selu]: 'selu',
  [Activation.sigmoid]: 'sigmoid',
  [Activation.softmax]: 'softmax',
  [Activation.softplus]: 'softplus',
  [Activation.softsign]: 'softsign',
  [Activation.tanh]: 'tahn',
  [Activation.swish]: 'swish',
  [Activation.mish]: 'mish'
};

export enum ModelType {
  neuralNetwork = 0,
  regression = 1
  // KNNClassifier = 2,
  // kMeans = 3
};

export const ModelTypeMapping: Record<ModelType, string> = {
  [ModelType.neuralNetwork]: 'NeuralNetwork',
  [ModelType.regression]: 'Regression'
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
  slug: string;

  constructor(name: string, active: boolean, visible: boolean, color: string, slug: string) {
    this.name = name;
    this.active = active;
    this.visible = visible;
    this.color = color;
    this.slug = slug;
  }
}

export class Label {
  id: string;
  name: string;
  confidence: number;
  prediction: number;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}


export class Classifier  {
  id: string;
  name: string;
  labels: Array<Label> = [];
  open = false;
  active = false;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}



export class Options {
  inputs: Array<any> = [];
  outputs: Array<any> = [];
  optimizer: any = tf.train.sgd;
  learningRate: number = 0.1;
  // debug: boolean = false; // determines whether or not to show the training visualizatio
}

export class TrainingOptions {
  epochs: number = 100;
  batchSize: number = 32;
}

export class NN_options extends Options {
  hiddenUnits: number = 4;
  activation: Activation = Activation.relu;
  activationOutputLayer: Activation = Activation.softmax;
  metrics: any = tf.metrics.categoricalAccuracy;
  trainingOptions = new TrainingOptions();
  losses: any = tf.metrics.categoricalCrossentropy;
}

export class Regression_options extends Options {
  degree: number = 1;
  losses: any = tf.metrics.meanSquaredError;
}




export class Model {
  id: string;
  name: string;
  date: any;
  type: ModelType;
  inputs: Array<ModelVariable> = [];
  outputs: Array<Classifier> = [];
  options: any;
  model: any;
  selected: boolean = false;
  filters: Array<Filter> = [];
  multiple = true;

  constructor(id: string, name: string, type: ModelType) {
    this.id = id;
    this.name = name;
    this.date = new Date().getTime();
    this.type = type;

    this.options =  this.type === ModelType.neuralNetwork ? new NN_options() : new Regression_options();

    this.inputs = [
      new ModelVariable('angle', true, true, '#43E6D5', 'A'),
      new ModelVariable('velocity', true, true, '#00AEEF', 'V'),
      new ModelVariable('direction', true, false, '#E18257', 'D'),
      new ModelVariable('pressure', false, false, '#4390E6', 'P'),
      new ModelVariable('target', false, false, '#7778E0', 'G')
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

export class InputItem {
  name: string;
  value: number;

  constructor(name: string) {
    this.name = name;
  }
}

export class OutputItem {
  label = new Label(null, null);
  classifier_id: string;
  classifier_name: string;
}

export class Data {
  inputs: Array<InputItem> = [];
  time: number;
}

export class McuEl {
  id: string;
  name: string;
  serialPath: string;
}

export class MotorEl {
  mcu = new McuEl();
  id: string;
  index: number;
  d: Array<Data> = [];
  record: boolean = true;
  visible: boolean = true;

  constructor(mcuID: string, mcuName: string, serialPath: string, id: string, index: number) {
    this.mcu.id = mcuID;
    this.mcu.name = mcuName;
    this.mcu.serialPath = serialPath;
    this.id = id;
    this.index = index;
  }
}


export class DataSet {
  id: String;
  name: String;
  date: any;
  m: Array<MotorEl> = [];
  output = new OutputItem();
  // outputs: Array<any> = []; //convert to single outputItem
  open = true;
  selected = false;
  bounds = new Bounds();
  offsetTime = 0;

  constructor(id: String, name: String, selectedMCUs: Array<MicroController>) {
    this.id = id;
    this.date = new Date().getTime();
    this.name = name;

    if (selectedMCUs) {
      for (const mcu of selectedMCUs) {
        for (const m of mcu.motors) {
          if (m.record) {
            const index = mcu.motors.indexOf(m);
            const motorEl = new MotorEl(mcu.id, mcu.name, mcu.serialPort.path, m.id, index);
            this.m.push(motorEl);
          }
        }
      }
    }
  }
}
