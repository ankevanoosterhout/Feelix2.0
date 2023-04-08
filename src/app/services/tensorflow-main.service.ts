import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { MicroController } from '../models/hardware.model';
import { Model, DataSet, Classifier, Data, NN_options, Label } from '../models/tensorflow.model';
import { HardwareService } from './hardware.service';
import { DataSetService } from './dataset.service';
import { Subject } from 'rxjs';
import { TensorFlowModelService } from './tensorFlow-model.service';
import { FilterModel, UploadStringModel } from '../models/effect-upload.model';
import { ElectronService } from 'ngx-electron';
import { FileSaverService } from 'ngx-filesaver';
import * as tf from '@tensorflow/tfjs';
// import { Tensor2D } from '@tensorflow/tfjs';

@Injectable()
export class TensorFlowMainService {

    public modelSet = [
      new Model(uuid(), 'model', 'NeuralNetwork', new NN_options('classification', false, 0.2, 4)),
      new Model(uuid(), 'model', 'KNNClassifier', {}),
      new Model(uuid(), 'model', 'kMeans', { k_clusters: 3, max_iterations: 4, threshold: 0.5 }),
    ];

    // public NN_task_options = [ 'classification' ];
    public NN_task_options = [{ option: 'classification', enabled: true }, { option: 'regression', enabled: false }];
    public modelOptions = [ 'NeuralNetwork' ];
    // public modelOptions = [ 'NeuralNetwork', 'KNNClassifier', 'kMeans' ];
    public selectedModel: Model = this.modelSet[0];

    public kMeans_options = [
      { name: 'k clusters', value: 3 },
      { name: 'Max iterations', value: 4 },
      { name: 'threshold', value: 0.5 }
    ];

    public selectedMicrocontrollers: Array<MicroController> = [];
    public selectOptionMicrocontroller: MicroController;

    public motorList = [];

    public dataSets: Array<DataSet> = [];
    public selectedDataset = null;

    public processing = false;


    public classify = false;
    public recording = { active: false, starttime: null };

    loss: any = null;
    serialPath: any;

    updateTensorflowProgress: Subject<any> = new Subject();
    reloadPage: Subject<any> = new Subject();
    updateResizeElements: Subject<any> = new Subject();
    updateGraphBounds: Subject<any> = new Subject();
    updateGraph: Subject<any> = new Subject();

    constructor(@Inject(DOCUMENT) private document: Document, public hardwareService: HardwareService, private dataSetService: DataSetService,
                private tensorflowService: TensorFlowModelService, private electronService: ElectronService, private _FileSaverService: FileSaverService) {}




    deleteDataSet() {
      const set = this.dataSets.filter(s => s.open)[0];
      if (set) {
        const index = this.dataSets.indexOf(set);
        this.dataSets.splice(index, 1);
        if (this.dataSets.length > 0) {
          this.selectDataSet(this.dataSets[0].id);
        }
      }
    }

    addDataSet() {
      const newID = uuid();
      this.dataSets.push(new DataSet(newID, 'Data set ' + (this.dataSets.length + 1)));
      this.selectDataSet(newID);
    }

    saveDataSet() {
      const dataSet = this.dataSets.filter(d => d.open)[0];
      if (dataSet) {
        this.dataSetService.saveDataSet(dataSet);
        this.updateProgess(dataSet.name + ' saved', 100);
      }
    }

    exportDataSet() {
      const dataSet = this.dataSets.filter(d => d.open)[0];
      if (dataSet) {
        const data = { data: this.createJSONfromDataSet([dataSet], false) };
        const blob = new Blob([JSON.stringify(data)], { type: 'text/plain' });
        const fileName = dataSet.name + '.json';
        this._FileSaverService.save(blob, fileName, 'text/plain');
      } else {
        this.updateProgess('No data set selected', 0);
      }
    }

    importDataSet() {
      //open dialogue window
    }

    trimDataSet() {
      const dataSet = this.dataSets.filter(d => d.open)[0];
      if (dataSet) {
        //remove empty spots at start/end
        console.log('write remove empty data function');
      }
    }

    loadDataSet() {
      //open
      this.electronService.ipcRenderer.send('load-dataset');
    }

    saveDataNN() {
      if (this.selectedModel.model) {
        this.selectedModel.model.saveData('training-data-' + this.selectedModel.name, this.itemsSaved);
      } else {
        this.exportDataSet();
      }
    }

    itemsSaved = ((error: any) => {
      if (error) {
        // console.log(error);
        this.updateProgess('not able to save data ' + error, 0);
        return;
      } else {
        this.updateProgess('data saved', 100);
      }
    }).bind(this);

    createJSONfromDataSet(dataSets: Array<DataSet>, train = true) {
      let data = [];

      dataSets.forEach(set => {
        let outputs = [];

        let i = 0;

        for (const classifier of this.selectedModel.outputs) {


          if (classifier.active) {
            for (const label of classifier.labels) {
              label.name === set.d.outputs[i] ? outputs.push(1) : outputs.push(0);
            }
            i++;
          }
        }
        if (train && outputs.length === 0) {
          this.processing = false;
          this.updateProgess('cannot find outputs', 0);
          return false;
        }

        // const outputstr = outputs.join(',');
        // const outputObject = JSON.parse('{' + outputstr + '}');

        console.log(set.d.inputs);

        set.d.inputs.forEach(input => {
          let inputs = [];

          for (const motor of input.motors) {
            for (let _i = 0; _i < motor.length; _i++) {
              const input_variable = this.selectedModel.inputs.filter(i => i.name === motor[_i].data.name)[0];
              if (input_variable.active) {
                inputs.push(motor[_i].data.value);
                // inputs.push('"' + motor[_i].data.name + '-' + motor[_i].motor + '":' + motor[_i].data.value);
              }
              inputs.push(motor.index);
            }
            inputs.push(input.port);
          }
          data.push({ xs: inputs, ys: outputs });
        });
      });

      return data;
    }

    selectDataSet(id: String = this.selectedDataset.id) {
      for (const set of this.dataSets) {
        set.open = set.id === id ? true : false;
        if (set.open) {
          this.updateGraphBounds.next(set.bounds);
          this.selectedDataset = set;
          this.updateGraph.next({ set: set, model: this.selectedModel, mcus: this.selectedMicrocontrollers });
        }
      }
    }

    updateOutputDataSet(id: String, output_list_index: number) {
      const value = (this.document.getElementById(id + '-output-' + output_list_index) as HTMLInputElement).value;
      this.dataSets.filter(d => d.id === id)[0].d.outputs[output_list_index] = value.substring(3);
    }

    updateDataSetName(id: String) {
      const value = (this.document.getElementById('dataSet-' + id) as HTMLInputElement).value;
      this.dataSets.filter(d => d.id === id)[0].name = value;
    }

    deleteClassifier(i: number) {
      this.selectedModel.outputs.splice(i, 1);
    }

    addClassifier() {
      this.selectedModel.outputs.push(new Classifier('Classifier-' + (this.selectedModel.outputs.length + 1)));
    }



    updateClassifier(i: number) {
      const value = (this.document.getElementById('classifier-' + i) as HTMLInputElement).value;
      this.selectedModel.outputs[i].name = value;
    }

    addLabelToClassifier(i: number) {
      this.selectedModel.outputs[i].open = true;
      this.selectedModel.outputs[i].labels.push(new Label('label-' + (this.selectedModel.outputs[i].labels.length + 1)));
    }

    deleteLabel(classifier_name: String, i:number) {
      this.selectedModel.outputs.filter(c => c.name === classifier_name)[0].labels.splice(i, 1);
    }

    updateClassifierLabel(classifier_name: String, i: number) {
      const value = (this.document.getElementById(classifier_name + '-label-' + i) as HTMLInputElement).value;
      this.selectedModel.outputs.filter(c => c.name === classifier_name)[0].labels[i].name = value;
    }

    deleteFilter(id: string) {
      const filterItem = this.selectedModel.filters.filter(f => f.id === id)[0];
      if (filterItem) {
        const index = this.selectedModel.filters.indexOf(filterItem);
        if (index > -1) {
          this.selectedModel.filters.splice(index, 1);
        }
      }
    }




    deleteMicrocontroller(id: String) {
      const microcontroller = this.selectedMicrocontrollers.filter(m => m.id === id)[0];
      if (microcontroller) {
        const index = this.selectedMicrocontrollers.indexOf(microcontroller);
        this.selectedMicrocontrollers.splice(index, 1);
      }
    }

    addMicrocontroller() {
      if (this.selectOptionMicrocontroller && this.selectedMicrocontrollers.filter(m => m.id === this.selectOptionMicrocontroller.id).length === 0) {
        for (const motor of this.selectOptionMicrocontroller.motors) {
          motor.record = true;
        }
        this.selectedMicrocontrollers.push(this.selectOptionMicrocontroller);
      }
    }


    updateProgess(_status: String, _progress: number) {
      this.updateTensorflowProgress.next({ status: _status, progress: _progress });
    }


    updateResize(_coord: number) {
      this.updateResizeElements.next({ coord: _coord })
    }




    NN_createData(data: Array<any>, modelObj: Model) {

      this.selectedModel.model = tf.sequential();

      this.selectedModel.model.name = modelObj.name;

      this.updateProgess('model created', 10);

      if (data.length > 0) {
        let outputs = [];
        let inputs = [];
        data.forEach(item => {
          // console.log(item);
          inputs.push(item.xs);
          outputs.push(item.ys);
        });
        // console.log(this.selectedModel.options.trainingOptions.batchSize, outputs[0].length);
        const iTensor = tf.tensor(inputs, [ inputs.length, inputs[0].length ]);
        const oTensor = tf.tensor(outputs, [ outputs.length, outputs[0].length ]);
        // const iTensor = tf.tensor(inputs, [ inputs.length,  inputs[0].length ]);
        // const oTensor = tf.tensor(outputs, [ outputs.length, outputs[0].length ]);
        console.log(iTensor, oTensor);

        for (let layer = 0; layer < modelObj.options.hiddenUnits; layer++) {
          const hiddenLayer = tf.layers.dense({
            units: inputs[0].length,
            inputShape: [ inputs[0].length ], // [ number of inputs, batch size ]
            activation: this.selectedModel.options.activation // make activation function adjustable in model settings
          });

          console.log(hiddenLayer);

          this.selectedModel.model.add(hiddenLayer);
        }

        const outputLayer = tf.layers.dense({
          units: outputs[0].length,
          activation: this.selectedModel.options.activation
        });

        this.selectedModel.model.add(outputLayer);

        const sgdOpt = tf.train.sgd(modelObj.options.learningRate);

        this.selectedModel.model.compile({
          optimizer: sgdOpt,
          loss: this.selectedModel.options.losses //make adjustable
        });

        console.log(this.selectedModel.model);
      //   this.selectedModel.model.normalizeData();

        this.updateProgess('training model', 20);

        this.train(iTensor, oTensor, modelObj.options.trainingOptions).then(() => {
          console.log('training is complete');

          this.processing = false;

          iTensor.dispose();
          oTensor.dispose();

          console.log("memory " + tf.memory().numTensors);

        });

      //   this.selectedModel.model.train(model.trainingOptions, this.whileTraining, this.finishedTraining);
      } else {
        this.updateProgess('no data found, training canceled', 0);
        this.processing = false;
        return false;
      }
    }


    async train(iTensor: any, oTensor: any, options: any) {

      const nrOfIterations = options.epochs > 10 ? Math.ceil(options.epochs / 10) : options.epochs;

      for (let i = 0; i < options.epochs; i++) {
        const response = await this.selectedModel.model.fit(iTensor, oTensor, {
          verbose: true,
          shuffle: true,
          batchSize: options.batchSize,
          epochs: nrOfIterations < options.epochs ? 10 : 1
        });
        if (i < nrOfIterations - 1) {
          this.updateProgess('training, loss = ' + response.history.loss[0], ((80/nrOfIterations) * i) + 20);
        } else {
          this.updateProgess('finished training ' + response.history.loss[0], 100);
        }
      }
    }

    NN_Deploy(input: any, selectedModel: any, path: string) {

      this.serialPath = path;
      console.log(input);
      console.log(input.length);

      if (selectedModel.options.task === 'classification') {
        const iTensor = tf.tensor2d(input);
        const outputs = this.selectedModel.model.predict(iTensor);
        const prediction = Array.from((outputs as any).dataSync());
        console.log(outputs);
        console.log(prediction);
        this.updatePredictionClassifiers(prediction);

        iTensor.dispose();
      }
    }


    updatePredictionClassifiers(results: Array<any>) {
      for (const output of this.selectedModel.outputs) {
        let i  = 0;
        for (const label of output.labels) {

          label.confidence = results[i];
          this.document.getElementById('bar-' + output.name + '-' + label.name).style.width = (label.confidence * 100) + '%';
          this.document.getElementById('confidence-' + output.name + '-' + label.name).innerHTML = (label.confidence * 100).toFixed(2) + '%';

          i++;
        }
      }
    }



    handleRegressionResults = ((error: any, result: any) => {
      if(error){
        this.updateProgess(error, 0);
        this.classify = false;
        console.error(error);
        return;
      }
      for (const output of this.selectedModel.outputs) {
        for (const label of output.labels) {
          const result_label = result.filter((r: { label: string; }) => r.label == label.name)[0];
          // label.prediction = result_label.;
          // this.document.getElementById('bar-' + output.name + '-' + label.name).style.width = (label.prediction * 100) + '%';
          // this.document.getElementById('confidence-' + output.name + '-' + label.name).innerHTML = (label.prediction  * 100).toFixed(2) + '%';
        }
      }
    }).bind(this);



    handleClassificationResults = ((error: any, result: any) => {
      if(error){
        this.updateProgess(error, 0);
        this.classify = false;
        // console.error(error);
        return;
      }
      for (const output of this.selectedModel.outputs) {
        for (const label of output.labels) {
          const result_label = result.filter((r: { label: string; }) => r.label == label.name)[0];
          // console.log(result_label);
          if (result_label) {
            label.confidence = result_label.confidence;
            this.document.getElementById('bar-' + output.name + '-' + label.name).style.width = (label.confidence * 100) + '%';
            this.document.getElementById('confidence-' + output.name + '-' + label.name).innerHTML = (label.confidence * 100).toFixed(2) + '%';
          }
        }
      }

      let filterArray = [];
      let n = 0;

      for (const filter of this.selectedModel.filters) {
        const classifier = this.selectedModel.outputs.filter(o => o.name === filter.classifier.name)[0];
        if (classifier && classifier.labels.length > 0) {
          const highestConfidenceLabel = this.getHighestConfidenceLabel(classifier);
          // console.log(highestConfidenceLabel.name);
          let index = classifier.labels.indexOf(highestConfidenceLabel);

          if (index > -1) {


            if ((filter.type.name === 'amplify' || filter.type.name === 'constrain') && filter.functionVariable.value[index] !== filter.functionVariable.prevValue) {

              let filterObj = { type: filter.type.slug, value: filter.functionVariable.value[index], smoothness: filter.type.interpolate };
              filterArray.push(filterObj);

              filter.functionVariable.prevValue = filter.functionVariable.value[index];

            } else if (filter.type.name === 'noise') {

              const newRandom = (Math.floor(Math.random() * ((filter.functionVariable.value[index] * 100) * 2)) - (filter.functionVariable.value[index] * 100)) / 100;
              let filterObj = { type: filter.type.slug, value: newRandom, smoothness: filter.type.interpolate };

              filterArray.push(filterObj);
            }
          }
        }
        if (n === this.selectedModel.filters.length - 1) {
          if (filterArray.length > 0) {
            // console.log('update filter');
            const microcontroller = this.selectedMicrocontrollers.filter(m => m.serialPort.path === this.serialPath)[0];
            if (microcontroller) {
              const filterModel = new FilterModel(filterArray, microcontroller);
              // console.log(filterModel);
              this.electronService.ipcRenderer.send('updateFilter', filterModel);
            }
          }
        }
        n++;
      }

    }).bind(this);



    getHighestConfidenceLabel(classifier: Classifier): Label {
      let maxConfidence = classifier.labels[0];
      for (const label of classifier.labels) {
        if (label.confidence > maxConfidence.confidence) {
          maxConfidence = label;
        }
      }
      return maxConfidence;
    }


    resetFiltersMicrocontroller() {
      for (const microcontroller of this.selectedMicrocontrollers) {
        const newUploadStringModel = new UploadStringModel(microcontroller, 'FFR');
        this.electronService.ipcRenderer.send('send_data_str', newUploadStringModel);
      }
    }



    importModel() {
      //select a folder
    }


    exportModel() {
      if (this.selectedModel) {
        if (this.selectedModel.model) {
          this.selectedModel.model.save();
          this.updateProgess('Save exported files', 100);
        } else {
          this.updateProgess('Error: model not initialized', 0);
        }
      }
    }

    loadModel(id: String) {
      const model = this.tensorflowService.getModel(id);
      // console.log(model);
      const modelStr = JSON.stringify(model.model);
      if (model) {
        this.selectedModel = model;
        this.selectedModel.model = JSON.parse(modelStr);
        // console.log(this.selectedModel.model);
        this.updateModelSettings(this.selectedModel);
        this.updateProgess('Model loaded', 100);
      } else {
        this.updateProgess('Error: no model found', 0);
      }
    }

    saveModel() {
      if (this.selectedModel) {
        this.selectedModel.id = this.tensorflowService.saveModel(this.selectedModel);
        this.updateProgess('model saved', 100);
      }
    }

    updateModelSettings(model: Model) {
      const item = this.modelOptions.filter(m => m === model.type)[0];
      const index = this.modelOptions.indexOf(item);

      if (index > -1) {
        (this.document.getElementById('model_type') as HTMLSelectElement).selectedIndex = index;

        if (model.type === 'NeuralNetwork') {
          const task = this.NN_task_options.filter(m => m === model.options.task)[0];
          const task_index = this.NN_task_options.indexOf(task);
          (this.document.getElementById('task') as HTMLSelectElement).selectedIndex = task_index;

          (this.document.getElementById('learningRate') as HTMLInputElement).value = model.options.learningRate;
          (this.document.getElementById('hiddenUnits') as HTMLInputElement).value = model.options.hiddenUnits;

          (this.document.getElementById('epochs') as HTMLInputElement).value = model.options.trainingOptions.epochs;
          (this.document.getElementById('batchsize') as HTMLInputElement).value = model.options.trainingOptions.batchSize;
        }

        (this.document.getElementById('modelName') as HTMLInputElement).value = model.name;

        this.updateVariables(model.inputs);
        this.updateVariables(model.outputs);
      }
    }

    updateVariables(variables: Array<any>) {
      for (const variable of variables) {
        const variable_el = this.document.getElementById(variable.id);
        const variable_name = this.document.getElementById('label-' + variable.id);
        if (variable_name) {
          variable_name.innerHTML = variable.name;
        }
        if (variable_el) {
          variable_el[0].checked = variable.active;
        }
      }
    }


}
