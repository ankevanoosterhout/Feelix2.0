import { Component, Input, OnInit, Inject } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { File } from '../../models/file.model';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from '../windows/dialog.component';
import { DOCUMENT } from '@angular/common';
import { v4 as uuid } from 'uuid';


@Component({
    selector: 'app-file-list',
    template: `
      <div class="open-tabs {{ _list }}">
        <ul class="tabs {{ _list }}" id="file-list">
          <li *ngFor="let file of files" [ngClass]="{ active: file.isActive }"  (click)="selectTab(file);">
            <div class="filename-tab">
              {{ file.name }}
              <div class="saved" *ngIf="file.date.changed"> *</div>
            </div>
            <div class="close closeTab" (click)="closeTab(file);"><div></div></div>
          </li>
        </ul>
        <div class="scroll-arrows" *ngIf="this.scrollTab">
          <div (click)="scroll(-1)" class="arrow-left"><div class="arrow left"></div></div>
          <div (click)="scroll(1)" class="arrow-right"><div class="arrow right"></div></div>
        </div>
      </div>
    `,
    styleUrls: ['./file-list.component.css'],
})

export class FileListComponent implements OnInit {

  // tslint:disable-next-line: variable-name
  public _list = '';

  public files = [];
  delete: boolean;

  folder: string[];
  rulerVisible = false;

  public scrollTab = false;

  constructor(@Inject(DOCUMENT) private document: Document, public fileService: FileService,
              private electronService: ElectronService, public dialog: MatDialog) {

    this.electronService.ipcRenderer.on('saveActiveFile', (event: Event, type: any) => {
      const activeFile = this.fileService.getAllFileData();

      if (activeFile.overwrite) { // prevent overwrite example files
        const data = {
          file: activeFile,
          overwrite: type,
          newId: uuid(),
          extension: '.feelix'
        };
        this.electronService.ipcRenderer.send('saveFile', data);
      }
    });

    this.electronService.ipcRenderer.on('updatedFile', (event: Event, data: any) => {
      if (data.type === 'add') {
        this.fileService.add(data.file);
      } else if (data.type === 'update') {
        this.fileService.update(data.file, false);
      }
    });
  }

  @Input()
  set list(list: string) {
    this._list = (list && list.trim()) || '';
  }

  ngOnInit(): void {
    this.files = this.fileService.getAll();
    this.scrollVisible(window.innerWidth);
    if (this.files.length < 1) {
      this.fileService.createDefault('Untitled-1');
      this.fileService.store();
      this.files = this.fileService.getAll();
    }
    this.fileService.fileObservable.subscribe(files => {
      this.files = files;
      this.scrollVisible(window.innerWidth);
    });
  }

  selectTab(file: any) {
    this.fileService.setActive(file);
  }

  closeTab(file: any) {

    // if (file.date.changed) {
    const dialogConfig = this.dialog.open(DialogComponent, {
      width: '380px',
      data: { message: 'Save changes to "' + file.name + '" before closing?', buttons: ['cancel', 'yes', 'no'] },
      disableClose: true,
      autoFocus: true,
      panelClass: 'custom-modalbox'
    });

    dialogConfig.afterClosed().subscribe(
        data => {
          if (data === 'no') {
            this.fileService.delete(file);

          } else if (data === 'yes') {
            this.saveFileData(file, true);
          } else {
            return false;
          }
        }
    );
  }


  saveFileData(file: File, close = false) {
    this.fileService.save(file, close);
  }


  scroll(direction: number) {
    const offset = this.document.getElementById('file-list').offsetLeft;
    const newOffset = offset + (75 * direction);
    const availableSpace = Math.floor(window.innerWidth / 155);
    if (newOffset <= 0 && newOffset > (this.files.length - availableSpace) * -155) {
      this.document.getElementById('file-list').style.marginLeft = newOffset + 'px';
    }
  }

  scrollVisible(window: number) {
    if ((this.files.length * 155) > window) {
      this.scrollTab = true;
    } else {
      this.scrollTab = false;
    }
  }

}
