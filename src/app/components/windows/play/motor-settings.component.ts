import { Component, OnInit, Inject, AfterViewInit, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { HardwareService } from 'src/app/services/hardware.service';
import { FileService } from 'src/app/services/file.service';
import { UploadService } from 'src/app/services/upload.service';
import { Router } from '@angular/router';
import * as d3 from 'd3';
import { DOCUMENT } from '@angular/common';
import { Unit } from 'src/app/models/hardware.model';


@Component({
  selector: 'app-motor-settings',
  templateUrl: './motor-settings.component.html',
  styleUrls: ['../../windows/effects/effects.component.css'],
})
export class MotorSettingsComponent implements OnInit, AfterViewInit {

  microcontroller: any;
  filelist = [];
  selectedTabID = 1;
  windowIndex = 0;
  fileDropdownVisible = 0;
  multiply: any;
  invertedMultiply = 1;
  activeFileUnits: string;

  public directionOptions = [
    { name: 'any', val: null },
    { name: 'clockwise', val: 'cw' },
    { name: 'counterclockwise',  val: 'ccw' }
  ];

  public tabs = [
    { id: 0, name: 'Play (position-based)', selected: false },
    { id: 1, name: 'Motor settings', selected: true },
    { id: 2, name: 'Microcontroller', selected: false }
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

  public controllerOptions = [
    { name: 'Arduino DUE' },
    { name: 'Teensy 3.2' },
    { name: 'Teensy 3.5' },
    { name: 'Teensy 3.6' }
  ];

  public qualityOptions = [
    { level: 0, name: 'low', division: 8 },
    { level: 1, name: 'normal', division: 4 },
    { level: 2, name: 'high', division: 2 },
    { level: 3, name: 'maximum', division: 1 }
  ];

  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService, private uploadService: UploadService,
              private hardwareService: HardwareService, private fileService: FileService, private router: Router ) {

    this.electronService.ipcRenderer.on('openedFile', (event: Event, file: any) => {
      if (file.mode === 'default') {
        this.filelist.push(file);
      }
    });

    this.electronService.ipcRenderer.on('updateCalibrationValue', (event: Event, data: any) => {
      this.microcontroller.motor.calibration.xStartPos = data;
      this.updateMotor(this.microcontroller.motor);
      if (this.selectedTabID === 1) {
        (this.document.getElementById('calibration_val') as HTMLInputElement).value = data;
      }
    });

  }

  @HostListener('window:resize', ['$event'])
  onResize(event: { target: { innerWidth: number; innerHeight: number; }; }) {
    this.drawFileDataMotors();
  }

  selectTab(id: number) {
    for (const tab of this.tabs) {
      if (tab.id !== id) {
        tab.selected = false;
      } else {
        this.selectedTabID = id;
        tab.selected = true;
      }
    }
  }

  openFiles() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('openFileDialogWindow', this.windowIndex);
    }
  }

  minimizeWindow() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('minimizePlayWindow', this.windowIndex);
    }
  }

  closeWindow() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closePlayWindow', this.windowIndex);
    }
  }

  deleteMicrocontroller(microcontroller: any) {
    this.hardwareService.deleteMicroController(microcontroller.serialPort.path);
    this.electronService.ipcRenderer.send('closePlayWindow', this.windowIndex);
  }

  uploadFile() {
    if (this.electronService.isElectronApp) {
      const Motor = this.microcontroller.motor;
      if (Motor.calibration.xStartPos === 0) {
        this.electronService.ipcRenderer.send('showMessage', 'The motor needs to be calibrated first.');
      } else {
        if (Motor.sleep) {
          Motor.sleep = false;
          this.updateMotor(Motor);
        }
        this.electronService.ipcRenderer.send('addFilesToUploadList',
          { effects: Motor.translatedData, motor: Motor,
            microcontroller: { port: this.microcontroller.serialPort, type: this.microcontroller.type }});
      }
    }
  }


  moveToPos() {
    this.electronService.ipcRenderer.send('moveToPos',
     { motors: this.microcontroller.motor, pos: this.microcontroller.motor.position.start,
       microcontroller: { port: this.microcontroller.serialPort, type: this.microcontroller.type }});
  }


  selectFile(file: any) {
    const motor = this.microcontroller.motor;
    motor.file = file;
    this.updateMotor(motor);
    motor.translatedData = this.uploadService.translateFileData(motor.file, motor);
    this.updateMotor(motor);
    this.drawFileData(motor, motor.translatedData, file);
  }

  removeSelectedFileFromList(motorId: number) {
    const motor = this.microcontroller.motor;
    const fileIndex = this.filelist.indexOf(motor.file);
    if (fileIndex > -1) {
      motor.file = null;
      this.filelist.splice(fileIndex, 1);
      if (this.filelist.length > 0) {
        motor.file = this.filelist[0];
        this.selectFile(this.filelist[0]);
      }
    }
  }

  refreshFileList() {
    const copyList = JSON.stringify(this.fileService.getAll().filter(f => f.mode === 'default'));
    this.filelist = JSON.parse(copyList);
    if (this.microcontroller.motor.file !== null) {
      const updatedFile = this.filelist.filter(f => f._id === this.microcontroller.motor.file._id)[0];
      if (updatedFile) {
        this.microcontroller.motor.file = updatedFile;
        this.selectFile(updatedFile);
      }
    }
  }

  updateStartPos(motor: any) {
    this.updateMotor(motor);
    this.electronService.ipcRenderer.send('updateStartPos',  {
      microcontroller: { port: this.microcontroller.serialPort, type: this.microcontroller.type },
      position: motor.position.start });
  }

  updateMotor(motor: any) {
    this.hardwareService.updateMotorDetails(this.microcontroller, motor);
  }

  updateMicrocontrollerDetails() {
    this.hardwareService.updateMicroControllerDetails(this.microcontroller, this.microcontroller.type);
    // this.electronService.ipcRenderer.send('updateMicrocontrollerDetails', this.microcontroller);
  }

  calibrateMotor(Motor: any) {
    this.electronService.ipcRenderer.send('calibrateMotor', {
      motor: Motor,
      microcontroller: { port: this.microcontroller.serialPort, type: this.microcontroller.type } });
  }

  saveToEEPROM(Motor: any) {
    this.electronService.ipcRenderer.send('saveCalibrationValueToEEPROM', {
      motor: Motor,
      microcontroller: { port: this.microcontroller.serialPort, type: this.microcontroller.type } });
  }

  compareUnits(unit1: Unit, unit2: Unit) {
    return unit1 && unit2 ? unit1.name === unit2.name : unit1 === unit2;
  }

  changeFrequency(value: number) {
    if (value > 600) { value = 600; }
    if (value < 50) { value = 50; }
    this.microcontroller.motor.frequency = value;
    this.updateMotor(this.microcontroller.motor);
  }


  changeFileDropdown(id: number) {
    this.fileDropdownVisible = this.fileDropdownVisible === id ? 0 : id;
  }

  ngOnInit(): void {
    const index = this.router.url.split('-');
    this.windowIndex = parseInt(index[2], 10);
    this.microcontroller = this.hardwareService.getSelectedMicroController();
    const copyList = JSON.stringify(this.fileService.getAll().filter(f => f.mode === 'default'));
    this.filelist = JSON.parse(copyList);
    if (this.microcontroller.motor.file === null && this.filelist.length > 0) {
      this.microcontroller.motor.file = this.filelist[0];
    }
  }

  ngAfterViewInit(): void {
    this.drawFileDataMotors();
  }

  drawFileDataMotors() {
    if (this.microcontroller) {
      this.drawFileData(this.microcontroller.motor, this.microcontroller.motor.translatedData, this.microcontroller.motor.file);

      if (this.microcontroller.motor.file !== null) {
        const motorFile = this.filelist.filter(f => f._id === this.microcontroller.motor.file._id)[0];
        if (!motorFile && this.microcontroller.motor.file.mode === 'default') {
          this.filelist.push(this.microcontroller.motor.file);
        }
      }
    }
  }


  updateCursor(motor: any) {
    if (motor.Xscale !== null && motor.file !== null) {
      let currentPos = motor.position.current;
      const multiplyFactor = this.multiply ? this.multiply : 1;
      if (motor.position.current < motor.file.rotation.start * multiplyFactor) {
        currentPos = motor.file.rotation.start * multiplyFactor;
      } else if (motor.position.current > motor.file.rotation.end * multiplyFactor) {
        currentPos = motor.file.rotation.end * multiplyFactor;
      }

      d3.selectAll('#cursor_' + motor.id)
        .attr('x1', motor.Xscale(currentPos))
        .attr('x2', motor.Xscale(currentPos));

    }
  }


  drawFileData(motor: any, translatedData: any, file: any) {

    const width = window.innerWidth - 67;
    const height = 113;

    if (file) {
      if (translatedData === null) {
        translatedData = this.uploadService.translateFileData(motor.file, motor);
        motor.translatedData = translatedData;
        this.hardwareService.updateMotorDetails(this.microcontroller, motor);
      }

      this.multiply = this.uploadService.getMultiplyFactor(file.grid.units, motor);
      this.invertedMultiply = this.uploadService.getInvertedMultiplyFactor(file.grid.units, motor);

      if (file.grid.units.name !== 'mm' && file.grid.units.name !== 'cm') {
        this.activeFileUnits = file.grid.units.name === 'degrees' ? '&deg;' : 'ppr';
      } else {
        this.activeFileUnits = file.grid.units.name;
      }
      this.document.getElementById('posUnits').innerHTML = this.activeFileUnits;

      if (this.multiply) {
        motor.Xscale = d3.scaleLinear()
            .domain([file.rotation.start * this.multiply - 5, file.rotation.end * this.multiply + 5])
            .range([0.8, width - 0.8]);

        const YScale = d3.scaleLinear()
            .domain([255, 0])
            .range([10, height - 7]);

        for (const layer of file.layers) {

          d3.select('#svgID-' + layer.id + '-' + motor.id).remove();

          const svg = d3.select('#overviewSVG-' + layer.id + '-' + motor.id)
            .append('svg')
            .attr('id', 'svgID-' + layer.id + '-' + motor.id)
            .attr('width', width + 1.6)
            .attr('height', height);

          const container = svg.append('rect')
            .attr('width', width)
            .attr('height', height - 5.5)
            .attr('x', 0.8)
            .attr('y', 3)
            .attr('fill', '#2c2c2c')
            .attr('stroke', '#111')
            .attr('stroke-width', 0.5);


          if (translatedData !== null) {

            const nodes = svg.append('g')
              .attr('class', 'nodes motor' + motor.id + '-' + layer.id)
              .attr('transform', 'translate(0, 3)');

            svg.selectAll('rect.effect' + motor.id + '-' + layer.id)
              .data(file.effects.filter((e: { slug: number; interface: { layer: any; };
                details: { direction: string; }; type: string; }) => e.slug < 5 && (e.interface.layer === layer.id ||
                e.details.direction === 'any' || e.type === 'limit')))
              .enter()
              .append('rect')
              .attr('class', 'effect' + motor.id + '-' + layer.id)
              .attr('x', (d: any) => motor.Xscale(d.details.position.start * this.multiply) + 0.8)
              .attr('y', 3)
              .attr('width', (d: any) => motor.Xscale(d.details.position.end * this.multiply) -
                                        motor.Xscale(d.details.position.start * this.multiply))
              .attr('height', (d: any) => d.type === 'limit' ? height - 6 : 5)
              .style('opacity', (d: any) => d.slug === 1 ? 0.1 : 1)
              .style('fill', (d: any) => d.interface.colors[0].hash)
              .style('stroke', '#1c1c1c')
              .style('stroke-width', 0.4);

            svg.selectAll('path.effect' + motor.id + '-' + layer.id)
              .data(file.effects.filter((e: { slug: number }) => e.slug === 1))
              .enter()
              .append('path')
              .attr('d', (d: any) => 'M' + motor.Xscale(d.details.position.start * this.multiply) + ', ' +
                YScale(0) + ' L' + motor.Xscale(d.details.position.start  * this.multiply) + ', ' +
                YScale(d.details.parameter.value.start2 * 2.55) + ' L' +
                motor.Xscale(d.details.position.end * this.multiply) + ', ' +
                YScale(d.details.parameter.value.end2 * 2.55) + ' L' +
                motor.Xscale(d.details.position.end * this.multiply) + ', ' + YScale(0) + 'Z')
              .attr('class', 'effect' + motor.id + '-' + layer.id)
              .style('opacity', 0.2)
              .style('fill', (d: any) => d.interface.colors[0].hash)
              .attr('transform', 'translate(0.8, 3)');

            for (const effect of translatedData) {
              if (effect && effect.translatedData.length > 0 &&
                ((effect.layer === layer.id) || (effect.direction === 0 && !effect.mirror))) {

                let r = 0;
                for (const repeat of effect.repeat) {
                  const offset = repeat - effect.repeat[0];
                  nodes.selectAll('rect.forceNode' + motor.id + '-' + effect.id + '-' + layer.id + '-' + r)
                    .data(effect.translatedData.filter((d: { o: any; x: any; }) => d.o !== d.x))
                    .enter()
                    .append('rect')
                    .attr('class', 'forceNode' + motor.id + '-' + effect.id + '-' + layer.id + '-' + r)
                    .attr('x', (d: any) => d.o <= d.x ? motor.Xscale(d.o) + motor.Xscale(offset) : motor.Xscale(d.x) + motor.Xscale(offset))
                    .attr('y', (d: any) => YScale(d.y))
                    .attr('width', (d: any) => d.o < d.x ? motor.Xscale(d.x) - motor.Xscale(d.o) : motor.Xscale(d.o) - motor.Xscale(d.x))
                    .attr('height', 0.3)
                    .attr('fill', file.layers[layer.id].colors[1].hash);


                  nodes.selectAll('circle.node' + motor.id + '-' + effect.id + '-' + layer.id + '-' + r)
                    .data(effect.translatedData)
                    .enter()
                    .append('circle')
                    .attr('class', 'node' + motor.id + '-' + effect.id + '-' + layer.id + '-' + r)
                    .attr('r', 0.4)
                    .attr('cx', (d: any) => motor.Xscale(d.x) + motor.Xscale(offset))
                    .attr('cy', (d: any) => YScale(d.y))
                    .attr('fill', file.layers[layer.id].colors[0].hash);

                  r++;
                }
              }
            }

            const cursor = svg.append('line')
              .attr('class', 'cursor')
              .attr('id', 'cursor_' + (motor.id))
              .attr('x1', motor.Xscale(motor.position.current ? motor.position.current : 0))
              .attr('y1', 0)
              .attr('x2', motor.Xscale(motor.position.current ? motor.position.current : 0))
              .attr('y2', height)
              .attr('stroke', '#FF9100')
              .attr('stroke-width', 1);

          }
        }
      }
    }
  }
}
