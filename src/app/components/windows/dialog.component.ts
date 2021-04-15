import { Component, OnInit, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material';


@Component({
  selector: 'app-dialog',
  template: `
  <div mat-dialog-title class="window-title-bar">Feelix</div>
    <div class="window-content">
      <div class="inputfield">
          <div mat-dialog-content class="form-row">
            <p class="message">{{ message }}</p>
          </div>
          <div class="form-row buttons">
            <div class="dialogBtn" *ngFor="let btn of buttons">
              <button mat-button [mat-dialog-close]="btn">{{ btn }}</button>
            </div>
          </div>
      </div>
  </div>
  `,
  styles: [`

    html, body {
      overflow: hidden;
    }

    p.message {
      font-size: 12px;
      display: inline-block;
      width:100%;
      box-sizing: border-box;
      text-align: left;
      color: #ddd!important;
      margin:0;
      padding:0 40px;
    }
    .form-row.buttons {
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

    .window-content {
      width: 85%;
    }

  `]
})
export class DialogComponent implements OnInit {

  public message = '';

  buttons = ['cancel', 'no', 'yes'];

  constructor(@Inject(MAT_DIALOG_DATA) data) {
    this.message = data.message;
    this.buttons = data.buttons;
  }

  ngOnInit(): void {}
}
