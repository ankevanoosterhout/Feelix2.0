import { Component, OnInit, Inject } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { HardwareService } from 'src/app/services/hardware.service';
import { FileService } from 'src/app/services/file.service';
import { UploadService } from 'src/app/services/upload.service';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { MicroController, Motor, Unit } from 'src/app/models/hardware.model';


@Component({
  selector: 'app-motor-settings',
  templateUrl: './motor-settings.component.html',
  styleUrls: ['../../windows/effects/effects.component.css'],
})
export class MotorSettingsComponent implements OnInit {

  comports = [];
  microcontrollers: MicroController[] = [];
  selectedMicrocontroller: MicroController = null;

  selectedPort: any = null;
  selectedController = 'Teensy';
  showSelectMicrocontroller = false;

  public directionOptions = [
    { name: 'any', val: null },
    { name: 'clockwise', val: 'cw' },
    { name: 'counterclockwise',  val: 'ccw' }
  ];

  public unitOptions = [
    { name: '4096PPR', PR: 4096 },
    { name: 'custom', PR: 360 }
  ];

  public linearOptions = [
    { name: 'mm', PR: 50 },
    { name: 'cm', PR: 5 }
  ];

  public radialOptions = [
    { name: 'PPR', PR: 4096 },
    { name: 'degrees', PR: 360 }
  ];

  public controllerOptions = [
    { name: 'Arduino DUE' },
    { name: 'Teensy' },
    { name: 'STM32' }
  ];

  public qualityOptions = [
    { level: 0, name: 'low', division: 8 },
    { level: 1, name: 'normal', division: 4 },
    { level: 2, name: 'high', division: 2 },
    { level: 3, name: 'maximum', division: 1 }
  ];


  public motorType = [
    { name: 'BLDC Motor' },
    { name: 'Stepper Motor' },
  ];

  public motionControlTypes = [
    { name: 'velocity' },
    { name: 'position' },
    { name: 'torque' }
  ];

  public encoderTypes = [
    { name: 'AS5047' },
    { name: 'AS5048A' },
    { name: 'AS5600' }
  ]

  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService, private uploadService: UploadService,
              private hardwareService: HardwareService, private fileService: FileService, private router: Router ) {

    this.electronService.ipcRenderer.on('updateCalibrationValue', (event: Event, data: any) => {
      // this.microcontroller.motor.calibration.xStartPos = data;
      // this.updateMotor(this.microcontroller.motor);
      (this.document.getElementById('calibration_val') as HTMLInputElement).value = data;

    });

    this.electronService.ipcRenderer.on('comports', (event: Event, comports: any) => {
      this.comports = comports;
      if (this.comports.length > 0) {
        this.selectedPort = this.comports[0];
      }
    });

  }

  selectMicrocontroller(microcontroller: MicroController) {
    this.selectedMicrocontroller = microcontroller;
    this.showSelectMicrocontroller = false;
  }

  closeWindow() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  deleteMicrocontroller(microcontroller: any) {
    this.hardwareService.deleteMicroController(microcontroller.serialPort.path);
  }

  updateMicrocontroller(microcontroller: any) {
    this.hardwareService.updateMicroController(microcontroller);
    // this.electronService.ipcRenderer.send('updateMicrocontrollerDetails', this.microcontroller);
  }

  calibrateMotor(microcontroller: any, motorIndex: number) {
    this.electronService.ipcRenderer.send('calibrateMotor', {
      motor: motorIndex,
      microcontroller: { port: microcontroller.serialPort, type: microcontroller.type } });
  }

  compareUnits(unit1: Unit, unit2: Unit) {
    return unit1 && unit2 ? unit1.name === unit2.name : unit1 === unit2;
  }


  getComports() {
    this.electronService.ipcRenderer.send('listSerialPorts');
  }

  getNumberOfPolePairs(motorId: number) {

  }

  addNewMicrocontroller() {
    this.selectedMicrocontroller = null;
    this.showSelectMicrocontroller = true;
  }

  updateNrOfMotors() {
    const nr = (this.document.getElementById('numberOfMotors-' + this.selectedMicrocontroller.id) as HTMLInputElement).value;
    if (parseInt(nr) > 0) {
      const microControllerLength = this.selectedMicrocontroller.motors.length;
      const diff = parseInt(nr) - microControllerLength;
      if (diff > 0) {
        for (let n = 0; n < diff; n++) {
          const newMotor = new Motor((microControllerLength + n + 1));
          this.selectedMicrocontroller.motors.push(newMotor);
        }
      } else if (diff < 0) {
        for (let n = diff; n < 0; n++) {
          this.selectedMicrocontroller.motors.pop();
        }
      }
      this.hardwareService.updateMicroController(this.selectedMicrocontroller);
    } else {
      (this.document.getElementById('numberOfMotors-' + this.selectedMicrocontroller.id) as HTMLInputElement).value = this.selectedMicrocontroller.motors.length.toString();
    }
  }

  saveMicrocontroller(selectedPort: any, selectedController: string) {
    this.hardwareService.addMicroController(selectedPort, this.selectedController);
    if (selectedPort !== null && selectedController !== null) {
      this.electronService.ipcRenderer.send('addMicrocontroller', { port: selectedPort.serialPort, type: this.selectedController });
    }
    this.microcontrollers = this.hardwareService.getAllMicroControllers();
    this.selectedMicrocontroller = this.microcontrollers[this.microcontrollers.length - 1];
    this.showSelectMicrocontroller = false;
  }


  ngOnInit(): void {
    this.microcontrollers = this.hardwareService.getAllMicroControllers();
    if (this.microcontrollers.length > 0) {
      this.selectedMicrocontroller = this.microcontrollers[0];
    }
  }




  // drawFileDataMotors() {
  //   if (this.microcontroller) {
  //     this.drawFileData(this.microcontroller.motor, this.microcontroller.motor.translatedData, this.microcontroller.motor.file);

  //     if (this.microcontroller.motor.file !== null) {
  //       const motorFile = this.filelist.filter(f => f._id === this.microcontroller.motor.file._id)[0];
  //       if (!motorFile && this.microcontroller.motor.file.mode === 'default') {
  //         this.filelist.push(this.microcontroller.motor.file);
  //       }
  //     }
  //   }
  // }



}
