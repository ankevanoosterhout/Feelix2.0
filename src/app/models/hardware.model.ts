
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


export class Config {
  polepairs: number = 14;
  phaseResistance: number = 15.2;
  motionControl: string = 'position';
  supplyVoltage: number = 12;
  voltageLimit: number = null;
  velocityLimit: number = 20;
  inlineCurrentSensing = false;
  encoderType: string = 'Magnetic sensor';
  encoder: any = new MagneticSensor();
  calibration = new Calibration();
  rotation = new Rotation();
  transmission = 1;
  frequency = 50000;
}



export class State {
  speed = 0;
  direction = 1;
  position = new Position();
  sleep = false;
}

export class Motor {
  id: string = null;
  type: string = 'BLDC Motor';
  config = new Config();
  state = new State();
  position_pid = new PID(20.0, 0.0, 0.0);
  velocity_pid = new PID(0.5, 10, .001);


  constructor(id: number) {
    const charArray = [ 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U'];
    this.id = charArray[id];
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
  motors = [ new Motor(0) ];
  storageSpace: number = null;
  connected = false;
  playing = false;
  selected = false;
  lastDataSend: number = null;
  updateSpeed = 20;
  baudrate = 115200;
  dataToOtherDevices: Array<any> = [];

  constructor(id: string, serialPort: any, vendor: string) {
    this.id = id;
    this.serialPort = serialPort;
    this.vendor = vendor;
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
