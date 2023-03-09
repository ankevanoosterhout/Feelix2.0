import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { ToolService } from 'src/app/services/tool.service';
import { DrawingPlaneConfig } from 'src/app/models/drawing-plane-config.model';
import { DrawingService } from 'src/app/services/drawing.service';
import { EffectType } from 'src/app/models/configuration.model';

@Component({
    selector: 'app-toolbar-inset',
    template: `
          <div class="toolbar-menu-section" id="toolbar"
          *ngIf="this.drawingService.file.configuration.horizontalScreenDivision < (100/innerHeight) * (innerHeight - 50)">
            <div class="detach-toolbar" (click)="detachToolbar()"><div></div></div>
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

        .detach-toolbar {
          position:absolute;
          display:inline-block;
          background: #3a3a3a;
          width: 100%;
          height: 14px;
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
          height:calc(100% - 44px);
          margin-top: 44px;
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
          width: 39px;
          margin: 10px 2px 0;
          max-height: calc(100% - 17px);
          padding: 0;
          top: 50%;
          overflow:hidden;
          transform: translateY(-50%);
        }

        .toolbar-menu li {
          float:left;
          width: 35px;
          height: 35px;
          /*background: #505050;*/
          box-sizing: border-box;
          margin: 2px;
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

        .hide {
            display:none;
        }


    `]
})
export class ToolbarInsetComponent implements OnInit {

  selectedTool: number;
  toolList = this.toolService.getTools();

  public config: DrawingPlaneConfig;
  public innerHeight: number;

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              public toolService: ToolService, public drawingService: DrawingService) {

    this.config = this.drawingService.config;

    this.electronService.ipcRenderer.on('selectCursor', (event: Event, acc: string) => {
      const tool = this.toolList.filter(f => f.acceleration === acc)[0];
      this.selectTool(tool.id);
    });

    this.electronService.ipcRenderer.on('attachToolbar', (event: Event) => {
      this.attachToolbar();
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

    this.innerHeight = window.innerHeight;
  }



  @HostListener('document:mouseleave', ['$event'])
  onMouseLeave(e: MouseEvent) {
    for (const tool of this.toolList) {
      this.deselectTool(tool.id);
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
    if (this.document.getElementById('tool-' + id)) {
      if (!this.document.getElementById('tool-' + id).classList.contains('hover')) {
        this.document.getElementById('tool-' + id).classList.add('hover');
      }
    }
  }

  deselectTool(id: number) {
    if (this.document.getElementById('tool-' + id)) {
      if (this.document.getElementById('tool-' + id).classList.contains('hover')) {
        this.document.getElementById('tool-' + id).classList.remove('hover');
      }
    }
  }

  detachToolbar() {
    this.electronService.ipcRenderer.send('showToolbar');

    this.config.toolbarOffset = 0;
    if (this.document.getElementById('toolbar')) {
      this.document.getElementById('toolbar').classList.add('hide');
    }
    if (this.document.getElementById('field-inset')) {
      this.document.getElementById('field-inset').classList.add('toolbarInset-hidden');
    }
    if (this.document.getElementById('effect-tabs')) {
      this.document.getElementById('effect-tabs').classList.add('wide');
    }
    this.drawingService.redraw();
  }

  attachToolbar() {
    this.config.toolbarOffset = 45;
    if (this.document.getElementById('toolbar')) {
      this.document.getElementById('toolbar').classList.remove('hide');
    }
    if (this.document.getElementById('field-inset')) {
      this.document.getElementById('field-inset').classList.remove('toolbarInset-hidden');
    }
    if (this.document.getElementById('effect-tabs')) {
      this.document.getElementById('effect-tabs').classList.remove('wide');
    }
    this.drawingService.redraw();
  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
    this.selectTool(3);
   }

}
