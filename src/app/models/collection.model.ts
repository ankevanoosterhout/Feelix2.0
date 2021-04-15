import { Effect } from './effect.model';
import { MicroController } from './hardware.model';

export class Rotation {
  start = 0;
  end = 360;
  linear = false;
  loop = false;
}

export class GeneralInfo {
  rotation = new Rotation();
}

// export class Layer {
//   id = 0;
//   type = 'cw';
//   name = 'clockwise rotation';
//   visible = 'visible';
//   status = 'active';
//   colors: Array<Color> = [];
//   options = false;

//   constructor(id: number, type: string, name: string, status: string, visible: string) {
//     this.id = id;
//     this.type = type;
//     this.name = name;
//     this.status = status;
//     this.visible = visible;
//   }
// }
export class Scale {
  text: string = null;
  value: number = null;

  constructor(text: string, value: number) {
    this.text = text;
    this.value = value;
  }
}

export class Collection {
  id: string = null;
  name: string = 'Sequence-1';
  general = new GeneralInfo();
  effects: Array<Effect> = [];
  microcontroller: MicroController = null;
  rotation = new Rotation();
  scale = new Scale('100%', 100);

  constructor(id: string) {
    this.id = id;
  }
}
