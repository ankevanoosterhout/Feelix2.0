import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { MicroController } from '../models/hardware.model';
import { Model, DataSet, Classifier, Data, NN_options, Label } from '../models/ml5js.model';
import { HardwareService } from './hardware.service';
import p5 from 'p5';
import ml5 from 'ml5';
import { DataSetService } from './dataset.service';
import { Subject } from 'rxjs';
import { ML5ModelService } from './ml5-model.service';
import { Filter, FilterType } from '../models/filter.model';
import { FilterModel, UploadModel } from '../models/effect-upload.model';
import { ElectronService } from 'ngx-electron';
import { FileSaverService } from 'ngx-filesaver';

@Injectable()
export class ML5jsService {

    public modelSet = [
      new Model(uuid(), 'model', 'NeuralNetwork', new NN_options('classification', false, 0.2, 16), { epochs: 32, batchSize: 12 }),
      new Model(uuid(), 'model', 'KNNClassifier', {}, {}),
      new Model(uuid(), 'model', 'kMeans', { k_clusters: 3, max_iterations: 4, threshold: 0.5 }, {}),
    ];

    public NN_task_options = [ 'classification' ];
    // public NN_task_options = [ 'classification', 'regression' ];
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

    public processing = false;


    public classify = false;
    public recording = { active: false, starttime: null };

    loss: any = null;

    updateML5jsProgress: Subject<any> = new Subject();
    reloadPage: Subject<any> = new Subject();
    updateResizeElements: Subject<any> = new Subject();

    constructor(@Inject(DOCUMENT) private document: Document, public hardwareService: HardwareService, private dataSetService: DataSetService,
                private ml5ModelService: ML5ModelService, private electronService: ElectronService, private _FileSaverService: FileSaverService) {}




    deleteDataSet() {
      const set = this.dataSets.filter(s => s.open)[0];
      if (set) {
        const index = this.dataSets.indexOf(set);
        this.dataSets.splice(index, 1);
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
        console.log(error);
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
            outputs.push('"' + classifier.name + '":"' + set.d.outputs[i] + '"');
            i++;
          }
        }
        if (train && outputs.length === 0) {
          this.processing = false;
          this.updateProgess('cannot find outputs', 0);
          return false;
        }

        const outputstr = outputs.join(',');
        const outputObject = JSON.parse('{' + outputstr + '}');

        set.d.inputs.forEach(input => {
          let inputs = [];

          for (const motor of input.motors) {
            for (let _i = 0; _i < motor.length; _i++) {
              const input_variable = this.selectedModel.inputs.filter(i => i.name === motor[_i].data.name)[0];
              if (input_variable.active) {
                inputs.push('"' + motor[_i].data.name + '-' + motor[_i].motor + '":' + motor[_i].data.value);
              }
            }
          }
          const input_var = this.selectedModel.inputs.filter(i => i.name === input.inputdata.name)[0];
          if (input_var.active) {
            inputs.push('"' + input.inputdata.name + '":' + input.inputdata.value);
          }

          const inputstr = inputs.join(',');
          let inputObject = JSON.parse('{' + inputstr + '}');

          data.push({ xs: inputObject, ys: outputObject });
        });
      });

      return data;
    }

    selectDataSet(id: String) {
      for (const set of this.dataSets) {
        if (set.id !== id) { set.open = false; }
        else if (set.id === id) { set.open = true; }
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
      this.updateML5jsProgress.next({ status: _status, progress: _progress });
    }


    updateResize(_coord: number) {
      this.updateResizeElements.next({ coord: _coord })
    }




    NN_createData(data: Array<any>, model: Model) {

      this.selectedModel.model = ml5.neuralNetwork(model.options);

      this.updateProgess('model loaded', 40);

      if (data.length > 0) {
        data.forEach(item => {
          this.selectedModel.model.addData(item.xs, item.ys);
        });

        this.selectedModel.model.normalizeData();

        this.updateProgess('training model', 60);

        this.selectedModel.model.train(model.trainingOptions, this.whileTraining, this.finishedTraining);
      } else {
        this.updateProgess('no data found, training canceled', 0);
        this.processing = false;
        return false;
      }
    }


    whileTraining = ((epoch: any, loss: any) => {
      console.log(epoch, loss);
      this.loss = loss;
      this.updateProgess('epoch: ' + epoch + ' loss: ' + loss.loss, 80);
    }).bind(this);

    finishedTraining = (() => {
      this.processing = false;

      this.updateProgess('finished training ' + (this.loss ? 'loss: ' + this.loss.loss : ''), 100);
    }).bind(this);



    NN_Deploy(input: any, selectedModel: any, serialPath: string) {

      if (selectedModel.options.task === 'classification') {
        if (selectedModel.multiple) {
          this.selectedModel.model.classify(input, this.handleClassificationResults(serialPath));
        } else {
          this.selectedModel.model.classifyMultiple(input, this.handleClassificationResults(serialPath));
        }
      } else {
        this.selectedModel.model.predict(input, this.handleRegressionResults);
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



    handleClassificationResults = ((serialPath: string, error: any, result: any) => {
      if(error){
        this.updateProgess(error, 0);
        this.classify = false;
        console.error(error);
        return;
      }
      for (const output of this.selectedModel.outputs) {
        for (const label of output.labels) {
          const result_label = result.filter((r: { label: string; }) => r.label == label.name)[0];
          console.log(result_label);
          if (result_label) {
            label.confidence = result_label.confidence;
            this.document.getElementById('bar-' + output.name + '-' + label.name).style.width = (label.confidence * 100) + '%';
            this.document.getElementById('confidence-' + output.name + '-' + label.name).innerHTML = (label.confidence * 100).toFixed(2) + '%';
          }
        }
      }

      let filterArray = [];

      for (const filter of this.selectedModel.filters) {
        const classifier = this.selectedModel.outputs.filter(o => o.name === filter.classifier.name)[0];
        if (classifier && classifier.labels.length > 0) {
          const highestConfidenceLabel = this.getHighestConfidenceLabel(classifier);
          console.log(highestConfidenceLabel.name);
          console.log(filter);
          let index = classifier.labels.indexOf(highestConfidenceLabel);
          if (index > -1) {


            filter.functionVariable.value[index] = filter.functionVariable.value[index] / 100;

            if (filter.functionVariable.value[index] !== filter.functionVariable.prevValue[index] || filter.type.name === 'noise') {
              if (filter.type.name === 'amplify' || filter.type.name === 'constrain') {

                let filterObj = { type: filter.type.name, value: filter.functionVariable.value[index], smoothness: filter.type.interpolate };
                filterArray.push(filterObj);

              } else if (filter.type.name === 'noise') {

                const newRandom = (Math.floor(Math.random() * (filter.functionVariable.value[index] * 2)) - filter.functionVariable.value[index]) / 100;
                let filterObj = { type: filter.type.name, value: newRandom, smoothness: filter.type.interpolate };

                filterArray.push(filterObj);
              }
            }
            filter.functionVariable.prevValue[index] = filter.functionVariable.value[index];
          }

        }
        if (filterArray.length > 0) {
          const microcontroller = this.selectedMicrocontrollers.filter(m => m.serialPort.path === serialPath)[0];
          if (microcontroller) {
            const newUploadModel = new FilterModel(filterArray, microcontroller);
            console.log(newUploadModel);
            this.electronService.ipcRenderer.send('updateFilter', newUploadModel);
          }
        }
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
      const model = this.ml5ModelService.getModel(id);
      console.log(model);
      const modelStr = JSON.stringify(model.model);
      if (model) {
        this.selectedModel = model;
        this.selectedModel.model = JSON.parse(modelStr);
        console.log(this.selectedModel.model);
        this.updateModelSettings(this.selectedModel);
        this.updateProgess('Model loaded', 100);
      } else {
        this.updateProgess('Error: no model found', 0);
      }
    }

    saveModel() {
      if (this.selectedModel) {
        this.selectedModel.id = this.ml5ModelService.saveModel(this.selectedModel);
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

          (this.document.getElementById('epochs') as HTMLInputElement).value = model.trainingOptions.epochs;
          (this.document.getElementById('batchsize') as HTMLInputElement).value = model.trainingOptions.batchSize;
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
