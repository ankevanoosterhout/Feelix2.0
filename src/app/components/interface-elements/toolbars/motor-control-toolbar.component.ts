import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { ToolService } from 'src/app/services/tool.service';
import { DrawingPlaneConfig } from 'src/app/models/drawing-plane-config.model';
import { DrawingService } from 'src/app/services/drawing.service';
import { MotorControlService } from 'src/app/services/motor-control.service';

@Component({
    selector: 'app-motor-control-toolbar',
    template: `
      <div class="wrapper">
        <div class="window-body"></div>
        <div class="toolbar-menu-section" id="toolbar-motor-control">
          <div class="attach-toolbar"><div class="attach-arrow" (click)="attachToolbar()"></div><div class="draggable"></div></div>
          <ul class="toolbar-menu">
            <li *ngFor="let item of this.motorControlService.toolList" (click)="selectTool(item.id)">
              <img class="tool-icon" id="tool-motor-control-{{ item.id }}" src="{{ item.icon }}" title="{{ item.name }}">
            </li>
          </ul>
        </div>
      </div>
          `,
    styles: [`
            /*toolbar*/

        .attach-toolbar {
          position:absolute;
          display:inline-block;
          background: #4a4a4a;
          height: 44px;
          width: 12px;
          top:0;
          left:0;
          margin:0;
          border: 1px solid #202020;
          z-index: 100;
        }

        .attach-toolbar .attach-arrow {
          position: absolute;
          margin: 4px 3px 0;
          width: 0;
          height: 0;
          border-top: 3px solid transparent;
          border-bottom: 3px solid transparent;
          border-right: 5px solid #ccc;
          z-index: 100;
          cursor: pointer;
        }

        .attach-toolbar .draggable {
          -webkit-app-region: drag;
          position: absolute;
          display: inline-block;
          width: 100%;
          height: 20px;
          bottom: 0;
        }

        .toolbar-menu-section {
          position: relative;
          display:inline-block;
          height:100%;
          left:0;
          top:0;
          /* border-right: 1px solid #202020; */
          vertical-align: middle;
        }

        .toolbar-menu {
          position:relative;
          width: auto;
          height: 40px;
          margin:5px 4px 5px 18px;
          padding:0;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }

        .toolbar-menu li {
            float:left;
            width: 35px;
            height: 33px;
            /*background: #505050;*/
            box-sizing: border-box;
            margin: 2px 2px 2px 0;
            position: relative;
            display:inline-block;
            border:1px solid transparent;
        }

        .toolbar-menu li:active,
        .toolbar-menu li.active {
            /*background: #fff;*/
            background: #505050;
            border:1px solid #2c2c2c;
        }

        .toolbar-menu li:hover {
          background: #505050;
          width: 33px;
          border:1px solid #ffa500;
        }
        .toolbar-menu li img {
            width: 100%;
            height:auto;
        }

        .toolbar-menu li.disabled img {
            /*background: transparent;*/
            opacity: 0.3;
        }
        .toolbar-menu li.disabled {
          display:none;
        }
        /*.toolbar-menu li.disabled:active,
        .toolbar-menu li.disabled:hover {
            background: transparent;
            border:1px solid transparent;
            cursor: url('./assets/icons/tools/cursor-invisible.png'), none;
        }*/

        .hide {
            display:none;
        }


    `]
})
export class MotorControlToolbarComponent implements OnInit {

  selectedTool: number;
  public config: DrawingPlaneConfig;

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              public toolService: ToolService, private drawingService: DrawingService, public motorControlService: MotorControlService) {

    this.config = this.drawingService.config;

    this.electronService.ipcRenderer.on('attachMotorControlToolbar', (event: Event) => {
      this.attachToolbar();
      this.motorControlService.drawCollections();
    })
  }

  selectTool(id: number) {
    if (id === 0) {
      this.motorControlService.addCollection();
    } else if (id === 1) {
      this.electronService.ipcRenderer.send('motorSettings');
    } else if (id === 2) {
      this.electronService.ipcRenderer.send('changeViewSettings');
    } else if (id === 3) {
      this.electronService.ipcRenderer.send('changeViewTranslation');
    }
  }

  attachToolbar() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('attachToolbarMotor');
    }
  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
    // this.selectTool(3);
   }

}
