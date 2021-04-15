import { Cursor } from './tool.model';
import { Node } from './node.model';


export class Margin {
  top: number = null;
  right: number = null;
  bottom: number = null;
  left: number = null;
  offsetTop: number = null;
}

export class EditBounds {
  xMin: number = null;
  xMax: number = null;
  yMin: number = null;
  yMax: number = null;

  constructor(xMin: number, xMax: number, yMin: number, yMax: number) {
    this.xMin = xMin;
    this.xMax = xMax;
    this.yMin = yMin;
    this.yMax = yMax;
  }
}

export class Coords {
  x: number = null;
  y: number = null;
}

export class Clipboard {
  empty = true;
  guides: Array<string> = [];
}

export class Slider {
  min: number = null;
  max: number = null;
}

export class ReferenceBox {
  inner = new Slider();
  outer = new Slider();
  ratio = 0.8;
}

export class SliderDrawplane {
  inner = new Slider();
  outer = new Slider();
  ratio = 0.8;
}


export class DrawingPlaneConfig {
  rulerVisible = true;
  rulerWidth = 13;
  drawRulerAxis: string = null;
  cursor = new Cursor(null, null, null, null, null, null, null , null);
  mouseDown = new Coords();
  mouseMove = new Coords();
  newNode: Node = null;
  newNodePlaced = false;

  svg: any;
  nodesSVG: any;
  forceNodeSVG: any;
  pathSVG: any;
  planeSVG: any;
  cpSVG: any;
  bbox: any;
  stepSVG: any;
  steplinesSVG: any;
  gridSVG: any;
  fplSVG: any;
  svgDx = innerWidth;
  svgDy = innerHeight;
  margin = new Margin();
  chartDx: number;
  chartDy: number;
  toolbarOffset = 45;
  motorControlToolbarOffset = 45;
  editBounds = new EditBounds(0, 360, 0, 100);
  yScale: any;
  xScale: any;
  zoom: any;
  zoomable = false;
  xAxis: any;
  xAxisBottom: any;
  xAxisSmallTicks: any;
  xAxisBottomSmallTicks: any;
  yAxisSVG: any;
  clipboard = new Clipboard();
  selectionStartPoint: any = null;
  activeSelection = false;
  containerBox: any;
  startPosBox: any;
  dragStartPoint: any;
  grabPos: any;
  boxRef: any;
  aspectRatioX = 1;
  aspectRatioY = 1;
  offsetYnodes = 0;
  offsetXnodes = 0;
  closestCoords = new Coords();
  newControlPoints: Array<Node> = [];
  timelineScale: any = null;
  timelineScaleX: any = null;
  timelineAxisSeconds: any;
  timelineAxisMilliseconds: any;
  timelineSeconds: any;
  timelineMilliseconds: any;
  slider = new ReferenceBox();
  sliderDrawplane = new SliderDrawplane();
  dragModule: any = null;
  timeCursor = 0;
  playing = false;
  activeInput = null;
  tmpEffect: any = null;
  animationInterval = null;
  newGuide = false;
  activeLibraryEffect = null;
  dataLoggingEnabled = false;
}



