import { Path } from './node.model';

export class HistoryElement {
  nodes: Array<Path> = [];
  effects: Array<any> = [];
  timeEffects: Array<any> = [];
  frames: any = null;
  moduleTabs: Array<any> = [];
  layers = [];
  guides = [];

  constructor(nodes: Array<Path>) {
    this.nodes = nodes;
  }
}

export class HistoryList {
  fileId: string = null;
  list: Array<HistoryElement> = [];
  index = 0;

  constructor(fileId: string, list: Array<HistoryElement>) {
    this.fileId = fileId;
    this.list = list;
  }
}

export class HistoryConfig {
  history: Array<HistoryList> = [];

  constructor() {}
}

