import { Filter } from "./filter.model";
import * as tf from '@tensorflow/tfjs';
import { MicroController } from "./hardware.model";


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
  activation: activation = activation.relu;
  activationOutputLayer: activation = activation.softmax;
  losses: any = tf.metrics.categoricalCrossentropy;
  metrics: any = tf.metrics.categoricalAccuracy;

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
