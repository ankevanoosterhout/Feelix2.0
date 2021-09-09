import { Component, OnInit, Inject } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { HardwareService } from 'src/app/services/hardware.service';
import { FileService } from 'src/app/services/file.service';
import { UploadService } from 'src/app/services/upload.service';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { MicroController, Motor, Unit } from 'src/app/models/hardware.model';
import { MagneticSensor, Encoder } from 'src/app/models/position-sensors.model';


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

  public vendors = [
    { name: 'Arduino DUE' },
    { name: 'Teensy' },
    { name: 'ESP32' },
    { name: 'STM32' }
  ];

  public qualityOptions = [
    { level: 0, name: 'low', division: 8 },
    { level: 1, name: 'normal', division: 4 },
    { level: 2, name: 'high', division: 2 },
    { level: 3, name: 'maximum', division: 1 }
  ];


  public motorType = [
    { name: 'BLDC Motor', disabled: false },
    { name: 'Stepper Motor', disabled: true },
  ];

  public motionControlTypes = [
    { name: 'velocity' },
    { name: 'position' },
    { name: 'torque' }
  ];

  public encoderTypes = [
    { name: 'Magnetic sensor', disabled: false },
    { name: 'Encoder', disabled: true }
  ];

  public magneticSensorType = [
    { name: 'AS5048A' },
    { name: 'AS5047' },
    { name: 'AS5147' },
    { name: 'AS5600' }
  ];

  public directionType = [
    { name: 'CW' },
    { name: 'CCW' }
  ];

  public communicationType = [
    { name: 'SPI' },
    { name: 'I2C' },
    { name: 'PWM' }
  ];

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

  updateSelectedController() {
    if (this.selectedPort.vendor !== 'unknown') {
      this.selectedController = this.selectedPort.vendor;
      (this.document.getElementById('controllerType') as HTMLSelectElement).value = this.selectedController;
    }
  }

  closeWindow() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  deleteMicrocontroller(microcontroller: any) {
    const port = microcontroller.serialPort.path;
    if (this.selectedMicrocontroller.id === microcontroller.id) {
      this.selectedMicrocontroller = null;
    }
    this.hardwareService.deleteMicroController(port);
  }

  updateMicrocontroller(microcontroller: any) {
    this.hardwareService.updateMicroController(microcontroller);
    // this.electronService.ipcRenderer.send('updateMicrocontrollerDetails', microcontroller);
  }

  calibrateMotor(microcontroller: any, motorIndex: number) {
    this.electronService.ipcRenderer.send('calibrateMotor', {
      motor: motorIndex,
      microcontroller: { port: microcontroller.serialPort, type: microcontroller.vendor } });
  }

  compareUnits(unit1: Unit, unit2: Unit) {
    return unit1 && unit2 ? unit1.name === unit2.name : unit1 === unit2;
  }


  getComports() {
    this.electronService.ipcRenderer.send('listSerialPorts');
  }

  // getNumberOfPolePairs(motor_id: string) {
    // this.electronService.ipcRenderer.send('getNumberOfPolePairs');
  // }

  getCalibrationValue(motor_id: string) {
    this.electronService.ipcRenderer.send('getCalibrationValue', { motor: motor_id, port: this.selectedMicrocontroller });
  }

  createencoder(motor_id: string) {
    const motor = this.selectedMicrocontroller.motors.filter(m => m.id === motor_id)[0];
    if (motor) {
      if (motor.config.encoderType === 'Magnetic sensor') {
        motor.config.encoder = new MagneticSensor();
      } else if (motor.config.encoderType === 'Encoder') {
        motor.config.encoder = new Encoder();
      }
      this.updateMicrocontroller(this.selectMicrocontroller);
    }
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
          const newMotor = new Motor((microControllerLength + n));
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
      this.electronService.ipcRenderer.send('addMicrocontroller', { port: selectedPort.serialPort, type: this.selectedController, baudrate: 115200 });
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
