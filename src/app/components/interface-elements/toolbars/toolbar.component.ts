import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { ToolService } from 'src/app/services/tool.service';
import { EffectType } from 'src/app/models/configuration.model';

@Component({
    selector: 'app-toolbar',
    template: `
        <div class="wrapper">
            <div class="window-body"></div>
            <div class="attach-toolbar"><div class="attach-arrow" (click)="attachToolbar()"></div><div class="draggable"></div></div>
            <ul class="toolbar-menu">
              <li *ngFor="let item of toolList" (click)="selectTool(item.id)" (mouseenter)="highlightTool(item.id)"
                (mouseleave)="deselectTool(item.id)"
                [ngClass]="{ active: this.selectedTool === item.id, disabled: item.disabled === true }">
                <img class="tool-icon" id="tool-{{ item.id }}" src="{{ item.icon }}" title="{{ item.name }} ({{ item.acceleration }})">
              </li>
            </ul>
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
            height: 35px;
            /*background: #505050;*/
            box-sizing: border-box;
            margin: 0 2px -5px 0;
            padding:0;
            position: relative;
            display:inline-block;
            border:1px solid transparent;
        }

        .hover {
            background: #505050;
            width: 33px;
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

        .toolbar-submenu {
            display:none;
        }

        .closeTab {
            right:0;
            margin-right:8px;
            margin-top: 9px;
            position:absolute;
            z-index: 120;
        }
    `]
})
export class ToolbarComponent implements OnInit {

  selectedTool: number;
  toolList = this.toolService.getTools();

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              public toolService: ToolService) {

    this.electronService.ipcRenderer.on('selectCursor', (event: Event, acc: string) => {
      const tool = this.toolList.filter(f => f.acceleration === acc)[0];
      this.selectTool(tool.id);
    });

    this.electronService.ipcRenderer.on('updateToolbar', (event: Event, data: any) => {
      if (data.type !== EffectType.position) {
        this.toolService.disable('thick');
        this.electronService.ipcRenderer.send('updateToolbarSize', 'small');
        if (this.selectedTool === 5) { this.selectTool(4); }
      } else {
        this.electronService.ipcRenderer.send('updateToolbarSize', 'large');
        this.toolService.enable('thick');
      }

      this.toolList = this.toolService.getTools();
    });

  }

  @HostListener('document:mouseleave', ['$event'])
  onMouseLeave(e: MouseEvent) {
    if (e.target[0].className !== '' && e.target[0].className !== 'tool-icon' ) {
      for (const tool of this.toolList) {
        this.deselectTool(tool.id);
      }
    }
  }

  closeToolbar() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeToolbar');
    }
  }

  selectTool(id: number) {
    if (!this.toolList[id].disabled && id !== this.selectedTool) {
      this.selectedTool = id;
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send('updateCursor', this.toolList[id]);
      }
    }
  }

  highlightTool(id: number) {
    if (!this.document.getElementById('tool-' + id).classList.contains('hover')) {
      this.document.getElementById('tool-' + id).classList.add('hover');
    }
  }

  deselectTool(id: number) {
    if (this.document.getElementById('tool-' + id).classList.contains('hover')) {
      this.document.getElementById('tool-' + id).classList.remove('hover');
    }
  }

  attachToolbar() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('attachToolbar');
    }
  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
    this.selectTool(3);
   }

}
