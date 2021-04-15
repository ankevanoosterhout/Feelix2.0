import { Margin, SliderDrawplane } from './drawing-plane-config.model';
import { Scale } from './node.model';

export class Size {
  width: number = null;
  height: number = null;
  offsetX: number = null;
  offsetY: number = null;
}

export class FeelixioConfig {
  svg: any;
  fieldSVG: any;
  svgDx = window.innerWidth - 300;
  svgDy = window.innerHeight - 66;
  margin = new Margin();
  chartDx: number;
  chartDy: number;
  zoom: any;
  tmpEffect: any;
  componentSVG: any;
  connectionSVG: any;
  linesSVG: any;
  activeInput = false;
  activeConnection = null;
  activeLink = null;
  activeComponent = null;
  t: any = null;
}
