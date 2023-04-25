import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { MicroController } from '../models/hardware.model';
import { Model, DataSet, Classifier, Data, NN_options, Label, MotorEl, ModelVariable, ModelType, Regression_options } from '../models/tensorflow.model';
import { HardwareService } from './hardware.service';
import { DataSetService } from './dataset.service';
import { Subject } from 'rxjs';
import { TensorFlowModelService } from './tensorFlow-model.service';
import { FilterModel, UploadStringModel } from '../models/effect-upload.model';
import { ElectronService } from 'ngx-electron';
import { FileSaverService } from 'ngx-filesaver';
// import * as tf from '@tensorflow/tfjs';
import { TensorFlowData } from '../models/tensorflow-data.model';
// import { Tensor2D } from '@tensorflow/tfjs';

@Injectable()
export class TensorFlowMainService {

    public learningType = ['supervised learning', 'unsupervised learning', 'reinforcement learning' ];

    public d: TensorFlowData;

    updateTensorflowProgress: Subject<any> = new Subject();
    reloadPage: Subject<any> = new Subject();
    updateResizeElements: Subject<any> = new Subject();
    updateGraphBounds: Subject<any> = new Subject();
    updateGraph: Subject<any> = new Subject();
    drawTrimLines: Subject<any> = new Subject();
    createJSON: Subject<any> = new Subject();

    constructor(@Inject(DOCUMENT) private document: Document, public hardwareService: HardwareService, private dataSetService: DataSetService,
                private tensorflowModelService: TensorFlowModelService, private electronService: ElectronService, private _FileSaverService: FileSaverService) {

                  this.d = new TensorFlowData();
                }




    deleteDataSet() {
      const set = this.d.dataSets.filter(s => s.open)[0];
      if (set) {
        const index = this.d.dataSets.indexOf(set);
        this.d.dataSets.splice(index, 1);
        if (this.d.dataSets.length > 0) {
          this.selectDataSet(this.d.dataSets[0].id);
        } else {
          this.updateGraph.next();
        }
      }
    }

    addDataSet() {
      const newID = uuid();
      this.d.dataSets.push(new DataSet(newID, 'Data set ' + (this.d.dataSets.length + 1), this.d.selectedMicrocontrollers));
      this.selectDataSet(newID);
    }

    saveDataSet(dataSet: DataSet = this.d.selectedDataset) {
      if (dataSet) {
        this.dataSetService.saveDataSet(dataSet);
        this.updateProgess(dataSet.name + ' saved', 100);
      }
    }

    saveCopyDataSet() {
      const copy = this.dataSetService.copyDataSet(this.d.selectedDataset);
      if (copy) {
        copy.name += '-copy';
        this.d.dataSets.push(copy);
        this.saveDataSet(copy);
        this.selectDataSet(copy.id);
      }
    }

    exportDataSet() {
      const dataSet = this.d.dataSets.filter(d => d.open)[0];
      if (dataSet) {
        const data = { data: this.createJSON.next({ data: [dataSet], train: false }) };
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
      if (this.d.selectedDataset && this.d.selectedDataset.m.length > 0) {

        this.d.trimLinesVisible = true;

        this.d.trimLines[0].value = this.d.selectedDataset.bounds.xMin + 100;
        this.d.trimLines[1].value = this.d.selectedDataset.bounds.xMax - 100;

        this.drawTrimLines.next({ bounds: this.d.selectedDataset.bounds, visible: this.d.trimLinesVisible, lines: this.d.trimLines });
      }
    }


    trimSet() {
      let Ymin = -1;
      let Ymax = 1;
      const dataSetCopy = this.dataSetService.copyDataSet(this.d.selectedDataset);
      dataSetCopy.name = this.d.selectedDataset.name + '-copy';

      for (const m of dataSetCopy.m) {
        if (m.d.length > 0) {
          for (let i = m.d.length - 1; i >= 0; i--) {
            if (m.d[i].time < this.d.trimLines[0].value || m.d[i].time > this.d.trimLines[1].value) {
              m.d.splice(i, 1);
            } else {
              m.d[i].time -= Math.floor(this.d.trimLines[0].value);
              for (const el of m.d[i].inputs) {
                if (el.name !== 'direction' && this.d.selectedModel.inputs.filter(i => i.name === el.name && i.active && i.visible).length > 0) {
                  if (el.value > Ymax) { Ymax = el.value; } else if (el.value < Ymin) { Ymin = el.value; }
                }
              }
            }
          }
        }
      }
      const span = this.d.trimLines[1].value - this.d.trimLines[0].value;

      dataSetCopy.bounds.xMin = 0;
      dataSetCopy.bounds.xMax = span < 1000 ? Math.ceil(span / 100) * 100 : span < 3000 ? Math.ceil(span / 200) * 200 : Math.ceil(span / 500) * 500;
      dataSetCopy.bounds.yMin = Ymin < -10 || Ymax > 10 ? Math.floor(Ymin/10) * 10 : Math.floor(Ymin/2) * 2;
      dataSetCopy.bounds.yMax = Ymin < -10 || Ymax > 10 ? Math.ceil(Ymax/10) * 10 : Math.ceil(Ymax/2) * 2;

      this.d.trimLinesVisible = false;

      this.d.dataSets.push(dataSetCopy);
      this.selectDataSet(dataSetCopy.id);

    }


    scaleYaxisBounds(dataSet: DataSet) {
      let Ymin = -1;
      let Ymax = 1;
      for (const m of dataSet.m) {
        for (const d of m.d) {
          for (const input of d.inputs) {
            if (input.name !== 'direction' && this.d.selectedModel.inputs.filter(i => i.name === input.name && i.active && i.visible).length > 0) {
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
      if (this.d.selectedModel.model) {
        this.d.selectedModel.model.saveData('training-data-' + this.d.selectedModel.name, this.itemsSaved);
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






    selectDataSet(id: String = this.d.selectedDataset.id) {
      this.d.trimLinesVisible = false;

      for (const set of this.d.dataSets) {
        set.open = set.id === id ? true : false;
        if (set.open) {
          this.updateGraphBounds.next(set.bounds);
          this.d.selectedDataset = set;
          this.updateGraph.next({ set: set, model: this.d.selectedModel, mcus: this.d.selectedMicrocontrollers, trimLines: this.d.trimLinesVisible ? this.d.trimLines : null });
        }
      }
    }

    updateBoundsActiveDataset() {
      if (this.d.selectedDataset && this.d.selectedDataset.m.length > 0) {
        const endTime = this.d.selectedDataset.m[0].d[this.d.selectedDataset.m[0].d.length - 1].time;
        this.d.selectedDataset.bounds.xMax = endTime < 3000 ? (Math.ceil(endTime / 200) * 200) : (Math.ceil(endTime / 500) * 500);
        this.updateGraphBounds.next(this.d.selectedDataset.bounds);
        this.updateGraph.next({ set: this.d.selectedDataset, model: this.d.selectedModel, mcus: this.d.selectedMicrocontrollers, trimLines: this.d.trimLinesVisible ? this.d.trimLines : null });
      }
    }

    updateOutputDataSet(index: number) {
      this.d.selectedDataset.output.classifier_id = this.d.selectedModel.outputs[index].id;
      this.d.selectedDataset.output.classifier_name = this.d.selectedModel.outputs[index].name;
    }

    selectClassifier(id: string) {
      for (const output of this.d.selectedModel.outputs) {
        output.active = output.id === id ? true : false;
      }
    }

    updateDataSetName(id: String) {
      const value = (this.document.getElementById('dataSet-' + id) as HTMLInputElement).value;
      this.d.dataSets.filter(d => d.id === id)[0].name = value;
    }

    updateModelType() {
      this.d.selectedModel.options = this.d.selectedModel.type === ModelType.neuralNetwork ? new NN_options() : new Regression_options();
    }

    addInputItem() {
      const nrOfInputs = this.d.selectedModel.inputs.length;
      this.d.selectedModel.inputs.push(new ModelVariable('untitled-' + (nrOfInputs - 5), false, false, '#FFFFFF', 'V' + (nrOfInputs - 5)));
    }

    deleteInputItem(i: number) {
      this.d.selectedModel.inputs.splice(i, 1);
    }

    updateInput(i: number) {
      const value = (this.document.getElementById('input-' + i) as HTMLInputElement).value;
      this.d.selectedModel.inputs[i].name = value;
    }

    deleteClassifier(i: number) {

      if (this.d.selectedModel.outputs.length === 1) {
        this.addClassifier();
      }
      if (this.d.selectedModel.outputs[i].active) {
        this.d.selectedModel.outputs.filter(o => o.id !== this.d.selectedModel.outputs[i].id && !o.active)[0].active = true;
      }
      this.d.selectedModel.outputs.splice(i, 1);
    }

    addClassifier() {
      this.d.selectedModel.outputs.push(new Classifier(uuid(), 'Classifier-' + (this.d.selectedModel.outputs.length + 1)));
    }

    updateClassifier(i: number, pos: number) {
      console.log(i, pos);
      const value = (this.document.getElementById('classifier-' + pos + '-' + i) as HTMLInputElement).value;
      this.d.selectedModel.outputs[i].name = value;
      (this.document.getElementById('classifier-' + (pos === 1 ? 2 : 1) + '-' + i) as HTMLInputElement).value = value;
    }

    addLabelToClassifier(i: number) {
      this.d.selectedModel.outputs[i].open = true;
      this.d.selectedModel.outputs[i].labels.push(new Label(uuid(), 'label-' + (this.d.selectedModel.outputs[i].labels.length + 1)));
    }

    deleteLabel(classifier_name: String, i:number) {
      this.d.selectedModel.outputs.filter(c => c.name === classifier_name)[0].labels.splice(i, 1);
    }

    updateClassifierLabel(classifier_name: String, i: number) {
      const value = (this.document.getElementById(classifier_name + '-label-' + i) as HTMLInputElement).value;
      this.d.selectedModel.outputs.filter(c => c.name === classifier_name)[0].labels[i].name = value;
    }

    deleteFilter(id: string) {
      const filterItem = this.d.selectedModel.filters.filter(f => f.id === id)[0];
      if (filterItem) {
        const index = this.d.selectedModel.filters.indexOf(filterItem);
        if (index > -1) {
          this.d.selectedModel.filters.splice(index, 1);
        }
      }
    }




    deleteMicrocontroller(id: String) {
      const microcontroller = this.d.selectedMicrocontrollers.filter(m => m.id === id)[0];
      if (microcontroller) {
        if (this.d.dataSets.length > 0) {
          for (const set of this.d.dataSets) {
            this.removeMicrocontrollerFromDataset(microcontroller, set);
          }
          if (this.d.selectedDataset) { this.selectDataSet(this.d.selectedDataset.id); }
        }
        const index = this.d.selectedMicrocontrollers.indexOf(microcontroller);
        this.d.selectedMicrocontrollers.splice(index, 1);
      }
    }

    addMicrocontroller() {
      if (this.d.selectOptionMicrocontroller !== undefined && this.d.selectedMicrocontrollers.filter(m => m.id === this.d.selectOptionMicrocontroller.id).length === 0) {
        for (const motor of this.d.selectOptionMicrocontroller.motors) {
          motor.record = true;
        }
        this.d.selectedMicrocontrollers.push(this.d.selectOptionMicrocontroller);
        for (const set of this.d.dataSets) {
          if (set.m.filter(m => m.mcu.id === this.d.selectOptionMicrocontroller.id).length === 0) {
            this.addMicrocontrollerToDataSet(this.d.selectOptionMicrocontroller, set);
          }
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



    stopTraining() {
      this.d.processing = false;
      this.d.selectedModel.model.stopTraining = true;
    }





    resetFiltersMicrocontroller() {
      for (const microcontroller of this.d.selectedMicrocontrollers) {
        const newUploadStringModel = new UploadStringModel(microcontroller, 'FFR');
        this.electronService.ipcRenderer.send('send_data_str', newUploadStringModel);
      }
    }



    importModel() {
      //select a folder
    }


    exportModel() {
      if (this.d.selectedModel) {
        if (this.d.selectedModel.model) {
          this.d.selectedModel.model.save();
          this.updateProgess('Save exported files', 100);
        } else {
          this.updateProgess('Error: model not initialized', 0);
        }
      }
    }

    loadModel(id: String) {
      const modelData = this.tensorflowModelService.getModel(id);
      console.log(modelData);
      if (modelData) {
        this.d.selectedModel = modelData;
        if (modelData.model) {
          const modelStr = JSON.stringify(modelData.model);
          console.log(modelStr);
          this.d.selectedModel.model = JSON.parse(modelStr);
          // console.log(this.selectedModel.model);
        }
        this.updateModelSettings(this.d.selectedModel);
        this.updateProgess('Model loaded', 100);
      } else {
        this.updateProgess('Error loading model', 0);
      }
    }

    saveModel() {
      if (this.d.selectedModel) {
        this.d.selectedModel.id = this.tensorflowModelService.saveModel(this.d.selectedModel);
        this.updateProgess('model saved', 100);
      }
    }

    updateModelSettings(model: Model) {
      (this.document.getElementById('model_type') as HTMLSelectElement).selectedIndex = ModelType.neuralNetwork;

      if (model.type === ModelType.neuralNetwork) {
        (this.document.getElementById('learningRate') as HTMLInputElement).value = model.options.learningRate;
        (this.document.getElementById('hiddenUnits') as HTMLInputElement).value = model.options.hiddenUnits;

        (this.document.getElementById('epochs') as HTMLInputElement).value = model.options.trainingOptions.epochs;
        (this.document.getElementById('batchsize') as HTMLInputElement).value = model.options.trainingOptions.batchSize;
      }

      (this.document.getElementById('modelName') as HTMLInputElement).value = model.name;

      this.updateVariables(model.inputs);
      this.updateVariables(model.outputs);
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
