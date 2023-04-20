import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { MicroController } from '../models/hardware.model';
import { Model, DataSet, Classifier, Data, NN_options, Label, MotorEl } from '../models/tensorflow.model';
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
    public selectedDataset: DataSet = null;

    public processing = false;

    public classify = false;
    public recording = { active: false, starttime: null };

    trimLinesVisible = false;
    trimLines = [ { id: 0, value: null }, { id: 1, value: null } ];

    // loss: any = null;
    serialPath: any;

    updateTensorflowProgress: Subject<any> = new Subject();
    reloadPage: Subject<any> = new Subject();
    updateResizeElements: Subject<any> = new Subject();
    updateGraphBounds: Subject<any> = new Subject();
    updateGraph: Subject<any> = new Subject();
    drawTrimLines: Subject<any> = new Subject();

    constructor(@Inject(DOCUMENT) private document: Document, public hardwareService: HardwareService, private dataSetService: DataSetService,
                private tensorflowService: TensorFlowModelService, private electronService: ElectronService, private _FileSaverService: FileSaverService) {}




    deleteDataSet() {
      const set = this.dataSets.filter(s => s.open)[0];
      if (set) {
        const index = this.dataSets.indexOf(set);
        this.dataSets.splice(index, 1);
        if (this.dataSets.length > 0) {
          this.selectDataSet(this.dataSets[0].id);
        } else {
          this.updateGraph.next();
        }
      }
    }

    addDataSet() {
      const newID = uuid();
      this.dataSets.push(new DataSet(newID, 'Data set ' + (this.dataSets.length + 1), this.selectedMicrocontrollers));
      this.selectDataSet(newID);
    }

    saveDataSet(dataSet: DataSet = this.selectedDataset) {
      if (dataSet) {
        this.dataSetService.saveDataSet(dataSet);
        this.updateProgess(dataSet.name + ' saved', 100);
      }
    }

    saveCopyDataSet() {
      const copy = this.dataSetService.copyDataSet(this.selectedDataset);
      if (copy) {
        copy.name += '-copy';
        this.dataSets.push(copy);
        this.saveDataSet(copy);
        this.selectDataSet(copy.id);
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
      if (this.selectedDataset && this.selectedDataset.m.length > 0) {

        this.trimLinesVisible = true;

        this.trimLines[0].value = this.selectedDataset.bounds.xMin + 100;
        this.trimLines[1].value = this.selectedDataset.bounds.xMax - 100;

        this.drawTrimLines.next({ bounds: this.selectedDataset.bounds, visible: this.trimLinesVisible, lines: this.trimLines });
      }
    }


    trimSet() {
      let Ymin = -1;
      let Ymax = 1;
      const dataSetCopy = this.dataSetService.copyDataSet(this.selectedDataset);
      dataSetCopy.name = this.selectedDataset.name + '-copy';

      for (const m of dataSetCopy.m) {
        if (m.d.length > 0) {
          for (let i = m.d.length - 1; i >= 0; i--) {
            if (m.d[i].time < this.trimLines[0].value || m.d[i].time > this.trimLines[1].value) {
              m.d.splice(i, 1);
            } else {
              m.d[i].time -= Math.floor(this.trimLines[0].value);
              for (const el of m.d[i].inputs) {
                if (el.name !== 'direction' && this.selectedModel.inputs.filter(i => i.name === el.name && i.active && i.visible).length > 0) {
                  if (el.value > Ymax) { Ymax = el.value; } else if (el.value < Ymin) { Ymin = el.value; }
                }
              }
            }
          }
        }
      }
      const span = this.trimLines[1].value - this.trimLines[0].value;

      dataSetCopy.bounds.xMin = 0;
      dataSetCopy.bounds.xMax = span < 1000 ? Math.ceil(span / 100) * 100 : span < 3000 ? Math.ceil(span / 200) * 200 : Math.ceil(span / 500) * 500;
      dataSetCopy.bounds.yMin = Ymin < -10 || Ymax > 10 ? Math.floor(Ymin/10) * 10 : Math.floor(Ymin/2) * 2;
      dataSetCopy.bounds.yMax = Ymin < -10 || Ymax > 10 ? Math.ceil(Ymax/10) * 10 : Math.ceil(Ymax/2) * 2;

      this.trimLinesVisible = false;

      this.dataSets.push(dataSetCopy);
      this.selectDataSet(dataSetCopy.id);

    }


    scaleYaxisBounds(dataSet: DataSet) {
      let Ymin = -1;
      let Ymax = 1;
      for (const m of dataSet.m) {
        for (const d of m.d) {
          for (const input of d.inputs) {
            if (input.name !== 'direction' && this.selectedModel.inputs.filter(i => i.name === input.name && i.active && i.visible).length > 0) {
              if (input.value > Ymax) { Ymax = input.value; } else if (input.value < Ymin) { Ymin = input.value; }
            }
          }
        }
      }
      dataSet.bounds.yMin = Ymin < -10 || Ymax > 10 ? Math.floor(Ymin/10) * 10 : Math.floor(Ymin);
      dataSet.bounds.yMax = Ymin < -10 || Ymax > 10 ? Math.ceil(Ymax/10) * 10 : Math.ceil(Ymax);
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
      const data = { xs: [], ys: [] };


      console.log(dataSets);

      dataSets.forEach(set => {

        let outputs = [];

        if (set.output.label.id) {

          for (const classifier of this.selectedModel.outputs) {
            if (classifier.active && classifier.id === set.output.classifier_id) {
              for (const label of classifier.labels) {
                label.id === set.output.label.id ? outputs.push(1) : outputs.push(0);
              }
            }
          }
          if (train && outputs.length === 0) {
            this.processing = false;
            this.updateProgess('cannot find outputs', 0);
            return false;
          }

          console.log(outputs);
        }

        // const outputstr = outputs.join(',');
        // const outputObject = JSON.parse('{' + outputstr + '}');

        console.log(set.m);


        let m = 0;


        set.m.forEach(motor => {
          let inputArray = [];
          let i = 0;
          let n = 0;

          if (motor.d.length > 0) {
            // const mcu = this.selectedMicrocontrollers.filter(m => m.id === motor.mcu.id)[0];
            // let i = 0;

            for (const d of motor.d) {
              const inputs = [];
              for (const input of d.inputs) {
                const input_variable = this.selectedModel.inputs.filter(i => i.name === input.name)[0];
                if (input_variable && input_variable.active) {
                  inputs.push(input.value);
                }
              }


              if (m !== 0) {
                data.xs[n][i].push(inputs);
              } else {
                inputArray.push([inputs]);
              }

              i++;

              if (i >= 20) {
                if (m === 0) {
                  data.xs.push(inputArray);
                  data.ys.push(outputs);
                } else {
                  n++;
                }
                i = 0;
                inputArray = [];
              }

              // inputs.push(this.selectedMicrocontrollers.indexOf(mcu));

              // inputArray.push(inputs);
              // data.push({ xs: inputs, ys: outputs }); // shape [[2][[inputs.length]]]
            }
          }
          // motors.push(inputArray);
          m++;
        });
      });

      // if (inputArray.length > 20) {
      //       data.xs.push(inputArray);
      //       data.ys.push(outputs);
      //       inputArray = [];
      //     }

      console.log(data);
      return data;
    }

    selectDataSet(id: String = this.selectedDataset.id) {
      this.trimLinesVisible = false;

      for (const set of this.dataSets) {
        set.open = set.id === id ? true : false;
        if (set.open) {
          this.updateGraphBounds.next(set.bounds);
          this.selectedDataset = set;
          this.updateGraph.next({ set: set, model: this.selectedModel, mcus: this.selectedMicrocontrollers, trimLines: this.trimLinesVisible ? this.trimLines : null });
        }
      }
    }

    updateBoundsActiveDataset() {
      if (this.selectedDataset && this.selectedDataset.m.length > 0) {
        const endTime = this.selectedDataset.m[0].d[this.selectedDataset.m[0].d.length - 1].time;
        this.selectedDataset.bounds.xMax = endTime < 3000 ? (Math.ceil(endTime / 200) * 200) : (Math.ceil(endTime / 500) * 500);
        this.updateGraphBounds.next(this.selectedDataset.bounds);
        this.updateGraph.next({ set: this.selectedDataset, model: this.selectedModel, mcus: this.selectedMicrocontrollers, trimLines: this.trimLinesVisible ? this.trimLines : null });
      }
    }

    updateOutputDataSet(index: number) {
      this.selectedDataset.output.classifier_id = this.selectedModel.outputs[index].id;
      this.selectedDataset.output.classifier_name = this.selectedModel.outputs[index].name;
    }

    selectClassifier(id: string) {
      for (const output of this.selectedModel.outputs) {
        output.active = output.id === id ? true : false;
      }
    }


    updateDataSetName(id: String) {
      const value = (this.document.getElementById('dataSet-' + id) as HTMLInputElement).value;
      this.dataSets.filter(d => d.id === id)[0].name = value;
    }

    deleteClassifier(i: number) {
      this.selectedModel.outputs.splice(i, 1);
    }

    addClassifier() {
      this.selectedModel.outputs.push(new Classifier(uuid(), 'Classifier-' + (this.selectedModel.outputs.length + 1)));
    }



    updateClassifier(i: number) {
      const value = (this.document.getElementById('classifier-' + i) as HTMLInputElement).value;
      this.selectedModel.outputs[i].name = value;
    }

    addLabelToClassifier(i: number) {
      this.selectedModel.outputs[i].open = true;
      this.selectedModel.outputs[i].labels.push(new Label(uuid(), 'label-' + (this.selectedModel.outputs[i].labels.length + 1)));
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
        if (this.dataSets.length > 0) {
          for (const set of this.dataSets) {
            this.removeMicrocontrollerFromDataset(microcontroller, set);
          }
          if (this.selectedDataset) { this.selectDataSet(this.selectedDataset.id); }
        }
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
      for (const set of this.dataSets) {
        if (set.m.filter(m => m.mcu.id === this.selectOptionMicrocontroller.id).length === 0) {
          this.addMicrocontrollerToDataSet(this.selectOptionMicrocontroller, set);
        }
      }
    }

    addMicrocontrollerToDataSet(mcu: MicroController, dataSet: DataSet) {
      for (const m of mcu.motors) {
        const index = mcu.motors.indexOf(m);
        const motorEl = new MotorEl(mcu.id, mcu.name, mcu.serialPort.path, m.id, index);
        motorEl.record = m.record;
        motorEl.visible = true;
        dataSet.m.push(motorEl);
      }
    }

    removeMicrocontrollerFromDataset(mcu: MicroController, dataSet: DataSet) {
      for (const m of dataSet.m) {
        if (m.mcu.id === mcu.id) {
          const index = dataSet.m.indexOf(m);
          if (index > -1) {
            dataSet.m.splice(index, 1);
          }
        }
      }
    }

    updateProgess(_status: String, _progress: number) {
      this.updateTensorflowProgress.next({ status: _status, progress: _progress });
    }


    updateResize(_coord: number) {
      this.updateResizeElements.next({ coord: _coord })
    }




    NN_createData(data: any, modelObj: Model) {

      this.selectedModel.model = tf.sequential();

      this.selectedModel.model.name = modelObj.name;

      this.updateProgess('model created', 10);

      if (data.xs && data.ys) {

        const inputShape = [null, 20, 1, 3];
        const outputShape = [null, 2]

        // const iT = tf.tensor3d(data.xs);
        // const oT = tf.tensor2d(data.ys);

        // console.log(iT, oT);

        for (let layer = 0; layer < 4; layer++) {
          const hiddenLayer = tf.layers.dense({
            units: 20,
            inputShape: inputShape.slice(1), // [ number of inputs, batch size ]
            activation: this.selectedModel.options.activation // make activation function adjustable in model settings
          });

          console.log(hiddenLayer);

          this.selectedModel.model.add(hiddenLayer);

          // this.selectedModel.model.add(tf.layers.maxPooling2d({ poolSize: 2 }));

        }

        this.selectedModel.model.add(tf.layers.flatten());


        const outputLayer = tf.layers.dense({
          units: outputShape[1],
          activation: this.selectedModel.options.activation
        });

        this.selectedModel.model.add(outputLayer);

        // const val = this.selectedModel.model.layers[0].computeOutputShape(hiddenLayer.batchInputShape);

        //   // Printing output
        //   console.log(val);

        const sgdOpt = tf.train.sgd(this.selectedModel.options.learningRate);
        console.log(sgdOpt);

        this.selectedModel.model.compile({
          optimizer: sgdOpt,
          loss: 'categoricalCrossentropy' //make adjustable
        });
        console.log(this.selectedModel.options);
        console.log(this.selectedModel.model);
      //   this.selectedModel.model.normalizeData();

        this.updateProgess('start training', 20);

        const numSamples = data.xs.length;
        const inputTensor = tf.tensor(data.xs, [numSamples, 20, 1, 3]);
        const outputTensor = tf.tensor(data.ys, [numSamples, 2]);


        this.train(inputTensor, outputTensor, this.selectedModel.options.trainingOptions).then(() => {
          console.log('training is complete');

          this.document.body.style.cursor = 'default';

          this.processing = false;

          inputTensor.dispose();
          outputTensor.dispose();

          console.log("memory " + tf.memory().numTensors);

        });

      } else {
        this.updateProgess('no data found, training canceled', 0);
        this.processing = false;

        this.document.body.style.cursor = 'default';

        return false;
      }
    }


    async train(iTensor: any, oTensor: any, options: any) {
      console.log(iTensor, oTensor);
      for (let i = 0; i < options.epochs; i++) {
        const response = await this.selectedModel.model.fit(iTensor, oTensor, {
          verbose: true,
          shuffle: true,
          batchSize: options.batchSize,
          epochs: 1
        });
        if (i < options.epochs - 1) {
          if (i % 10 === 0) {
            this.updateProgess('training, loss = ' + response.history.loss[0], ((80/options.epochs) * i) + 20);
          }
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
