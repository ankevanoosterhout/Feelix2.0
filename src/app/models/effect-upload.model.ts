import { Color } from './colors.model';

export class Linear {
  Ymin: number = null;
  Ymax: number = null;
  Xmin: number = null;
  Xmax: number = null;
  dYdX: number = null;
}


export class EffectUploadModel {
  id: string = null;
  playAfterUpload = false;
  effectID: string = null;
  quality: number = null;
  name: string = null;
  index: number = null;
  treeIndex = 0;
  position: number = null;
  angle: number = null;
  scaleX = 1.0;
  scaleY = 1.0;
  direction = 0;
  repeat: Array<number> = [];
  mirror = false;
  enabled = true;
  loop = false;
  startTime = 0;
  translatedData: Array<any> = [];
  slug: number = null;
  linear = new Linear();
  infinite = false;
  colors: Array<Color> = [];
  layer = 0;
  overlapping = 0;
  offsetX = 0;
  offsetY = 0;

  constructor(id: string, effectID: string) {
    this.id = id;
    this.effectID = effectID;
  }
}
