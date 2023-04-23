import { MicroController } from "./hardware.model";
import { DataSet, Model, NN_options } from "./tensorflow.model";
import { v4 as uuid } from 'uuid';

export class TensorFlowData {

  selectedMicrocontrollers: Array<MicroController> = [];
  selectOptionMicrocontroller: MicroController;
  selectedModel: Model = new Model(uuid(), 'model', 'NeuralNetwork', new NN_options('classification', false, 0.2, 4))

  modelOptions = [ { option: 'NeuralNetwork', enabled: true },
                   { option: 'KNNClassifier', enabled: false },
                   { option: 'kMeans', enabled: false } ];

  NN_task_options = [{ option: 'classification', enabled: true },
                     { option: 'regression', enabled: true }];

  kMeans_options = [{ name: 'k clusters', value: 3 },
                    { name: 'Max iterations', value: 4 },
                    { name: 'threshold', value: 0.5 } ];

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
