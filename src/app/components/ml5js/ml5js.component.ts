import { DOCUMENT } from '@angular/common';
import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { ConnectModel } from 'src/app/models/effect-upload.model';
import { MicroController, Motor } from 'src/app/models/hardware.model';
import { Classifier, DataSet } from 'src/app/models/ml5js.model';
import { HardwareService } from 'src/app/services/hardware.service';
import { ML5jsService } from 'src/app/services/ml5js.service';
import { MotorControlService } from 'src/app/services/motor-control.service';
import { UploadService } from 'src/app/services/upload.service';
import { v4 as uuid } from 'uuid';
import '../../../../electron/elements/ml5_sketch.js';

@Component({
  selector: 'app-ml5js',
  templateUrl: './ml5js_2.component.html',
  styleUrls: ['../windows/effects/effects.component.css', './ml5js.component.css'],
})
export class ML5jsComponent implements OnInit {

  updateHorizontalScreenDivision = false;
  resultWindowVisible = true;

  constructor(@Inject(DOCUMENT) private document: Document, public motorControlService: MotorControlService, public hardwareService: HardwareService,
    private uploadService: UploadService, private electronService: ElectronService, public ml5jsService: ML5jsService) {


      this.electronService.ipcRenderer.on('motorData', (event: Event, data: any) => {

        if (data.velocity > 0.1 || data.velocity < -0.1) {
          if (this.ml5jsService.dataSets.length > 0) {
            if (this.ml5jsService.recording.active) {
              let dataset = this.ml5jsService.dataSets[this.ml5jsService.dataSets.length - 1];
              for (const microcontroller of this.ml5jsService.selectedMicrocontrollers) {

                if (microcontroller.serialPort.path === data.serialPath) {
                  let microcontrollerObject = { port: microcontroller.serialPort.path, motors: [], inputdata: { name: null, value: null } };
                  let m = 0;
                  for (const motor of microcontroller.motors) {

                    let i = 0;
                    let dataList = [];
                    for (const input of this.ml5jsService.selectedModel.inputs) {
                        let dataObject = { motor: motor.id, index: m, data: { name: input.name, value: null } }
                        if (i < 3) {

                          if (motor.id === data.motorID) {

                          if (input.name === 'angle') {
                            dataObject.data.value = data.angle;
                          } else if (input.name === 'velocity') {
                            dataObject.data .value = data.velocity;
                          } else if (input.name === 'direction') {
                            dataObject.data.value = (data.velocity >= 0.00 ? "1" : "0");
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
              console.log(dataset.d.inputs);
            }
          }
          if (this.ml5jsService.classify) {
            const result = this.ml5jsService.NN_classify({ angle: data.angle, velocity: data.velocity, direction: (data.velocity >= 0.00 ? "1" : "0") });
            console.log(result);
          }
        }
      });

  }

  ngOnInit(): void {
    this.ml5jsService.dataSets.push(new DataSet(uuid(), 'Data set ' + (this.ml5jsService.dataSets.length + 1)));
    this.ml5jsService.selectedModel.outputs.push(new Classifier('Classifier-' + (this.ml5jsService.selectedModel.outputs.length + 1)));
    // this.loadScript('ml5_sketch.js');
  }


  storeDataSet() {

  }

  exportDataSet() {

  }

  saveDataSet(index: number) {

  }


  updateClassifier(item: String, index: number) {

  }

  toggleResultWindow() {
    this.resultWindowVisible = !this.resultWindowVisible;
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




};
