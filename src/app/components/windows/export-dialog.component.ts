import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';
import { DOCUMENT } from '@angular/common';
import { UploadService } from 'src/app/services/upload.service';


@Component({
  selector: 'app-export-dialog',
  template: `
  <div mat-dialog-title class="window-title-bar">Export</div>
    <div class="window-content">

      <div class="row">
        <label class="label">Render quality</label>
        <input type="number" id="quality" name="quality" [(ngModel)]="this.quality" (change)="this.exportEffect(this.effect)" title="increase the value to reduce data points">
      </div>

      <div mat-dialog-content class="row" title="paste the text in the initialization of your Arduino sketch (before the setup function)">
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

    .label {
      width: auto;
      margin-right: 15px;
    }

    input {
      -webkit-appearance: none;
      background: #4a4a4a;
      border: 1px solid #1c1c1c;
      border-radius: 0;
      font-size: 11px;
      width: 20px;
      min-width: 20px;
      color: #bbb;
    }

    textarea#copyfield {
      font-size: 11px;
      font-family: 'Courier';
      display: inline-block;
      width:328px;
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
      tab-size: 2;
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
export class ExportDialogComponent {

  public data = '';
  public buttons = ['Cancel'];

  public selectedDevice: any;
  public effect: any;
  public quality = 5;

  public useDefault = true;

  constructor(@Inject(DOCUMENT) public document: Document, @Inject(MAT_DIALOG_DATA) data: any, private uploadService: UploadService) {
    this.data = data.d;
    this.effect = data.e;
    this.exportEffect(this.effect);
  }

  public exportEffect(effect: any) {
    this.data = this.uploadService.translateEffectForExport(effect, this.quality);
  }

  public copy() {
    const copyText: any = document.getElementById('copyfield');
    if (copyText) {
      copyText.select();
      document.execCommand('copy');
    }
  }

}
