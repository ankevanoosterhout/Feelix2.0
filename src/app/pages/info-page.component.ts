import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-info-page',
  template: `
  <div class="window-content">
    <div class="logo"><img src="./assets/icons/logo/feelix.svg"></div>


    <div class="row">
      <div class="column">
        Design directional force feedback or precise motion control for your brushless motor with Feelix.<br /><br />
        Feelix can be used in combination with the following hardware:
        <ul>
          <li>Brushless motor (high torque)</li>
          <li>Encoder (ams AS5047D-ATSM)</li>
          <li>3-Phase motor driver (L6234)</li>
          <li>Teensy 3.2 / 3.5 / 3.6 <p class="link" (click)="gotToLink('https://docs.feelix.xyz/downloads/arduino-library')">
            download library
          </p></li>
        </ul>
        <br />
        For more information visit <p class="link inline" (click)="gotToLink('https://docs.feelix.xyz')">docs.feelix.xyz<p>
      </div>
      <div class="column">
        <img class="bldcmotor-img" src="./assets/images/brushlessmotor.png">
      </div>
    </div>


    <label class="checkbox-container show">Do not show again
        <input type="checkbox" id="show" name="show" [(ngModel)]="dontShowAgain" [checked]="dontShowAgain" (change)="disableInfo();">
        <span class="checkmark checkbox"></span>
    </label>
  </div>`,
  styles: [`

    .window-content {
      width: 100%;
      height: 100vh;
      box-sizing: border-box;
      font-size: 12px;
      color: #222;
    }

    .logo {
      width: 70%;
      height: auto;
    }

    p.link {
      text-decoration: underline;
      cursor: pointer;
      margin: 0;
      padding:0;
      display:inline-block;
      color: #4E8EFF;
    }
    p.inline {
      display: inline-block;
    }

    .column {
      display:inline-block;
      float: left;
      width: 50%;
      padding: 10px 15px;
      box-sizing: border-box;
    }

    .column-wide {
      width: 100%;
      padding: 10px 15px;
      box-sizing: border-box;
    }

    .bldcmotor-img {
      width: 90%;
      margin: 0 5%;
      height: auto;
    }

    .show {
      position: absolute;
      bottom: 0;
      left:0;
      margin: 30px 30px;
      font-size: 12px;
      line-heigth: 18px;
      color: #222;
    }

    .checkmark.checkbox {
      background-color: #fff;
      border: 1px solid #1a1a1a;
    }

    .checkbox-container .checkmark:after {
      color: #222;
    }
  `]
})
export class InfoPageComponent implements OnInit {

  public static readonly SHOW = 'ngx-webstorage|showInfo';

  dontShowAgain = false;

  constructor(private electronService: ElectronService) { }

  ngOnInit() {
    localStorage.setItem(InfoPageComponent.SHOW, 'true');
  }

  disableInfo() {
    const show = !this.dontShowAgain;
    localStorage.setItem(InfoPageComponent.SHOW, show.toString());
  }

  gotToLink(link: string) {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('openExternalLink', link);
    }
  }
}


