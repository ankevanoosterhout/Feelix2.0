import { Vector2, Vector3, Plane, Raycaster } from 'three';


export class DisplaySettings {
  displayModels = true;
  displayIK = false;
}

export class DragControls {
  distance: number;
  initialGrabPoint = new Vector3();
  grabPoint = new Vector3();
  prevHitPoint = new Vector3();
  newHitPoint = new Vector3();
  tempVector = new Vector3();
  pivotPoint = new Vector3();
  plane = new Plane();
  projectedStartPoint = new Vector3();
  projectedEndPoint = new Vector3();
  mouse = new Vector2();
  hitDistance = -1;
  manipulating = null;
  hovered = null;
  selected = null;

  rayCaster = new Raycaster();
  mousePosition = new Vector2();


  // intersects = new THREE.Vector3();
  // pivotPoint = new THREE.Object3D();
  // rotationAxis = new THREE.Vector3();
  // intersectPoint = new THREE.Vector3();
  // plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
}


export class IKConfig {
  solver: any;
  ikHelper: any;
  goal: any;

  ikRoot = null;

  // newFrames: Array<string> = [];
  targetObject: any;
  finalLink: any;

  createRoot = false;

  animate = false;
  iterations = 5;

  screen = new DisplaySettings();
  drag = new DragControls();


}
