import { Component, Input, OnInit, Inject } from '@angular/core';
import { FileService } from 'src/app/services/file.service';
import { File } from '../../models/file.model';
import { MatDialog } from '@angular/material/dialog';
import { DOCUMENT } from '@angular/common';
import { v4 as uuid } from 'uuid';
import { Effect } from 'src/app/models/effect.model';
import { ElectronService } from 'ngx-electron';
import { DataService } from 'src/app/services/data.service';


@Component({
    selector: 'app-effect-list',
    template: `
      <div class="open-tabs effects" id="effect-tabs">
        <ul class="tabs effects" id="effect-list">
          <li *ngFor="let tab of file.configuration.openTabs" [ngClass]="{ active: tab.isActive }"  (click)="selectTab(tab)">
            <div class="filename-tab">{{ tab.name }}</div>
            <div class="close closeTab effects" (click)="closeTab(tab)"><div></div></div>
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

export class EffectListComponent implements OnInit {

  // tslint:disable-next-line: variable-name
  public _list = '';

  public file: File;
  delete: boolean;

  folder: string[];
  rulerVisible = false;

  public scrollTab = false;

  constructor(@Inject(DOCUMENT) private document: Document, public fileService: FileService, public dialog: MatDialog, private electronService: ElectronService,
    private dataService: DataService) {}

  @Input()
  set list(list: string) {
    this._list = (list && list.trim()) || '';
  }

  ngOnInit(): void {
    this.file = this.fileService.getActiveFile();
    this.scrollVisible(window.innerWidth);

    this.fileService.fileObservable.subscribe(files => {
      this.file = files.filter(f => f.isActive)[0];
      this.scrollVisible(window.innerWidth - 45);
    });
  }

  selectTab(tab: any) {
    const effect = this.file.effects.filter(e => e.id === tab.id)[0];
    if (effect) {
      this.fileService.setEffectActive(effect);
      this.dataService.deselectAll();
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send('updateMenu', {
          visible: effect.grid.visible,
          snap: effect.grid.snap,
          lock: effect.grid.lockGuides
        });
      }

    }
  }

  closeTab(tab: any) {
    this.fileService.closeEffectTab(tab.id);
  }


  scroll(direction: number) {
    const offset = this.document.getElementById('effect-list').offsetLeft;
    const newOffset = offset + (75 * direction);
    const availableSpace = Math.floor(window.innerWidth / 155);
    if (newOffset <= 0 && newOffset > (this.file.effects.length - availableSpace) * -155) {
      this.document.getElementById('effect-list').style.marginLeft = newOffset + 'px';
    }
  }

  scrollVisible(window: number) {
    if ((this.file.effects.length * 155) > window) {
      this.scrollTab = true;
    } else {
      this.scrollTab = false;
    }
  }

}
