import { Bounds } from "./tensorflow.model";


export class TensorFlowConfig {

  dataSVG: any = null;
  scaleY: any;
  scaleX: any;

  bounds = new Bounds();

  width = (window.innerWidth - 470);
  height = (window.innerHeight * 0.55) - 120;

  margin = 30;

  xAxis: any;
  yAxis: any;

  updateHorizontalScreenDivision = false;
  updateVerticalScreenDivision = false;
  resultWindowVisible = true;

  horizontalScreenDivision = 220;
  verticalScreenDivision = 45;
}
