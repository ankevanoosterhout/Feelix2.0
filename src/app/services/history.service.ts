import { Injectable } from '@angular/core';
import { HistoryConfig, HistoryEffects, HistoryListElement } from '../models/history.model';
import { File } from '../models/file.model';
import { ElectronService } from 'ngx-electron';
import { CloneService } from './clone.service';
import { Subject } from 'rxjs';


@Injectable({providedIn: 'root'})
export class HistoryService {

  public config = new HistoryConfig();
  public file = new File(null, null, null);

  reloadFileData: Subject<any> = new Subject();

  constructor(private electronService: ElectronService, private cloneService: CloneService) {

    this.electronService.ipcRenderer.on('undo', (event: Event) => {
      const data = this.undo();
      if (data) {
        this.reloadFileData.next(data);
      }
    });

    this.electronService.ipcRenderer.on('redo', (event: Event) => {
      const data = this.redo();
      if (data) {
        this.reloadFileData.next(data);
      }
    });
  }

  redo() {
    const history = this.config.history.filter(h => h.fileId === this.file._id)[0];
    if (history) {
      const list = history.list.filter(l => l.id === this.file.activeEffect.id)[0];
      if (list && list.index < list.effects.length) {
        const updatedFile = this.updateFileData(list.effects[list.index]);
        list.index ++;
        let enableButton = true;
        if (list.index >= list.effects.length) {
          enableButton = false;
        }
        return { file: updatedFile, enable: enableButton, type: 'redo' };
      }
    }
    return;
  }

  undo() {
    const history = this.config.history.filter(h => h.fileId === this.file._id)[0];
    if (history) {
      const list = history.list.filter(l => l.id === this.file.activeEffect.id)[0];
      if (list && list.index >= 0) {
        const updatedFile = this.updateFileData(list.effects[list.index]);
        list.index --;
        let enableButton = true;
        if (list.index < 0) {
          list.index = 0;
          enableButton = false;
        }
        return { file: updatedFile, enable: enableButton, type: 'undo' };
      }
    }
    return;
  }

  addToHistory() {
    const effect = this.cloneService.deepClone(this.file.activeEffect);

    const historyDataFile = this.config.history.filter(h => h.fileId === this.file._id)[0] || new HistoryListElement(this.file._id, []);
    const effectList = historyDataFile.list.filter(l => l.id === effect.id)[0] || new HistoryEffects(effect.id);

    effectList.effects.push(effect);
    if (effectList.index < 30) {
      effectList.index ++;
    } else {
      effectList.effects.shift();
    }

    if (historyDataFile.list.filter(l => l.id === effect.id).length === 0) {
      historyDataFile.list.push(effectList);
    }

    if (this.config.history.filter(h => h.fileId === this.file._id).length === 0) {
      this.config.history.push(historyDataFile);
    }
  }

  updateFileData(historyEl: any) {
    if (historyEl) {
      if (this.file.activeEffect.id === historyEl.id) {
        this.file.activeEffect = this.cloneService.deepClone(historyEl);
        return this.file;
      }
    }
    return;
  }

  clearHistory() {
    this.config.history = [];
  }

  fileChanged() {
    return this.file.date.changed;
  }

  clearHistoryFile(id: string) {
    const historyFile = this.config.history.filter(h => h.fileId === id)[0];
    if (historyFile) {
      const index = this.config.history.indexOf(historyFile);
      if (index > -1) {
        this.config.history.splice(index, 1);
      }
    }
  }

  clearHistoryEffect(id: string) {
    const historyFile = this.config.history.filter(h => h.fileId === this.file._id)[0];
    if (historyFile) {
      const effect = historyFile.list.filter(e => e.id === id)[0];
      if (effect) {
        const index = historyFile.list.indexOf(effect);
        if (index > -1) {
          historyFile.list.splice(index, 1);
        }
      }
    }
  }
}
