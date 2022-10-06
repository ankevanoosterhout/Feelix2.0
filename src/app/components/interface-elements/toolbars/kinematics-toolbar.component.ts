import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { Cursor } from 'src/app/models/tool.model';
import { KinematicsDrawingService } from 'src/app/services/kinematics-drawing.service';

@Component({
    selector: 'app-kinematics-toolbar',
    template: `

      <div class="toolbar-menu-section" id="toolbar-kinematic-control">
        <div class="attach-toolbar"><div class="attach-arrow" [ngClass]="{ hidden: this.hidden }" (click)="this.hidden = !this.hidden"></div><div class="label title">tools</div></div>
        <ul class="toolbar-menu" [ngClass]="{ hide: this.hidden }" >
          <li *ngFor="let item of this.toolList" (click)="selectTool(item.id)">
            <img class="tool-icon" id="tool-kinematic-control-{{ item.id }}" src="./assets/icons/tools/{{ item.icon }}" title="{{ item.name }}">
          </li>
        </ul>
      </div>
          `,
    styles: [`
            /*toolbar*/

        .attach-toolbar {
          position: absolute;
          display: inline-block;
          background: #3a3a3a;
          width: 44px;
          height: 18px;
          top: 0;
          left: 0;
          margin: 0;
          border: 1px solid #202020;
          z-index: 100;
        }

        .attach-toolbar .attach-arrow {
          position: absolute;
          display:inline-block;
          margin: 7px 3px 0;
          width: 0;
          height: 0;
          border-right: 3px solid transparent;
          border-left: 3px solid transparent;
          border-top: 5px solid #ccc;
          z-index: 100;
          cursor: pointer;
        }


        .attach-toolbar .attach-arrow.hidden {
          border-left: 5px solid #ccc;
          border-top: 3px solid transparent;
          border-bottom: 3px solid transparent;
          border-right: none;
          margin-top: 6px 4px 0;
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
          position: absolute;
          display:inline-block;
          height:auto;
          left:0;
          top:0;
          margin: 28px 5px;
          /* border-right: 1px solid #202020; */
          /* vertical-align: middle; */
        }

        .toolbar-menu {
          position: absolute;
          display: inline-flex;
          flex-direction: column;
          width: 46px;
          height: auto;
          margin: 19px 0 5px;
          padding: 0 4px 3px;
          box-sizing: border-box;
          background: #4a4a4a;
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

        .label {
          display: inline-block;
          font-family: Arial, Helvetica, sans-serif;
          line-height: 11px;
          /* color: #bebebe; */
          width: 60px;
        }


        .title {
          font-weight: 500;
          font-size: 11px;
          margin: 4px 0px 4px 15px;
          color: #ddd;
          vertical-align: top;
        }



    `]
})
export class KinematicsToolbarComponent implements OnInit {

  selectedTool: number;
  hidden = false;



  toolList = [
    new Cursor(0, 'connect', 'connect', false, 'bind.svg', 'a', ''),
    new Cursor(0, 'revolute', 'revolute', false, 'revolute.svg', 'j', ''),
    new Cursor(1, 'group', 'group', false, 'group.svg', 'g', '')
  ];

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService, private kinematicsDrawingService: KinematicsDrawingService) {
    this.electronService.ipcRenderer.on('toolsVisible', (event: Event, visible: boolean) => {
      this.hidden = visible;
    });
  }

  selectTool(id: number) {
    if (id === 0) {
      this.kinematicsDrawingService.joinObjects();
    } else if (id === 1) {
      this.kinematicsDrawingService.groupObjects();
    } else if (id === 2) {
    } else if (id === 3) {
    }
  }


  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
  }

}
