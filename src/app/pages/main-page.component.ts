import { AfterViewInit, Component, HostListener } from '@angular/core';
import { DrawingService } from '../services/drawing.service';
import { MotorControlService } from '../services/motor-control.service';

@Component({
    selector: 'app-main-page',
    template: `
      <app-file-list [list]="list"></app-file-list>
      <div id="top-section">
        <div id="motor-control">
        <app-motor-control-toolbar-inset></app-motor-control-toolbar-inset>
        <app-motor-control></app-motor-control>
        </div>
        <div class="resize-vertical" (mousedown)="updateVerticalScreenDivision = true"></div>
        <div id="library">
          <div class="sidebar">
            <div class="hide-sidebar" id="toggleLibraryWindow" (click)="this.drawingService.toggleLibraryWindow()"><div></div></div>
          </div>
          <app-effects></app-effects>
        </div>
      </div>

      <div class="resize-horizontal" (mousedown)="updateHorizontalScreenDivision = true"></div>

      <div id="bottom-section">
        <app-fixed-toolbar></app-fixed-toolbar>
        <app-toolbar-inset></app-toolbar-inset>
        <app-effect-list></app-effect-list>
        <app-drawing-plane></app-drawing-plane>
      </div>
      <app-statusbar [page]="page"></app-statusbar>

    `,
    styles: [`

    #bottom-section {
      /* user-select: none; */
      display:inline-block;
      position:relative;
      height:calc(65vh - 20px);
      margin-top: 0;
      width:100%;
    }

    #top-section {
      display:inline-block;
      height: calc(35vh - 23px);
      position:relative;
      margin-top: 22px;
      width: 100%;
      overflow: hidden;
    }

    #library {
      display:inline-block;
      position:absolute;
      width: calc(30vw - 1px);
      height: 100%;
      top:0;
      right:1px;
    }

    #motor-control {
      display:inline-block;
      position:relative;
      width: 70vw;
      height: 100%;
      vertical-align: top;
    }


    .sidebar {
      position:relative;
      display:inline-block;
      left:3px;
      width: 25px;
      height:100%;
      background: #3a3a3a;
      border-right: 1px solid #202020;
    }

    .hide-sidebar {
      position:absolute;
      display:inline-block;
      width: 100%;
      height: 13px;
      cursor:pointer;
    }

    .hide-sidebar div {
      position: relative;
      top: 4px;
      left: 5px;
      width: 0;
      height: 0;
      border-top: 3px solid transparent;
      border-bottom: 3px solid transparent;
      border-left: 5px solid #ccc;
    }

    #toggleLibraryWindow.hidden div {
      border-left: none;
      border-right: 5px solid #ccc;
    }

  `],
})


export class MainPageComponent implements AfterViewInit {

    list = 'designFiles';
    page = 'main';
    updateHorizontalScreenDivision = false;
    updateVerticalScreenDivision = false;

    constructor(public drawingService: DrawingService, private motorControlService: MotorControlService) {}

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(e: MouseEvent) {

      if (this.updateHorizontalScreenDivision) {
        this.updateScreenDivisionY(e.clientY);
      } else if (this.updateVerticalScreenDivision) {
        this.updateScreenDivisionX(e.clientX);
      }
    }

    @HostListener('document:mouseup', ['$event'])
    onMouseUp(e: MouseEvent) {
      if (this.updateHorizontalScreenDivision || this.updateVerticalScreenDivision) {
        // this.drawingService.saveFile(this.drawingService.file);
        this.updateHorizontalScreenDivision = false;
        this.updateVerticalScreenDivision = false;
      }
    }

    updateScreenDivisionY(coord: number) {
      if (coord > 60 && coord < window.innerHeight - 55) {
        let yValue = coord - 22;
        let fullHeight = window.innerHeight - 40;
        let division = 100 / (fullHeight / yValue);
        this.drawingService.updateResize(division, 'horizontal');
        this.motorControlService.onResize();
        this.drawingService.redraw();
      }
    }

    updateScreenDivisionX(coord: number) {
      if (coord <= window.innerWidth - 18) {
        let division = 100 / (window.innerWidth / coord);
        this.drawingService.updateResize(division, 'vertical');
        this.motorControlService.onResize();
        this.drawingService.redraw();
      }
    }

    ngAfterViewInit() {
      this.drawingService.setDivToScreenDivision();
    }


}
