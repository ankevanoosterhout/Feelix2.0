import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { File } from 'src/app/models/file.model';

@Component({
  selector: 'app-layer-option',
  template: `
  <div class="window-body"></div>
  <div class="window-title-bar">Layer options</div>
  <div class="window-content">
    <div class="inputfield">
      <div class="form-row">
        <label>Name</label>
        <!-- <input type="text" name="layerName" [(ngModel)]="file.layers[layerID].name"> -->
      </div>

      <div class="form-row">
        <label class="select color">{{ name[0] }}</label>
        <!-- <select class="form-control" id="selectColor"
            required
            [(ngModel)]="file.layers[layerID].colors[0].hash" name="color1">
            <option *ngFor="let col of colorOptions" [ngValue]="col.hash">{{ col.name }}</option>
        </select> -->
      </div>

      <div class="form-row">
        <label class="select color">{{ name[1] }}</label>
        <!-- <select class="form-control" id="selectColor"
            required
            [(ngModel)]="file.layers[layerID].colors[1].hash" name="color2">
            <option *ngFor="let col of colorOptions" [ngValue]="col.hash">{{ col.name }}</option>
        </select> -->
      </div>

      <div class="form-row buttons">
        <button id="cancel" (click)="cancel();">Cancel</button>
        <button id="submit" autofocus (click)="submit();">Ok</button>
      </div>

    </div>
  </div>

    `,
    styles: [``]
})


export class LayerOptionComponent implements OnInit {


  file: File;
  layerID = 0;
  name = [ 'Force intensity', 'Force angle' ];

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              public fileService: FileService) { }

  colorOptions = [
    { name: 'Light Gray', hash: '#dddddd' },
    { name: 'Cyan', hash: '#00c9cc' },
    { name: 'Red', hash: '#ed1a75'  },
    { name: 'Blue', hash: '#005baa' },
    { name: 'Yellow', hash: '#fff200' },
    { name: 'Black', hash: '#000000' },
  ];

  submit() {
    // this.electronService.ipcRenderer.send('updateLayerColors', { layer: this.layerID, colors: this.file.layers[this.layerID].colors });
    this.cancel();
  }

  cancel() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
    this.file = this.fileService.files.filter(f => f.isActive)[0];
    // const layerDetails = this.file.layers.filter(l => l.options === true)[0];
    // this.layerID = layerDetails.id;
    // this.file.layers[this.layerID].options = false;
  }
}
