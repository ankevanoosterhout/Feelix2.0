export class HistoryEffects {
  id: string = null;
  effects: Array<any> = [];
  index = 0;

  constructor(id: string) {
    this.id = id;
  }
}



export class HistoryListElement {
  fileId: string = null;
  list: Array<HistoryEffects> = [];

  constructor(fileId: string, list: Array<HistoryEffects>) {
    this.fileId = fileId;
    this.list = list;
  }
}


export class HistoryConfig {
  history: Array<HistoryListElement> = [];

  constructor() {}
}


