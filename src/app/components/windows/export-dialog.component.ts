import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { DOCUMENT } from '@angular/common';
import { MicroController } from 'src/app/models/hardware.model';
import { v4 as uuid } from 'uuid';
import { UploadService } from 'src/app/services/upload.service';


@Component({
  selector: 'app-export-dialog',
  template: `
  <div mat-dialog-title class="window-title-bar">Export</div>
    <div class="window-content">
      <div class="row">
        <div class="text-button" [ngClass]="{ active: useDefault }"
        (click)="useDefault=!useDefault; exportEffect(this.effect)">Default motor settings</div>
      </div>
      <div class="row">
        <label class="labelRow select">Export for </label>
        <select class="form-control" [(ngModel)]="this.selectedDevice" [ngClass]="{ inactive: useDefault }"
          name="customVarComport" (change)="exportEffect(this.effect)">
          <option *ngFor="let device of this.microcontrollerList" [ngValue]="device">
            {{ device.serialPort.path }} - {{ device.type }}
          </option>
        </select>
      </div>
      <div mat-dialog-content class="row" >
        <textarea id="copyfield">{{ data }}</textarea>
      </div>
      <div class="form-row buttons">
          <button (click)="this.copy()">Copy</button>
          <div class="dialogBtn" *ngFor="let btn of buttons">
            <button mat-button [mat-dialog-close]="btn">{{ btn }}</button>
          </div>
      </div>
  </div>
  `,
  styles: [`

    html, body {
      overflow-x: hidden;
    }

    .text-button {
      cursor: default;
    }

    textarea#copyfield {
      font-size: 11px;
      font-family: 'Courier';
      display: inline-block;
      width:308px;
      height: 120px;
      box-sizing: border-box;
      text-align: left;
      color: #888!important;
      top: 0;
      vertical-align: top;
      margin:15px 0 0 0;
      padding:10px;
      background: #fff;
      border: 1px solid #888;
      border-radius: 5px;
      resize: none;
    }
    .form-row.buttons {
      margin-top: 0;
      width: 100%;
      float:right;
    }

    .window-content {
      padding: 0 20px;
      margin: 0 0 10px;
      top: 0;
      vertical-align: top;
      overflow-x: hidden;
    }

    .dialogBtn {
      width: auto;
      display:inline-block;
      position:relative;
    }
    .dialogBtn button {
      text-transform: capitalize;
    }

    .labelRow {
      width: 87px;
      padding-left: 10px;
      top: 0;
      vertical-align:top;
      margin-top: 6px;
      margin-left:0;
      text-align: left;
    }

    .inactive {
      opacity: 0.4;
    }

    .window-content label.select:after {
      left: 278px;
      margin-top: 55px;
    }


  `]
})
export class ExportDialogComponent implements OnInit {

  public data = '';
  public buttons = ['Cancel'];

  public defaultSettings = new MicroController(uuid(), null, 'Teensy');
  public microcontrollerList = [];

  public selectedDevice: any;
  public effect: any;

  public useDefault = true;

  constructor(@Inject(DOCUMENT) public document: Document, @Inject(MAT_DIALOG_DATA) data: any, private uploadService: UploadService) {
    this.data = data.d;
    this.effect = data.e;
    this.microcontrollerList = data.microcontrollers;
    if (this.microcontrollerList.length > 0) {
      this.selectedDevice = this.microcontrollerList[0];
    }
    this.exportEffect(this.effect);
  }

  public exportEffect(libEffect: any) {
    let dataStr = '';
    if (libEffect.effect.slug === 5) {
      // dataStr = this.uploadService
        // .translatePositionEffectForExport(libEffect, (this.useDefault ? this.defaultSettings.motor : this.selectedDevice.motor));
    } else {
      // dataStr = this.uploadService.
        // translateTimeEffectForExport(libEffect, (this.useDefault ? this.defaultSettings.motor : this.selectedDevice.motor));
    }
    this.data = dataStr;
  }

  public copy() {
    const copyText: any = document.getElementById('copyfield');
    if (copyText) {
      copyText.select();
      document.execCommand('copy');
      // alert('Copied the text: ' + copyText.value);
    }
  }

  ngOnInit(): void {}
}
