
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
  value = 0.016875;
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
}

export class Config {
  polepairs: number = 7;
  motionControl: string = 'position';
  supplyVoltage: number = 12;
  inlineCurrentSensing = false;
  encoder = 'AS5047';
  calibration = new Calibration();
  rotation = new Rotation();
  transmission = 1;
  frequency = 200;
}

export class State {
  speed = 0;
  direction = 1;
  position = new Position();
  sleep = false;
}

export class Motor {
  id = 0;
  type: string = 'BLDC Motor';
  config = new Config();
  state = new State();
  pid = new PID();

  constructor(id: number) {
    this.id = id;
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
  feelixio = 'motor';
  serialPort: any = null;
  vendor: string = null;
  type: string = null;
  motors = [ new Motor(1) ];
  storageSpace: number = null;
  connected = false;
  selected = false;
  lastDataSend: number = null;
  updateSpeed = 20;
  dataToOtherDevices: Array<OtherDevices> = [];

  constructor(id: string, serialPort: any, type: string) {
    this.id = id;
    this.serialPort = serialPort;
    this.type = type;
    this.lastDataSend = new Date().getTime();
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
  baudrate = 9600;

  constructor(id: string, serialPort: any, name: string) {
    this.id = id;
    this.serialPort = serialPort.port;
    this.baudrate = serialPort.baudrate;
    this.name = name;
    this.lastDataSend = new Date().getTime();
    this.lastDataReceived = new Date().getTime();
  }
}
