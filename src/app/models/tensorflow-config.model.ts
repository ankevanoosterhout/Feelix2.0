

export class TensorFlowConfig {

  dataSVG: any = null;
  scaleY: any;
  scaleX: any;

  xMin = 0;
  xMax = 10000;
  yMin = -4;
  yMax = 4;

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

  rulerWidth = 13;
}
