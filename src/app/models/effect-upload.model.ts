import { Collection } from './collection.model';
import { Details, Effect } from './effect.model';
import { MicroController } from './hardware.model';

export class Linear {
  Ymin: number = null;
  Ymax: number = null;
  Xmin: number = null;
  Xmax: number = null;
  dYdX: number = null;
}


// export class EffectUploadModel {
//   id: string = null;
//   playAfterUpload = false;
//   effectID: string = null;
//   quality: number = null;
//   name: string = null;
//   index: number = null;
//   treeIndex = 0;
//   position: number = null;
//   angle: number = null;
//   scaleX = 1.0;
//   scaleY = 1.0;
//   direction = 0;
//   repeat: Array<number> = [];
//   mirror = false;
//   enabled = true;
//   loop = false;
//   startTime = 0;
//   translatedData: Array<any> = [];
//   slug: number = null;
//   linear = new Linear();
//   infinite = false;
//   colors: Array<Color> = [];
//   layer = 0;
//   overlapping = 0;
//   offsetX = 0;
//   offsetY = 0;

//   constructor(id: string, effectID: string) {
//     this.id = id;
//     this.effectID = effectID;
//   }
// }

export class Model {
  identifier: string;
  value: any;

  constructor(identifier: string, value: any) {
    this.identifier = identifier;
    this.value = value;
  }
}

export class ConfigModel {



  constructor(collection: Collection, microcontroller: MicroController) {

  }
}

export class EffectModel {
  position: Model = null;
  scale: Model = null;
  flip: Model = null;
  direction: Model = null;
  infinite: Model = null;

  constructor(collEffect: Details) {
    this.position = new Model('P', [ collEffect.position.x, collEffect.position.y ]);
    this.scale = new Model('S', [ collEffect.scale.x, collEffect.scale.y ]);
    this.flip = new Model('F', [ collEffect.flip.x, collEffect.flip.y ]);
    this.direction = new Model('D', [ (collEffect.direction === 'any' || collEffect.direction === 'clockwise' ? true : false),
      (collEffect.direction === 'any' || collEffect.direction === 'counterclockwise' ? true : false) ]);
    this.infinite = new Model ('I', collEffect.infinite);
  }
}

export class DataModel {
  overlay: Array<any>;
  effectData: Array<any>;

  constructor(effectData: Array<any>, overlay: Array<any>) {
    this.effectData = effectData;
    this.overlay = overlay;
  }
}


export class UploadModel {
  effects: Array<EffectModel> = [];
  config: ConfigModel = null;
  data: DataModel = null;

  constructor(collection: Collection, microcontroller: MicroController) {
    for (const effect of collection.effects) {
      const effectModel = new EffectModel(effect);
      this.effects.push(effectModel);
    }
    this.config = new ConfigModel(collection, microcontroller);
    this.data = new DataModel(collection.effectDataList, collection.renderedData);
  }

}
