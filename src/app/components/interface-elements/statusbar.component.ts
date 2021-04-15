import { Component, OnInit, Input, Inject } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { DOCUMENT } from '@angular/common';

@Component({
  selector: 'app-statusbar',
  template: `

    <div class="statusbar">
      <div class="process-update" id="msg">{{ this._status }}</div>
      <div class="process-uploadbar">
        <div id="progress" class="inner-bar"></div>
      </div>

      <div class="version">version B2.0.0</div>
      <div class="logo" *ngIf="this._page === 'main'"><img src="./assets/icons/logo/feelix-logo-gray.svg"></div>
      <div class="logo" *ngIf="this._page === 'Feelixio'"><img src="./assets/icons/logo/feelix-io-logo-gray.svg"></div>

    </div>

  `,
  styles: [`

    .statusbar {
      position: absolute;
      width: 100%;
      height: 18px;
      z-index: 100;
      bottom:0;
      left:0;
      background: #ddd;
      border-top: 1px solid #444;
      -webkit-box-shadow: inset 0px 0px 2px #999;
      color: #444;
      font-size: 9px;
      line-height: 17px;
      user-select:none;
    }

    .process-update {
      display: inline-block;
      position: relative;
      padding: 0 15px;
      width: 55%;
      max-width: calc(100% - 350px);
      vertical-align:top;
    }

    .process-uploadbar {
      display: inline-block;
      position: relative;
      left:0;
      margin: 0 15px;
      top: 3px;
      width: 250px;
      height: 12px;
      box-shadow: inset 0 0 4px #333;
      vertical-align:top;
    }

    .inner-bar {
      position:absolute;
      display:inline-block;
      left:0;
      top:0;
      margin:3px;
      width: 0;
      height:6px;
      background: #222;
    }


    .logo {
      display: inline-block;
      position: relative;
      padding: 1px 5px;
      float:right;
    }

    .logo img {
      height: 8px;
      width: auto;
    }

    .version {
      display: inline-block;
      position: relative;
      width: auto;
      padding: 0 15px 0 15px;
      vertical-align:top;
      float:right;
      text-align:right;
    }

  `]
})
export class StatusbarComponent implements OnInit {

  // tslint:disable-next-line: variable-name
  public _status = 'Loading...';
  // tslint:disable-next-line: variable-name
  public _page = '';

  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService) {

    this.electronService.ipcRenderer.on('updateProgress', (event: Event, data: any) => {
      this.updateProgressBar(data.progress);
      this._status = data.str;
      this.document.getElementById('msg').innerHTML = this._status;
    });

    this.electronService.ipcRenderer.on('statusMsg', (event: Event, msg: any) => {
      this._status = msg;
      this.document.getElementById('msg').innerHTML = this._status;
    });
  }

  private updateProgressBar(progress: number) {
    const width = 244 * (progress / 100);
    this.document.getElementById('progress').style.width = width + 'px';
  }

  ngOnInit(): void { }

  @Input()
  set status(status: string) {
    this._status = status && status.trim();
  }

  get status(): string {
    return this._status;
  }

  @Input()
  set page(page: string) {
    this._page = (page && page.trim()) || '';
  }




}
