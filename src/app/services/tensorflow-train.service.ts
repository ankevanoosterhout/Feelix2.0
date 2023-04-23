import { Injectable, Inject } from '@angular/core';
import * as tf from '@tensorflow/tfjs';
import { TensorFlowData } from '../models/tensorflow-data.model';
import { DataSet, Model } from '../models/tensorflow.model';
import { TensorFlowMainService } from './tensorflow-main.service';
import { Subject } from 'rxjs';
import { DOCUMENT } from '@angular/common';


@Injectable()
export class TensorFlowTrainService {

  public d: TensorFlowData;

  createPredictionModel: Subject<any> = new Subject();

  constructor(@Inject(DOCUMENT) private document: Document, private tensorflowService: TensorFlowMainService) {
    this.d = this.tensorflowService.d;

    this.tensorflowService.createJSON.subscribe((res) => {
      this.createJSONfromDataSet(res.data, res.train);
    });
  }

  predictOutput() {
    let collectData = true;
    let i = 0;
    if (this.d.predictionDataset) {
      for (const motor of this.d.predictionDataset.m) {
        if (motor.d.length <= 20 && motor.d.length !== 0) {
          collectData = false;
        }
        i++;

        if (i >= this.d.predictionDataset.m.length && collectData) {

          const data = this.createJSONfromDataSet([this.d.predictionDataset], false);
          this.NN_Deploy(data.xs, this.d.selectedModel);
          this.clearCollectedData();
        }
      }
    }
  }


  clearCollectedData() {
    this.d.recording.starttime = new Date().getTime();
    for (const motor of this.d.predictionDataset.m) {
      motor.d = [];
    }
  }



  createJSONfromDataSet(dataSets: Array<DataSet>, train = true) {
    // console.log(dataSets);
    const data = { xs: [], ys: [] };
    let dataSize = 0;

    dataSets.forEach(set => {

      let outputs = [];

      if (train && set.output.label.id) {

        for (const classifier of this.d.selectedModel.outputs) {
          if (classifier.active && classifier.id === set.output.classifier_id) {
            for (const label of classifier.labels) {
              label.id === set.output.label.id ? outputs.push(1) : outputs.push(0);
            }
          }
        }
        if (outputs.length === 0) {
          this.d.processing = false;
          this.tensorflowService.updateProgess('cannot find outputs', 0);
          return false;
        }
        // console.log(outputs);
      }

      // console.log(set.m);

      let m = 0;

      set.m.forEach(motor => {
        let inputArray = [];
        let i = 0;
        let n = 0 + dataSize;


        if (motor.d.length > 0) {

          for (const d of motor.d) {
            const inputs = [];
            for (const input of d.inputs) {
              const input_variable = this.d.selectedModel.inputs.filter(i => i.name === input.name)[0];
              if (input_variable && input_variable.active) {
                inputs.push(input.value);
              }
            }

            if (m !== 0 && data.xs[n]) {
              if (data.xs[n][i]) {
                data.xs[n][i].push(inputs);
              }
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
          }
        }
        m++;
      });

      dataSize = data.xs.length;
    });

    console.log(data);

    return data;
  }




  NN_createData(data: any, modelObj: Model) {

    this.d.selectedModel.model = tf.sequential();

    this.createPredictionModel.next();

    this.d.selectedModel.model.name = modelObj.name;

    this.tensorflowService.updateProgess('model created', 10);

    if (data.xs && data.ys) {

      const inputShape = [null, data.xs[0][0][0].length, (data.xs[0][0].length * data.xs[0].length) ];
      const outputShape = [null, data.ys[0].length]

      console.log(inputShape);

      const numSamples = data.xs.length;
      const iTensor = tf.tensor(data.xs, [numSamples, data.xs[0].length, data.xs[0][0].length, data.xs[0][0][0].length]);
      const outputTensor = tf.tensor(data.ys, [numSamples, data.ys[0].length]);

      const inputTensor = tf.reshape(iTensor, [numSamples, data.xs[0][0][0].length, (data.xs[0][0].length * data.xs[0].length) ]);

      console.log(iTensor, inputTensor, outputTensor);


      for (let layer = 0; layer < this.d.selectedModel.options.hiddenUnits; layer++) {
        const hiddenLayer = tf.layers.dense({
          units: (data.xs[0][0].length * data.xs[0].length), //data.xs[0][0][0].length
          inputShape: inputShape.slice(1), // [ number of inputs, batch size ]
          activation: this.d.selectedModel.options.activation // make activation function adjustable in model settings
        });

        console.log(hiddenLayer);

        this.d.selectedModel.model.add(hiddenLayer);
        // this.selectedModel.model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
      }
      this.d.selectedModel.model.add(tf.layers.flatten());


      const outputLayer = tf.layers.dense({
        units: outputShape[1],
        activation: this.d.selectedModel.options.activationOutputLayer
      });

      this.d.selectedModel.model.add(outputLayer);

      const sgdOpt = tf.train.sgd(this.d.selectedModel.options.learningRate);
      // console.log(sgdOpt);

      this.d.selectedModel.model.compile({
        optimizer: sgdOpt,
        loss: this.d.selectedModel.options.losses,
        metrics: [ this.d.selectedModel.options.metrics ]
      });
      // console.log(this.d.selectedModel.options);
      // console.log(this.d.selectedModel.model);
    //   this.selectedModel.model.normalizeData();

      this.tensorflowService.updateProgess('start training', 20);




      this.train(inputTensor, outputTensor, this.d.selectedModel.options.trainingOptions).then(() => {
        console.log('training is complete');

        this.document.body.style.cursor = 'default';

        this.d.processing = false;

        inputTensor.dispose();
        outputTensor.dispose();

        console.log("memory " + tf.memory().numTensors);

      });

    } else {
      this.tensorflowService.updateProgess('no data found, training canceled', 0);
      this.d.processing = false;

      this.document.body.style.cursor = 'default';

      return false;
    }
  }


  async train(iTensor: any, oTensor: any, options: any) {
    // console.log(iTensor, oTensor);
    for (let i = 0; i < options.epochs; i++) {
      const response = await this.d.selectedModel.model.fit(iTensor, oTensor, {
        verbose: true,
        shuffle: true,
        batchSize: options.batchSize,
        epochs: 1
      });
      if (i < options.epochs - 1) {
        if (i % 10 === 0) {
          this.tensorflowService.updateProgess('training, loss = ' + response.history.loss[0], ((80/options.epochs) * i) + 20);
        }
      } else {
        this.tensorflowService.updateProgess('finished training ' + response.history.loss[0], 100);
      }
    }
  }




  NN_Deploy(input: any, selectedModel: any) {

    // this.serialPath = path;
    console.log('predict');
    console.log(input);

    if (selectedModel.options.task === 'classification') {
      const iTensor = tf.tensor(input);
      const inputTensor = tf.reshape(iTensor, [input.length, input[0][0][0].length, (input[0][0].length * input[0].length) ]);
      console.log(iTensor, inputTensor);
      const outputs = this.d.selectedModel.multiple ? this.d.selectedModel.model.predictOnBatch(inputTensor) : this.d.selectedModel.model.predict(inputTensor);
      console.log(outputs);
      const prediction = Array.from((outputs as any).dataSync());
      console.log(prediction);
      this.updatePredictionClassifiers(prediction);

      iTensor.dispose();
    }
  }


  updatePredictionClassifiers(results: Array<any>) {
    console.log(this.d.selectedModel.outputs);
    for (const classifier of this.d.selectedModel.outputs) {
      let i  = 0;
      for (const label of classifier.labels) {
        console.log(label);
        label.confidence = results[i];
        (this.document.getElementById('bar-' + classifier.id + '-' + label.id) as HTMLElement).style.width = (label.confidence * 100) + '%';
        (this.document.getElementById('confidence-' + classifier.id + '-' + label.id) as HTMLElement).innerHTML = (label.confidence * 100).toFixed(2) + '%';

        i++;
      }
    }
  }




    // handleRegressionResults = ((error: any, result: any) => {
    //   if(error){
    //     this.updateProgess(error, 0);
    //     this.d.classify = false;
    //     console.error(error);
    //     return;
    //   }
    //   for (const output of this.d.selectedModel.outputs) {
    //     for (const label of output.labels) {
    //       const result_label = result.filter((r: { label: string; }) => r.label == label.name)[0];
    //       // label.prediction = result_label.;
    //       // this.document.getElementById('bar-' + output.name + '-' + label.name).style.width = (label.prediction * 100) + '%';
    //       // this.document.getElementById('confidence-' + output.name + '-' + label.name).innerHTML = (label.prediction  * 100).toFixed(2) + '%';
    //     }
    //   }
    // }).bind(this);
    

    //   let filterArray = [];
    //   let n = 0;

    //   for (const filter of this.d.selectedModel.filters) {
    //     const classifier = this.d.selectedModel.outputs.filter(o => o.name === filter.classifier.name)[0];
    //     if (classifier && classifier.labels.length > 0) {
    //       const highestConfidenceLabel = this.getHighestConfidenceLabel(classifier);
    //       // console.log(highestConfidenceLabel.name);
    //       let index = classifier.labels.indexOf(highestConfidenceLabel);

    //       if (index > -1) {


    //         if ((filter.type.name === 'amplify' || filter.type.name === 'constrain') && filter.functionVariable.value[index] !== filter.functionVariable.prevValue) {

    //           let filterObj = { type: filter.type.slug, value: filter.functionVariable.value[index], smoothness: filter.type.interpolate };
    //           filterArray.push(filterObj);

    //           filter.functionVariable.prevValue = filter.functionVariable.value[index];

    //         } else if (filter.type.name === 'noise') {

    //           const newRandom = (Math.floor(Math.random() * ((filter.functionVariable.value[index] * 100) * 2)) - (filter.functionVariable.value[index] * 100)) / 100;
    //           let filterObj = { type: filter.type.slug, value: newRandom, smoothness: filter.type.interpolate };

    //           filterArray.push(filterObj);
    //         }
    //       }
    //     }
    //     if (n === this.d.selectedModel.filters.length - 1) {
    //       if (filterArray.length > 0) {
    //         // console.log('update filter');
    //         const microcontroller = this.d.selectedMicrocontrollers.filter(m => m.serialPort.path === this.serialPath)[0];
    //         if (microcontroller) {
    //           const filterModel = new FilterModel(filterArray, microcontroller);
    //           // console.log(filterModel);
    //           this.electronService.ipcRenderer.send('updateFilter', filterModel);
    //         }
    //       }
    //     }
    //     n++;
    //   }

    // }).bind(this);



    // getHighestConfidenceLabel(classifier: Classifier): Label {
    //   let maxConfidence = classifier.labels[0];
    //   for (const label of classifier.labels) {
    //     if (label.confidence > maxConfidence.confidence) {
    //       maxConfidence = label;
    //     }
    //   }
    //   return maxConfidence;
    // }

}
