import { Component, OnInit, Input } from '@angular/core';
import { FeelixioRenderService } from 'src/app/services/feelixio-render.service';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-render-info',
  template: `
  <div class="fixed-toolbar-render">
    <div class="add" (click)="render()">Render</div>
    <div class="add" [ngClass]="{ inactive: !this.feelixioRenderService.feelixioFile.config.rendered }" (click)="upload()">Upload</div>
    <div class="add" [ngClass]="{ inactive: !this.feelixioRenderService.feelixioFile.config.loaded ||
      !this.feelixioRenderService.feelixioFile.config.rendered}" (click)="play()" *ngIf="!playing">
      <img src="./assets/icons/buttons/play.svg" title="play">
    </div>
    <div class="add" [ngClass]="{ inactive: !this.feelixioRenderService.feelixioFile.config.loaded ||
      !this.feelixioRenderService.feelixioFile.config.rendered }" (click)="play()" *ngIf="playing">
      <img src="./assets/icons/buttons/stop.svg" title="stop">
    </div>
    <div class="message-icon" *ngIf="this._message === 'Rendering failed.' && !this.feelixioRenderService.feelixioFile.config.rendered">
      <img src="./assets/icons/buttons/warning.svg"></div>
    <div class="message-icon" *ngIf="this.feelixioRenderService.feelixioFile.config.rendered">
      <img src="./assets/icons/buttons/good.svg"></div>
    <div class="render-message">{{ this._message }}</div>
    <div class="timer">{{ this.timeStr }}</div>
  </div>

  `,
  styleUrls: ['./fixed-toolbar.component.css']
})
export class RenderInfoComponent implements OnInit {

  // tslint:disable-next-line:variable-name
  public _message = '';
  public playing = false;
  public timeStr = '00:00:000';
  public time = 0;
  public timerInterval: any;

  constructor(public feelixioRenderService: FeelixioRenderService) {}

  ngOnInit(): void { }

  @Input()
  set message(message: string) {
    this._message = message && message.trim();
  }
  get message(): string {
    return this._message;
  }

  @Input()
  set fileRendered(rendered: boolean) {
    this.feelixioRenderService.feelixioFile.config.rendered = rendered;
    if (!this.feelixioRenderService.feelixioFile.config.rendered) { this._message = ''; }
  }

  get fileRendered(): boolean {
    return this.feelixioRenderService.feelixioFile.config.rendered;
  }

  render() {
    this.feelixioRenderService.feelixioFile.config.rendered = false;
    this._message = '';
    const renderResult = this.feelixioRenderService.render();
    this.feelixioRenderService.feelixioFile.config.rendered = renderResult.render;
    this._message = renderResult.msg;
  }

  upload() {
    if (this.feelixioRenderService.feelixioFile.config.rendered) {
      this.feelixioRenderService.uploadEffectData();
    } else {
      this._message = 'The file needs to be rendered first.';
    }
  }

  play() {
    if (this.feelixioRenderService.feelixioFile.config.loaded) {
      this.feelixioRenderService.feelixioFile.config.running = !this.feelixioRenderService.feelixioFile.config.running;
      this.playing = !this.playing;
      this.feelixioRenderService.playEffectData(this.playing);
      if (this.playing) {
        this.startTimer();
        this.feelixioRenderService.startIntervalDataSend();
      } else {
        this.endTimer();
        this.feelixioRenderService.clearIntervalDataSend();
      }
    } else {
      this.feelixioRenderService.feelixioFile.config.running = false;
      this._message = 'The file needs to be uploaded first.';
    }
  }



  startTimer() {
    this.time = 0;
    this.timerInterval = setInterval(() => {
      this.time++;
      this.updateTimer(this.time);
    }, 1);
  }

  endTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  updateTimer(time: number) {
    const minutes = Math.floor(time / 60000);
    const minutesStr = minutes < 10 ? '0' + minutes.toString() : minutes.toString();
    const seconds = Math.floor((time - (60000 * minutes)) / 1000);
    const secondsStr = seconds < 10 ? '0' + seconds.toString() : seconds.toString();
    const ms = time - (60000 * minutes) - (1000 * seconds);
    let msStr = ms.toString();
    if (ms < 10) { msStr = '00' + msStr; } else if (ms < 100) { msStr = '0' + msStr; }
    this.timeStr = minutesStr + ':' + secondsStr + ':' + msStr;
  }

}
