const SerialPort = require('serialport');
const main = require('./main');

let activePorts = [];
let activeDevicePorts = [];
let ports = [];
let port;
let receivingPort = null;
let progress = 0;

let dataSendWaitList = [];


function listSerialPorts(callback) {
  let portsList = [];
  SerialPort.list().then(ports => {
    ports.forEach((item)=>{
      let vendor = 'unknown';
      if (item.vendorId !== undefined && item.productId !== undefined) {
        if (item.vendorId === '16C0' && item.productId === '0483') {
          vendor = 'Teensy';
        } else if ((item.vendorId === '2341' || item.vendorId === '2A03') && item.productId === '003D') {
          vendor = 'Arduino DUE';
        } else if (item.vendorId === '0483' && (item.productId === '5740' || item.productId === '0003')) {
          vendor = 'STM32';
        }
      }
      portsList.push({ serialPort: item, vendor: vendor });
    });
    callback(portsList);
  })
};

function checkIfAvailable(serialData, callback, connect) {
  SerialPort.list().then(ports => {
    if (serialData && ports.length > 0) {
      callback(serialData, ports, connect);
    }
  });
}

function writeDataString(data, COM) {
  sp.write(data, function (err) {
      if (err) {
          // reconnect(data, COM);
          return console.log('Error: ', err.message);
      }
  });
}


function closeSerialPort(serialData) {
  checkIfAvailable(serialData, ifSerialAvailable, false);
}


function closeAllSerialPorts() {
  for (let COM of activePorts) {
    closeSerialPort(COM);
  }
  for (let device of activeDevicePorts) {
    if (device.sp && device.sp.IsOpen) {
      device.sp.close();
    }
    device.connected = false;
  }
}


function connectToSerialPort(serialData) {
  progress = 0;
  main.updateSerialProgress({ progress: progress, str: 'Trying to connect to ' + serialData.port.path });
  checkIfAvailable(serialData, ifSerialAvailable, true);
}



function ifSerialAvailable(serialData, portlist, connect) {
  if (portlist.length > 0) {
    main.updateAvailablePortList(portlist);
    const portAvailable = portlist.filter(p => p.path === serialData.port.path);
    let selectedPort = ports.filter(p => p.COM === serialData.port.path)[0];

    if (portAvailable.length > 0) {
      if (connect) {
        if (selectedPort) {
          if (selectedPort.sp && !selectedPort.sp.IsOpen) { selectedPort.sp.open(); }
        } else {
          updateProgress(100, (serialData.port.path + ' is connected'));
          createConnection(serialData);
        }
      } else {
        if (selectedPort) {
          if (selectedPort.sp && selectedPort.sp.IsOpen) { selectedPort.sp.close(); }
        } else {
          const sp = new newSerialPort(serialData, port);
          ports.push(sp);
          updateProgress(100, (serialData.port.path + ' close'));
        }
      }
    } else {
      updateProgress(0, (serialData.port.path + ' is not available'));
    }
  } else {
    updateProgress(0, (serialData.port.path + ' is not available'));
  }
}



function createConnection(serialData) {
  if (serialData && serialData.port) {
    if (ports.filter(d => d.path === serialData.port.path).length === 0) {
      const sp = new newSerialPort(serialData, port);
      sp.createSerialPort();
      ports.push(sp);
    }
  }
}


class newSerialPort {
  constructor(portData, sp) {
      this.portData = portData;
      this.COM = portData.port.path;
      this.sp = sp;
      this.baudrate = portData.baudrate
      this.connected = false;
  }


  writeData(data) {
    this.sp.write(data, function (err) {
        if (err) { return console.log('Error: ', err.message); }
        else {
          //  console.log('written ', data);
        }
    });
  }


  get getCOMPort() {
      return this.COM;
  }

  get getSp() {
      return this.sp;
  }


  closeConnection() {
      if (this.sp !== null) {
          this.sp.close();
      }
  }

  createSerialPort() {
      if (this.connected && this.sp) {
         this.sp.close();
      }

      this.sp = new SerialPort(this.COM, {
          baudRate: this.baudrate,
          autoOpen: true
      }, function (err) {
          if (err) {
            return console.log('Error: ', err)
          }
      });

      let Readline = SerialPort.parsers.Readline; // make instance of Readline parser
      let parser = new Readline(); // make a new parser to read ASCII lines
      this.sp.pipe(parser); // pipe the serial stream to the parser


      this.sp.on('open', (error) => {
        if (error) {
          updateProgress(0, ('Error opening ' + this.COM + ' ' + error));
          this.sp.close();
        } else {
          updateProgress(100, (this.COM + ' has been added'));
          this.connected = true;
          main.updateSerialStatus({ microcontroller: this.portData, connected: this.connected });
          if (!activePorts.includes(this.COM)) {
            activePorts.push(this.COM);
          }
        }
      });

      parser.on('data', (d) => {

        if (d.charAt(0) === '*') {
          // console.log('received data ', d);
          if (dataSendWaitList.filter(d => d.port === this.COM)) {
            uploadFromWaitList(ports.filter(p => p.COM === this.COM)[0]);
          }
        }

        else if (d.charAt(0) === 'A') {
          const dataArray = d.substr(1).split(':');
          const data = {
              angle: parseFloat(dataArray[0]),
              velocity: parseFloat(dataArray[1]),
              time: parseInt(dataArray[2]),
              serialPath: this.COM
          };
          main.visualizaMotorData(data);

        } else if (d.charAt(0) === 'Z') { // receive custom variable

          const dataArray = d.substr(1).split(':');
          const data = {
              motorID: dataArray[0],
              zero_electric_angle: parseFloat(dataArray[1]),
              direction: parseInt(dataArray[2]),
              serialPath: this.COM
          };
          main.updateZeroElectricAngle(data);

        } else if (d.charAt(0) === 'M') { // receive custom variable
          updateProgress(progress, 'Maximum data size reached');

        } else if (d.charAt(0) === 'V') { // receive custom variable
          updateProgress(progress, 'Motor stopped automatically because it reached a high velocity');
        }

    });


    this.sp.on('close', () => {
        this.connected = false;
        dataSendWaitList = [];
        main.updateSerialStatus({ microcontroller: this.portData, connected: this.connected });
        updateProgress(0, ('Connection to ' + this.COM + ' - ' + this.portData.type + ' is closed'));
        const portIndex = activePorts.indexOf(this.COM);
        if (portIndex > -1) {
          activePorts.splice(portIndex, 1);
        }
    });


    this.sp.on('error', (error) => {
        updateProgress(0, (this.portData.path + ' - ' + this.portData.type + ': ' + error));
        if (!this.connected) {
          main.updateSerialStatus({ microcontroller: this.portData, connected: this.connected });
        }
    });
  }
}

function updateProgress(_progress, _str) {
  progress = _progress;
  main.updateSerialProgress({ progress: _progress, str: _str });
}



function prepareMotorData(uploadContent, motor, datalist) {

  datalist.unshift('FM' + motor.id + 'F');
  datalist.unshift('FM' + motor.id + 'I' + motor.id);
  if (motor.config.supplyVoltage) {
    datalist.unshift('FM' + motor.id + 'S' + motor.config.supplyVoltage);
  }
  if (motor.config.polepairs) {
    datalist.unshift('FM' + motor.id + 'P' + motor.config.polepairs);
  }
  datalist.unshift('FM' + motor.id + 'L' + (motor.config.voltageLimit || motor.config.supplyVoltage));

  if (motor.config.velocityLimit) {
    datalist.unshift('FM' + motor.id + 'V' + motor.config.velocityLimit);
  }
  if (motor.config.calibration.value && motor.config.calibration.value !== 0.0  && motor.config.calibration.value !== -12345.0 && motor.config.calibration.direction) {
    datalist.unshift('FM' + motor.id + 'Z' + motor.config.calibration.value.toFixed(12));
    datalist.unshift('FM' + motor.id + 'N' + (motor.config.calibration.direction === 'CW' ? 1 : -1));
  }
  // datalist.unshift('FM' + motor.id + 'E' + motor.config.encoder.part_number);
  datalist.unshift('FM' + motor.id + 'O' + motor.state.position.start);
  datalist.unshift('FM' + motor.id + 'C' + motor.config.encoder.clock_speed);
  datalist.unshift('FM' + motor.id + 'H' + uploadContent.config.loop);
  datalist.unshift('FM' + motor.id + 'D' + (motor.config.encoder.direction === 'CW' ? 1 : -1));
  datalist.unshift('FM' + motor.id + 'T' + uploadContent.config.updateSpeed);
  datalist.unshift('FM' + motor.id + 'J' + Math.round(uploadContent.config.range));
  datalist.unshift('FM' + motor.id + 'A' + ':' + motor.position_pid.p + ':' + motor.position_pid.i + ':' + motor.position_pid.d);
  datalist.unshift('FM' + motor.id + 'Q' + ':' + motor.velocity_pid.p + ':' + motor.velocity_pid.i + ':' + motor.velocity_pid.d);
  // datalist.unshift('FM' + motor.id + 'B' + uploadContent.baudRate);

  return datalist;
}




function prepareEffectData(uploadContent, motor, datalist) {
  let i = 0;
  let ptr = 0;
  for (const d of uploadContent.data.overlay) {
    d.pointer = ptr;
    ptr += d.type === 'position' ? d.data.length * 2 : d.data.length;
  }

  let ptr2 = 0;
  for (const d of uploadContent.data.effectData) {
    const sameEffectList = uploadContent.effects.filter(e => e.id === d.id);
    for (const sameEffect of sameEffectList) {
      sameEffect.pointer = ptr2 + ptr;
    }
    ptr2 += d.type === 'position' ? d.data.length * 2 : d.data.length;
  }


  for (const d of uploadContent.data.overlay) {
    datalist.unshift('FE' + i + 'C:' + d.position.start.toFixed(5));
    datalist.unshift('FE' + i + 'A:' + (d.data.length - 1));
    datalist.unshift('FE' + i + 'D:' + (d.direction.cw ? 1 : -1) + ':' + (d.direction.ccw ? 1 : -1) );
    datalist.unshift('FE' + i + 'I:' + (d.infinite ? 1 : -1));
    datalist.unshift('FE' + i + 'R:' + d.pointer);
    let type = 0;
    if (d.type === 'position') { type = 1; }
    if (d.type === 'velocity' && d.yUnit !== 'degrees') { type = 2; }
    if (d.type === 'velocity' && d.yUnit === 'degrees') { type = 3; }
    datalist.unshift('FE' + i + 'T:' + type);
    datalist.unshift('FE' + i + 'Z:' + (d.type === 'position' ? d.data.length * 2 : d.data.length));


    for (const el of d.data) {
      if (el.d && d.type === 'position') {
        datalist.unshift('FDI:' + (Math.round(el.d) !== el.d ? el.d.toFixed(6) : el.d));
      }
      if (d.type === 'velocity' && d.yUnit === 'degrees') {
        datalist.unshift('FDI:' + ((el.y2 * 100) * (Math.PI / 180)).toFixed(6));
      } else {
        datalist.unshift('FDI:' + (Math.round(el.y) !== el.y ? el.y.toFixed(6) : el.y));
      }
    }
    i++;
  }


  for (const effect of uploadContent.effects) {
    datalist.unshift('FE' + i + effect.position.identifier + ':' + effect.position.value[1]);
    if (effect.vis_type !== 'velocity') {
      datalist.unshift('FE' + i + effect.direction.identifier + ':' + effect.direction.value[0] + ':' + effect.direction.value[1]);
    }
    datalist.unshift('FE' + i + effect.scale.identifier + ':' + effect.scale.value[0] + ':' + effect.scale.value[1]);
    datalist.unshift('FE' + i + effect.flip.identifier + ':' + effect.flip.value[0] + ':' + effect.flip.value[1] + ':' + effect.flip.value[2]);
    datalist.unshift('FE' + i + effect.angle.identifier + ':' + effect.angle.value);
    datalist.unshift('FE' + i + effect.vis_type.identifier + ':' + effect.vis_type.value);
    if (effect.vis_type !== 'velocity') {
      datalist.unshift('FE' + i + effect.effect_type.identifier + ':' + effect.effect_type.value);
    }
    datalist.unshift('FE' + i + effect.datasize.identifier + ':' + effect.datasize.value);
    datalist.unshift('FE' + i + effect.quality.identifier + ':' + effect.quality.value);
    datalist.unshift('FE' + i + 'C:' + effect.position.value[0]);
    datalist.unshift('FE' + i + 'R:' + effect.pointer);

    if (effect.repeat) {
      for (const repeat of effect.repeat.value) {
        datalist.unshift('FE' + i + effect.repeat.identifier + ':' + repeat.x.toFixed(8));
      }
    }
    datalist.unshift('FE' + i + effect.infinite.identifier + ':' + effect.infinite.value);

    i++;
  }
  for (const d of uploadContent.data.effectData) {
    for (const el of d.data) {
      if (d.type === 'position') {
        datalist.unshift('FDI:' + (Math.round(el.d) !== el.d ? el.d.toFixed(6) : el.d));
      }
      if (d.type === 'velocity' && d.yUnit === 'degrees') {
        datalist.unshift('FDI:' + ((el.y * 100) * (Math.PI / 180)).toFixed(6));
      } else {
        datalist.unshift('FDI:' + (Math.round(el.y) !== el.y ? el.y.toFixed(6) : el.y));
      }
    }
  }

  return datalist;

}



function tryToEstablishConnection(receivingPort, port, vendor, baudrate) {
  if (!receivingPort) {
    createConnection({ port:port, type: vendor, baudrate: baudrate });
    receivingPort = ports.filter(p => p.COM === port.path)[0];
  } else if (!receivingPort.sp.IsOpen) {
    receivingPort.sp.open();
    activePorts.push(receivingPort.COM);
  }
  return receivingPort;
}


function uploadData(uploadContent) {
  receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];

  datalist = [];

  receivingPort = tryToEstablishConnection(receivingPort, uploadContent.config.serialPort, uploadContent.config.vendor, uploadContent.config.baudrate);

  const motor = uploadContent.config.motor;

  datalist = prepareMotorData(uploadContent, motor, datalist);
  datalist = prepareEffectData(uploadContent, motor, datalist);

  dataSendWaitList.push({ port: uploadContent.config.serialPort.path, data: datalist, totalItems: datalist.length, collection: uploadContent.config.collection });
  dataSendWaitList.filter(d => d.port === uploadContent.config.serialPort.path)[0].data.unshift('FC');

  setTimeout(() => {
    uploadFromWaitList(receivingPort);
  }, 500);

}






function uploadFromWaitList(receivingPort) {
  if (receivingPort && dataSendWaitList.length > 0) {
    const datalist = dataSendWaitList.filter(d => d.port === receivingPort.COM)[0];

    if (datalist && datalist.data.length > 0) {
      const item = datalist.data[datalist.data.length - 1];

      receivingPort.writeData(item + '&');
      datalist.data.pop();

      if (datalist.data.length === 0) {
        const index = dataSendWaitList.indexOf(datalist);
        if (dataSendWaitList[index].collection) {
          main.uploadSuccesful(dataSendWaitList[index].collection);
        }
        dataSendWaitList.splice(index, 1);
        main.updateSerialProgress({ progress: 100, str: 'Ready' });
      } else {
        const progress = (100 / datalist.totalItems) * (datalist.totalItems - datalist.data.length);
        main.updateSerialProgress({ progress: progress, str: 'Writing data to ' + receivingPort.portData.type + ' at ' + receivingPort.COM });
      }
      return;
    }


  } else {
    if (!receivingPort) {
      main.updateSerialProgress({ progress: 0, str: 'Port is not available' });
    }
  }
}


function play(play, motor_id, collection_name, port) {
  sendDataStr([ 'FM' + motor_id + 'K' + (play ? 1 : 0) ], port);
  main.updateSerialProgress({ progress: 100, str: (play ? 'Play ' + collection_name + ' at ' + port : 'Stop ' + collection_name + ' at ' + port) });
}


function calibrateMotor(motor_id, microcontroller) {
  receivingPort = ports.filter(p => p.COM === microcontroller.serialPort.path)[0];
  motor = microcontroller.motors.filter(m => m.id === motor_id)[0];

  receivingPort = tryToEstablishConnection(receivingPort, microcontroller.serialPort, microcontroller.vendor, microcontroller.baudrate);

  let datalist = [];
  datalist.unshift('FM' + motor.id + 'I' + motor.id);
  datalist.unshift('FM' + motor.id + 'S' + motor.config.supplyVoltage);
  datalist.unshift('FM' + motor.id + 'P' + motor.config.polepairs);
  datalist.unshift('FM' + motor.id + 'R');
  datalist.unshift('FC');

  dataSendWaitList.push({ port: microcontroller.serialPort.path, data: datalist, totalItems: datalist.length });

  setTimeout(() => {
    uploadFromWaitList(receivingPort);
    main.updateSerialProgress({ progress: 0, str: 'Calibrating motor at ' + receivingPort.COM });
  }, 500);
}


function updateEffectData(char, data, effectIndex, port) {
  const datastr = 'FE' + char + effectIndex + ':' + data;
  sendDataStr([ datastr ], port);
  main.updateSerialProgress({ progress: 100, str: 'sending update effect to ' + port  });
}


function updateMotorControlVariable(char, data, motor_id, port) {
  const datastr = 'FM' + motor_id + char + data;
  sendDataStr([ datastr ], port);
  main.updateSerialProgress({ progress: 100, str: 'sending update motor control variable to ' + port });
}


function sendDataStr(str, port) {
  receivingPort = ports.filter(p => p.COM === port)[0];
  dataSendWaitList.push({ port: port, data: str, totalItems: 1 });
  uploadFromWaitList(receivingPort);
}



exports.listSerialPorts = listSerialPorts;
exports.writeDataString = writeDataString;
exports.createConnection = createConnection;
exports.connectToSerialPort = connectToSerialPort;
exports.closeSerialPort = closeSerialPort;
exports.closeAllSerialPorts = closeAllSerialPorts;
exports.calibrateMotor = calibrateMotor;
exports.play = play;
exports.uploadData = uploadData;
exports.updateMotorControlVariable = updateMotorControlVariable;
exports.updateEffectData = updateEffectData;
