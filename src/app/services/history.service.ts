import { Injectable } from '@angular/core';
import { HistoryList, HistoryElement, HistoryConfig } from '../models/history.model';
import { File } from '../models/file.model';
import { NodeService } from './node.service';


@Injectable()
export class HistoryService {

  public config = new HistoryConfig();
  public file = new File(null, null, null);

  constructor(private nodeService: NodeService) { }

  redo() {
    const history = this.config.history.filter(h => h.fileId === this.file._id)[0];
    if (history) {
      if (history.index < history.list.length) {
        const updatedFile = this.updateFileData(history.list[history.index]);
        history.index ++;
        let enableButton = true;
        if (history.index >= history.list.length) {
          enableButton = false;
        }
        return { file: updatedFile, index: enableButton };
      }
    }
  }

  undo() {
    const history = this.config.history.filter(h => h.fileId === this.file._id)[0];
    if (history) {
      if (history.index >= 0) {
        const updatedFile = this.updateFileData(history.list[history.index]);
        history.index --;
        let enableButton = true;
        if (history.index < 0) {
          history.index = 0;
          enableButton = false;
        }
        return { file: updatedFile, index: enableButton };
      }
    }
  }

  addToHistory() {
    
  }

  updateFileData(historyEl: HistoryElement) {

    return this.file;
  }

  clearHistory() {
    this.config.history = [];
  }

  fileChanged() {
    return this.file.date.changed;
  }



}
