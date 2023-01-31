
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



  // sceneObjects: Array<THREE.Object3D> = [];
  mousedown = false;
  shift = false;
  gridVisible = true;
  inputActive = false;
  selectColor = 0x53d7f5;
  tmpPlane: any;


  rootActive = false;
  move: boolean = false;
}

