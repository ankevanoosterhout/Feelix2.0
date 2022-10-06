import { DOCUMENT } from '@angular/common';
import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Classifier, DataSet } from 'src/app/models/ml5js.model';
import { HardwareService } from 'src/app/services/hardware.service';
import { ML5jsService } from 'src/app/services/ml5js.service';
import { MotorControlService } from 'src/app/services/motor-control.service';
import { UploadService } from 'src/app/services/upload.service';
import { v4 as uuid } from 'uuid';

@Component({
  selector: 'app-ml5js',
  templateUrl: './ml5js.component.html',
  styleUrls: ['../windows/effects/effects.component.css', './ml5js.component.css'],
})
export class ML5jsComponent implements OnInit {

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
    private uploadService: UploadService, private electronService: ElectronService, public ml5jsService: ML5jsService) {


      this.electronService.ipcRenderer.on('motorData', (event: Event, data: any) => {

        if (data.velocity > 0.1 || data.velocity < -0.1) {
          if (this.ml5jsService.classify && this.ml5jsService.selectedModel.model) {
            let inputs = [];
            for (const input of this.ml5jsService.selectedModel.inputs) {
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

            if (this.ml5jsService.selectedModel.multiple) {
              const microcontroller = this.ml5jsService.selectedMicrocontrollers.filter(m => m.serialPort.path === data.serialPath)[0];
              if (this.inputArray.length > 0 && this.hardwareService.getDataSendTime(microcontroller.id) - new Date().getTime() > microcontroller.updateSpeed * 3) {
                this.ml5jsService.NN_Deploy(this.inputArray, this.ml5jsService.selectedModel, data.serialPath);
              } else {
                this.inputArray.push(inputs);
              }

              this.hardwareService.updateDataSendTime(microcontroller.id);

            } else {

              this.ml5jsService.NN_Deploy(inputs, this.ml5jsService.selectedModel, data.serialPath);
            }

          } else if (this.ml5jsService.dataSets.length > 0) {

            if (this.ml5jsService.recording.active) {
              let dataset = this.ml5jsService.dataSets.filter(d => d.open)[0];
              for (const microcontroller of this.ml5jsService.selectedMicrocontrollers) {

                if (microcontroller.serialPort.path === data.serialPath) {
                  let microcontrollerObject = { port: microcontroller.serialPort.path, motors: [], inputdata: { name: null, value: null } };
                  let m = 0;
                  for (const motor of microcontroller.motors) {

                    let i = 0;
                    let dataList = [];
                    for (const input of this.ml5jsService.selectedModel.inputs) {
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
                  microcontrollerObject.inputdata = { name: "time", value: new Date().getTime() - this.ml5jsService.recording.starttime };
                  dataset.d.inputs.push(microcontrollerObject);
                  break;
                }
              }
              const item = this.document.getElementById('dataSetItem-' + dataset.id);
              if (item) { item.click(); }
            }
          }

        }
      });

      this.electronService.ipcRenderer.on('export-dataset-model', (event: Event, data: any) => {
        this.ml5jsService.saveDataNN();
      });

      this.electronService.ipcRenderer.on('load-datasets', (event: Event, data: any) => {
        if (data) {
          for (const dataset of data) {
            if (this.ml5jsService.dataSets.filter(d => d.id === dataset.id).length === 0) {
              this.ml5jsService.dataSets.unshift(dataset);
            }
          }
          if (this.ml5jsService.dataSets.length > 0) {
            const item = this.document.getElementById('dataSetItem-' + this.ml5jsService.dataSets[(this.ml5jsService.dataSets.length - 1)].id);
            if (item) { item.click(); }
          }
        }
      });


      this.electronService.ipcRenderer.on('load-model', (event: Event, data: any) => {
        if (data && data[0]) {
          this.ml5jsService.loadModel(data[0].id);
        }
      });

      this.ml5jsService.updateML5jsProgress.subscribe(data => {
        this.progress = data.progress;
        this.status = data.status;
        this.document.getElementById('msg').innerHTML = this.status;
        const width = 244 * (this.progress / 100);
        this.document.getElementById('progress').style.width = width + 'px';
      });

      this.ml5jsService.updateResizeElements.subscribe(data => {
        this.updateScreenDivisionY(data.coord);
      });


      this.electronService.ipcRenderer.on('save-model', (event: Event) => {
        this.ml5jsService.saveModel();
      });

      this.electronService.ipcRenderer.on('export-model', (event: Event) => {
        this.ml5jsService.exportModel();
      });

      this.electronService.ipcRenderer.on('import-model', (event: Event) => {
        this.ml5jsService.importModel();
      });

      this.electronService.ipcRenderer.on('deploy-model', (event: Event) => {
        this.document.getElementById('deploy').click();
      });

      this.electronService.ipcRenderer.on('train-model', (event: Event) => {
        this.document.getElementById('initialize').click();
      });


  }

  ngOnInit(): void {
    this.ml5jsService.dataSets.push(new DataSet(uuid(), 'Data set ' + (this.ml5jsService.dataSets.length + 1)));
    this.ml5jsService.selectedModel.outputs.push(new Classifier('Classifier-' + (this.ml5jsService.selectedModel.outputs.length + 1)));
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
