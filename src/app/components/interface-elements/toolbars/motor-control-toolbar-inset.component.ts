import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { DrawingPlaneConfig } from 'src/app/models/drawing-plane-config.model';
import { DrawingService } from 'src/app/services/drawing.service';
import { MotorControlService } from 'src/app/services/motor-control.service';

@Component({
    selector: 'app-motor-control-toolbar-inset',
    template: `
          <div class="toolbar-menu-section" id="toolbar-motor-control">
            <div class="detach-toolbar" (click)="detachToolbar()"><div></div></div>
            <ul class="toolbar-menu">
              <li *ngFor="let item of this.motorControlService.toolList" (click)="this.selectTool(item.id, item.disabled)">
                <img class="tool-icon" [ngClass]="{ disabled: item.disabled }" id="tool-motor-control-{{ item.id }}" src="{{ item.icon }}" title="{{ item.name }}">
              </li>
            </ul>
          </div>
          `,
    styles: [`
            /*toolbar*/

        .detach-toolbar {
          position:absolute;
          display:inline-block;
          background: #3a3a3a;
          width: 100%;
          height: 13px;
          border-bottom: 1px solid #202020;
        }

        .detach-toolbar div {
          position: relative;
          top: 4px;
          left: 5px;
          width: 0;
          height: 0;
          border-top: 3px solid transparent;
          border-bottom: 3px solid transparent;
          border-left: 5px solid #ccc;
        }

        .detach-toolbar:hover {
          cursor: pointer;
        }

        .toolbar-menu-section {
          position: relative;
          display:inline-block;
          height:100%;
          left:0;
          top:0;
          border-right: 1px solid #202020;
          vertical-align: middle;
          overflow:hidden;
        }

        .toolbar-menu {
            position:relative;
            display:inline-block;
            height: auto;
            width: 35px;
            margin: 10px 4px 0;
            max-height: calc(100% - 10px);
            overflow:hidden;
            padding: 0;
            top: 50%;
            transform: translateY(-50%);
        }

        .toolbar-menu li {
            float:left;
            width: 35px;
            height: 35px;
            /*background: #505050;*/
            box-sizing: border-box;
            margin: 2px 2px 2px 0;
            position: relative;
            display:inline-block;
            border:1px solid transparent;
        }

        .toolbar-menu li:hover {
            background: #505050;
            border:1px solid #ffa500;
        }
        .toolbar-menu li:active,
        .toolbar-menu li.active {
            /*background: #fff;*/
            background: #505050;
            border:1px solid #2c2c2c;
        }
        .toolbar-menu li img {
            width: 100%;
            height:auto;
        }

        .toolbar-menu li img.disabled {
            /*background: transparent;*/
            opacity: 0.3;
        }
        /* .toolbar-menu li.disabled {
          display:none;
        } */
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
export class MotorControlToolbarInsetComponent implements OnInit {

  selectedTool: number;

  public config: DrawingPlaneConfig;

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              private drawingService: DrawingService, public motorControlService: MotorControlService) {

    this.config = this.drawingService.config;

    this.electronService.ipcRenderer.on('attachMotorControlToolbar', (event: Event) => {
      this.attachToolbar();
    });

  }

  selectTool(id: number, disabled: boolean) {
    if (!disabled) {
      if (id === 0) {
        this.motorControlService.addCollection();
      } else if (id === 1) {
        this.electronService.ipcRenderer.send('motorSettings');
      } else if (id === 2) {
        this.motorControlService.changeViewSettings();
      } else if (id === 3) {
        this.motorControlService.uploadAllCollections.next();
      } else if (id === 4) {
        const src = (this.document.getElementById('tool-motor-control-4') as HTMLImageElement).src.split('/');
        const play = src[src.length - 1] === 'play_all.svg' ? true : false;
        this.motorControlService.playAllCollections.next(play);
      } else if (id === 5) {
        const src = (this.document.getElementById('tool-motor-control-4') as HTMLImageElement).src.split('/');
        const play = src[src.length - 1] === 'play_all_delay.svg' ? true : false;
        if (play) {
          this.motorControlService.playSequence.next();
        }
      }
    }
  }

  detachToolbar() {
    this.document.body.style.cursor = 'wait';
    this.config.motorControlToolbarOffset = 0;
    this.electronService.ipcRenderer.send('showToolbarMotor');
    this.document.getElementById('toolbar-motor-control').classList.add('hide');
    this.document.getElementById('motor-control-section').classList.add('wide');
    this.motorControlService.drawCollections();
  }

  attachToolbar() {
    this.config.motorControlToolbarOffset = 45;
    this.document.getElementById('toolbar-motor-control').classList.remove('hide');
    this.document.getElementById('motor-control-section').classList.remove('wide');
  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
    // this.selectTool(3);
   }

}
