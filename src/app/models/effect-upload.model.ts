import { Collection } from './collection.model';
import { Details, Effect } from './effect.model';
import { MicroController, Motor } from './hardware.model';

export class Linear {
  Ymin: number = null;
  Ymax: number = null;
  Xmin: number = null;
  Xmax: number = null;
  dYdX: number = null;
}



export class Model {
  identifier: string;
  value: any;

  constructor(identifier: string, value: any) {
    this.identifier = identifier;
    this.value = value;
  }
}

export class ConfigModel {
  serialPort: any;
  motor: Motor;
  vendor: string;
  updateSpeed: number;
  baudrate: number;
  collection: string;

  constructor(collection: Collection, microcontroller: MicroController) {
    this.serialPort = microcontroller.serialPort;
    this.motor = microcontroller.motors.filter(m => m.id === collection.motorID)[0];
    this.vendor = microcontroller.vendor;
    this.updateSpeed = microcontroller.updateSpeed;
    this.baudrate = microcontroller.baudrate;
    this.collection = collection.id;
  }
}

export class EffectModel {
  id: String = null;
  position: Model = null;
  angle: Model = null;
  scale: Model = null;
  flip: Model = null;
  direction: Model = null;
  infinite: Model = null;
  repeat: Model = null;
  vis_type: Model = null;
  effect_type: Model = null;
  datasize: Model = null;

  constructor(collEffect: Details, effect: any) {
    this.id = effect.id;
    this.position = new Model('P', [ Math.round(collEffect.position.x) !== collEffect.position.x ? collEffect.position.x.toFixed(5) : collEffect.position.x,
      Math.round(collEffect.position.y) !== collEffect.position.y ? (collEffect.position.y / 100).toFixed(5) : (collEffect.position.y / 100) ]);

    this.angle = new Model('A', (effect.data.length - 1) * (collEffect.scale.x / 100));

    this.scale = new Model('S', [ Math.round(collEffect.scale.x) !== collEffect.scale.x ? (collEffect.scale.x / 100).toFixed(5) : (collEffect.scale.x / 100),
      Math.round(collEffect.scale.y) !== collEffect.scale.y ? (collEffect.scale.y / 100).toFixed(5) : (collEffect.scale.y / 100) ]);

    this.flip = new Model('F', [ collEffect.flip.x ? 1 : 0, collEffect.flip.y ? 1 : 0 ]);

    this.direction = new Model('D', [ (collEffect.direction === 'any' || collEffect.direction === 'clockwise' ? 1 : 0),
      (collEffect.direction === 'any' || collEffect.direction === 'counterclockwise' ? 1 : 0) ]);

    this.infinite = new Model ('I', collEffect.infinite ? 1 : 0);

    this.datasize = new Model ('Z', effect.data.length);

    if (effect.type === 'torque') {
      this.vis_type = new Model('T', 'T');
    } else if (effect.type === 'position') {
      this.vis_type = new Model('T', 'P');
    } else if (effect.type === 'velocity') {
      this.vis_type = new Model('T', 'V');
    }

    this.effect_type = new Model('E', effect.rotation === 'dependent' ? 'D' : 'I');

    if (collEffect.repeat.repeatInstances.length > 0) {
      this.repeat = new Model('R', collEffect.repeat.repeatInstances);
    }
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
    for (const collEffect of collection.effects) {
      const effectData = collection.effectDataList.filter(e => e.id === collEffect.effectID)[0];
      if (effectData && effectData.data.length > 0) {
        const effectModel = new EffectModel(collEffect, effectData);
        this.effects.push(effectModel);
      }
    }
    this.config = new ConfigModel(collection, microcontroller);
    this.data = new DataModel(collection.effectDataList, collection.renderedData);
  }

}
