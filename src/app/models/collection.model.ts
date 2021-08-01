import { SliderDrawplane } from './drawing-plane-config.model';
import { Details, Effect } from './effect.model';
import { MicroController, Unit } from './hardware.model';

export class Rotation {
  start = 0;
  end = 360;
  units = new Unit('degrees', 360);
  linear = false;
  loop = false;
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

export class Layer {
  name: string = null;
  visible = true;
  locked = false;

  constructor(name: string) {
    this.name = name;
  }
}

export class Collection {
  id: string = null;
  name: string = 'Sequence-1';
  effects: Array<Details> = [];
  microcontroller: MicroController = null;
  motorID: string = 'A';
  rotation = new Rotation();
  config = new Config();
  visualizationType = 'torque';
  layers = [ new Layer('CW'), new Layer('CCW') ];
  overlappingData = [];
  effectDataList = [];
  renderedData = [];

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
}
