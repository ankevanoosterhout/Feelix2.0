export class ScrollOffset {
  id: string = null;
  value = 0;

  constructor(id: string) {
    this.id = id;
  }
}

export class OpenTab {
  id: string = null;
  isActive = false;
  name: string = null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}

export class Configuration {
  activeEffect: any = null;
  horizontalScreenDivision = 35;
  verticalScreenDivision = 70;
  collectionDisplay = 'large';
  openTabs: Array<OpenTab> = [];
  rendered = false;
}
