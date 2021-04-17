import { SliderDrawplane } from './drawing-plane-config.model';
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
  graphD3: any = null;

  constructor(text: string, value: number) {
    this.text = text;
    this.value = value;
  }
}

export class Config {
  scale = new Scale('100%', 100);
  zoom: any = null;
  yScale: any = null;
  xScale: any = null;
  newXscale: any = null;
  newYscale: any = null;
  xAxis: any = null;
  xAxisSmall: any = null;
  xAxisThicks: any = null;
  xAxisSmallThicks: any = null;
  slider = new SliderDrawplane();
  svg: any = null;
}

export class Collection {
  id: string = null;
  name: string = 'Sequence-1';
  general = new GeneralInfo();
  effects: Array<Effect> = [];
  microcontroller: MicroController = null;
  rotation = new Rotation();
  config = new Config();

  constructor(id: string) {
    this.id = id;
  }
}
