import { DOCUMENT } from '@angular/common';
import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Classifier, DataSet } from 'src/app/models/tensorflow.model';
import { HardwareService } from 'src/app/services/hardware.service';
import { TensorFlowMainService } from 'src/app/services/tensorflow-main.service';
import { MotorControlService } from 'src/app/services/motor-control.service';
import { UploadService } from 'src/app/services/upload.service';
import { v4 as uuid } from 'uuid';
import { TensorFlowDrawService } from 'src/app/services/tensorflow-draw.service';

@Component({
  selector: 'app-ml5js',
  templateUrl: './tensorFlowJS.component.html',
  styleUrls: ['../windows/effects/effects.component.css', './tensorFlowJS.component.css'],
})
export class TensorFlowJSComponent implements OnInit {

  updateHorizontalScreenDivision = false;
  updateVerticalScreenDivision = false;
  resultWindowVisible = true;

  horizontalScreenDivision = 65;
  verticalScreenDivision = 45;

  public page = 'ml5js';
  public status = 'Ready';
  public progress = 0;

  inputArray = [];

  constructor(@Inject(DOCUMENT) private document: Document, public motorControlService: MotorControlService, public hardwareService: HardwareService,
    private uploadService: UploadService, private electronService: ElectronService, public tensorflowService: TensorFlowMainService, private tensorflowDrawService: TensorFlowDrawService) {


      this.electronService.ipcRenderer.on('motorData', (event: Event, data: any) => {
        // console.log(data);
        if (data.velocity > 0.08 || data.velocity < -0.08) {

          //when classifying input data
          if (this.tensorflowService.classify && this.tensorflowService.selectedModel.model) {
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

            if (this.tensorflowService.recording.active) {
              let dataset = this.tensorflowService.dataSets.filter(d => d.open)[0];
              // let dataset = this.tensorflowService.dataSets[0];
              const microcontroller = this.tensorflowService.selectedMicrocontrollers.filter(m => m.serialPort.path === data.serialPath)[0];

              if (microcontroller) {

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

                          if (i == 2) {
                            microcontrollerObject.motors[m] = dataList;
                          }
                        }
                        i++;
                    }
                  }
                  m++;
                }
                microcontrollerObject.inputdata = { name: "time", value: new Date().getTime() - this.tensorflowService.recording.starttime };
                // console.log(dataset);
                if (dataset.d) {
                  dataset.d.inputs.push(microcontrollerObject);
                  // this.tensorflowDrawService.drawGraphData(dataset);
                }
              }
              const item = this.document.getElementById('dataSetItem-' + dataset.id);
              if (item) { item.click(); }
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
    this.tensorflowService.selectedModel.outputs.push(new Classifier('Classifier-' + (this.tensorflowService.selectedModel.outputs.length + 1)));

  }




  updateClassifier(item: String, index: number) {

  }

  toggleResultWindow() {
    this.resultWindowVisible = !this.resultWindowVisible;
    this.updateScreenDivisionX(!this.resultWindowVisible ? window.innerWidth - 18 : window.innerWidth * 0.65);
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

    if (this.updateHorizontalScreenDivision) {
      this.updateScreenDivisionY(e.clientY);
    } else if (this.updateVerticalScreenDivision) {
      this.updateScreenDivisionX(e.clientX);
    }
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(e: MouseEvent) {
    if (this.updateHorizontalScreenDivision || this.updateVerticalScreenDivision) {
      this.updateHorizontalScreenDivision = false;
      this.updateVerticalScreenDivision = false;
    }
  }



  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    // this.tensorflowDrawService.drawGraph(window.innerWidth, window.innerHeight);
    // this.tensorflowDrawService.drawGraphData(this.tensorflowService.dataSets.filter(d => d.open)[0]);
  }


  updateScreenDivisionY(coord: number) {
    if (coord > 60 && coord <= window.innerHeight - 60) {
      let fullHeight = window.innerHeight - 60;
      let division = 100 / (fullHeight / (coord - 22));
      this.updateResize(division, 'horizontal');
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
      this.document.getElementById('classifiers').style.height = ((window.innerHeight * division / 100) - 5) + 'px';
      this.document.getElementById('model').style.height = ((window.innerHeight * division / 100) - 5) + 'px';
      this.document.getElementById('data').style.height = ((window.innerHeight * (100-division) / 100) - 60) + 'px';
      this.horizontalScreenDivision = division;
      if (this.horizontalScreenDivision >= (100 / window.innerHeight) * (window.innerHeight - 80)) {
        this.document.getElementById('toggleDataSection').classList.add('hidden');
      } else {
        if (this.document.getElementById('toggleDataSection').classList.contains('hidden')) {
          this.document.getElementById('toggleDataSection').classList.remove('hidden');
        }
      }


    } else if (orientation === 'vertical') {

      this.document.getElementById('model').style.width = (window.innerWidth * division / 100) + 'px';
      this.document.getElementById('classifiers').style.width = (window.innerWidth * (100-division) / 100) + 'px';
      this.verticalScreenDivision = division;
      if (this.verticalScreenDivision >= (100 / window.innerWidth) * (window.innerWidth - 18)) {
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





};
