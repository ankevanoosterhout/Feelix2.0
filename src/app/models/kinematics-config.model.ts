
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
  mousePosition = new THREE.Vector2();
  rayCaster = new THREE.Raycaster();

  sceneObjects: Array<any> = [];
  mousedown = false;
  shift = false;
  gridVisible = true;
}

