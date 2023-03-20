import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';

@Component({
  selector: 'app-play-sequence',
  template: `
  <div mat-dialog-title class="window-title-bar">Play sequence</div>
  <div class="window-content">

      <div mat-dialog-content class="form-row">
        <ul>
          <li *ngFor="let data of this.d">
            <div class="column wide">
              {{ data.name }}
            </div>
            <div class="column small">
              <input type="number" class="small motor-settings" id="time-{{ data.id }}" name="time-{{ data.id }}" [(ngModel)]="data.time">
              <span> ms</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="form-row buttons">
        <button mat-button [mat-dialog-close]="">Cancel</button>
        <button mat-button [mat-dialog-close]="this.d">Play</button>
      </div>
  </div>`,
  styles: [`

    html, body {
      margin: 0;
      overflow: hidden;
      font-family: 'Open Sans', Arial, sans-serif;
    }

    ul {
      list-style-type: none;
      position:relative;
      width: 95%;
      color: #ccc;
      font-size: 12px;
      margin: 0;
      padding: 0 20px;
    }
    li {
      padding: 10px 0;
    }

    .column {
      display: inline-block;
    }

    .column.wide {
      width: 180px;
    }

    .column.small {
      width: auto;
    }

    .window-content {
      display: inline-block;
      position: relative;
      width: 100%;
      margin:0;
      box-sizing: border-box;
      padding: 15px;
    }

    .form-row.buttons {
      margin-top: 0;
      width: 100%;
      float:right;
    }

    .dialogBtn {
      width: auto;
      display:inline-block;
      position:relative;
    }

    .dialogBtn button {
      text-transform: capitalize;
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

  `]
})
export class PlaySequenceComponent {

  public d = [];

  constructor(@Inject(MAT_DIALOG_DATA) data: { d: Array<any> }) {
    this.d = data.d;
  }





  // submit() {
  //   this.electronService.ipcRenderer.send('playAllTimeSequence', this.d);
  // }

}
