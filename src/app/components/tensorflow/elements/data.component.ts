import { Component, Inject, AfterViewInit } from '@angular/core';
import { HardwareService } from 'src/app/services/hardware.service';
import { TensorFlowMainService } from 'src/app/services/tensorflow-main.service';
import { ElectronService } from 'ngx-electron';
import { ConnectModel } from 'src/app/models/effect-upload.model';
import { UploadService } from 'src/app/services/upload.service';
import { DOCUMENT } from '@angular/common';
import { TensorFlowDrawService } from 'src/app/services/tensorflow-draw.service';
import { MicroController } from 'src/app/models/hardware.model';



@Component({
  selector: 'app-data',
  templateUrl: 'data.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../tensorFlowJS.component.css'],
})
export class DataComponent implements AfterViewInit {


  dataVisible = true;



  constructor(@Inject(DOCUMENT) private document: Document,public tensorflowService: TensorFlowMainService, public hardwareService: HardwareService,
              private electronService: ElectronService, private uploadService: UploadService, private tensorflowDrawService: TensorFlowDrawService) {}


  ngAfterViewInit(): void {
    this.tensorflowDrawService.drawGraph();
  }



  record() {
    this.tensorflowService.recording.active = !this.tensorflowService.recording.active;

    if (!this.tensorflowService.recording.active) {
      this.tensorflowService.recording.starttime = null;
    }

    for (const microcontroller of this.tensorflowService.selectedMicrocontrollers) {
      microcontroller.record = this.tensorflowService.recording.active;

      if (microcontroller.record) {

        // this.tensorflowService.updateProgess('connecting to microcontroller ' + microcontroller.serialPort.path, 0);
        const model = new ConnectModel(microcontroller);
        this.electronService.ipcRenderer.send('requestData', model);

      } else {
        this.tensorflowService.classify = false;
      }
    }
  }


  toggleDataSection() {
    this.dataVisible = !this.dataVisible;
    this.tensorflowService.updateResize((!this.dataVisible ? window.innerHeight - 60 : window.innerHeight * 0.45));
  }

  toggleVisibilityInput(name: string) {
    const input = this.tensorflowService.selectedModel.inputs.filter(n => n.name == name)[0];
    input.visible = !input.visible;
    if (this.tensorflowService.selectedDataset) {
      this.tensorflowDrawService.drawTensorFlowGraphData(this.tensorflowService.selectedDataset, this.tensorflowService.selectedModel, this.tensorflowService.selectedMicrocontrollers);
    }
  }

  toggleVisibilityMotor(mcu: MicroController, motor_id: string) {
    const motor = mcu.motors.filter(m => m.id === motor_id)[0];
    motor.visible = !motor.visible;
    if (this.tensorflowService.selectedDataset) {
      this.tensorflowDrawService.drawTensorFlowGraphData(this.tensorflowService.selectedDataset, this.tensorflowService.selectedModel, this.tensorflowService.selectedMicrocontrollers);
    }
  }

  updateCommunicationSpeed(id: string) {
    const microcontroller = this.tensorflowService.selectedMicrocontrollers.filter(m => m.id === id)[0];
    if (microcontroller) {
      this.hardwareService.updateMicroController(microcontroller);
      const uploadModel = this.uploadService.createUploadModel(null, microcontroller);
      uploadModel.config.motors = microcontroller.motors;
      // console.log(uploadModel);
      this.electronService.ipcRenderer.send('updateMotorSetting', uploadModel);
      // console.log(microcontroller.updateSpeed);
    }
  }


  openCloseItem(id: string) {
    const item = this.document.getElementById('open_' + id);
    const section = this.document.getElementById('section_' + id);
    if (item && section) {
      if (item.classList.contains('open')) {
        item.classList.remove('open');
        section.classList.add('hidden');
      } else {
        item.classList.add('open');
        section.classList.remove('hidden');
      }
    }
  }


  compareID(el1: any, el2: any) {
    return el1 && el2 ? el1.id === el2.id : el1 === el2;
  }
}
