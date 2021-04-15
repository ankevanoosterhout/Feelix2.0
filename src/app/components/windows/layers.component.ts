import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { File } from 'src/app/models/file.model';


@Component({
    // tslint:disable-next-line: component-selector
    selector: 'app-layers',
    template: `
    <div class="wrapper" >
      <div class="window-body"></div>
      <div class="toolbar-title">Layers <div class="close" (click)="closeWindow();"><div></div></div></div>

      <!-- <ul class="layers" *ngIf="file.layers">
        <li *ngFor="let layer of file.layers" class="layer {{ layer.status }}" id="layer_{{ layer.id }}" name="layer.type">
          <div class="layer-visible-icon main-layer {{ layer.type }} {{ layer.visible }}" (click)="showLayer(layer.id);">
            <img class="visible-icon" src="./assets/icons/layers/visible-icon.svg">
          </div>
          <div class="disable-layer-icon main-layer {{ layer.type }} {{ layer.status }}" (click)="disableLayer(layer.id);">
            <img class="disable-icon" src="./assets/icons/layers/disable-layer.svg">
          </div>
          <div id="layer-colors">
            <div class="color" [ngStyle]="{'background': layer.colors[0].hash }"></div>
            <div class="color" [ngStyle]="{'background': layer.colors[1].hash }"></div>
          </div>
          <div class="layer-name main-layer" (dblclick)="onClick(layer.id)" (click)="selectLayer(layer.id)">{{ layer.name }}</div>
        </li>
      </ul> -->
      <div class="draggable-area layers"></div>
    </div>
    `,
    styles: [`

    /*layerwindow*/



    ul.layers {
        position: relative;
        list-style-type: none;
        width: calc(100% - 11px);
        display:inline-block;
        height: calc(100vh - 40px);
        box-sizing: border-box;
        margin: 5px;
        padding: 0;
        background: #3a3a3a;
        border: 1px solid #2c2c2c;
        user-select: none;
        overflow: hidden;
        cursor:default;
    }


    ul.layers li {
        position:relative;
        width:100%;
        display:inline-block;
        height: 26px;
        margin-bottom:0;
        float:left;
        box-sizing: border-box;
        border-bottom: 1px solid #2c2c2c;
        transition: background 0.3s ease;
    }

    ul.layers li.active {
        background: #505050;
    }

    ul.layers li ul {
        margin:0;
        padding:0;
        width: 100%;
        top:26px;
        height:52px;
        float:left;
        position:relative;
        list-style-type: none;
        /*border-top:1px solid #222;*/
        display:none;
    }

    /*ul.layers li ul li:last-child {*/
      /*border-bottom:none;*/
    /*}*/

    ul.layers li.open ul {
        display:inline-block;
        top:0;
    }


    .disable-layer-icon,
    .layer-lock-icon,
    .layer-visible-icon {
        display:inline-block;
        float:left;
        height: 26px;
        width: 26px;
        box-sizing: border-box;
        padding:0px 6px;
        margin:0;
        border-right: 1px solid #2c2c2c;
        overflow:hidden;
        z-index: 10;
    }


    ul.layers li.layer.open .layer-arrow {
        -ms-transform: rotate(90deg); /* IE 9 */
        -webkit-transform: rotate(90deg); /* Chrome, Safari, Opera */
        transform: rotate(90deg);
    }


    .layer-name {
        display: inline-block;
        position: absolute;
        height: 26px;
        width: calc(100% - 70px);
        box-sizing: border-box;
        top:0;
        left:70px;
        line-height: 26px;
        font-size: 10px;
        letter-spacing: 0.03em;
        color: #e0e0e0;
        padding: 0 15px 0 35px;
        margin:0;
    }
    .layer-name.main-layer {
        padding: 0 10px;
    }

    .draggable-area.layers {
        -webkit-app-region: drag;
        height:30px;
        width:220px;
        cursor: crosshair;
        display: inline-block;
        position: absolute;
        left:0;
        top:0;
        background: none;
        z-index: 1;
    }

    .layer-lock-icon {
        padding:1px 8.5px 0;
    }


    .layer-lock-icon img,
    .disable-icon,
    .visible-icon {
        opacity:0.2;
        width: 100%;
        height:auto;
        margin-top: -3px;
    }

    .layer.disabled .disable-icon,
    .layer-visible-icon.visible .visible-icon {
        opacity: 0.8;
    }
    .layer.disabled .layer-arrow {
        opacity: 0.2;
    }

      /*.disable-layer-icon:hover .disable-icon {*/
        /*opacity: 0.7;*/
      /*}*/
      /*.layer-visible-icon:hover .visible-icon {*/
        /*opacity: 0.7;*/
      /*}*/
      .layer.disabled .layer-visible-icon:hover .visible-icon {
          opacity: 0.2;
      }
      ul.layers li.disabled:hover {
          background: #333;
      }

      #layer-colors {
          display: inline-block;
          float:left;
          position: relative;
          width: 13px;
          height: 26px;
          border-right: 1px solid #222;
          box-sizing: border-box;
      }
      .color {
          display: inline-block;
          float:left;
          margin:2px 0 0 1px;
          width: 5px;
          height: 22px;
      }

      #color-true-1 {
        background: none!important;
      }

      .disable-layer-icon {
          padding: 1px 8px;
      }

   `]
})


export class LayersComponent implements OnInit {


    file: File;

    // tslint:disable-next-line: variable-name
    constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
                public fileService: FileService) {}


    public selectLayer(id: number) {
      // if (this.file.layers[id].status === 'inactive') {
      //   if (this.file.selectedLayer !== null) {
      //     if (this.file.layers[this.file.selectedLayer].status === 'active') {
      //       this.file.layers[this.file.selectedLayer].status = 'inactive';
      //     }
      //   }
      //   this.file.layers[id].status = 'active';
      //   this.file.selectedLayer = id;
      //   const obj = { layers: this.file.layers, selected: this.file.selectedLayer };
      //   this.electronService.ipcRenderer.send('updateLayers', obj);
      // }
    }

    public showLayer(id: number) {
      // if (this.file.layers[id].visible === 'visible') {
      //   this.file.layers[id].visible = 'hidden';
      // } else {
      //   this.file.layers[id].visible = 'visible';
      // }
      // const obj = { layers: this.file.layers, selected: this.file.selectedLayer };
      // this.electronService.ipcRenderer.send('updateLayers', obj);
    }

    public disableLayer(id: number) {
      // if (this.file.layers[id === 0 ? 1 : 0].status !== 'disabled') { // prevent disabling both layers at the same time
      //   if (this.file.layers[id].status !== 'disabled') {
      //     this.file.layers[id].status = 'disabled';
      //   } else {
      //     this.file.layers[id].status = 'inactive';
      //   }
      //   if (this.file.selectedLayer === id) {
      //     this.file.selectedLayer = this.file.selectedLayer === 0 ? 1 : 0;
      //     this.file.layers[this.file.selectedLayer].status = 'active';
      //   }
      //   const obj = { layers: this.file.layers, selected: this.file.selectedLayer };
      //   this.electronService.ipcRenderer.send('updateLayers', obj);
      // }
    }

    public closeWindow() {
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send('closeLayerWindow');
      }
    }

    public openLayerOptions(id: number) {
      // if (this.electronService.isElectronApp) {
      //   this.file.layers[id].options = true;
      //   const obj = { layers: this.file.layers, selected: this.file.selectedLayer };
      //   this.electronService.ipcRenderer.send('updateLayers', obj);
      //   this.electronService.ipcRenderer.send('openLayerOptionWindow');
      // }
    }



    onClick(id: number) {
      this.openLayerOptions(id);
    }

    ngOnInit(): void {
      this.document.body.classList.add('disable-scroll-body');
      this.file = this.fileService.getActiveFile();

      this.fileService.fileObservable.subscribe(files => {
        this.file = files.filter(f => f.isActive)[0];
      });
    }



}
