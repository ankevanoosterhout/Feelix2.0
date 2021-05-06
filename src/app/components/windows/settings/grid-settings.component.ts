import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { File } from 'src/app/models/file.model';
import { DrawingService } from 'src/app/services/drawing.service';

@Component({
  selector: 'app-grid-settings',
  template: `<div class="window-body"></div>
  <div class="window-title-bar">Grid size</div>
  <div class="window-content">
    <div class="inputfield">
        <div class="form-row">
            <label class="select color">Color</label>
            <select class="form-control"
                required [(ngModel)]="file.activeEffect.grid.settings.color.hash" name="color">
                <option *ngFor="let item of colors" [ngValue]="item.hash">{{ item.name }}</option>
            </select>
        </div>

        <div class="inputfield-inset">
          <div class="inputfield-inset-title">Vertical gridlines</div>
          <div class="form-row">
              <label>grid line every</label>
              <input type="number" [(ngModel)]="file.activeEffect.grid.settings.spacingX" name="grid-spacingX" />
              <span class="span-text"> {{ this.file.activeEffect.grid.xUnit.name }}</span>
          </div>
          <div class="form-row">
              <label>subdivision</label>
              <input type="number" [(ngModel)]="file.activeEffect.grid.settings.subDivisionsX" name="subdivisionsX"/>
          </div>
        </div>

        <div class="inputfield-inset">
          <div class="inputfield-inset-title">Horizontal gridlines</div>
          <div class="form-row">
              <label>grid line every</label>
              <input type="number" [(ngModel)]="file.activeEffect.grid.settings.spacingY" name="grid-spacingY">
              <span class="span-text"> %</span>
          </div>
          <div class="form-row">
              <label>subdivision</label>
              <input type="number" [(ngModel)]="file.activeEffect.grid.settings.subDivisionsY" name="subdivisionsY">
          </div>
        </div>

        <div class="form-row" *ngIf="file.activeEffect.grid.xUnit.name === 'custom'">
          <label>Points per revolution</label>
          <input type="number" id="PR" name="PR" [(ngModel)]="file.activeEffect.grid.xUnit.PR">
        </div>

        <div class="form-row buttons">
          <button (click)="submit();">Ok</button>
          <button (click)="close();">Cancel</button>
        </div>
    </div>
  </div>`,
  styles: [`
    .span-text {
      padding-left: 10px;
    }
  `]
})
export class GridSettingsComponent implements OnInit {
  file: File;

  units = [
    { name: 'degrees', PR: 360 },
    { name: 'radians', PR: (2 * Math.PI) },
    { name: 'mm', PR: 100 },
    { name: 'cm', PR: 10 },
  ];

  colors = [
    { hash: '#666666', name: 'Gray' },
    { hash: '#00ffff', name: 'Cyan' },
    { hash: '#ec008c', name: 'Magenta' },
    { hash: '#ed1c24', name: 'Red' },
    { hash: '#ec008c', name: 'Magenta' },
    { hash: '#005baa', name: 'Blue' },
    { hash: '#fff200', name: 'Yellow' },
    { hash: '#000000', name: 'Black' }
  ];
  // tslint:disable-next-line: variable-name
  constructor(private electronService: ElectronService, public fileService: FileService, private drawingService: DrawingService) { }

  public submit() {
    // if (this.selectedUnit.name !== this.file.grid.xUnit.name) {
    //   const oldUnits = this.file.grid.xUnit;
    //   this.file.rotation.end = Math.round(this.file.rotation.end * (this.file.grid.xUnit.PR / this.selectedUnit.PR));
    //   this.file.rotation.start = Math.round(this.file.rotation.start * (this.file.grid.xUnit.PR / this.selectedUnit.PR));
    //   this.drawingService.setEditBounds(this.file.mode);
    //   this.fileService.updateUnits(oldUnits, this.selectedUnit, this.file);
    // }
    this.fileService.update(this.file);
    this.close();
  }

  public close() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  ngOnInit(): void {
    this.file = this.fileService.getActiveFile();
  }
}
