import { Component, OnInit, Inject, AfterViewInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { EffectLibraryService } from 'src/app/services/effect-library.service';
import { EffectVisualizationService } from 'src/app/services/effect-visualization.service';
import { VariableService } from 'src/app/services/variable.service';
import { EaseFunctionLibraryService } from 'src/app/services/ease-function-library.service';
import { HardwareService } from 'src/app/services/hardware.service';
import { FeelixioConfig } from 'src/app/models/feelixio-config.model';
import { FeelixioDrawElementsService } from 'src/app/services/feelixio-draw-elements.service';
import { MotorObject, EffectObject } from 'src/app/models/feelixio-file.model';
import { Parameter, Unit, ValueComponent, Value } from 'src/app/models/component.model';
import { ComponentService } from 'src/app/services/component.service';
import { v4 as uuid } from 'uuid';
import { ElectronService } from 'ngx-electron';
import { FeelixioRenderService } from 'src/app/services/feelixio-render.service';
import { ConnectedDevice, MicroController } from 'src/app/models/hardware.model';
import { timeout } from 'd3';

@Component({
    selector: 'app-feelixio-parts',
    templateUrl: './feelixio-parts.component.html',
    styleUrls: ['../windows/effects/effects.component.css', './feelixio.component.css'],
})


export class FeelixioPartsComponent implements OnInit, AfterViewInit {

  public config: FeelixioConfig;

  microcontrollers: Array<MicroController> = [];
  registeredDevices: Array<ConnectedDevice> = [];
  // availablePorts = this.microcontrollers.concat(this.registeredDevices);
  selectedDevice: any = null;
  standardEffects = this.variableService.getEffects();
  easeEffects = this.easeFunctionService.getAllEaseFunctions();


  public tabs = [
    { id: 0, name: 'Standard', contentData: this.standardEffects.concat(this.easeEffects), selected: true, disabled: false },
    { id: 1, name: 'Position', contentData: this.effectLibraryService.getEffectsFeelixio(), selected: false, disabled: false  },
    { id: 2, name: 'Time', contentData: this.effectLibraryService.getEffectsFeelixio(), selected: false, disabled: false  },
    { id: 3, name: 'Components', contentData: this.componentService.getComponents(), selected: false, disabled: false  },
    { id: 4, name: 'Motors', contentData: this.microcontrollers, selected: false, disabled: false  }
   ];

  public directionOptions = [
    { name: 'any', val: null, i: 0 },
    { name: 'clockwise', val: 'cw', i: 1 },
    { name: 'counterclockwise',  val: 'ccw', i: 2 }
  ];

  public unitOptions = [
    { name: '4096PPR', PR: 4096 },
    { name: 'custom', PR: 360 }
  ];

  public controllerOptions = [
    { name: 'Arduino DUE' },
    { name: 'Teensy' },
    { name: 'STM32' },
  ];

  public qualityOptions = [
    { level: 0, name: 'low', division: 8 },
    { level: 1, name: 'normal', division: 4 },
    { level: 2, name: 'high', division: 2 },
    { level: 3, name: 'maximum', division: 1 }
  ];

  public linear = [
    { name: 'Speed', id: 0 },
    { name: 'Position', id: 1 },
    { name: 'Custom', id: 2 }
  ];

  public linearOptions = [
    { name: 'mm', PR: 50 },
    { name: 'cm', PR: 5 }
  ];

  public radialOptions = [
    { name: 'PPR', PR: 4096 },
    { name: 'degrees', PR: 360 }
  ];



  detailsVisible = true;
  activeTab = 0;
  serialConnectionsVisible = true;


  constructor(@Inject(DOCUMENT) private document: Document, private feelixioDrawElementsService: FeelixioDrawElementsService,
              private effectLibraryService: EffectLibraryService, private effectVisualizationService: EffectVisualizationService,
              private variableService: VariableService, private easeFunctionService: EaseFunctionLibraryService,
              public hardwareService: HardwareService, private componentService: ComponentService,
              private electronService: ElectronService, private feelixioRenderService: FeelixioRenderService) {

    this.config = this.feelixioDrawElementsService.config;

    this.electronService.ipcRenderer.on('updateCalibrationValue', (event: Event, d: any) => {
      const controller = this.microcontrollers.filter(m => m.serialPort.path === d.port)[0];
      if (controller) {
        // controller.motor.calibration.xStartPos = d.data;

        // this.hardwareService.updateMotorDetails(controller, controller.motor);
        (this.document.getElementById('calibration_val_' + d.port) as HTMLInputElement).value = d.data;
        this.updateMicrocontrollerFeelixIO(controller);
      }
    });


    this.electronService.ipcRenderer.on('playData', (event: Event, d: any) => {
      const microcontroller = this.microcontrollers.filter(m => m.serialPort.path === d.port)[0];
      const data = d.d;
      if (microcontroller) {
        // microcontroller.motor.speed = data.speed;
        // microcontroller.motor.direction = data.pos < microcontroller.motor.position.current ? 0 : 1;
        // microcontroller.motor.position.current = data.pos;
        // this.document.getElementById('speed_' + d.port).innerHTML = microcontroller.motor.speed + ' rpm';
        this.document.getElementById('position_' + d.port).innerHTML = ' ' +
        //  (Math.round((microcontroller.motor.position.current * (360 / 4096)) * 100) / 100) + '°';

        this.hardwareService.updateMicroController(microcontroller);
        // this.feelixioDrawElementsService.updateCursors(microcontroller.motor.position.current);

        this.feelixioRenderService.updateOutputParametersMotor(microcontroller);
      }
    });

    this.electronService.ipcRenderer.on('updateEffectsFromLibrary', (event: Event, data: any) => {
      if (this.activeTab === 1 || this.activeTab === 2) {
        this.selectTab(this.activeTab);
      }
    });

    this.electronService.ipcRenderer.on('addDevice', (event: Event, data: any) => {
      this.hardwareService.addConnectedDevice(data);
      // this.availablePorts = this.microcontrollers.concat(this.registeredDevices);
    });

  }

  compareUnits(unit1: Unit, unit2: Unit) {
    return unit1 && unit2 ? unit1.name === unit2.name : unit1 === unit2;
  }

  compareCOMPort(port1: any, port2: any) {
    return port1 && port2 ? port1.serialPort.path === port2.serialPort.path : port1 === port2;
  }

  selectTab(id: number) {
    for (const tab of this.tabs) {
      if (tab.id !== id) {
        tab.selected = false;
      } else {
        tab.selected = true;
      }
    }
    this.activeTab = id;
    if (this.activeTab === 1) {
      this.effectLibraryService.getEffectsFromLocalStorage();
      this.drawPositionEffects();
    } else if (this.activeTab === 2) {
      this.effectLibraryService.getEffectsFromLocalStorage();
      this.drawTimeEffects();
    }
  }

  scroll(direction: number) {
    const offset = this.document.getElementById('tablist').offsetLeft;
    const newOffset = offset + (75 * direction);
    const width = this.document.getElementById('tablist').offsetWidth;
    if (newOffset > ((width - 150) * -1) && newOffset < 50) {
      this.document.getElementById('tablist').style.marginLeft = newOffset + 'px';
    }
  }

  editLibraryItem(effect: any) {
    this.electronService.ipcRenderer.send('openEffectInNewFile', effect);
  }

  deleteLibraryItem(id: string) {
    this.effectLibraryService.deleteEffect(id);
    this.drawLibraryEffects();
  }

  dragstartLib(item: any, type: string, overlay = 'overlayEffect') {
    if (type === 'effect') {
      this.config.tmpEffect = new EffectObject(uuid(), item, null, { x: 0, y: 0 });
    } else if (type === 'component') {
      this.config.tmpEffect = item;
      this.config.tmpEffect.id = uuid();
    }
    this.document.querySelector('#' + overlay + '-' + (type === 'component' ? item.type : item.id)).classList.add('dragging');
  }

  dragendLib(item: string, overlay = 'overlayEffect') {
    this.document.querySelector('#' + overlay + '-' + item).classList.remove('dragging');
  }

  dragstartMotor(motor: any, port: any) {
    this.config.tmpEffect = new MotorObject(uuid(), port, motor, { x: 0, y: 0 });
    this.document.querySelector('#overlayEffect-' + port.id + '-' + motor).classList.add('dragging');
  }

  drawLibraryEffects() {
    // this.effectLibraryService.updateEffectData();
    this.effectLibraryService.getEffectsFromLocalStorage();
    this.drawPositionEffects();
    this.drawTimeEffects();
  }

  drawPositionEffects() {
    this.tabs[1].contentData = this.effectLibraryService.getEffectsFeelixio();
    setTimeout(() => { this.drawEffects(this.tabs[1].contentData, 'position'); }, 200);
  }

  drawTimeEffects() {
    this.tabs[2].contentData = this.effectLibraryService.getEffectsFeelixio();
    setTimeout(() => { this.drawEffects(this.tabs[2].contentData, 'time'); }, 200);
  }

  drawEffects(data: any, type: string) {
    for (const item of data) {
      const div = this.document.getElementById('effectSVG-' + item.id);
      if (div) {
        this.effectVisualizationService.drawEffect(item, type);
      }
    }
  }

  drawNodePathModules() {
    for (const item of this.tabs[0].contentData) {
      if (item.type === 'ease') {
        this.effectVisualizationService.drawNodePath(item);
      }
    }
  }


  updateDetails() {
    if (this.config.activeComponent.type === 'repeat') {
      const spacingPar = this.config.activeComponent.parameters.input.filter(p => p.name === 'Spacing')[0];
      const inputList = this.config.activeComponent.parameters.input.filter(p => p.name === '');
      const categoryValueTimes = this.config.activeComponent.parameters.input.filter(p => p.name === 'Times')[0].defaultVal.category.val;
      const times: number = categoryValueTimes === 'infinite' ? -1 : +categoryValueTimes;

      if (this.config.activeComponent.parameters.input
          .filter(p => p.name === 'Even spacing')[0].defaultVal.category.val === 'false') {
        if (spacingPar) {
          const index = this.config.activeComponent.parameters.input.indexOf(spacingPar);
          if (index > -1) { this.config.activeComponent.parameters.input.splice(index, 1); }
          for (let t = 0; t < times; t++) {
            this.addEmptyParameter('', '', 'bottom');
          }
        } else if (!spacingPar) {
          if (inputList.length !== times) {
            const diff = times - inputList.length;

            if (diff > 0) {
              for (let d = 0; d < diff; d++) { this.addEmptyParameter('', '', 'bottom'); }
            } else if (diff < 0) {
              for (let d = diff; d < 0; d++) {
                const index = this.config.activeComponent.parameters.input.filter(p => p.name === '')[0];
                if (index > -1) { this.config.activeComponent.parameters.input.filter(p => p.name === '').splice(index, 1); }
              }
            }
          }
        }
      } else {
        if (inputList.length > 0) {
          for (const input of inputList) {
            const index = this.config.activeComponent.parameters.input.indexOf(input);
            if (index > -1) { this.config.activeComponent.parameters.input.splice(index, 1); }
          }
        }
        if (!spacingPar) {
          this.addEmptyParameter('Spacing', 'S', 'left');
        }
      }
    }
    const outputLinks =
      this.feelixioDrawElementsService.feelixioFile.links.filter(l => l.output.component.id === this.config.activeComponent.id);

    if (outputLinks.length > 0) {
      this.feelixioRenderService.updateLinkedParameters(outputLinks);
    }
    if (this.config.activeComponent.type === 'slider' || this.config.activeComponent.type === 'value') {
      this.config.activeComponent.component.type.val =
        parseFloat(this.config.activeComponent.component.type.val).toFixed(this.config.activeComponent.component.decimals);
    }
    if (!this.feelixioDrawElementsService.feelixioFile.config.running) {
      this.feelixioDrawElementsService.setRenderedFalse();
    }
    this.feelixioDrawElementsService.saveFileData(this.feelixioDrawElementsService.feelixioFile);
  }

  resetTimer(comp: any) {
    this.feelixioRenderService.resetTimer(comp);
  }

  startTimer(comp: any) {
    this.feelixioRenderService.startTimer(comp);
  }

  addEmptyParameter(name = '', slug = '', position = 'left') {
    const par = new Parameter(uuid(), name, slug, 'input', false,
      [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr')], [], position, false,
      new ValueComponent(new Value(0, [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr')]),
        null, new Unit('degrees', '&deg;'), null));
    this.config.activeComponent.parameters.input.push(par);
  }

  updateDetailsCheckBox(parameter: any) {
    this.feelixioDrawElementsService.setRenderedFalse();
    parameter.hidden = !parameter.hidden;
    if (parameter.name === 'velocity') {
      this.config.activeComponent.parameters.input.filter(p => p.name === 'duration')[0].hidden = true; }
    if (parameter.name === 'duration') {
      this.config.activeComponent.parameters.input.filter(p => p.name === 'velocity')[0].hidden = true; }
    if (this.config.activeComponent.type === 'linear') {
      for (const par of this.config.activeComponent.parameters.input) {
        if (par.name !== parameter.name) {
          par.hidden = true;
        }
      }
    }
    if (this.feelixioDrawElementsService.feelixioFile.config.running) {
      this.feelixioDrawElementsService.setRenderedFalse();
    }
    this.feelixioDrawElementsService.saveFileData(this.feelixioDrawElementsService.feelixioFile);
  }

  updateInputParameter(parameter: any) {
    if (this.config.activeComponent.parameters.output[0].value) {
      this.config.activeComponent.parameters.output[0].value.type.start2 = parameter.defaultVal.type.start;
      this.config.activeComponent.parameters.output[0].value.type.end2 = parameter.defaultVal.type.end;
    }
  }

  updateParameter() {
    this.feelixioDrawElementsService.setRenderedFalse();
    if (this.feelixioDrawElementsService.feelixioFile.config.rendered) {
      this.feelixioDrawElementsService.feelixioFile.config.rendered = false;
    }
    let input = 0;
    let output = 0;
    for (let p = this.config.activeComponent.parameters.input.length - 1; p >= 0; p--) {
      if (this.config.activeComponent.parameters.input[p] === undefined) {
        input++;
        this.config.activeComponent.parameters.input.pop();
      }
    }
    for (let p = this.config.activeComponent.parameters.output.length - 1; p >= 0; p--) {
      if (this.config.activeComponent.parameters.output[p] === undefined) {
        output++;
        this.config.activeComponent.parameters.output.pop();
      }
    }
    for (let p = 0; p < input; p++) {
      const par = new Parameter(uuid(), '', '', 'input', false,
      [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
      new Unit('milliseconds', 'ms'), new Unit('seconds', 's')], [], 'left', false,
      new ValueComponent(new Value(0, [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
      new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), null));
      this.config.activeComponent.parameters.input.push(par);
    }
    for (let p = 0; p < output; p++) {
      const par = new Parameter(uuid(), '', '', 'output', false,
      [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
      new Unit('milliseconds', 'ms'), new Unit('seconds', 's')], [], 'right', false,
      new ValueComponent(new Value(0, [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
      new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), null));
      this.config.activeComponent.parameters.output.push(par);
    }

    this.feelixioDrawElementsService.drawFileData();
  }

  updateMotor(motorObject: any) {
    this.feelixioDrawElementsService.setRenderedFalse();
    const motor = motorObject.microcontroller.motor;
    if (motor) {
      this.hardwareService.updateMotorDetails(motorObject.microcontroller, motor);
      this.feelixioDrawElementsService.updateMicrocontroller(motorObject.microcontroller);
    }
  }

  updateMicrocontroller(microcontroller: MicroController) {
    if (microcontroller) {
      this.hardwareService.updateMicroController(microcontroller);
    }
  }


  changeQuality(effect: any) {
    const qualityLevel = effect.details.quality.level;
    const quality = this.qualityOptions.filter(q => q.level === qualityLevel)[0];
    effect.details.quality = quality;
  }

  updateStartPos(motorObject: any) {
    const Motor = motorObject.microcontroller.motor;
    if (Motor) {
      this.updateMotor(motorObject);
      this.electronService.ipcRenderer.send('updateStartPos', {
        motor: Motor,
        microcontroller: { port: motorObject.microcontroller.serialPort, type: motorObject.microcontroller.type,
          position: Motor.position.start } });
    }
  }

  updateSleepmode(motorObject: any) {
    const Motor = motorObject.microcontroller.motor;
    if (Motor) {
      this.updateMotor(motorObject);
      this.electronService.ipcRenderer.send('updateSleepmode',  {
        microcontroller: { port: motorObject.microcontroller.serialPort, type: motorObject.microcontroller.type },
        sleep: Motor.sleep });
    }
  }

  calibrateMotor(motorObject: any) {
    const Motor = motorObject.microcontroller.motor;
    if (Motor) {
      this.electronService.ipcRenderer.send('calibrateMotor', {
        motor: Motor,
        microcontroller: { port: motorObject.microcontroller.serialPort, type: motorObject.microcontroller.type } });
    }
  }

  saveToEEPROM(motorObject: any) {
    const Motor = motorObject.microcontroller.motor;
    if (Motor) {
      this.electronService.ipcRenderer.send('saveCalibrationValueToEEPROM', {
        motor: Motor,
        microcontroller: { port: motorObject.microcontroller.serialPort, type: motorObject.microcontroller.type } });
    }
  }

  deleteMicrocontroller(microcontroller: MicroController) {
    if (microcontroller) {
      this.hardwareService.deleteMicroController(microcontroller.serialPort.path);
      this.microcontrollers = this.hardwareService.getAllMicroControllers();
    }
  }

  deleteDevice(device: ConnectedDevice) {
    if (device) {
      this.hardwareService.deleteDevice(device.serialPort.path);
      this.registeredDevices = this.hardwareService.getRegisteredDevices();
    }
  }

  connectToMicrocontroller(microcontroller: MicroController, conn: boolean) {
    this.electronService.ipcRenderer.send('connectToSerialPort',
      { COM: { port: microcontroller.serialPort, type: microcontroller.type }, connect: conn });
  }

  connectToDevice(device: ConnectedDevice, conn: boolean) {
    this.hardwareService.updateStatusDevice(device.connected, device.serialPort);
    this.electronService.ipcRenderer.send('connectToSerialPort',
      { COM: { port: device.serialPort, name: device.name, baudrate: device.baudrate }, connect: conn });
  }

  addDeviceToList(microcontroller: MicroController) {
    if (microcontroller && this.selectedDevice) {
      const deviceList = this.hardwareService.addOtherDeviceToMicrocontroller(microcontroller, this.selectedDevice);
      if (deviceList) {
        microcontroller.dataToOtherDevices = deviceList;
      } else {
        microcontroller.dataToOtherDevices = [];
      }
      this.updateMicrocontrollerFeelixIO(microcontroller);
    }
  }

  deleteFromOtherDeviceList(microcontroller: MicroController, device: any) {
    this.hardwareService.deleteOtherDeviceFromList(microcontroller, device);
  }


  addSerialConnection(comtype: string) {
    this.electronService.ipcRenderer.send('listSerialPorts', { type: comtype });
  }

  ngAfterViewInit(): void {
    this.drawNodePathModules();
    this.drawLibraryEffects();
  }

  updateMicrocontrollerFeelixIO(microcontroller: MicroController) {
    this.feelixioDrawElementsService.updateMicrocontroller(microcontroller);
  }


  ngOnInit(): void {
    this.microcontrollers = this.hardwareService.getAllMicroControllers();
    this.registeredDevices = this.hardwareService.getRegisteredDevices();

    this.hardwareService.microcontrollerObservable.subscribe(microcontrollerData => {
      this.microcontrollers = microcontrollerData;
      this.tabs[4].contentData = this.microcontrollers;

    });
    this.hardwareService.registeredDevicesObservable.subscribe(registeredDevicesData => {
      this.registeredDevices = registeredDevicesData;
    });
  }

}
