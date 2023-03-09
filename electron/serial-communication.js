const SerialPort = require('serialport');
const main = require('./main');

let activePorts = [];
let ports = [];
let port;
let receivingPort = null;
let progress = 0;

let dataSendWaitList = [];
let datalist = [];

const softwareVersion = { major: 3, minor: 0, patch: 0 };


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
      } else {
        console.log('write data ', data);
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
  // console.log(serialData);
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
          sendDataStr([ 'FS' ],  this.COM);
          this.connected = true;
          main.updateSerialStatus({ microcontroller: this.portData, connected: this.connected });
          if (!activePorts.includes(this.COM)) {
            activePorts.push(this.COM);
          }
        }
      });

      parser.on('data', (d) => {
        // console.log(d);
        if (d.charAt(0) === '#') {
          console.log('received data ', d);
        }

        if (d.charAt(0) === '*') {
          // console.log('received data ', d);
          if (dataSendWaitList.filter(d => d.port === this.COM)) {
            uploadFromWaitList(ports.filter(p => p.COM === this.COM)[0]);
          }
        }

        else if (d.charAt(0) === 'A') {
          const dataArray = d.substr(1).split(':');
          let incomingData;
          if (dataArray.length <= 5) {
            incomingData = {
                motorID: dataArray[0],
                angle: parseFloat(dataArray[1]),
                velocity: parseFloat(dataArray[2]),
                time: parseInt(dataArray[3]),
                target: parseFloat(dataArray[4]),
                serialPath: this.COM
            };
          } else {
            incomingData = {
              motorID: dataArray[0],
              angle: parseFloat(dataArray[1]),
              velocity: parseFloat(dataArray[2]),
              time: parseInt(dataArray[3]),
              target: parseFloat(dataArray[4]),
              current_a: parseFloat(dataArray[5]),
              current_b: parseFloat(dataArray[6]),
              serialPath: this.COM
            };
          }
          main.visualizaMotorData(incomingData);

        } else if (d.charAt(0) === 'Z') { // receive custom variable

          const dataArray = d.substr(1).split(':');
          const data = {
              motorID: dataArray[0],
              zero_electric_angle: parseFloat(dataArray[1]),
              direction: parseInt(dataArray[2]),
              serialPath: this.COM
          };
          main.updateZeroElectricAngle(data);

        } else if (d.charAt(0) === 'C') { // receive custom variable
          const dataArray = d.substr(1).split(':');
          const data = {
              motorID: dataArray[0],
              current_sense_calibration: dataArray[1],
              serialPath: this.COM
          };
          main.updateCurrentSenseCalibration(data);

        } else if (d.charAt(0) === 'M') { // receive custom variable
          updateProgress(progress, 'Maximum data size reached');

        } else if (d.charAt(0) === 'V') { // receive custom variable
          updateProgress(progress, 'Motor stopped automatically because it reached a high velocity');

        } else if (d.charAt(0) === 'O') { // receive custom variable
          updateProgress(progress, 'Overheat protection activitated');

        } else if (d.charAt(0) === 'L') { // receive custom variable
          // console.log('listed devices ' + d.substr(1));
          updateProgress(progress, d.substr(1));

        } else if (d.charAt(0) === 'S') { // receive custom variable
          const dataArray = d.substr(1).split('.');
          const data = {
              major: parseInt(dataArray[0]),
              minor: parseInt(dataArray[1]),
              patch: parseInt(dataArray[2]),
          };
          if (data.major !== softwareVersion.major || data.minor !== softwareVersion.minor) {
            main.showMessageConfirmation({ msg: "The software version of Feelix does not match the software version on the microcontroller (v"
              + (data.major + '.' + data.minor + '.' + data.patch) + "), update to v" + (softwareVersion.major + '.' + softwareVersion.minor + '.X'), action:"updateVersion", type: "message", d: this.COM });
                          // this.sp.close();
          }
        } else if (d.charAt(0) === 'R') {
          const dataArray = d.substr(1).split(':');
          const data = {
            motorID: dataArray[0],
            type: dataArray[1],
            value: parseFloat(dataArray[2]),
            serialPath: this.COM
          }
          main.returnData(data);
          main.updateSerialProgress({ progress: 100, str: 'value received' });
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

  // datalist.unshift('FM' + motor.id + 'F');

  datalist.unshift('FM' + motor.id + 'I' + motor.id);
  // datalist.unshift('FM' + motor.id + '' + (motor.I2C_communication));
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
  if (motor.config.sensorOffset !== undefined) {
    datalist.unshift('FM' + motor.id + 'O' + (motor.config.sensorOffset * (Math.PI / 180)).toFixed(14));
  }
  if (motor.config.transmission !== 1) {
    datalist.unshift('FM' + motor.id + 'X' + (motor.config.encoder.transmission.toFixed(14))); //new
  }
  datalist.unshift('FM' + motor.id + 'C' + motor.config.encoder.clock_speed);
  datalist.unshift('FM' + motor.id + 'D' + (motor.config.encoder.direction ? 1 : -1));

  if (uploadContent.config) {
    datalist.unshift('FM' + motor.id + 'T' + uploadContent.config.updateSpeed);
    datalist.unshift('FM' + motor.id + 'J' + uploadContent.config.range);
    datalist.unshift('FM' + motor.id + 'H' + uploadContent.config.loop);
    datalist.unshift('FM' + motor.id + 'M' + uploadContent.config.constrain_range);
  }
  if (motor.state.position.start) {
    datalist.unshift('FM' + motor.id + '%' + motor.state.position.start.toFixed(14));
  }

  datalist.unshift('FM' + motor.id + 'A' + ':' + motor.position_pid.p + ':' + motor.position_pid.i + ':' + motor.position_pid.d);
  datalist.unshift('FM' + motor.id + 'Q' + ':' + motor.velocity_pid.p + ':' + motor.velocity_pid.i + ':' + motor.velocity_pid.d);
  datalist.unshift('FM' + motor.id + 'G' + (motor.config.inlineCurrentSensing ? 1 : 0));
  if (motor.config.calibrateCurrentSense) {
    datalist.unshift('FM' + motor.id + 'Y' + motor.config.calibrateCurrentSense.toFixed(5));
  }
  datalist.unshift('FM' + motor.id + 'X' + (motor.config.overheatProtection ? 1 : 0));


  // datalist.unshift('FM' + motor.id + 'B' + uploadContent.baudRate);
  return datalist;
}




function prepareEffectData(uploadContent, motor, datalist) {
  let i = 0;
  let ptr = 0;
  for (const d of uploadContent.data.overlay) {
    d.pointer = ptr;
    ptr += d.type === 1 ? d.data.length * 2 : d.data.length;
  }

  let ptr2 = 0;
  for (const d of uploadContent.data.effectData) {
    const sameEffectList = uploadContent.effects.filter(e => e.id === d.id);
    for (const sameEffect of sameEffectList) {
      sameEffect.pointer = ptr2 + ptr;
    }
    ptr2 += d.type === 1 ? d.data.length * 2 : d.data.length;
  }


  for (const d of uploadContent.data.overlay) {
    datalist.unshift('FE' + motor.id + i + 'C:' + d.position.start.toFixed(5));
    datalist.unshift('FE' + motor.id + i + 'A:' + (d.data.length - 1));
    datalist.unshift('FE' + motor.id + i + 'D:' + (d.direction.cw ? 1 : -1) + ':' + (d.direction.ccw ? 1 : -1) );
    datalist.unshift('FE' + motor.id + i + 'I:' + (d.infinite ? 1 : -1));
    datalist.unshift('FE' + motor.id + i + 'R:' + d.pointer);
    let type = 0;
    if (d.type === 1) { type = 1; }
    if (d.type === 2 && d.yUnit !== 'deg') { type = 2; }
    if (d.type === 2 && d.yUnit === 'deg') { type = 3; }
    datalist.unshift('FE' + motor.id + i + 'T:' + type); //T
    if (type !== 2) {
      datalist.unshift('FE' + motor.id + i + 'E:1');
    }
    datalist.unshift('FE' + motor.id + i + 'Z:' + (d.type === 1 ? d.data.length * 2 : d.data.length));


    for (const el of d.data) {

      if (el.d && d.type === 1) {
        datalist.unshift('FDI' + motor.id + ':' + (Math.round(el.d) !== el.d ? el.d.toFixed(6) : el.d));
      }
      if (d.type === 2 && d.yUnit === 'deg') {
        datalist.unshift('FDI' + motor.id + ':' + ((el.y2 * 100) * (Math.PI / 180)).toFixed(6));
      } else {
        // console.log('overlay ' + 'FDI' + motor.id + ':' + (Math.round(el.y) !== el.y ? el.y.toFixed(6) : el.y));
        datalist.unshift('FDI' + motor.id + ':' + (Math.round(el.y) !== el.y ? el.y.toFixed(6) : el.y));
      }
    }
    i++;
  }


  for (const effect of uploadContent.effects) {
    datalist.unshift('FE' + motor.id + i + effect.position.identifier + ':' + effect.position.value[1]);
    if (effect.vis_type !== 2) {
      datalist.unshift('FE' + motor.id + i + effect.direction.identifier + ':' + effect.direction.value[0] + ':' + effect.direction.value[1]);
    }
    datalist.unshift('FE' + motor.id + i + effect.scale.identifier + ':' + effect.scale.value[0] + ':' + effect.scale.value[1]);
    datalist.unshift('FE' + motor.id + i + effect.flip.identifier + ':' + effect.flip.value[0] + ':' + effect.flip.value[1] + ':' + effect.flip.value[2]);
    datalist.unshift('FE' + motor.id + i + effect.angle.identifier + ':' + effect.angle.value);
    datalist.unshift('FE' + motor.id + i + effect.vis_type.identifier + ':' + effect.vis_type.value);
    if (effect.vis_type !== 2) {
      datalist.unshift('FE' + motor.id + i + effect.effect_type.identifier + ':' + effect.effect_type.value);
    }
    datalist.unshift('FE' + motor.id + i + effect.datasize.identifier + ':' + effect.datasize.value);
    datalist.unshift('FE' + motor.id + i + effect.quality.identifier + ':' + effect.quality.value);
    datalist.unshift('FE' + motor.id + i + 'C:' + effect.position.value[0]);
    datalist.unshift('FE' + motor.id + i + 'R:' + effect.pointer);

    if (effect.repeat) {
      for (const repeat of effect.repeat.value) {
        datalist.unshift('FE' + motor.id + i + effect.repeat.identifier + ':' + repeat.x.toFixed(8));
      }
    }
    datalist.unshift('FE' + motor.id + i + effect.infinite.identifier + ':' + effect.infinite.value);

    i++;
  }
  for (const d of uploadContent.data.effectData) {
    for (const el of d.data) {
      if (d.type === 1) {
        datalist.unshift('FDI' + motor.id + ':' + (Math.round(el.d) !== el.d ? el.d.toFixed(6) : el.d));
      }
      if (d.type === 2 && d.yUnit === 'deg') {
        datalist.unshift('FDI' + motor.id + ':' + ((el.y * 100) * (Math.PI / 180)).toFixed(6));
      } else {
        // console.log('effect ' + 'FDI' + motor.id + ':' + (Math.round(el.y) !== el.y ? el.y.toFixed(6) : el.y));
        datalist.unshift('FDI' + motor.id + ':' + (Math.round(el.y) !== el.y ? el.y.toFixed(6) : el.y));
      }
    }
  }

  return datalist;

}




function tryToEstablishConnection(receivingPort, uploadContent, callback) {

  if (!receivingPort && uploadContent && uploadContent.config) {
    createConnection({ port: uploadContent.config.serialPort, type: uploadContent.config.vendor, baudrate: uploadContent.config.baudrate });
    receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];
  } else if (receivingPort && !receivingPort.sp.IsOpen) {
    receivingPort.sp.open();
    if (!activePorts.includes(receivingPort.COM)) {
      activePorts.push(receivingPort.COM);
    }
  }
  if (uploadContent && uploadContent.config) {
    callback(receivingPort, uploadContent);
  }
  // return receivingPort;
}


function uploadData(uploadContent) {
  receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];

  datalist = [];

  tryToEstablishConnection(receivingPort, uploadContent, upload_to_receivedPort);

}



function upload_to_receivedPort(port, uploadContent) {
  receivingPort = port;
  // console.log(uploadContent.config.motors);
  // for (const motor of uploadContent.config.motors) {

  //   if (motor.id === uploadContent.config.motorID) {
  //     datalist.unshift('FM' + motor.id + 'F');
  //     datalist = prepareMotorData(uploadContent, motor, datalist);
  //     if (uploadContent.data) {
  //       datalist = prepareEffectData(uploadContent, motor, datalist);
  //     }
  //   }
  // }

  for (const motor of uploadContent.config.motors) {
    datalist.unshift('FM' + motor.id + 'F');
    datalist = prepareMotorData(uploadContent, motor, datalist);
    if (uploadContent.data) {
      datalist = prepareEffectData(uploadContent, motor, datalist);
    }
  }

  dataSendWaitList.push({ port: uploadContent.config.serialPort.path, data: datalist, totalItems: datalist.length, collection: uploadContent.config.collection });
  dataSendWaitList.filter(d => d.port === uploadContent.config.serialPort.path)[0].data.unshift('FC' + (uploadContent.config.motorID ? uploadContent.config.motorID : 'A'));
  // console.log('FC' + (uploadContent.config.motorID ? uploadContent.config.motorID : 'A'));

  uploadFromWaitList(receivingPort);
}


function requestData(data)  {
  // console.log(data);
  receivingPort = ports.filter(p => p.COM === data.config.serialPort.path)[0];

  tryToEstablishConnection(receivingPort, data, receivedPort);

  sendDataStr([ 'FI' ],  data.config.serialPort.path); //'FMQ'
}


function receivedPort(port, NULL) {
  receivingPort = port;
}


function uploadFromWaitList(receivingPort) {
  if (receivingPort) {
    const datalist = dataSendWaitList.filter(d => d.port === receivingPort.COM)[0];

    if (datalist && datalist.data.length > 0) {
      let item = datalist.data[datalist.data.length - 1];
      // console.log(item);
      if (item) {
        if (item.length > 19) {
          item = item.slice(0, (19 - item.length));
        }
        // console.log(item);
        receivingPort.writeData(item + '&');
        datalist.data.pop();
      }

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

function run(motor_id, port, run) {
  sendDataStr([ 'FM' + motor_id + 'K'  + run], port);
  main.updateSerialProgress({ progress: 100, str: 'Run motor ' + motor_id + ' at ' + port });
}

function returnToStart(motor_id, collection_name, port) {
  sendDataStr([ 'FM' + motor_id + 'W0' ], port);
  main.updateSerialProgress({ progress: 100, str: (play ? 'Return to start ' + collection_name + ' at ' + port : 'Stop ' + collection_name + ' at ' + port) });
}

function calibrateCurrentSense(uploadContent) {
  // sendDataStr([ 'FM' + motor_id + 'U' ], port);
  // main.updateSerialProgress({ progress: 100, str: 'Calibrate current sensors motor ' + motor_id + ' at ' + port });
  if (uploadContent.config) {
    receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];
    // motor = microcontroller.motors.filter(m => m.id === motor_id)[0];

    receivingPort = tryToEstablishConnection(receivingPort, uploadContent, calibrate_current_sense);

  }
}

function calibrate_current_sense(port, uploadContent) {
  receivingPort = port;

  const motor = uploadContent.config.motors[0];

  if (motor) {

    datalist = [];

    datalist.unshift('FM' + motor.id + 'I' + motor.id);
    datalist.unshift('FM' + motor.id + 'S' + motor.config.supplyVoltage);
    datalist.unshift('FM' + motor.id + 'P' + motor.config.polepairs);
    datalist.unshift('FM' + motor.id + 'Z' + motor.config.calibration.value.toFixed(12));
    datalist.unshift('FM' + motor.id + 'N' + (motor.config.calibration.direction === 'CW' ? 1 : -1));
    datalist.unshift('FM' + motor.id + 'U');
    // datalist.unshift('FC' + motor.id);

    dataSendWaitList.push({ port: uploadContent.config.serialPort.path, data: datalist, totalItems: datalist.length });

    main.updateSerialProgress({ progress: 0, str: 'Calibrate current sensors motor ' + motor.id + ' at ' + receivingPort.COM });

    uploadFromWaitList(receivingPort);

    // sendDataStr([ 'FM' + motor.id + 'U' ], uploadContent.config.serialPort.path);
  } else {
    main.updateSerialProgress({ progress: 0, str: 'Error: Not able to calibrate motor at ' + receivingPort.COM });
  }
}


function calibrateMotor(uploadContent) {
  // console.log(uploadContent);
  if (uploadContent.config) {
    receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];
    // motor = microcontroller.motors.filter(m => m.id === motor_id)[0];

    receivingPort = tryToEstablishConnection(receivingPort, uploadContent, calibrate_motor);
  }
}

function calibrate_motor(port, uploadContent) {
  receivingPort = port;

  const motor = uploadContent.config.motors[0];

  if (motor) {

    datalist = [];

    datalist.unshift('FM' + motor.id + 'I' + motor.id);
    datalist.unshift('FM' + motor.id + 'S' + motor.config.supplyVoltage);
    datalist.unshift('FM' + motor.id + 'P' + motor.config.polepairs);
    datalist.unshift('FM' + motor.id + 'R');
    datalist.unshift('FC' + motor.id);

    // console.log('datalist: ' + datalist);

    dataSendWaitList.push({ port: uploadContent.config.serialPort.path, data: datalist, totalItems: datalist.length });

    main.updateSerialProgress({ progress: 0, str: 'Calibrating motor at ' + receivingPort.COM });

    uploadFromWaitList(receivingPort);
  } else {
    main.updateSerialProgress({ progress: 0, str: 'Error: Not able to calibrate motor at ' + receivingPort.COM });
  }
}

function updateFilter(uploadContent) {
  if (uploadContent.config) {
    receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];

    receivingPort = tryToEstablishConnection(receivingPort, uploadContent, update_filter);
  }
}


function update_filter(port, uploadContent) {
  receivingPort = port;

  if (receivingPort) {

    datalist = [];

    for (const filter of uploadContent.filters) {
      datalist.unshift('FF' + filter.type + ':' + filter.value.toFixed(2) + ':' + filter.smoothness);
    }
    // console.log('datalist: ' + datalist);
    // datalist.unshift('FC' + motor.id);

    dataSendWaitList.push({ port: uploadContent.config.serialPort.path, data: datalist, totalItems: datalist.length });
    main.updateSerialProgress({ progress: 0, str: 'Update filter ' + receivingPort.COM });
    uploadFromWaitList(receivingPort);

  } else {

    main.updateSerialProgress({ progress: 0, str: 'Error: Not able update filter at ' + receivingPort.COM });
  }

}


function sendDataString(uploadContent) {
  if (uploadContent.config) {
    receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];

    receivingPort = tryToEstablishConnection(receivingPort, uploadContent, send_data_string);
  }
}

function send_data_string(port, uploadContent) {
  receivingPort = port;

  if (receivingPort) {

    dataSendWaitList.push({ port: uploadContent.config.serialPort.path, data: [uploadContent.dataString], totalItems: 1 });
    main.updateSerialProgress({ progress: 0, str: 'Send data ' + receivingPort.COM });
    uploadFromWaitList(receivingPort);
  } else {
    main.updateSerialProgress({ progress: 0, str: 'Error: Not able to send data ' + receivingPort.COM });
  }

}




function updateMotorSetting(uploadContent) {
  // console.log('config: ' + uploadContent.config);
  if (uploadContent.config) {
    receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];

    receivingPort = tryToEstablishConnection(receivingPort, uploadContent, updateMotorSettingCallback);
  }
}



function updateMotorSettingCallback(port, uploadContent) {
  receivingPort = port;

  datalist = [];

  if (uploadContent && uploadContent.config) {
    for (const motor of uploadContent.config.motors) {
      prepareMotorData(uploadContent, motor, datalist);
    }


    if (datalist.length > 0) {
      datalist.unshift('FC' + uploadContent.config.motorID);

      dataSendWaitList.push({ port: uploadContent.config.serialPort.path, data: datalist, totalItems: datalist.length });

      main.updateSerialProgress({ progress: 0, str: 'Updating settings at ' + receivingPort.COM });

      uploadFromWaitList(receivingPort);

    } else {
      main.updateSerialProgress({ progress: 0, str: 'Error: Not able to update settings at ' + receivingPort.COM });
    }
  }
}

// function updateStartPosition(data) {
//   console.log('config: ' + uploadContent.config);
//   if (uploadContent.config) {
//     receivingPort = ports.filter(p => p.COM === uploadContent.config.serialPort.path)[0];

//     receivingPort = tryToEstablishConnection(receivingPort, uploadContent, updateMotorSettingCallback);
//   }
// }

function listDevices(motor_id, port) {
  const datastr = 'FL' + motor_id;
  // console.log(datastr + ' ' + port);
  sendDataStr([ datastr ], port);
  main.updateSerialProgress({ progress: 50, str: 'list devices at ' + port + ' motor ' + motor_id });
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

function getValue(motor_id, port, char) {
  const datastr = 'FG' + motor_id + char;
  // console.log(datastr + ' ' + port);
  sendDataStr([ datastr ], port);
  main.updateSerialProgress({ progress: 50, str: 'request value' });
}


function sendDataStr(str, port) {
  receivingPort = ports.filter(p => p.COM === port)[0];
  dataSendWaitList.push({ port: port, data: str, totalItems: 1 });
  // console.log(dataSendWaitList);
  uploadFromWaitList(receivingPort);
}



exports.listSerialPorts = listSerialPorts;
exports.writeDataString = writeDataString;
exports.createConnection = createConnection;
exports.connectToSerialPort = connectToSerialPort;
exports.closeSerialPort = closeSerialPort;
exports.closeAllSerialPorts = closeAllSerialPorts;
exports.calibrateMotor = calibrateMotor;
exports.calibrateCurrentSense = calibrateCurrentSense;
exports.updateFilter = updateFilter;
exports.updateMotorSetting = updateMotorSetting;
exports.play = play;
exports.run = run;
exports.returnToStart = returnToStart;
exports.uploadData = uploadData;
exports.updateMotorControlVariable = updateMotorControlVariable;
exports.updateEffectData = updateEffectData;
exports.requestData = requestData;
exports.sendDataString = sendDataString;
exports.getValue = getValue;
exports.listDevices = listDevices;
