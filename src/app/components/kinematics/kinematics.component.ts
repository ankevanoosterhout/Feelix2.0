import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { KinematicService } from 'src/app/services/kinematic.service';
import { Joint } from 'src/app/models/kinematic.model';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MeshStandardMaterial } from 'three';

@Component({
    selector: 'app-kinematics',
    templateUrl: './kinematics.component.html',
    styleUrls: ['./kinematics.component.css']
})
export class KinematicsComponent implements OnInit {

  public visible = [true, false, false, false, false, false];

  height = window.innerHeight;
  width = window.innerWidth;

  canvas: any;

  camera: any;
  scene: any;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  dir: any;
  zoom = 20;
  controls: any;
  loader = new OBJLoader();
  mousePosition = new THREE.Vector2();
  rayCaster = new THREE.Raycaster();

  material = new THREE.MeshStandardMaterial({ color: 0xff2200, depthWrite: false });


  rotation = { x: 0, y: 0, z: 0 };
  lastMousePosition = { x: 0, y: 0 };

  mousedown = false;
  shift = false;

  sceneObjects = [];


  public page = 'Kinematics';
  public status = 'Ready';
  public progress = 0;


  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, public kinematicService: KinematicService, private electronService: ElectronService) {


  }




  drawOrigin(direction: {x: number, y: number, z: number}, color: any) {
    //normalize the direction vector (convert to vector of length 1)
    this.dir = new THREE.Vector3( direction.x, direction.y, direction.z );
    this.dir.normalize();

    const origin = new THREE.Vector3( 0, 0, 0 );
    const length = 20;
    const hex = color;

    const arrowHelper = new THREE.ArrowHelper( this.dir, origin, length, hex );
    this.scene.add( arrowHelper );
  }


  init() {
    this.canvas = this.document.getElementById('canvas');
    this.renderer.setSize(this.width, this.height);
    this.canvas.appendChild( this.renderer.domElement );

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0xe0e0e0 );
    this.scene.fog = new THREE.Fog(0xe0e0e0, 1000, 1200);


    this.drawOrigin({ x: 20, y: 0, z: 0 }, 0xd12304);
    this.drawOrigin({ x: 0, y: 20, z: 0 }, 0x00c93c);
    this.drawOrigin({ x: 0, y: 0, z: 20 }, 0x02a3d9);

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 20, 0 );
    this.scene.add( hemiLight );

    const dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 20, 10 );
    this.scene.add( dirLight );

    const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false, side: THREE.DoubleSide } ) );
    mesh.rotation.x = - Math.PI / 2;
    this.scene.add( mesh );

    const grid = new THREE.GridHelper( 2000, 50, 0x000000, 0x000000 );
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    this.scene.add( grid );


    this.camera = new THREE.PerspectiveCamera(45, this.width/this.height, 1, 100000);

    this.camera.position.z = 5;
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.zoomSpeed = 0.8;
    // this.controls.screenSpacePanning = false;
    this.camera.position.set(0, 20, 100);
    this.controls.update();

  };

  drawModel(model: any) {
    this.loadOBJModel(model.object3D.OBJ, model.id);
  }

  loadOBJModel(url: string, id: string) {
    this.loader.load('./assets/models/' + url, (object: any) => {   // called when resource is loaded
        object.name = id;
        object.traverse( ( child: any ) => {
            if ( child instanceof THREE.Mesh ) {
                child.material = new THREE.MeshStandardMaterial({ color: 0xff2200 });
            }
        });
        // for (const child of object.children) {
        //   child.material = new THREE.MeshStandardMaterial({ color: 0xff2200, depthWrite: false });
        // }
        this.scene.add( object );
        this.sceneObjects.push(object);
      }, (xhr: any) => {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      }, (error: any) => {
        console.log( 'Error loading model' );
      }
    );
  }



  animate() {
    this.controls.update();
    requestAnimationFrame( () => this.animate );
    this.renderer.render(this.scene, this.camera);

    this.rayCaster.setFromCamera(this.mousePosition, this.camera);
    const intersects = this.rayCaster.intersectObjects(this.scene.children);

    let sceneObject = null;
    for (const intersect of intersects) {
      sceneObject = this.sceneObjects.filter(s => s.id === intersect.object.id || s.id === intersect.object.parent.id)[0];
      if (sceneObject) {
        console.log((sceneObject.id === intersect.object.id), (sceneObject.id === intersect.object.parent.id));
        this.selectObject(sceneObject);
      }
    }
    if (sceneObject === null) {
      this.deselectAllObjects();
    }
  };

  selectObject(object: any) {
    for (const joint of this.kinematicService.joints) {
      const sceneObject = this.sceneObjects.filter(s => s.name === joint.id)[0];

      if (sceneObject) {
        if (sceneObject.id !== object.id) {
          const isSelectedIndex = this.kinematicService.selectedJoints.indexOf(joint);
          if (isSelectedIndex > -1) {
            this.kinematicService.deselectJoint(joint.id);
            this.setObjectColor(sceneObject, 0xff2200);
          }
        } else {
          const isSelectedIndex = this.kinematicService.selectedJoints.indexOf(joint);
          if (isSelectedIndex < 0) {
            this.kinematicService.selectJoint(joint.id);
            this.setObjectColor(object, 0xfc7f03);
          }
        }
      }
    }
  }

  deselectAllObjects() {
    for (const object of this.sceneObjects) {
      this.kinematicService.deselectJoint(object.name);
      this.setObjectColor(object, 0xff2200);
    }
  }


  setObjectColor(object: any, color: number) {
    object.traverse( ( child: any ) => {
      if ( child instanceof THREE.Mesh ) {
          console.log('update color ' + child);
          child.material = new THREE.MeshStandardMaterial({ color: color });
      }
    });
  }


  ngOnInit(): void {
    this.init();
    this.animate();
  }


  getWindowSize() {
    this.height = window.innerHeight;
    this.width = window.innerWidth;
  }


  @HostListener('window:resize', ['$event'])
  onResize(e: Event) {
    this.getWindowSize();
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
    this.animate();
  }


  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    this.animate();
  }

  // @HostListener('document:mousedown', ['$event'])
  // onMouseDown(e: MouseEvent) {
  //   this.mousePosition.x = (e.clientX / this.width) * 2 - 1;
  //   this.mousePosition.y = - (e.clientY / this.height) * 2 + 1;

  // }

  @HostListener('click', ['$event'])
  onClick(e:MouseEvent) {
    console.log("event", e);
    this.mousePosition.x = (e.clientX / this.width) * 2 - 1;
    this.mousePosition.y = - (e.clientY / this.height) * 2 + 1;
  }

  updateJoint(joint: Joint) {
    this.kinematicService.updateJointVisualization(joint.id, joint.object3D);
    this.updateModel(this.kinematicService.getJoint(joint.id));
  }

  addModel(model: any) {
    this.kinematicService.addJoint();
    const modelObject = this.kinematicService.joints[this.kinematicService.joints.length - 1];
    this.drawModel(modelObject);
  }

  updateModel(model: Joint) {
    if (model) {
      const object = this.scene.getObjectByName(model.id);

      if (object) {
        object.position.x = model.object3D.position.x;
        object.position.y = model.object3D.position.y;
        object.position.z = model.object3D.position.z;

        object.rotation.x = model.object3D.rotation.x * (Math.PI / 180);
        object.rotation.y = model.object3D.rotation.y * (Math.PI / 180);
        object.rotation.z = model.object3D.rotation.z * (Math.PI / 180);
      }
    }
  }


}
