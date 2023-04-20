import { MicroController } from "./hardware.model";
import { DataSet, Model, NN_options } from "./tensorflow.model";
import { v4 as uuid } from 'uuid';

export class TensorFlowData {

  selectedMicrocontrollers: Array<MicroController> = [];
  selectOptionMicrocontroller: MicroController;
  selectedModel: Model = new Model(uuid(), 'model', 'NeuralNetwork', new NN_options('classification', false, 0.2, 4))

  motorList = [];

  dataSets: Array<DataSet> = [];
  selectedDataset: DataSet = null;
  predictionDataset: DataSet = null;

  processing = false;

  classify = false;
  recording = { active: false, starttime: null };

  trimLinesVisible = false;
  trimLines = [ { id: 0, value: null }, { id: 1, value: null } ];


}
