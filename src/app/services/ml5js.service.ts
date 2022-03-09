import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { MicroController } from '../models/hardware.model';
import { Model, DataSet, Classifier, Category } from '../models/ml5js.model';
import { HardwareService } from './hardware.service';
import p5 from 'p5';
import ml5 from 'ml5';

@Injectable()
export class ML5jsService {

  public modelSet = [
    new Model('NeuralNetwork', { NN_task: 'classification', debug: false }),
    // new Model('FeatureExtractor', []),
    new Model('KNNClassifier', {}),
    new Model('kMeans', { k_clusters: 3, max_iterations: 4, threshold: 0.5 }),
  ];

  public NN_task_options = [ 'classification', 'regression' ];
  public selectedModel = this.modelSet[0];

  public kMeans_options = [
    { name: 'k clusters', value: 3 },
    { name: 'Max iterations', value: 4 },
    { name: 'threshold', value: 0.5 }
  ];

  public selectedMicrocontrollers: Array<MicroController> = [];
  public selectOptionMicrocontroller: MicroController;

  public motorList = [];

  public dataSets: Array<DataSet> = [];

  public nn;

  public classify = false;
  public recording = { active: false, starttime: null };

  constructor(@Inject(DOCUMENT) private document: Document, public hardwareService: HardwareService) {}


  selectModel() {
    console.log(this.selectedModel);
  }

  saveModel() {}


  deleteDataSet(i: number) {
    this.dataSets.splice(i, 1);
  }


  addDataSet() {
    this.dataSets.push(new DataSet(uuid(), 'Data set ' + (this.dataSets.length + 1)));
  }

  updateOutputDataSet(id: string) {
    let values = [];
    for (let i = 0; i < this.selectedModel.outputs.length; i++) {
      values.push({ value: (this.document.getElementById(id +'-output-' + i) as HTMLInputElement).value, classifier: this.selectedModel.outputs[i].name });
    }
    this.dataSets.filter(d => d.id === id)[0].d.outputs = values;
    console.log(this.dataSets.filter(d => d.id === id)[0]);
  }

  updateDataSetName(i: number) {
    const value = (this.document.getElementById('dataSet-' + i) as HTMLInputElement).value;
    this.dataSets[i].name = value;
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

  addCategoryToClassifier(i: number) {
    this.selectedModel.outputs[i].open = true;
    this.selectedModel.outputs[i].categories.push(new Category('Category-' + (this.selectedModel.outputs[i].categories.length + 1)));
  }

  deleteCategory(classifier_name: String, i:number) {
    this.selectedModel.outputs.filter(c => c.name === classifier_name)[0].categories.splice(i, 1);
  }

  updateClassifierCategory(classifier_name: string, i: number) {
    const value = (this.document.getElementById(classifier_name + '-category-' + i) as HTMLInputElement).value;
    this.selectedModel.outputs.filter(c => c.name === classifier_name)[0].categories[i].name = value;
  }


  exportDataSet(id: String) {

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






  NN_createData(data: Array<any>, options: any, epochs_val: number, batchSize_val: number) {

    this.nn = ml5.neuralNetwork(options);

    data.forEach(item => {
      this.nn.addData(item.inputs, item.outputs);
    });

    this.nn.normalizeData();


    const trainingOptions = {
      epochs: epochs_val,
      batchSize: batchSize_val
    }

    this.nn.train(trainingOptions, this.finishedTraining);

  }


finishedTraining(){
  console.log('finished training');
}


NN_classify(input){
  this.nn.classify(input, this.handleResults);

}

handleResults(error: any, result: any) {
  if(error){
    console.error(error);
    return;
  }
  console.log(result); // {label: 'red', confidence: 0.8};
  return result;
}

}
