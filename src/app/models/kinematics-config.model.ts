
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';


export class KinematicsConfig {
  canvas: any;

  height = window.innerHeight;
  width = window.innerWidth;
  aspect = this.width/this.height;

  cameraPersp: any;
  cameraOrtho: any;
  currentCamera: any;
  scene: any;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  dir: any;
  control: any;
  orbit: any;
  loader = new OBJLoader();
  jsonLoader = new THREE.ObjectLoader();
  mousePosition = new THREE.Vector2();
  rayCaster = new THREE.Raycaster();
  lastRayCasterPoint = new THREE.Vector3();

  // sceneObjects: Array<THREE.Object3D> = [];
  mousedown = false;
  shift = false;
  gridVisible = true;
  inputActive = false;
  selectColor = 0x53d7f5;
  draggableObject: any = null;
  rotaryControls: any;
  tmpPlane: any;
  intersects = new THREE.Vector3();
  pivotPoint = new THREE.Object3D();
  rotationAxis = new THREE.Vector3();
  intersectPoint = new THREE.Vector3();
  plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  rootActive = false;
  move: boolean = false;
}

