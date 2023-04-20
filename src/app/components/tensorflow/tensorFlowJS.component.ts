import { DOCUMENT } from '@angular/common';
import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Classifier, Data, DataSet, InputItem, Label } from 'src/app/models/tensorflow.model';
import { HardwareService } from 'src/app/services/hardware.service';
import { TensorFlowMainService } from 'src/app/services/tensorflow-main.service';
import { MotorControlService } from 'src/app/services/motor-control.service';
import { v4 as uuid } from 'uuid';
import { TensorFlowDrawService } from 'src/app/services/tensorflow-draw.service';
import { TensorFlowConfig } from 'src/app/models/tensorflow-config.model';
import { TensorFlowData } from 'src/app/models/tensorflow-data.model';

@Component({
  selector: 'app-tensorflow-js',
  templateUrl: './tensorFlowJS.component.html',
  styleUrls: ['../windows/effects/effects.component.css', './tensorFlowJS.component.css'],
})
export class TensorFlowJSComponent implements OnInit {

  public config: TensorFlowConfig;
  public d: TensorFlowData;

  public page = 'tensorflow';
  public status = 'Ready';
  public progress = 0;

  inputArray = [];
  stopRecordingCounter = 0;

  constructor(@Inject(DOCUMENT) private document: Document, public motorControlService: MotorControlService, public hardwareService: HardwareService,
    private electronService: ElectronService, public tensorflowService: TensorFlowMainService, private tensorflowDrawService: TensorFlowDrawService) {

      this.config = this.tensorflowDrawService.config;
      this.d = this.tensorflowService.d;


      this.electronService.ipcRenderer.on('motorData', (event: Event, data: any) => {

        //when classifying input data
        // if (this.tensorflowService.classify && (data.velocity > 0.02 || data.velocity < -0.02) && this.tensorflowService.selectedModel.model) {
        //   let inputs = this.getInputs(data);

        //   if (this.tensorflowService.selectedModel.multiple) {
        //     // const microcontroller = this.tensorflowService.selectedMicrocontrollers.filter(m => m.serialPort.path === data.serialPath)[0];
        //     this.inputArray.push(inputs);

        //     if (this.inputArray.length >= this.tensorflowService.selectedModel.options.trainingOptions.batchSize) {
        //       this.tensorflowService.NN_Deploy(this.inputArray, this.tensorflowService.selectedModel, data.serialPath);
        //       this.inputArray = [];
        //     }

        //   } else {
        //     this.tensorflowService.NN_Deploy([ inputs ], this.tensorflowService.selectedModel, data.serialPath);
        //   }


        //   //when gathering input data
        // } else if (this.tensorflowService.selectedDataset) {

          if (this.d.recording.active && this.d.recording.starttime === null && (data.velocity > 0.03 || data.velocity < -0.03)) {
            this.d.recording.starttime = new Date().getTime();
          }

          if (this.d.recording.starttime !== null) {

            if (data.velocity === 0.0) { this.stopRecordingCounter++; } else if (data.velocity > 0.03 || data.velocity < -0.03) { this.stopRecordingCounter = 0; }

            if (this.stopRecordingCounter < 10) {

              const dataSetEl = !this.d.classify ? this.d.selectedDataset : this.d.predictionDataset;

              if (dataSetEl.m && dataSetEl.m.length > 0) {
                const motorEl = dataSetEl.m.filter(m => m.mcu.serialPath === data.serialPath && m.id === data.motorID)[0];

                if (motorEl) {
                  const dataObject = new Data();

                  for (const input of this.d.selectedModel.inputs) {
                    if (input.name === 'angle' || input.name === 'velocity' || input.name === 'target' || input.name === 'direction') {

                      const inputItem = new InputItem(input.name);

                      if (input.name === 'angle') { inputItem.value = data.angle; }

                      else if (input.name === 'velocity') { inputItem.value = data.velocity; }

                      else if (input.name === 'direction') { inputItem.value = data.velocity === 0.0 ? 0 : data.velocity > 0.0 ? 1 : -1; }

                      else if (input.name === 'target') { inputItem.value = data.target; }

                      dataObject.inputs.push(inputItem);

                      if (!this.d.classify) {
                        this.checkBounds(inputItem.value);
                      }
                    }
                  }

                  const time = new Date().getTime() - this.d.recording.starttime;
                  dataObject.time = time;

                  motorEl.d.push(dataObject);

                  if (this.d.classify) {
                    this.tensorflowService.predictOutput();
                  }

                  if (!this.d.classify && time > dataSetEl.bounds.xMax - 500) {
                    dataSetEl.bounds.xMax = dataSetEl.bounds.xMax < 3000 ?
                      Math.ceil(dataSetEl.bounds.xMax * 0.006) * 200 : Math.ceil(dataSetEl.bounds.xMax * 0.0024) * 500;

                    this.tensorflowDrawService.updateBounds(dataSetEl.bounds);
                  }
                  this.tensorflowDrawService.drawGraph();
                  this.tensorflowDrawService.drawTensorFlowGraphData(dataSetEl, this.d.selectedModel, this.d.trimLinesVisible ? this.d.trimLines : null);

              }
            }
          }
        }

      });


      this.electronService.ipcRenderer.on('export-dataset-model', (event: Event, data: any) => {
        this.tensorflowService.saveDataNN();
      });


      this.electronService.ipcRenderer.on('load-datasets', (event: Event, data: any) => {
        console.log(data);
        if (data) {
          for (const dataset of data) {
            if (this.d.dataSets.filter(d => d.id === dataset.id).length === 0) {
              this.d.dataSets.unshift(dataset);
              for (const motor of dataset.m) {
                if (this.d.selectedMicrocontrollers.filter(m => m.id === motor.mcu.id).length === 0) {
                  const mcu = this.hardwareService.microcontrollers.filter(m => m.id === motor.mcu.id)[0];
                  if (mcu) {
                    this.d.selectOptionMicrocontroller = mcu;
                    this.tensorflowService.addMicrocontroller();
                  }
                }
              }
            }
            if (dataset.output.classifier_id) {
              const outputClassifierInModel = this.d.selectedModel.outputs.filter(o => o.id === dataset.output.classifier_id)[0];

              if (!outputClassifierInModel) {
                const newClassifier = new Classifier(dataset.output.classifier_id, dataset.output.classifier_name);
                this.d.selectedModel.outputs.push(newClassifier);
                this.tensorflowService.selectClassifier(newClassifier.id);
                this.checkIfHasLabel(newClassifier, dataset.output.label);
              } else {
                this.checkIfHasLabel(outputClassifierInModel, dataset.output.label);
                this.tensorflowService.selectClassifier(outputClassifierInModel.id);
              }
            }
          }
          if (this.d.dataSets.length > 0) {
            this.tensorflowService.selectDataSet(this.d.dataSets[0].id);
          }
        }
      });


      this.electronService.ipcRenderer.on('load-model', (event: Event, data: any) => {
        if (data && data[0]) {
          this.tensorflowService.loadModel(data[0].id);
        }
      });

      this.tensorflowService.updateTensorflowProgress.subscribe(data => {
        this.progress = data.progress;
        this.status = data.status;
        this.document.getElementById('msg').innerHTML = this.status;
        const width = 244 * (this.progress / 100);
        this.document.getElementById('progress').style.width = width + 'px';
      });

      this.tensorflowService.updateResizeElements.subscribe(data => {
        this.updateScreenDivisionY(data.coord);
      });

      this.tensorflowService.updateGraphBounds.subscribe(data => {
        this.tensorflowDrawService.updateBounds(data);
      });

      this.tensorflowService.updateGraph.subscribe(data => {
        this.tensorflowDrawService.drawGraph();
        if (data) {
          this.tensorflowDrawService.drawTensorFlowGraphData(data.set, data.model, data.trimLines);
        }
      });

      this.tensorflowService.createPredictionModel.subscribe(data => {
        this.d.predictionDataset = new DataSet(uuid(), 'Prediction', this.d.selectedMicrocontrollers);
        this.d.predictionDataset.bounds = {
          xMin: 0,
          xMax: 700,
          yMin: 10,
          yMax: -10
        }
        // console.log(this.d.predictionDataset);
      });

      this.tensorflowService.drawTrimLines.subscribe(data => {
        this.tensorflowDrawService.drawTrimLines(data.bounds, data.visible, data.lines);
      });

      this.electronService.ipcRenderer.on('save-model', (event: Event) => {
        this.tensorflowService.saveModel();
      });

      this.electronService.ipcRenderer.on('export-model', (event: Event) => {
        this.tensorflowService.exportModel();
      });

      this.electronService.ipcRenderer.on('import-model', (event: Event) => {
        this.tensorflowService.importModel();
      });

      this.electronService.ipcRenderer.on('deploy-model', (event: Event) => {
        this.document.getElementById('deploy').click();
      });

      this.electronService.ipcRenderer.on('train-model', (event: Event) => {
        this.document.getElementById('initialize').click();
      });
  }

  ngOnInit(): void {
    this.d.dataSets.push(new DataSet(uuid(), 'Data set ' + (this.d.dataSets.length + 1), this.d.selectedMicrocontrollers));
    this.d.dataSets[0].open = true;
    this.d.selectedDataset = this.d.dataSets[0];
    this.d.selectedModel.outputs.push(new Classifier(uuid(), 'Classifier-' + (this.d.selectedModel.outputs.length + 1)));
    this.d.selectedModel.outputs[0].active = true;
    this.tensorflowService.addLabelToClassifier(0);
  }

  checkIfHasLabel(classifier: Classifier, label: Label) {
    if (label && classifier) {
      const l = classifier.labels.filter(l => l.id === label.id)[0];
      if (!l) {
        const newLabel = new Label(label.id, label.name);
        classifier.labels.push(newLabel);
      }
    }
  }


  checkBounds(value: number) {
    if (value > this.d.selectedDataset.bounds.yMax) {
      this.d.selectedDataset.bounds.yMax = value >= 10 || this.d.selectedDataset.bounds.yMin <= -10 ? Math.ceil(value/10) * 10 : Math.ceil(value / 2) * 2;
      this.tensorflowDrawService.updateBounds(this.d.selectedDataset.bounds);

    } else if (value < this.d.selectedDataset.bounds.yMin) {
      this.d.selectedDataset.bounds.yMin = value <= -10 || this.d.selectedDataset.bounds.yMax >= 10 ? Math.floor(value/10) * 10 : Math.floor(value / 2) * 2;
      this.tensorflowDrawService.updateBounds(this.d.selectedDataset.bounds);
    }
  }


  getInputs(data: any) {
    let inputs = [];
    const microcontroller = this.d.selectedMicrocontrollers.filter(m => m.serialPort.path === data.serialPath)[0];
    // const microcontrollerIndex = this.d.selectedMicrocontrollers.indexOf(microcontroller);

    if (microcontroller) {
      const motor = microcontroller.motors.filter(m => m.id === data.motorID)[0];
      const motorIndex = microcontroller.motors.indexOf(motor);

      for (const input of this.d.selectedModel.inputs) {
        if (input.active) {

          if (input.name === 'angle') {
            inputs.push(data.angle);

          } else if (input.name === 'velocity') {
            inputs.push(data.velocity);

          } else if (input.name === 'direction') {
            if (data.velocity === 0.0) {
              inputs.push(0.0);
            } else {
              inputs.push((data.velocity > 0.00 ? 1 : -1));
            }
          } else if (input.name === 'pressure') {
            inputs.push(data.pressure);

          } else if (input.name === 'target') {
            inputs.push(data.target);
          }
        }
      }
    }
    return inputs;
  }



  toggleResultWindow() {
    this.config.resultWindowVisible = !this.config.resultWindowVisible;
    this.updateScreenDivisionX(!this.config.resultWindowVisible ? window.innerWidth - 18 : window.innerWidth * 0.65);
  }


  public loadScript(url: string) {
    let body = <HTMLDivElement> document.body;
    let script = document.createElement('script');
    script.innerHTML = '';
    script.src = url;
    script.async = true;
    script.defer = true;
    body.appendChild(script);
  }



  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {

    if (this.config.updateHorizontalScreenDivision) {
      this.updateScreenDivisionY(e.clientY);
    } else if (this.config.updateVerticalScreenDivision) {
      this.updateScreenDivisionX(e.clientX);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(e: MouseEvent) {
    if (this.config.updateHorizontalScreenDivision || this.config.updateVerticalScreenDivision) {
      this.config.updateHorizontalScreenDivision = false;
      this.config.updateVerticalScreenDivision = false;
    }
  }



  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.config.width = (window.innerWidth - 470);
    this.config.height = window.innerHeight - this.config.horizontalScreenDivision - 120;
    this.document.getElementById('data').style.height = (window.innerHeight - this.config.horizontalScreenDivision) + 'px';
    this.document.getElementById('model').style.width = (window.innerWidth * this.config.verticalScreenDivision / 100) + 'px';
    this.document.getElementById('classifiers').style.width = (window.innerWidth * (100-this.config.verticalScreenDivision) / 100) + 'px';
    this.tensorflowDrawService.drawGraph();
    this.tensorflowDrawService.drawTensorFlowGraphData(this.d.selectedDataset, this.d.selectedModel,
      this.d.trimLinesVisible ? this.d.trimLines : null);
  }


  updateScreenDivisionY(coord: number) {
    if (coord > 60 && coord <= window.innerHeight - 60) {
      this.updateResize(coord, 'horizontal');
    }
  }

  updateScreenDivisionX(coord: number) {
    if (coord <= window.innerWidth - 18) {
      let division = 100 / (window.innerWidth / coord);
      this.updateResize(division, 'vertical');
    }
  }


  updateResize(division: number, orientation: string) {
    if (orientation === 'horizontal') {
      this.document.getElementById('classifiers').style.height = division + 'px';
      this.document.getElementById('model').style.height = division + 'px';
      this.document.getElementById('data').style.height = (window.innerHeight - division) + 'px';
      this.config.height = window.innerHeight - division - 120;
      this.config.horizontalScreenDivision = division;
      if (this.config.horizontalScreenDivision >= window.innerHeight - 80) {
        this.document.getElementById('toggleDataSection').classList.add('hidden');
      } else {
        if (this.document.getElementById('toggleDataSection').classList.contains('hidden')) {
          this.document.getElementById('toggleDataSection').classList.remove('hidden');
        }
        this.tensorflowDrawService.drawGraph();
        this.tensorflowDrawService.drawTensorFlowGraphData(this.d.selectedDataset, this.d.selectedModel,
          this.d.trimLinesVisible ? this.d.trimLines : null);
      }


    } else if (orientation === 'vertical') {
      this.document.getElementById('model').style.width = (window.innerWidth * division / 100) + 'px';
      this.document.getElementById('classifiers').style.width = (window.innerWidth * (100-division) / 100) + 'px';
      this.config.verticalScreenDivision = division;
      if (this.config.verticalScreenDivision >= (100 / window.innerWidth) * (window.innerWidth - 18)) {
        if (!this.document.getElementById('toggleResultWindow').classList.contains('hidden')) {
          this.document.getElementById('toggleResultWindow').classList.add('hidden');
        }
      } else {
        if (this.document.getElementById('toggleResultWindow').classList.contains('hidden')) {
          this.document.getElementById('toggleResultWindow').classList.remove('hidden');
        }
      }
    }
  }

}
