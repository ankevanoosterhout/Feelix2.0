import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { File } from 'src/app/models/file.model';
import { v4 as uuid } from 'uuid';
import { Router } from '@angular/router';
import { DrawingService } from 'src/app/services/drawing.service';
import { Collection } from 'src/app/models/collection.model';
import { Effect } from 'src/app/models/effect.model';


@Component({
  selector: 'app-file-settings',
  template: `
  <div class="window-title-bar" *ngIf="!this.updateMode">New File</div>
  <div class="window-title-bar" *ngIf="this.updateMode">Update File</div>
  <div class="window-content">
      <form>
          <div class="inputfield">
              <div class="form-row">
                  <label class="name">Name</label>
                  <input type="text" id="filename" [(ngModel)]="this.file.name" name="filename" (change)="updateFileName(this.file.name)">
              </div>
          </div>
          <div class="form-row buttons settings">
              <button (click)="close()">Cancel</button>
              <button id="submit" autofocus (click)="submit()" *ngIf="this.updateMode">Update</button>
              <button id="submit" autofocus (click)="submit()" *ngIf="!this.updateMode">Create</button>
          </div>
      </form>
    </div>
  `,
  styles: [`
    label.name {
      width: 70px !important;
    }
  `]
})

export class FileSettingsComponent implements OnInit {
  file: File;
  updateMode = false;
  mode = 'default';
  newFileCount = 1;

  buttonText = 'Create';
  initialUnits = { name: 'deg', PR: 360 };


  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              public fileService: FileService, public drawingService: DrawingService,
              private router: Router) {

    if (this.router.url === '/file-update-settings') {
      this.updateMode = true;
      this.buttonText = 'Update';
    }
  }

  public submit() {

    if (!this.updateMode) {
      this.fileService.updateActiveFile();
      this.electronService.ipcRenderer.send('updateNumberOfNewFiles');
      if (this.file.collections.length === 0) {
        this.file.collections.push(new Collection(uuid(), 'Collection-' + (this.file.collections.length + 1)));
      }
      if (this.file.effects.length === 0) {
        this.file.effects.push(new Effect(uuid()));
        this.file.activeEffect = this.file.effects[0];
      }
      this.fileService.add(this.file);
    } else {
      this.drawingService.setEditBounds();
      this.fileService.updateUnits(this.initialUnits, this.file.activeEffect.grid.xUnit);
    }
    this.close();
  }


  public close() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  updateFileName(filename: string) {
    let path = this.file.path.substring(0, this.file.path.lastIndexOf('\\'));
    path += filename + '.json';
    this.file.path = path;
    this.file.name = filename;
  }


  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
    if (this.updateMode) {
      this.file = this.fileService.getAllFileData();
    } else {
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send('getNumberOfNewFiles');
      }
      this.newFileCount = this.fileService.getFileCount();
      this.file = new File('Untitled-' + this.newFileCount, uuid(), false);
    }
  }
}

