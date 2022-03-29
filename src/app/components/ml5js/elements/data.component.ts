
import { Component, Inject } from '@angular/core';
import { HardwareService } from 'src/app/services/hardware.service';
import { ML5jsService } from 'src/app/services/ml5js.service';
import { ElectronService } from 'ngx-electron';
import { ConnectModel } from 'src/app/models/effect-upload.model';
import { UploadService } from 'src/app/services/upload.service';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-data',
  templateUrl: 'data.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../ml5js.component.css'],
})
export class DataComponent {


  dataVisible = true;

  constructor(@Inject(DOCUMENT) private document: Document,public ml5jsService: ML5jsService, public hardwareService: HardwareService,
              private electronService: ElectronService, private uploadService: UploadService) {

  }



  record() {
    this.ml5jsService.recording.active = !this.ml5jsService.recording.active;
    if (this.ml5jsService.recording.active) {
      this.ml5jsService.recording.starttime = new Date().getTime();
    }
    for (const microcontroller of this.ml5jsService.selectedMicrocontrollers) {
      microcontroller.record = this.ml5jsService.recording.active;

      if (microcontroller.record) {
        for (const motor of microcontroller.motors) {
          if (motor.record) {
            this.ml5jsService.updateProgess('connecting to motor ' + motor.id + ' at ' +  microcontroller.serialPort.path, 0);
             // this.electronService.ipcRenderer.send('requestData', new ConnectModel(microcontroller));
          }
        }
      } else {
        this.ml5jsService.classify = false;
      }
    }
  }


  toggleDataSection() {
    this.dataVisible = !this.dataVisible;
    this.ml5jsService.updateResize((!this.dataVisible ? window.innerHeight - 60 : window.innerHeight * 0.45));
  }

  updateCommunicationSpeed(id: string) {
    const microcontroller = this.ml5jsService.selectedMicrocontrollers.filter(m => m.id === id)[0];
    if (microcontroller) {
      this.hardwareService.updateMicroController(microcontroller);
      const uploadModel = this.uploadService.createUploadModel(null, microcontroller);
      uploadModel.config.motors = microcontroller.motors;
      console.log(uploadModel);
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




}
