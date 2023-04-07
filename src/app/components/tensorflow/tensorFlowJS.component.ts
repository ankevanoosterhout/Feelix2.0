import { DOCUMENT } from '@angular/common';
import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Classifier, DataSet } from 'src/app/models/tensorflow.model';
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

  constructor(@Inject(DOCUMENT) private document: Document, public motorControlService: MotorControlService, public hardwareService: HardwareService,
    private electronService: ElectronService, public tensorflowService: TensorFlowMainService, private tensorflowDrawService: TensorFlowDrawService) {

      this.config = this.tensorflowDrawService.config;


      this.electronService.ipcRenderer.on('motorData', (event: Event, data: any) => {

        if (data.velocity > 0.03 || data.velocity < -0.03) {
          //when classifying input data
          if (this.tensorflowService.classify && this.tensorflowService.selectedModel.model) {
            let inputs = this.getInputs(data);

            // const inputstr = inputList.join(',');
            // let inputObject = JSON.parse('{' + inputstr + '}');

            if (this.tensorflowService.selectedModel.multiple) {
              const microcontroller = this.tensorflowService.selectedMicrocontrollers.filter(m => m.serialPort.path === data.serialPath)[0];
              if (this.inputArray.length > 0 && this.hardwareService.getDataSendTime(microcontroller.id) - new Date().getTime() > microcontroller.updateSpeed * 3) {
                this.tensorflowService.NN_Deploy(this.inputArray, this.tensorflowService.selectedModel, data.serialPath);
              } else {
                this.inputArray.push(inputs);
              }

              this.hardwareService.updateDataSendTime(microcontroller.id);

            } else {
              this.tensorflowService.NN_Deploy(inputs, this.tensorflowService.selectedModel, data.serialPath);
            }

            //when gathering input data
          } else if (this.tensorflowService.dataSets.length > 0) {

            if (this.tensorflowService.recording.starttime === null && this.tensorflowService.recording.active) {
              this.tensorflowService.recording.starttime = new Date().getTime();
            }


            if (this.tensorflowService.recording.active) {
              // let dataset = this.tensorflowService.dataSets.filter(d => d.open)[0]; //update dataset.open when select in dropdown
              // let dataset = this.tensorflowService.selectedDataset;
              const microcontroller = this.tensorflowService.selectedMicrocontrollers.filter(m => m.serialPort.path === data.serialPath)[0];

              if (microcontroller && this.tensorflowService.selectedDataset) {

                let microcontrollerObject = { port: microcontroller.serialPort.path, motors: [], inputdata: { name: null, value: null } };
                let m = 0;
                for (const motor of microcontroller.motors) {

                  let i = 0;
                  let dataList = [];
                  for (const input of this.tensorflowService.selectedModel.inputs) {
                      let dataObject = { motor: motor.id, index: m, data: { name: input.name, value: null } }
                      if (input.name === 'angle' || input.name === 'velocity' || input.name === 'target' || input.name === 'direction') {

                        if (motor.id === data.motorID) {

                          if (input.name === 'angle') {
                            dataObject.data.value = data.angle;
                          } else if (input.name === 'velocity') {
                            dataObject.data.value = data.velocity;
                          } else if (input.name === 'direction') {
                            dataObject.data.value = (data.velocity >= 0.00 ? 1 : 0);
                          } else if (input.name === 'target') {
                            dataObject.data.value = data.target;
                          }
                          dataList.push(dataObject);

                          if (dataObject.data.value > this.tensorflowService.selectedDataset.bounds.yMax) {
                            this.tensorflowService.selectedDataset.bounds.yMax = Math.ceil(dataObject.data.value);
                            this.tensorflowDrawService.updateBounds(this.tensorflowService.selectedDataset.bounds);

                          } else if (dataObject.data.value < this.tensorflowService.selectedDataset.bounds.yMin) {
                            this.tensorflowService.selectedDataset.bounds.yMin = Math.floor(dataObject.data.value);
                            this.tensorflowDrawService.updateBounds(this.tensorflowService.selectedDataset.bounds);
                          }

                          if (i == 2) {
                            microcontrollerObject.motors[m] = dataList;
                          }
                        }
                        i++;
                    }
                  }
                  m++;
                }

                const time = new Date().getTime() - this.tensorflowService.recording.starttime;
                microcontrollerObject.inputdata = { name: "time", value: time };

                if (time > this.tensorflowService.selectedDataset.bounds.xMax - 500) {
                  this.tensorflowService.selectedDataset.bounds.xMax += 2000;
                  this.tensorflowDrawService.updateBounds(this.tensorflowService.selectedDataset.bounds);
                }
                if (this.tensorflowService.selectedDataset.d) {
                  this.tensorflowService.selectedDataset.d.inputs.push(microcontrollerObject);
                  this.tensorflowDrawService.drawGraph();
                  this.tensorflowDrawService.drawTensorFlowGraphData(this.tensorflowService.selectedDataset, this.tensorflowService.selectedModel, this.tensorflowService.selectedMicrocontrollers);
                }
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
            const item = this.document.getElementById('dataSetItem-' + this.tensorflowService.dataSets[(this.tensorflowService.dataSets.length - 1)].id);
            if (item) { item.click(); }
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
    this.tensorflowService.dataSets.push(new DataSet(uuid(), 'Data set ' + (this.tensorflowService.dataSets.length + 1)));
    this.tensorflowService.dataSets[0].open = true;
    this.tensorflowService.selectedDataset = this.tensorflowService.dataSets[0];
    this.tensorflowService.selectedModel.outputs.push(new Classifier('Classifier-' + (this.tensorflowService.selectedModel.outputs.length + 1)));
    this.tensorflowService.selectedModel.outputs[0].active = true;
    this.tensorflowService.addLabelToClassifier(0);
  }


  updateClassifier(item: String, index: number) {

  }


  getInputs(data: any) {
    let inputs = [];
    for (const input of this.tensorflowService.selectedModel.inputs) {
      if (input.active) {
        if (input.name === 'angle') {
          inputs.push(data.angle);
          // inputList.push('"angle-' + data.motorID + '":' + data.angle);
        } else if (input.name === 'velocity') {
          inputs.push(data.velocity);
          // inputList.push('"velocity-' + data.motorID + '":' + data.velocity);
        } else if (input.name === 'direction') {
          inputs.push((data.velocity >= 0.00 ? 1 : 0));
          // inputList.push('"direction-' + data.motorID + '":' + (data.velocity >= 0.00 ? 1 : 0));
        } else if (input.name === 'target') {
          inputs.push(data.target);
          // inputList.push('"target-' + data.motorID + '":' + data.target);
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
