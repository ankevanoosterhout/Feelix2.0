import { Component, Input, OnInit, Inject } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { File } from '../../models/file.model';
import { MatDialog } from '@angular/material/dialog';
import { DOCUMENT } from '@angular/common';
import { v4 as uuid } from 'uuid';
import { Effect } from 'src/app/models/effect.model';


@Component({
    selector: 'app-effect-list',
    template: `
      <div class="open-tabs effects" id="effect-tabs">
        <ul class="tabs effects" id="file-list">
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

  constructor(@Inject(DOCUMENT) private document: Document, public fileService: FileService,
              private electronService: ElectronService, public dialog: MatDialog) {}

  @Input()
  set list(list: string) {
    this._list = (list && list.trim()) || '';
  }

  ngOnInit(): void {
    this.file = this.fileService.getActiveFile();
    this.scrollVisible(window.innerWidth);
    if (this.file.effects.length < 1) {
      this.fileService.addEffect(new Effect(uuid()));
      this.fileService.store();
      this.file = this.fileService.getActiveFile();
    }
    this.fileService.fileObservable.subscribe(files => {
      this.file = files.filter(f => f.isActive)[0];
      this.scrollVisible(window.innerWidth - 45);
    });
  }

  selectTab(tab: any) {
    const effect = this.file.effects.filter(e => e.id === tab.id)[0];
    if (effect) {
      this.fileService.setEffectActive(effect);
    }
  }

  closeTab(tab: any) {
    this.fileService.closeEffectTab(tab.id);
    // // if (file.date.changed) {
    // const dialogConfig = this.dialog.open(DialogComponent, {
    //   width: '380px',
    //   data: { message: 'Save changes to "' + effect.name + '" before closing?', buttons: ['cancel', 'yes', 'no'] },
    //   disableClose: true,
    //   autoFocus: true,
    //   panelClass: 'custom-modalbox'
    // });

    // dialogConfig.afterClosed().subscribe(
    //     data => {
    //       if (data === 'no') {
    //         this.fileService.delete(effect);
    //       } else if (data === 'yes') {
    //         // this.saveEffectData(file, true);
    //       } else {
    //         return false;
    //       }
    //     }
    // );
  }


  saveEffectData(effect: Effect, close = false) {
    // this.fileService.saveEffect(effect, close);
  }


  scroll(direction: number) {
    const offset = this.document.getElementById('file-list').offsetLeft;
    const newOffset = offset + (75 * direction);
    const availableSpace = Math.floor(window.innerWidth / 155);
    if (newOffset <= 0 && newOffset > (this.file.effects.length - availableSpace) * -155) {
      this.document.getElementById('file-list').style.marginLeft = newOffset + 'px';
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
