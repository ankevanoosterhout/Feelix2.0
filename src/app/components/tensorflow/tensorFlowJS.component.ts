import { DOCUMENT } from '@angular/common';
import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Classifier, Data, DataSet, InputItem } from 'src/app/models/tensorflow.model';
import { HardwareService } from 'src/app/services/hardware.service';
import { TensorFlowMainService } from 'src/app/services/tensorflow-main.service';
import { MotorControlService } from 'src/app/services/motor-control.service';
import { v4 as uuid } from 'uuid';
import { TensorFlowDrawService } from 'src/app/services/tensorflow-draw.service';
import { TensorFlowConfig } from 'src/app/models/tensorflow-config.model';

@Component({
  selector: 'app-tensorflow-js',
  templateUrl: './tensorFlowJS.component.html',
  styleUrls: ['../windows/effects/effects.component.css', './tensorFlowJS.component.css'],
})
export class TensorFlowJSComponent implements OnInit {

  public config: TensorFlowConfig;

  public page = 'tensorflow';
  public status = 'Ready';
  public progress = 0;

  inputArray = [];
  stopRecordingCounter = 0;

  constructor(@Inject(DOCUMENT) private document: Document, public motorControlService: MotorControlService, public hardwareService: HardwareService,
    private electronService: ElectronService, public tensorflowService: TensorFlowMainService, private tensorflowDrawService: TensorFlowDrawService) {

      this.config = this.tensorflowDrawService.config;


      this.electronService.ipcRenderer.on('motorData', (event: Event, data: any) => {

        //when classifying input data
        if (this.tensorflowService.classify && (data.velocity > 0.03 || data.velocity < -0.03) && this.tensorflowService.selectedModel.model) {
          let inputs = this.getInputs(data);

          if (this.tensorflowService.selectedModel.multiple) {
            // const microcontroller = this.tensorflowService.selectedMicrocontrollers.filter(m => m.serialPort.path === data.serialPath)[0];
            if (this.inputArray.length >= this.tensorflowService.selectedModel.options.trainingOptions.batchSize) {
              this.tensorflowService.NN_Deploy(this.inputArray, this.tensorflowService.selectedModel, data.serialPath);
              this.inputArray = [];
            } else {
              this.inputArray.push(inputs);
            }
          } else {
            this.tensorflowService.NN_Deploy([ inputs ], this.tensorflowService.selectedModel, data.serialPath);
          }


          //when gathering input data
        } else if (this.tensorflowService.selectedDataset) {

          if (this.tensorflowService.recording.active && this.tensorflowService.recording.starttime === null && (data.velocity > 0.03 || data.velocity < -0.03)) {
            this.tensorflowService.recording.starttime = new Date().getTime();
          }


          if (this.tensorflowService.recording.starttime !== null) {

            if (data.velocity === 0.0) { this.stopRecordingCounter++; } else if (data.velocity > 0.03 || data.velocity < -0.03) { this.stopRecordingCounter = 0; }

            if (this.stopRecordingCounter < 10) {

              const motorEl = this.tensorflowService.selectedDataset.m.filter(m => m.mcu.serialPath === data.serialPath && m.id === data.motorID)[0];

              if (motorEl) {
                const dataObject = new Data();

                for (const input of this.tensorflowService.selectedModel.inputs) {
                  if (input.name === 'angle' || input.name === 'velocity' || input.name === 'target' || input.name === 'direction') {

                    const inputItem = new InputItem(input.name);

                    if (input.name === 'angle') { inputItem.value = data.angle; }

                    else if (input.name === 'velocity') { inputItem.value = data.velocity; }

                    else if (input.name === 'direction') { inputItem.value = data.velocity === 0.0 ? 0 : data.velocity > 0.0 ? 1 : -1; }

                    else if (input.name === 'target') { inputItem.value = data.target; }

                    dataObject.inputs.push(inputItem);
                    this.checkBounds(inputItem.value);
                  }
                }

                const time = new Date().getTime() - this.tensorflowService.recording.starttime;
                dataObject.time = time;

                motorEl.d.push(dataObject);

                if (time > this.tensorflowService.selectedDataset.bounds.xMax - 500) {
                  this.tensorflowService.selectedDataset.bounds.xMax = this.tensorflowService.selectedDataset.bounds.xMax < 3000 ?
                    Math.ceil(this.tensorflowService.selectedDataset.bounds.xMax * 0.006) * 200 : Math.ceil(this.tensorflowService.selectedDataset.bounds.xMax * 0.0024) * 500;

                  this.tensorflowDrawService.updateBounds(this.tensorflowService.selectedDataset.bounds);
                }
                this.tensorflowDrawService.drawGraph();
                this.tensorflowDrawService.drawTensorFlowGraphData(this.tensorflowService.selectedDataset, this.tensorflowService.selectedModel, this.tensorflowService.selectedMicrocontrollers);
              }
            }
          }
        }

      });


      this.electronService.ipcRenderer.on('export-dataset-model', (event: Event, data: any) => {
        this.tensorflowService.saveDataNN();
      });


      this.electronService.ipcRenderer.on('load-datasets', (event: Event, data: any) => {
        if (data) {
          for (const dataset of data) {
            if (this.tensorflowService.dataSets.filter(d => d.id === dataset.id).length === 0) {
              this.tensorflowService.dataSets.unshift(dataset);
            }
          }
          if (this.tensorflowService.dataSets.length > 0) {
            this.tensorflowService.selectDataSet(this.tensorflowService.dataSets[this.tensorflowService.dataSets.length - 1].id);
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
        this.tensorflowDrawService.drawTensorFlowGraphData(data.set, data.model, data.mcus);
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
    this.tensorflowService.dataSets.push(new DataSet(uuid(), 'Data set ' + (this.tensorflowService.dataSets.length + 1), this.tensorflowService.selectedMicrocontrollers));
    this.tensorflowService.dataSets[0].open = true;
    this.tensorflowService.selectedDataset = this.tensorflowService.dataSets[0];
    this.tensorflowService.selectedModel.outputs.push(new Classifier('Classifier-' + (this.tensorflowService.selectedModel.outputs.length + 1)));
    this.tensorflowService.selectedModel.outputs[0].active = true;
    this.tensorflowService.addLabelToClassifier(0);
  }



  checkBounds(value: number) {
    if (value > this.tensorflowService.selectedDataset.bounds.yMax) {
      this.tensorflowService.selectedDataset.bounds.yMax = value >= 10 || this.tensorflowService.selectedDataset.bounds.yMin <= -10 ? Math.ceil(value/10) * 10 : Math.ceil(value / 2) * 2;
      this.tensorflowDrawService.updateBounds(this.tensorflowService.selectedDataset.bounds);

    } else if (value < this.tensorflowService.selectedDataset.bounds.yMin) {
      this.tensorflowService.selectedDataset.bounds.yMin = value <= -10 || this.tensorflowService.selectedDataset.bounds.yMax >= 10 ? Math.floor(value/10) * 10 : Math.floor(value / 2) * 2;
      this.tensorflowDrawService.updateBounds(this.tensorflowService.selectedDataset.bounds);
    }
  }


  updateClassifier(item: String, index: number) {

  }


  getInputs(data: any) {
    let inputs = [];
    const microcontroller = this.tensorflowService.selectedMicrocontrollers.filter(m => m.serialPort.path === data.serialPath)[0];

    if (microcontroller) {
      const motor = microcontroller.motors.filter(m => m.id === data.motorID)[0];
      const motorIndex = microcontroller.motors.indexOf(motor);

      // [motordata][inputArray]

      for (const input of this.tensorflowService.selectedModel.inputs) {
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
          } else if (input.name === 'target') {
            inputs.push(data.target);
          }
        }
      }
      // inputs.push(motorIndex);
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
    this.document.getElementById('model').style.width = (window.innerWidth * this.config.verticalScreenDivision / 100) + 'px';
    this.document.getElementById('classifiers').style.width = (window.innerWidth * (100-this.config.verticalScreenDivision) / 100) + 'px';
    this.tensorflowDrawService.drawGraph();
    this.tensorflowDrawService.drawTensorFlowGraphData(this.tensorflowService.selectedDataset, this.tensorflowService.selectedModel, this.tensorflowService.selectedMicrocontrollers);
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
        this.tensorflowDrawService.drawTensorFlowGraphData(this.tensorflowService.selectedDataset, this.tensorflowService.selectedModel, this.tensorflowService.selectedMicrocontrollers);
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
