
import { Component, Inject } from '@angular/core';
import { HardwareService } from 'src/app/services/hardware.service';
import { ML5jsService } from 'src/app/services/ml5js.service';
import { ElectronService } from 'ngx-electron';
import { ConnectModel } from 'src/app/models/effect-upload.model';

@Component({
  selector: 'app-data',
  templateUrl: 'data.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../ml5js.component.css'],
})
export class DataComponent {


  dataVisible = true;

  constructor(public ml5jsService: ML5jsService, public hardwareService: HardwareService, private electronService: ElectronService) {
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
            this.electronService.ipcRenderer.send('run', { motor_id: motor.id, port: microcontroller.serialPort.path });
          }
        }
        // this.electronService.ipcRenderer.send('requestData', new ConnectModel(microcontroller));
      } else {
        this.ml5jsService.classify = false;
      }
    }
  }


  toggleDataSection() {
    this.dataVisible = !this.dataVisible;
  }

  selectDataSet(index: number) {
    let i = 0;
    for (const set of this.ml5jsService.dataSets) {
      if (i !== index) { set.open = false; }
      else if (i === index) { set.open = true; }
      i++;
    }
  }


}
