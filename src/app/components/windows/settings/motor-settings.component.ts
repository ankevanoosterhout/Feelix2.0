import { Component, OnInit, Inject } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { HardwareService } from 'src/app/services/hardware.service';
import { FileService } from 'src/app/services/file.service';
import { UploadService } from 'src/app/services/upload.service';
import { Router } from '@angular/router';
import { DOCUMENT } from '@angular/common';
import { ActuatorLabelMapping, ActuatorType, BLDCConfig, MicroController, Motor, PneuConfig, SensorCommunication, SensorCommunicationMapping, StepperConfig, TorqueTunerConfig, Unit } from 'src/app/models/hardware.model';
import { MagneticSensor, Encoder } from 'src/app/models/position-sensors.model';


@Component({
  selector: 'app-motor-settings',
  templateUrl: './motor-settings.component.html',
  styleUrls: ['../../windows/effects/effects.component.css'],
})
export class MotorSettingsComponent implements OnInit {

  public ActuatorLabelMapping = ActuatorLabelMapping;
  public SensorCommunicationMapping = SensorCommunicationMapping;

  public motorTypes = Object.values(ActuatorType).filter(value => typeof value === 'number');
  public sensorCommunicationTypes = Object.values(SensorCommunication).filter(value => typeof value === 'number');

  comports = [];
  microcontrollers: MicroController[] = [];
  selectedMicrocontroller: MicroController = null;

  selectedPort: any = null;
  selectedController = 'Teensy';
  showSelectMicrocontroller = false;
  searchRange = 0;

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
    { name: 'deg', PR: 360 }
  ];

  public vendors = [
    { name: 'STM32' },
    { name: 'Teensy' },
    { name: 'ESP32' },
    { name: 'ESP8266' },
    { name: 'Arduino MEGA' },
    { name: 'Arduino DUE' },
    { name: 'Arduino Nano' },
    { name: 'Raspberry PICO' }
  ];

  public qualityOptions = [
    { level: 0, name: 'low', division: 8 },
    { level: 1, name: 'normal', division: 4 },
    { level: 2, name: 'high', division: 2 },
    { level: 3, name: 'maximum', division: 1 }
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


  public I2C_communicationType = [
    { name: 'no communication', value: 0 },
    { name: 'master', value: 1 },
    { name: 'slave', value: 2 }
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

      (this.document.getElementById('calibrationValue-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = data.zero_electric_angle.toString();
      (this.document.getElementById('calibrationDirection-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = data.direction === 1 ? 'CW' : 'CCW';

    });

    this.electronService.ipcRenderer.on('microcontrollers', (event: Event, data: any) => {
      this.microcontrollers = data;
      this.selectedMicrocontroller = this.microcontrollers[this.microcontrollers.length - 1];
      this.showSelectMicrocontroller = false;
    });

    this.electronService.ipcRenderer.on('updateCurrentSenseCalibration', (event: Event, data: any) => {
      const microcontroller = this.microcontrollers.filter(m => m.serialPort.path === data.serialPath)[0];
      if (microcontroller) {
        microcontroller.motors.filter(m => m.id === data.motorID)[0].config.overheatProtection = true;
        microcontroller.motors.filter(m => m.id === data.motorID)[0].config.current_sense_calibration = data.current_sense_calibration;
        this.hardwareService.updateMicroController(microcontroller);
        (this.document.getElementById('currentSenseCalibrationValue-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = data.current_sense_calibration.toString();
      }
    });

    this.electronService.ipcRenderer.on('receiveData', (event: Event, data: any) => {
      // console.log(data);
      const microcontroller = this.microcontrollers.filter(m => m.serialPort.path === data.serialPath)[0];
      if (microcontroller && data.type === 'A') {
        if (this.searchRange === 1) {
          this.searchRange++;
          const motor = microcontroller.motors.filter(m => m.id === data.motorID)[0];
          if (motor) {
            motor.state.position.start = data.value * (180/Math.PI);
            (this.document.getElementById('instruction-' + data.serialPath + '-' + data.motorID) as HTMLElement).innerHTML = "rotate motor to end position and press 'OK'";
            if (this.document.getElementById('startPosition-' + data.serialPath + '-' + data.motorID)) {
              (this.document.getElementById('startPosition-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = motor.state.position.start.toString();
              (this.document.getElementById('startPosition-offset-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = (motor.state.position.start + motor.config.sensorOffset).toString();
            }
          }

        } else if (this.searchRange > 1) {
          this.searchRange = 0;
          const motor = microcontroller.motors.filter(m => m.id === data.motorID)[0];
          if (motor) {
            motor.state.position.end = data.value * (180/Math.PI);
            if (motor.state.position.end < motor.state.position.start) {
              const tmp = motor.state.position.end;
              motor.state.position.end = motor.state.position.start;
              motor.state.position.start = tmp;
              if (this.document.getElementById('startPosition-' + data.serialPath + '-' + data.motorID)) {
                (this.document.getElementById('startPosition-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = motor.state.position.start.toString();
                (this.document.getElementById('startPosition-offset-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = (motor.state.position.start + motor.config.sensorOffset).toString();
              }
            }
            if (this.document.getElementById('endPosition-' + data.serialPath + '-' + data.motorID)) {
              (this.document.getElementById('endPosition-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = motor.state.position.end.toString();
              (this.document.getElementById('endPosition-offset-' + data.serialPath + '-' + data.motorID) as HTMLInputElement).value = (motor.state.position.end + motor.config.sensorOffset).toString();
            }
          }
          this.hardwareService.updateMicroController(microcontroller);
          (this.document.getElementById('find-range') as HTMLElement).classList.add('hidden');
          (this.document.getElementById('find-range-2') as HTMLElement).classList.remove('hidden');
          (this.document.getElementById('instruction-' + data.serialPath + '-' + data.motorID) as HTMLElement).innerHTML = "rotate motor to start position and press 'OK'";
          this.electronService.ipcRenderer.send('run', { motor_id: data.motorID, port: data.serialPath, run: 0 });
        }
      }
    })
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

  updateStartPosition(microcontroller: any, motor_id: string) {

    this.hardwareService.updateMicroController(microcontroller);

    const uploadModel = this.uploadService.createUploadModel(null, this.selectedMicrocontroller);
    const motor = this.selectedMicrocontroller.motors.filter(m => m.id === motor_id)[0];
    const newSensorOffset = (this.document.getElementById('sensorOffset-' + this.selectedMicrocontroller.serialPort.path + '-' + motor_id) as HTMLInputElement).value;
    const newStartValue = motor.state.position.start + parseFloat(newSensorOffset);
    const newEndValue = motor.state.position.end + parseFloat(newSensorOffset);
    (this.document.getElementById('startPosition-offset-' + this.selectedMicrocontroller.serialPort.path + '-' + motor_id) as HTMLInputElement).value = newStartValue.toString();
    (this.document.getElementById('endPosition-offset-' + this.selectedMicrocontroller.serialPort.path + '-' + motor_id) as HTMLInputElement).value = newEndValue.toString();
    // motor.state.position.start -= sensorOffset;
    // motor.state.position.end -= sensorOffset;
    uploadModel.config.motors = [ motor ];
    if (this.selectedMicrocontroller) {
      this.electronService.ipcRenderer.send('updateMotorSetting', uploadModel);
    }
  }

  updateActuatorType(microcontroller: MicroController, motor_id: string) {
    const motor = microcontroller.motors.filter(m => m.id === motor_id)[0];
    if (motor) {
      if (motor.type === ActuatorType.bldc) {
        motor.config = new BLDCConfig();
      } else if (motor.type === ActuatorType.pneumatic) {
        motor.config = new PneuConfig();
      } else if (motor.type === ActuatorType.stepper) {
        motor.config = new StepperConfig();
      } else if (motor.type === ActuatorType.torquetuner) {
        motor.config = new TorqueTunerConfig();
      }
    }
    this.hardwareService.updateMicroController(microcontroller);
  }
  

  updateRange(position: string, motor_id: string, microcontroller: MicroController) {
    const value = (this.document.getElementById(position + 'Position-offset-' + microcontroller.serialPort.path + '-' + motor_id) as HTMLInputElement).value;
    if (value) {
      const motor = microcontroller.motors.filter(m => m.id === motor_id)[0];
      if (motor) {
        const newOffset = position === 'start' ? parseFloat(value) - motor.state.position.start : parseFloat(value) - motor.state.position.end;
        if (newOffset) {
          motor.config.sensorOffset = newOffset;
          this.updateStartPosition(microcontroller, motor_id);
        }
        const otherPos = position === 'start' ? 'end' : 'start';
        const newValue = (position === 'start' ? motor.state.position.end : motor.state.position.start) + motor.config.sensorOffset;
        (this.document.getElementById(otherPos + 'Position-offset-' + microcontroller.serialPort.path + '-' + motor_id) as HTMLInputElement).value = newValue.toString();
      }
    }
    this.updateMicrocontroller(microcontroller);
  }



  // calibrateMotor(microcontroller: any, motorIndex: number) {

  //   this.electronService.ipcRenderer.send('calibrateMotor', {
  //     motor: motorIndex,
  //     microcontroller: { port: microcontroller.serialPort, type: microcontroller.vendor } });
  // }

  findRange(microcontroller: MicroController, motor_id: string) {
    this.searchRange = 1;
    this.hardwareService.updateMicroController(microcontroller);

    const uploadModel = this.uploadService.createUploadModel(null, this.selectedMicrocontroller);
    const motor = this.selectedMicrocontroller.motors.filter(m => m.id === motor_id)[0];
    uploadModel.config.motors = [ motor ];
    if (this.selectedMicrocontroller) {
      this.electronService.ipcRenderer.send('updateMotorSetting', uploadModel);
      (this.document.getElementById('find-range-2') as HTMLElement).classList.add('hidden');
      (this.document.getElementById('find-range') as HTMLElement).classList.remove('hidden');
      this.electronService.ipcRenderer.send('run', { motor_id: motor_id, port: microcontroller.serialPort.path, run: 1 });
    }

  }

  listDevices(motor_id: string, microcontroller: MicroController) {
    if (microcontroller) {
      this.electronService.ipcRenderer.send('listDevices', { motor_id: motor_id, port: microcontroller.serialPort.path });
    }
  }

  confirmPosition(microcontroller: any, motor_id: string) {
    this.electronService.ipcRenderer.send('getValue', { motor_id: motor_id, port: microcontroller.serialPort.path, char: 'A' });
  }


  compareUnits(unit1: Unit, unit2: Unit) {
    return unit1 && unit2 ? unit1.name === unit2.name : unit1 === unit2;
  }


  getComports() {
    this.electronService.ipcRenderer.send('listSerialPorts');
  }


  getCalibrationValue(motor_id: string) {
    if (this.selectedMicrocontroller) {
      const uploadModel = this.createCalibrationModel(motor_id);
      this.electronService.ipcRenderer.send('getCalibrationValue', uploadModel);
    }
  }

  getCurrentSenseCalibrationValue(motor_id: string) {
    if (this.selectedMicrocontroller) {
      const uploadModel = this.createCalibrationModel(motor_id);
      this.electronService.ipcRenderer.send('getCurrentSenseCalibrationValue', uploadModel);
    }
  }

  createCalibrationModel(motor_id: string) {
    const uploadModel = this.uploadService.createUploadModel(null, this.selectedMicrocontroller);
    const motor = this.selectedMicrocontroller.motors.filter(m => m.id === motor_id)[0];
    uploadModel.config.motors = [ motor ];
    return uploadModel;
  }

  createencoder(motor_id: string) {
    const motor = this.selectedMicrocontroller.motors.filter(m => m.id === motor_id)[0];
    if (motor) {
      if (motor.config.encoderType === 'Magnetic sensor') {
        motor.config.encoder = new MagneticSensor();
      } else if (motor.config.encoderType === 'Encoder') {
        motor.config.encoder = new Encoder();
      }
      this.updateMicrocontroller(this.selectedMicrocontroller);
    }
  }

  addNewMicrocontroller() {
    this.selectedMicrocontroller = null;
    this.showSelectMicrocontroller = true;
  }

  updateNrOfMotors() {
    const nr = (this.document.getElementById('numberOfMotors-' + this.selectedMicrocontroller.id) as HTMLInputElement).value;
    if (parseInt(nr) > 0) {
      const numberOfMotors = this.selectedMicrocontroller.motors.length;

      const diff = parseInt(nr) - numberOfMotors;
      if (diff > 0) {
        for (let n = 0; n < diff; n++) {
          const newMotor = new Motor((numberOfMotors + n), (numberOfMotors > 0 ? this.selectedMicrocontroller.motors[0].type : ActuatorType.bldc),
          (this.selectedMicrocontroller.motors[0].I2C_communication === 1 ? 2 : 0));

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

  updateI2C(motor: Motor, microcontroller: MicroController) {
    const id = parseInt(motor.I2C_address, 16);
    if (microcontroller.motors.filter(m => m.id == id.toString()).length === 0) {
      motor.id = id.toString(16).toUpperCase();
    }
    motor.I2C_address = '0x' + motor.id;
    this.updateMicrocontroller(microcontroller);
  }

  updateSensorAddress(mcu: MicroController, motor_id: string) {
    const motor = mcu.motors.filter(m => m.id === motor_id)[0];
    const regExp = new RegExp(/^0x[0-9A-F]{1,4}$/i);
    if (!regExp.test(motor.config.sensorAddress)) {
      motor.config.sensorAddress = undefined;
    }
    this.updateMicrocontroller(mcu);
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

    this.getComports();
  }




}
