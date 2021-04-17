import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { HardwareService } from 'src/app/services/hardware.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-select-com',
  template: `
    <div class="window-title-bar" *ngIf="this.type === 'custom'">Connect to serialport</div>
    <div class="window-title-bar" *ngIf="this.type !== 'custom'">New microcontroller</div>
    <div class="window-content">

      <div class="form-row" *ngIf="this.type === 'custom'">
        <label class="label">Name</label>
        <input type="text" class="form-control" [(ngModel)]="this.name" name="name">
      </div>
      <div class="form-row">
        <label class="label select">COM</label>
        <select class="form-control" id="COMPortList" required [(ngModel)]="selectedPort" name="comportList">
          <option value="">--select a comport--</option>
          <option *ngFor="let port of comports" [ngValue]="port">{{ port.serialPort.path }} - {{ port.vendor }}</option>
        </select>
        <div (click)="getComports()" class="image-button"><img src="./assets/icons/buttons/return.svg"></div>
      </div>
      <div class="form-row" *ngIf="this.type !== 'custom'">
        <label class="label select">Microcontroller</label>
        <select class="form-control" id="controllerType"
            required [(ngModel)]="selectedController" name="controllerType">
            <option *ngFor="let type of controllers" [ngValue]="type">{{ type }}</option>
        </select>
      </div>
      <div class="form-row buttons">
          <button id="submit" (click)="save(selectedPort, selectedController)" *ngIf="this.type === 'custom'">Save</button>
          <button id="submit" (click)="saveMicrocontroller(selectedPort, selectedController)" *ngIf="this.type !== 'custom'">Save</button>
          <button id="cancel" (click)="close()">Cancel</button>
      </div>
    </div>`,
  styles: [`

    #comportList {
      margin-right: 10px;
    }

    .form-row.buttons {
      padding-top: 20px;
    }

    input[type=text] {
      background: #202020;
      border: none;
      color: #fff;
      font-size: 13px;
    }
    input[type=text]::placeholder {
      font-size: 13px;
    }

    .image-button {
      margin-top:0;
    }

    label.select:after {
      margin-top: 20px;
    }

  `]
})
export class SelectComComponent implements OnInit {
  public name = 'untitled';
  public baudrate = 15200;
  comports = [];
  microControllers = [];
  controllers = [
    'Arduino DUE',
    'Teensy 3.2',
    'Teensy 3.5',
    'Teensy 3.6',
    'STM32',
  ];

  type = 'motor';

  selectedPort: any = null;
  selectedController = 'Teensy 3.2';
  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              private hardwareService: HardwareService, private router: Router) {

    this.type = this.router.url === '/connect-to-com-custom' ? 'custom' : 'motor';

    this.electronService.ipcRenderer.on('comports', (event: Event, comports: any) => {
      this.comports = comports;
      if (this.comports.length > 0) {
        this.selectedPort = this.comports[0];
      }
    });
  }


  saveMicrocontroller(selectedPort: any, selectedController: string) {
    this.hardwareService.addMicroController(selectedPort, this.selectedController);
    if (selectedPort !== null && selectedController !== null) {
      this.electronService.ipcRenderer.send('addMicrocontroller', { port: selectedPort.serialPort, type: this.selectedController });
    }
  }

  save(selectedPort: any) {
    if (selectedPort !== null) {
      this.electronService.ipcRenderer.send('addSerialPort', { port: selectedPort.serialPort, type: this.selectedController, name: this.name, baudrate: this.baudrate });
    }
  }


  getComports() {
    this.electronService.ipcRenderer.send('listSerialPorts', { type: this.type });
  }


  close() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
    this.comports = this.hardwareService.getAvailableCOMPorts();
    if (this.comports.length > 0) {
      this.selectedPort = this.comports[0];
      if (this.comports[0].vendor !== 'unknown') {
        this.selectedController === this.comports[0].vendor;
      }
    } else {
      this.getComports();
    }
  }

}


