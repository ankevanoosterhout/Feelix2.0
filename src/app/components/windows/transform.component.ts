import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { File } from 'src/app/models/file.model';

@Component({
  selector: 'app-transform',
  template: `
  <div class="window-title-bar">Move</div>
  <div class="window-content">
      <div class="inputfield">
        <div class="inputfield-inset">
          <div class="inputfield-inset-title">Position</div>
          <div class="form-row">
              <label>Horizontal</label>
              <input type="number" id="horizontal" [(ngModel)]="parameters.horizontal" name="horizontal">
              <span class="span-text">{{ units.name }}</span>
          </div>
          <div class="form-row">
              <label>Vertical</label>
              <input type="number" id="vertical" [(ngModel)]="parameters.vertical" name="vertical">
              <span class="span-text">{{ units.name }}</span>
          </div>
      </div>
      <label class="checkbox-container preview">Preview
          <input type="checkbox" id="preview" name="preview"
          [(ngModel)]="parameters.preview"
          (change)="preview();" [checked]="parameters.preview">
          <span class="checkmark checkbox"></span>
      </label>
      <div class="form-row buttons side">
          <button (click)="submit('copy');">Copy</button>
          <button (click)="submit('move');">Ok</button>
          <button (click)="close();">Cancel</button>
      </div>
  </div>`,
  styles: [``]
})
export class TransformComponent implements OnInit {

  file: File;
  units = { name: 'degrees', PR: 360 };
  moved = false;

  parameters = {
    horizontal: 0,
    vertical: 0,
    type: '',
    preview: false,
    tmp: false
  };

  // tslint:disable-next-line: variable-name
  constructor(private electronService: ElectronService, private fileService: FileService) { }

  submit(type: string) {
    this.parameters.type = type;
    this.parameters.tmp = false;
    if (!this.parameters.preview && type === 'move' || type === 'copy') {
      this.electronService.ipcRenderer.send('transform', this.parameters);
    } else {
      this.electronService.ipcRenderer.send('closeTransformWindow');
    }
  }

  close() {
    this.parameters.tmp = false;
    if (this.parameters.preview) {
      this.parameters.horizontal *= -1;
      this.parameters.vertical *= -1;
      this.electronService.ipcRenderer.send('transform', this.parameters);
    } else {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  preview() {
    this.parameters.type = 'preview';
    this.parameters.tmp = true;
    this.electronService.ipcRenderer.send('transform', this.parameters);
  }

  ngOnInit(): void {
    this.file = this.fileService.getActiveFile();
    // this.units = this.file.grid.units;
  }
}
