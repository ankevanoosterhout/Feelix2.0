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

  // public directionOptions = [
  //   { name: 'clockwise', val: 'cw' },
  //   { name: 'counterclockwise',  val: 'ccw' }
  // ];

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
    { name: 'AS5X4X' },
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


    this.electronService.ipcRenderer.on('comports', (event: Event, comports: any) => {
      this.comports = comports;
      if (this.comports.length > 0) {
        this.selectedPort = this.comports[0];
      }
    });

    this.electronService.ipcRenderer.on('zero_electric_angle', (event: Event, data: any) => {

      this.microcontrollers.filter(m => m.serialPort.path === data.serialPath)[0].motors.filter(m => m.id === data.motorID)[0].config.calibration.value = data.zero_electric_angle;
      this.microcontrollers.filter(m => m.serialPort.path === data.serialPath)[0].motors.filter(m => m.id === data.motorID)[0].config.calibration.direction = data.direction === 1 ? 'CW' : 'CCW';

      (this.document.getElementById('calibrationValue-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = data.zero_electric_angle;
      (this.document.getElementById('calibrationDirection-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = data.direction === 1 ? 'CW' : 'CCW';

    });

    this.electronService.ipcRenderer.on('microcontrollers', (event: Event, data: any) => {
      this.microcontrollers = data;
      this.selectedMicrocontroller = this.microcontrollers[this.microcontrollers.length - 1];
      this.showSelectMicrocontroller = false;
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
    if (microcontroller) {
      const port = microcontroller.serialPort.path;
      if (this.selectedMicrocontroller.id === microcontroller.id) {
        this.selectedMicrocontroller = null;
      }
      this.hardwareService.deleteMicroController(port);
      this.electronService.ipcRenderer.send('deleteMicrocontrollerCollections', microcontroller);
    }
  }

  updateMicrocontroller(microcontroller: any) {
    this.hardwareService.updateMicroController(microcontroller);
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

    if (selectedPort !== null && selectedController !== null) {
      this.hardwareService.addMicroController(selectedPort, this.selectedController);
      this.electronService.ipcRenderer.send('addMicrocontroller', { port: selectedPort.serialPort, type: this.selectedController, baudrate: 115200 });
      this.selectedMicrocontroller = this.microcontrollers[this.microcontrollers.length - 1];
      this.showSelectMicrocontroller = false;
    }
  }


  ngOnInit(): void {
    this.microcontrollers = this.hardwareService.getAllMicroControllers();
    if (this.microcontrollers.length > 0) {
      this.selectedMicrocontroller = this.microcontrollers[0];
    }

    this.hardwareService.microcontrollerObservable.subscribe(microcontrollers => {
      this.microcontrollers = microcontrollers;
      if (this.selectedMicrocontroller) {
        this.selectedMicrocontroller = this.microcontrollers.filter(m => m.id === this.selectedMicrocontroller.id)[0];
      }
    });
  }




}
