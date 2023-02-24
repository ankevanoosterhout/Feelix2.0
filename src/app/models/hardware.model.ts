
import { Encoder, MagneticSensor } from './position-sensors.model';

export class Unit {
  name = '4096PPR';
  PR = 4096;

  constructor(name = '4096PPR', PR = 4096) {
    this.name = name;
    this.PR = PR;
  }
}

export class Quality {
  level = 1;
  name = 'normal';
  division = 4;
}

export class Calibration {
  value = 0.0;
  direction: string = null;
  xStartPos = 0.0;
}

export class Position {
  start = 0.0;
  end: number;
  current = 0;
}

export class Radial {
  value = 4096;
  unit = new Unit('PPR', 4096);
}

export class Linear {
  value = 5;
  unit = new Unit('cm', 5);
}

export class Translation {
  radial = new Radial();
  linear = new Linear();
}

export class Rotation {
  linear = false;
  translation = new Translation();
}

export class PID {
  p: number = null;
  i: number = null;
  d: number = null;
  constructor(p: number, i: number, d: number) {
    this.p = p;
    this.i = i;
    this.d = d;
  }
}

export class CurrentSense {
  name: string;
  value: number;

  constructor(name: string, value: number) {
    this.name = name;
    this.value = value;
  }
}


export class Config {
  polepairs: number = 7;
  phaseResistance: number = 15.2;
  motionControl: string = 'position';
  supplyVoltage: number = 12;
  voltageLimit: number = 12;
  velocityLimit: number = 20;
  inlineCurrentSensing = false;
  encoderType: string = 'Magnetic sensor';
  encoder: any = new MagneticSensor();
  sensorOffset = 0.0;
  calibration = new Calibration();
  rotation = new Rotation();
  transmission = 1;
  frequency = 50000;
  current_sense = [ new CurrentSense('a', 0.0), new CurrentSense('b', 0.0) ];
  current_sense_calibration: number;
  overheatProtection = false;
}



export class State {
  speed = 0;
  direction = 1;
  position = new Position();
  sleep = false;
  target = 0;
}

export class Motor {
  id: string = null;
  type: string = 'BLDC Motor';
  config = new Config();
  state = new State();
  position_pid = new PID(20.0, 0.0, 0.0);
  velocity_pid = new PID(0.5, 10, .001);
  record = false;
  I2C_address: any;
  I2C_communication = 0;


  constructor(id: number, i2cComm = 0) {
    this.id = (id + 10).toString(16).toUpperCase();
    this.I2C_address = '0x' + this.id;
    this.I2C_communication = i2cComm;
  }
}


export class OtherDevices {
  serialPort: any = null;
  speed = false;
  position = false;
  direction = false;
  updateSpeed = 100;
  intervalFunction: any = null;

  constructor(serialPort: any) {
    this.serialPort = serialPort;
  }
}


export class MicroController {
  id: string = null;
  serialPort: any = null;
  name: string = null;
  vendor: string = null;
  motors = [ new Motor(0, 1) ];
  storageSpace: number = null;
  connected = false;
  playing = false;
  selected = false;
  lastDataSend: number = null;
  updateSpeed = 20;
  baudrate = 115200;
  dataToOtherDevices: Array<any> = [];
  record = false;

  constructor(id: string, serialPort: any, vendor: string) {
    this.id = id;
    this.serialPort = serialPort;
    this.vendor = vendor;
    if (this.vendor === 'STM32') {
      this.updateSpeed = 150;
    }
    this.lastDataSend = new Date().getTime();
    this.name = serialPort.path + '-' + vendor;
  }


}


export class ConnectedDevice {
  id: string = null;
  name: string = null;
  serialPort: any = null;
  connected = true;
  lastDataSend: number = null;
  lastDataReceived: number = null;
  dataSendSpeed = 50;
  baudrate = 115200;

  constructor(id: string, serialPort: any, name: string) {
    this.id = id;
    this.serialPort = serialPort.port;
    this.baudrate = serialPort.baudrate;
    this.name = name;
    this.lastDataSend = new Date().getTime();
    this.lastDataReceived = new Date().getTime();
  }
}
