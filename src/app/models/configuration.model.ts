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

export class effectTypeColor {
  type: string;
  hash: string;

  constructor(type: string, hash: string) {
    this.type = type;
    this.hash = hash;
  }
}

export class Configuration {
  activeEffect: any = null;
  horizontalScreenDivision = 35;
  verticalScreenDivision = 70;
  collectionDisplay = 'large';
  openTabs: Array<OpenTab> = [];
  rendered = false;
  libraryViewSettings = 'large-thumbnails';
  sortType = 'date-modified';
  sortDirection = 'first-last';
  colors: Array<effectTypeColor> =
    [ new effectTypeColor('torque', '#0f4d9d'),
      new effectTypeColor('velocity', '#ed1a75'),
      new effectTypeColor('position', '#d94313') ];
}
