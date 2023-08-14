export enum EffectType {
  torque = 0,
  position = 1,
  velocity = 2,
  pneumatic = 3,
  midi = 4
};


export const EffectTypeLabelMapping: Record<EffectType, string> = {
  [EffectType.torque]: 'torque',
  [EffectType.position]: 'position',
  [EffectType.velocity]: 'velocity',
  [EffectType.pneumatic]: 'pneumatic',
  [EffectType.midi]: 'midi'
};


export class ScrollOffset {
  id: string = null;
  value = 0;

  constructor(id: string) {
    this.id = id;
  }
};

export class OpenTab {
  id: string = null;
  isActive = false;
  name: string = null;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
};

export class EffectTypeColor {
  type: EffectType;
  hash: Array<string>;


  constructor(type: EffectType, hash: Array<string>) {
    this.type = type;
    this.hash = hash;
  }
};

export class Configuration {
  horizontalScreenDivision = 35; //35
  verticalScreenDivision = 70; //70
  collectionDisplay = 'large';
  collectionDisplayTranslation = 'linear';
  openTabs: Array<OpenTab> = [];
  rendered = false;
  libraryViewSettings = 'large-thumbnails';
  sortType = 'date-modified';
  sortDirection = 'first-last';
  colors: Array<EffectTypeColor> =
    [ new EffectTypeColor(EffectType.torque, ['#0f4d9d']),
      new EffectTypeColor(EffectType.velocity, ['#ed1a75']),
      new EffectTypeColor(EffectType.position, ['#d94313', '#d5afaf']),
      new EffectTypeColor(EffectType.pneumatic, ['#37DEF8']),
      new EffectTypeColor(EffectType.midi, ['#0f4d9d']),
    ];
};
