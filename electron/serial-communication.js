const SerialPort = require('serialport');
const main = require('./main');

let activePorts = [];
let activeDevicePorts = [];
let ports = [];
let port;
let registeredDevice;
let registeredDevices = [];


let runDataIndex = { parent: 0, child: 0 };
let receivingPort = null;

let dataSendWaitList = [];


function listSerialPorts(callback) {
  let portsList = [];
  SerialPort.list().then(ports => {
    ports.forEach((item)=>{
      let vendor = 'unknown';
      if (item.vendorId !== undefined && item.productId !== undefined) {
        if (item.vendorId === '16C0' && item.productId === '0483') {
          vendor = 'Teensy 3.2';
        }
      }
      portsList.push({ serialPort: item, vendor: vendor });
    });
    callback(portsList);
  })
};

function checkIfAvailable(COM, callback, connect) {
  SerialPort.list().then(ports => {
    if (COM && ports.length > 0) {
      callback(COM, ports, connect);
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


function closeSerialPort(COM) {
  checkIfAvailable(COM, ifSerialAvailable, false);
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


function connectToSerialPort(COM) {
  main.updateSerialProgress({ progress: 0, str: 'Trying to connect to ' + COM.port.path });
  checkIfAvailable(COM, ifSerialAvailable, true);
}

function addSerialPort(data) {
  if (registeredDevices.filter(d => d.path === data.port.path).length === 0) {
    const sp = new newSerialPort(data, registeredDevice);
    sp.createDevicePort(data.baudrate);
    registeredDevices.push(sp);
  }
}


function ifSerialAvailable(serialData, portlist, connect) {
  if (portlist.length > 0) {
    let deviceType = serialData.name ? 'other' : 'motor';
    main.updateAvailablePortList(portlist);
    const portAvailable = portlist.filter(p => p.path === serialData.port.path);
    let selectedPort = ports.filter(p => p.COM === serialData.port.path)[0];

    if (portAvailable.length > 0) {
      if (connect) {
        if (selectedPort) {
          if (selectedPort.sp && !selectedPort.sp.IsOpen) { selectedPort.sp.open(); }
        } else {
          main.updateSerialProgress({ progress: 100, str: serialData.port.path + ' connect' });
          deviceType === 'motor' ? createConnection(serialData) : addSerialPort(serialData);
        }
      } else {
        if (selectedPort) {
          if (selectedPort.sp && selectedPort.sp.IsOpen) { selectedPort.sp.close(); }
        } else {
          const sp = new newSerialPort(serialData, port);
          deviceType === 'motor' ? ports.push(sp) : registeredDevices.push(sp);
          main.updateSerialProgress({ progress: 100, str: serialData.port.path + ' close' });
        }
      }
    } else {
      main.updateSerialProgress({ progress: 0, str: serialData.port.path + ' is not available' });
    }
  } else {
    main.updateSerialProgress({ progress: 0, str: serialData.port.path + ' is not available'  });
  }
}



function getUploadProgress() {

  let totalItems = 0;
  let current = runDataIndex.child;
  let i = 0;
  let parentIndex;
  if (dataSendWaitList.length > 0) {
    if (dataSendWaitList[dataSendWaitList.length - 1].type === 'runData') {
      for (const d of dataSendWaitList[dataSendWaitList.length - 1].data) {
        totalItems += d.data.length;
        if (runDataIndex.parent > i) {
          current += dataSendWaitList[dataSendWaitList.length - 1].data[i].data.length;
        }
        i++;
      }
      const progress = (100 / totalItems) * current;
      parentIndex = runDataIndex.parent;
      if (parentIndex >= dataSendWaitList[dataSendWaitList.length - 1].data.length) { parentIndex = dataSendWaitList[dataSendWaitList.length - 1].data.length - 1; }
      main.updateSerialProgress({ progress: progress, str: 'Uploading in progress ' + (dataSendWaitList.length - 1) });
    }
  } else {
    main.updateSerialProgress({ progress: 100, str: 'Ready'});
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
      this.connected = false;
  }


  writeData(data) {
    this.sp.write(data, function (err) {
        if (err) { return console.log('Error: ', err.message); }
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

  createDevicePort(baudRate) {
    if (this.connected) {
      this.sp.close();
    }
    this.sp = new SerialPort(this.COM, {
      baudRate: baudRate,
      autoOpen: true
    }, function (err) {
      if (err) { return console.log('Error: ', err); }
    });


    let Readline = SerialPort.parsers.Readline; // make instance of Readline parser
    let parser = new Readline(); // make a new parser to read ASCII lines
    this.sp.pipe(parser); // pipe the serial stream to the parser


    this.sp.on('open', (err) => {
      if (err) {
        main.updateSerialProgress({ progress: 0, str: 'Error opening ' + this.COM + ' ' + err });
        this.sp.close();
      } else {
        main.updateSerialProgress({ progress: 100, str: this.COM + ' is connected' });
        main.updateSerialStatus({ device: this.portData, connected: this.connected });
        if (!activeDevicePorts.includes(this.COM)) {
          activeDevicePorts.push(this.COM);
        }
        this.connected = true;
      }
    });

    this.sp.on('close', () => {
      dataSendWaitList = [];
      main.updateSerialStatus({ device: this.portData, connected: this.connected });
      main.updateSerialProgress({ progress: 0, str: 'Connection to ' + this.portData.port.path + ' - ' + this.portData.name + ' is closed' });
      const portIndex = activeDevicePorts.indexOf(this.COM);
      if (portIndex > -1) {
        activeDevicePorts.splice(portIndex, 1);
      }
    });


    this.sp.on('error', (error) => {
      main.updateSerialProgress({ progress: 0, str: this.portData.port.path + ' - ' + this.portData.type + ': ' + error });
      if (!this.connected) {
        main.updateSerialStatus({ device: this.portData, connected: this.connected });
      }
    });

    parser.on('data', (d) => {
      // main.updateSerialProgress({ progress: 0, str: 'Print incoming data: ' + d });
      if (d.charAt(0) === '*') {
        main.updateSerialProgress({ progress: 0, str: 'Print incoming data: ' + d });
      } else if (d.charAt(0) === 'V') {
        const dataArray = d.substr(1).split(':');
        const data = {
            variableIndex: parseInt(dataArray[0]),
            value: dataArray[1],
            port: this.COM
        };
        main.updateCustomVariableFeelixIO(data);
      }
    });
  }

  createSerialPort() {
      if (this.connected) {
         this.sp.close();
      }

      this.sp = new SerialPort(this.COM, {
          baudRate: 19200,
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
          main.updateSerialProgress({ progress: 0, str: 'Error opening ' + this.COM + ' ' + error });
          this.sp.close();
        } else {
          main.updateSerialProgress({ progress: 65, str: this.COM + ' is open' });
          if (!activePorts.includes(this.COM)) {
            activePorts.push(this.COM);
          }
          if (!this.connected) {
            this.sp.write('C', (err) => {
                if (err) { return console.log(err); }
            });
          }
        }
      });

      parser.on('data', (d) => {
        // console.log(d);
        if (d.charAt(0) === '*') {
          main.updateSerialProgress({ progress: 0, str: d });
        } else if (d.charAt(0) === 'C') {
          this.connected = true;
          main.updateSerialProgress({ progress: 100, str: 'Connected to ' + this.portData.port.path + ' - ' + this.portData.type });
          main.updateSerialStatus({ microcontroller: this.portData, connected: this.connected });

        } else if (d.charAt(0) === 'n') { // send next
          // send next bit if there is more data to send
          if (dataSendWaitList.length > 0) {
            if (dataSendWaitList[dataSendWaitList.length - 1].type === 'runData') {
              updateRunData(dataSendWaitList[dataSendWaitList.length - 1].receivingPort, dataSendWaitList[dataSendWaitList.length - 1].data);
            }
          }

        } else if (d.charAt(0) === 'd' || d.charAt(0) === 'q') {
          dataSendWaitList.pop();

          // if (dataSendWaitList.length === 0 && d.charAt(0) === 'd') {
          //   main.updateSerialProgress({ progress: 100, str: 'Uploading to ' + this.COM + ' is complete' });
            // this.sp.write('Quit', (err) => {
            //   if (err) { return console.log(err); }
            // });
          // } else {
          uploadFromWaitList();
          // }

        } else if (d.charAt(0) === '&') {
          const dataArray = d.substr(1).split(':');
          const data = {
              pos: parseInt(dataArray[0]),
              speed: Math.abs(parseInt(dataArray[1])),
              ms: Math.abs(parseInt(dataArray[2]))
          };
          main.sendDataToPlayWindow(data, this.COM);

        } else if (d.charAt(0) === 'U') {
          const dataArray = d.split(':');
          main.updateCalibrationValue(parseFloat(dataArray[1]), this.COM);
          main.updateSerialProgress({ progress: 100, str: 'Calibration of motor at ' + this.COM + ' is complete' });
        } else if (d.charAt(0) === 'Z') { // receive custom variable

          const dataArray = d.split(':');
          main.updateSleepmodePlayWindow(dataArray[1], this.COM)

        } else if (d.charAt(0) === 'V') { // receive custom variable
          const dataArray = d.substr(1).split(':');
          const data = {
              variableIndex: parseInt(dataArray[1]),
              value: dataArray[2]
          };
          main.updateCustomVariableFeelixIO(data);

        }
        // else if (d.charAt(0) === 'Q') {

        //   this.sp.close();
        //   this.connected = false;

        // }
    });


    this.sp.on('close', () => {
        this.connected = false;
        dataSendWaitList = [];
        main.updateSerialStatus({ microcontroller: this.portData, connected: this.connected });
        main.updateSerialProgress({ progress: 0, str: 'Connection to ' + this.portData.port.path + ' - ' + this.portData.type + ' is closed' });
        const portIndex = activePorts.indexOf(this.COM);
        if (portIndex > -1) {
          activePorts.splice(portIndex, 1);
        }
    });


    this.sp.on('error', (error) => {
        main.updateSerialProgress({ progress: 0, str: this.portData.port.path + ' - ' + this.portData.type + ': ' + error });
        if (!this.connected) {
          main.updateSerialStatus({ microcontroller: this.portData, connected: this.connected });
        }
    });
  }
}

function uploadEffectsToMicrocontroller(effectList, motor, serialData) {
  receivingPort = ports.filter(p => p.COM === serialData.port.path)[0];

  if (receivingPort) {
    let generalDataStr = 'M;' + motor.encoder.PR + ';' + motor.frequency + ';' + motor.position.start + ';' + motor.calibration.xStartPos + ';' + effectList.length;

    let pathEffectListID = [];

    let runData = [];
    let effectData = [];
    let variableData = [];
    let index = 0;
    let positionDataPointer = 0;
    let timeDataPointer = 0;
    const effectObj = { data: [], name: 'effect data' };
    const variableObj = { data: [], name: 'variables' };


    for (const effect of effectList) {
      let arraySize;
      effectObj.name = effect.name;
      const infinite = effect.slug === 4 ? effect.loop : effect.infinite;

      let effectDataStr = 'E;' + index + ';' + effect.slug + ';' + effect.quality + ';' + effect.position + ';' +
        effect.angle + ';' + effect.direction + ';' + effect.scaleX + ';' + effect.scaleY + ';' + effect.startTime + ';' +
        (effect.repeat !== null ? effect.repeat.length : 1) + ';' + (infinite ? 1 : 0)  + ';' +
        (effect.enabled ? 1 : 0) + ';' + (effect.overlapping > 0 ? 1 : 0);

      let variableStr = '';
      if (effect.linear.Xmin !== null) {
        variableStr += 'V;' + index + ';' + effect.linear.Xmin + ';' + effect.linear.Xmax + ';' + effect.linear.Ymin + ';' + effect.linear.Ymax + ';' + effect.linear.dYdX;
        variableObj.data.push(variableStr);
      }

      if (effect.slug === 4) {

        arraySize = effect.translatedData.length;

        const existingPathDetails = pathEffectListID.filter(p => p.id === effect.id)[0];
        if (existingPathDetails) {
          effectDataStr += ';' + arraySize + ';' + existingPathDetails.pointer;

        } else {
          pathEffectListID.push({ id: effect.id, pointer: timeDataPointer });
          effectDataStr += ';' + arraySize + ';' + timeDataPointer;

        if (arraySize > 0) {
            let dataObj = { effect: index, pointer: timeDataPointer, data: [] };
            let elIndex = 0;
            let subPointer = timeDataPointer;
            let runDataStr = 'T;' + subPointer;
            for (const t of effect.translatedData) {
              runDataStr += ';' + t.x + ';' + t.y + ';' + t.cp1x + ';' + t.cp1y + ';' + t.cp2x + ';' + t.cp2y;
              elIndex++;

              if (elIndex > 20) {
                elIndex = 0;
                dataObj.data.push(runDataStr);
                subPointer += elIndex;
                runDataStr = 'T;' + subPointer;
              }
            }
            if (runDataStr !== 'T;' + subPointer) {
              dataObj.data.push(runDataStr);
            }
            runData.push(dataObj);
          }
          timeDataPointer += effect.translatedData.length - 1;
        }
      } else if (effect.slug === 5) {

        arraySize = effect.translatedData.length;

        const existingPathDetails = pathEffectListID.filter(p => p.id === effect.id)[0];
        if (existingPathDetails) {
          effectDataStr += ';' + arraySize + ';' + existingPathDetails.pointer;

        } else {
          pathEffectListID.push({ id: effect.id, pointer: positionDataPointer });
          effectDataStr += ';' + arraySize + ';' + positionDataPointer;

          if (effect.repeat !== null) {
            for (let r = 0; r < effect.repeat.length; r++) {
              effectDataStr += ';' + effect.repeat[r];
            }
          }

          if (arraySize > 0) {
            let dataObj = { effect: index, pointer: positionDataPointer, data: [] };
            let elIndex = 0;
            let subPointer = positionDataPointer;
            let runDataStr = 'D;' + subPointer;
            for (const t of effect.translatedData) {
              runDataStr += ';' + t.y + ';' + t.d;
              elIndex++;

              if (elIndex > 64) {
                dataObj.data.push(runDataStr);
                subPointer += elIndex;
                runDataStr = 'D;' + subPointer;
                elIndex = 0;
              }
            }
            if (runDataStr !== 'D;' + subPointer) {
              dataObj.data.push(runDataStr);
            }
            runData.push(dataObj);
          }
          positionDataPointer += effect.translatedData.length - 1;
        }
      }
      index++;
      effectObj.data.push(effectDataStr);
    }

    generalDataStr += ';' + positionDataPointer + ';' + timeDataPointer;
    effectData.push(effectObj);

    if (variableObj.data.length > 0) {
      variableData.push(variableObj);
    }
    dataSendWaitList.unshift({ type: 'generalData', receivingPort, data: generalDataStr, name: 'motor settings' });
    if (variableData.length > 0) {
      dataSendWaitList.unshift({ type: 'runData', receivingPort, data: variableData, name: 'effect data'  });
    }
    dataSendWaitList.unshift({ type: 'runData', receivingPort, data: effectData, name: 'effect data'  });
    if (runData.length > 0) {
      dataSendWaitList.unshift({ type: 'runData', receivingPort, data: runData, name: 'effect data'  });
    }
    if (effectList[0].playAfterUpload) {
      dataSendWaitList.unshift({ type: 'generalData', receivingPort, data: '*P;1', name: 'effect data'  });
    }
    uploadFromWaitList();
  } else {
    connectToSerialPort(serialData);
  }
}




function updateRunData(port, runData) {
  if (runDataIndex.parent < runData.length) {
    if (runDataIndex.child < runData[runDataIndex.parent].data.length) {
      port.writeData(runData[runDataIndex.parent].data[runDataIndex.child]);
      runDataIndex.child ++;
    } else {
      runDataIndex.parent ++;
      runDataIndex.child = 0;
      updateRunData(port, runData);
    }
  } else {
    port.writeData('S');
  }
  getUploadProgress();
}



function uploadFromWaitList() {
  const index = dataSendWaitList.length - 1;
  if (index > -1) {
    let item = dataSendWaitList[index];
    receivingPort = ports.filter(p => p.COM === item.receivingPort.COM)[0];
    if (receivingPort) {
      if (item.type === 'runData') {
        runDataIndex = { parent: 0, child: 0 };
        updateRunData(item.receivingPort, item.data);
      } else {
        item.receivingPort.writeData(item.data);
      }
    } else {
      dataSendWaitList.pop();
      uploadFromWaitList();
      main.updateSerialProgress({ progress: 0, str: 'Cannot find ' + item.receivingPort.COM });
    }
  } else {
    main.updateSerialProgress({ progress: 0, str: 'Ready' });
  }
}


function moveToPos(serialData, pos = 0) {
  let str = '*R;' + pos;
  sendDataStr(str, serialData);
  main.updateSerialProgress({ progress: 100, str: 'Move motor at ' + serialData.port.path + ' to start position' });
}




function playEffect(play, serialData) {
  let str = '*P;' + (play ? 1 : 0);
  sendDataStr(str, serialData);
  main.updateSerialProgress({ progress: 100, str: (play ? 'Play motor at ' + serialData.port.path : 'Stop motor at ' + serialData.port.path) });
}


function calibrateMotor(motor, serialData) {
  // let generalDataStr =  'M;' + motor.encoder.PR + ';' + motor.frequency + ';' + motor.position.start + ';0.0';
  // sendDataStr(generalDataStr, serialData);

  let direction = 0;
  if (motor.calibration.direction === 'clockwise') { direction = 1; } else if (motor.calibration.direction === 'counterclockwise') { direction = -1; }
  const str = '*C;' + direction;
  sendDataStr(str, serialData);
  main.updateSerialProgress({ progress: 50, str: 'Calibrating motor at ' + serialData.port.path  });
}


function saveCalibrationValueToEEPROM(motor, serialData) {
  main.updateSerialProgress({ progress: 100, str: 'Save calibration value' });
  const str = '*M;' + motor.calibration.value;
  sendDataStr(str, serialData);
}


function updateStartPosition(serialData, position) {
  main.updateSerialProgress({ progress: 100, str: 'Update start position' });
  const str = '*U;' + position;
  sendDataStr(str, serialData);
}


function updateSleepmode(serialData, sleep) {
  main.updateSerialProgress({ progress: 100, str: (sleep === true ? 'Enable sleep mode' : 'Disable sleep mode') });
  const str = '*Z;' + (sleep === true ? 1 : 0);
  sendDataStr(str, serialData);
}


function updateEffectData(type, data, effectIndex, serialData) {
  if (serialData) {
    main.updateSerialProgress({ progress: 100, str: 'send update ' + data });
    let str = '&' + type + ';' + effectIndex + ';' + data;
    sendDataStr(str, serialData);
  }
}


function sendDataStr(str, serialData) {
  receivingPort = ports.filter(p => p.COM === serialData.port.path)[0];
  if (receivingPort) {
    dataSendWaitList.unshift({ type: 'generalData', receivingPort, data: str });
    // if (dataSendWaitList.length === 1) {
      uploadFromWaitList();
    // }
  } else {
    connectToSerialPort(serialData);
  }
}

function updateExternalDevice(serialData, dataList) {
  if (serialData) {
    receivingPort = activeDevicePorts.filter(p => p.COM === serialData.path)[0];
    if (receivingPort) {
      let list = '';
      let index = 0;
      for (const item of dataList) {
        list += item.identifier + ';' + item.value;
        if (index < dataList.length - 1) {
          list += ':';
        }
        index++;
      }
      if (list.length > 0) {
        receivingPort.writeData(list + '\n');
        main.updateSerialProgress({ progress: ((100 / dataList.length) * index), str: 'send motor data to ' + receivingPort.COM });
      }
    }
  }
}



exports.listSerialPorts = listSerialPorts;
exports.writeDataString = writeDataString;
exports.createConnection = createConnection;
exports.connectToSerialPort = connectToSerialPort;
exports.addSerialPort = addSerialPort;
exports.closeSerialPort = closeSerialPort;
exports.closeAllSerialPorts = closeAllSerialPorts;
exports.moveToPos = moveToPos;
exports.calibrateMotor = calibrateMotor;
exports.saveCalibrationValueToEEPROM = saveCalibrationValueToEEPROM;
exports.updateStartPosition = updateStartPosition;
exports.updateSleepmode = updateSleepmode;
exports.playEffect = playEffect;
exports.uploadEffectsToMicrocontroller = uploadEffectsToMicrocontroller;
exports.updateEffectData = updateEffectData;
exports.updateExternalDevice = updateExternalDevice;

