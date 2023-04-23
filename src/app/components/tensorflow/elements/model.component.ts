
import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { activation, ActivationLabelMapping, Data, DataSet } from 'src/app/models/tensorflow.model';
import { TensorFlowMainService } from 'src/app/services/tensorflow-main.service';
import * as tf from '@tensorflow/tfjs';
import { TensorFlowData } from 'src/app/models/tensorflow-data.model';
import { TensorFlowTrainService } from 'src/app/services/tensorflow-train.service';

@Component({
  selector: 'app-model',
  templateUrl: 'model.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../tensorFlowJS.component.css'],
})
export class ModelComponent {

  public ActivationLabelMapping = ActivationLabelMapping;
  public activationOptions = Object.values(activation);
  public d: TensorFlowData;

  public lossOptions = [
    { name: 'absoluteDifference', value: tf.losses.absoluteDifference },
    { name: 'computeWeightedLoss', value: tf.losses.computeWeightedLoss },
    { name: 'cosineDistance', value: tf.losses.cosineDistance },
    { name: 'hingeLoss', value: tf.losses.hingeLoss },
    { name: 'huberLoss', value: tf.losses.huberLoss },
    { name: 'logLoss', value: tf.losses.logLoss },
    { name: 'meanSquaredError', value: tf.losses.meanSquaredError },
    { name: 'sigmoidCrossEntropy', value: tf.losses.sigmoidCrossEntropy },
    { name: 'softmaxCrossEntropy', value: tf.losses.softmaxCrossEntropy },
    { name: 'categoricalCrossentropy', value: tf.metrics.categoricalCrossentropy }
  ];

  public metricsOptions = [
    { name: 'binaryAccuracy', value: tf.metrics.binaryAccuracy },
    { name: 'binaryCrossentropy', value: tf.metrics.binaryCrossentropy },
    { name: 'categoricalAccuracy', value: tf.metrics.categoricalAccuracy },
    { name: 'categoricalCrossentropy', value: tf.metrics.categoricalCrossentropy },
    { name: 'cosineProximity', value: tf.metrics.cosineProximity },
    { name: 'meanAbsoluteError', value: tf.metrics.meanAbsoluteError },
    { name: 'meanAbsolutePercentageError', value: tf.metrics.meanAbsolutePercentageError },
    { name: 'meanSquaredError', value: tf.metrics.meanSquaredError },
    { name: 'precision', value: tf.metrics.precision },
    { name: 'recall', value: tf.metrics.recall },
    { name: 'sparseCategoricalAccuracy', value: tf.metrics.sparseCategoricalAccuracy }
  ]

  constructor(@Inject(DOCUMENT) private document: Document, private tensorflowService: TensorFlowMainService, private tensorflowTrainService: TensorFlowTrainService) {
    this.d = this.tensorflowService.d;
  }



  initializeNN_Model() {
    if (!this.d.processing && this.d.dataSets.length > 0) {

      this.document.body.style.cursor = 'wait';

      this.d.processing = true;
      this.tensorflowService.updateProgess('initializing model', 20);

      const data = this.tensorflowTrainService.createJSONfromDataSet(this.d.dataSets, true);

      const inputLabels = [];
      const outputLabels = [];

      for (const input of this.d.selectedModel.inputs) {
        if (input.active) { inputLabels.push(input.name); }
      }

      for (const output of this.d.selectedModel.outputs) {
        for (const label of output.labels) {
          if (!outputLabels.includes(label.name)) { outputLabels.push(label.name); }
        }
      }

      this.d.selectedModel.options.inputs = inputLabels;
      this.d.selectedModel.options.outputs = outputLabels;

      this.tensorflowTrainService.NN_createData(data, this.d.selectedModel);

    } else {
      this.tensorflowService.updateProgess(this.d.processing ? 'training in progress': 'no data', 0);
    }
  }


  selectClassifier(id: string) {
    this.tensorflowService.selectClassifier(id);
  }


  classifyAtRunTime() {
    if (this.d.selectedModel.model) {
      if (!this.d.classify) {
        this.d.processing = false;
        this.d.classify = true;
        this.tensorflowService.updateProgess('deploy', 100);
        this.document.getElementById('record-button').click();
      } else {
        this.d.processing = false;
        this.d.classify = false;
        this.d.predictionDataset = null;
        this.tensorflowService.updateProgess('stopped', 0);
        this.tensorflowService.resetFiltersMicrocontroller();
      }
    }
  }



}
