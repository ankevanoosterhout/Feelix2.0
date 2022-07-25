import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { Joint } from '../models/kinematic.model';
import { KinematicsConfig } from '../models/kinematics-config.model';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { KinematicService } from './kinematic.service';

@Injectable()
export class KinematicsDrawingService {

  public config: KinematicsConfig;

  selectObjectFromScene: Subject<any> = new Subject();



  constructor(@Inject(DOCUMENT) private document: Document, private kinematicService: KinematicService) {
    this.config = new KinematicsConfig();
  }



  public selectSceneObject( object: any ) {
    this.selectObjectFromScene.next(object);
  }


  init() {
    this.config.canvas = this.document.getElementById('canvas');
    this.config.renderer.setSize(this.config.width, this.config.height);
    this.config.canvas.appendChild( this.config.renderer.domElement );

    this.config.scene = new THREE.Scene();
    this.config.scene.background = new THREE.Color( 0xe0e0e0 );
    this.config.scene.fog = new THREE.Fog(0xe0e0e0, 1200, 2000);

    this.drawGrid();

    // this.drawOrigin({ x: 30, y: 0, z: 0 }, 0xd12304);
    // this.drawOrigin({ x: 0, y: 30, z: 0 }, 0x00c93c);
    // this.drawOrigin({ x: 0, y: 0, z: 30 }, 0x02a3d9);

    const hemiLight = new THREE.HemisphereLight( 0xffffff, 0x444444 );
    hemiLight.position.set( 0, 20, 0 );
    this.config.scene.add( hemiLight );

    const dirLight = new THREE.DirectionalLight( 0xffffff );
    dirLight.position.set( 0, 20, 10 );
    this.config.scene.add( dirLight );




    this.config.cameraPersp = new THREE.PerspectiveCamera(45, this.config.width/this.config.height, 1, 100000);
    this.config.cameraOrtho = new THREE.OrthographicCamera( - 600 * (this.config.width/this.config.height), 600 * (this.config.width/this.config.height), 600, - 600, 0.01, 30000 );

    this.config.currentCamera = this.config.cameraPersp;

    this.config.currentCamera.position.set( 400, 200, 400 );
    this.config.currentCamera.lookAt( 0, 150, 0 );
    this.config.orbit = new OrbitControls(this.config.currentCamera, this.config.renderer.domElement);
    this.config.orbit.zoomSpeed = 0.8;
    this.config.orbit.update();

    this.config.control = new TransformControls( this.config.currentCamera, this.config.renderer.domElement );
    this.config.control.addEventListener( 'change', () => this.animate );

    this.config.control.addEventListener( 'dragging-changed', ( event: any ) => {
      this.config.orbit.enabled = !event.value;


      // if (this.kinematicService.selectedJoints.length === 1) {
      //   this.updatePosition(this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id), this.kinematicService.selectedJoints[0]);
      // }
    } );
    // this.config.orbit.screenSpacePanning = false;

    this.config.scene.add( this.config.control );

    this.config.orbit.update();

  };




  drawOrigin(direction: {x: number, y: number, z: number}, color: any) {
    //normalize the direction vector (convert to vector of length 1)
    this.config.dir = new THREE.Vector3( direction.x, direction.y, direction.z );
    this.config.dir.normalize();

    const origin = new THREE.Vector3( 0, 0, 0 );
    const length = 30;
    const hex = color;

    const arrowHelper = new THREE.ArrowHelper( this.config.dir, origin, length, hex );
    this.config.scene.add( arrowHelper );
  }



  drawGrid() {
    const mesh = new THREE.Mesh( new THREE.PlaneGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false, side: THREE.DoubleSide } ) );
    mesh.rotation.x = - Math.PI / 2;
    mesh.name = 'mesh';
    this.config.scene.add( mesh );

    const grid = new THREE.GridHelper( 2000, 50, 0x000000, 0x000000 );
    grid.name = 'grid';
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    this.config.scene.add( grid );
  }

  animate() {
    this.config.orbit.update();
    requestAnimationFrame( () => this.animate );

    this.config.renderer.render(this.config.scene, this.config.currentCamera);
  }


  getIntersects(shift: boolean) {
    this.config.rayCaster.setFromCamera(this.config.mousePosition, this.config.currentCamera);
    const intersects = this.config.rayCaster.intersectObjects(this.config.scene.children);
    for (const intersect of intersects) {
      const sceneObject = this.config.sceneObjects.filter(s => s.id === intersect.object.parent.id)[0];
      if (sceneObject) {
        this.selectObject(sceneObject, shift);
        this.animate();
      }
    }
  }

  selectface() {

  }

  selectObject(object: any, shift = false) {

    const joint = this.kinematicService.joints.filter(j => j.id === object.name)[0];
    if (joint) {
      const isSelectedIndex = this.kinematicService.selectedJoints.indexOf(joint);
      if (isSelectedIndex > -1) {
        this.deselectObject(object);
        if (this.kinematicService.selectedJoints.length === 1) {
          const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
          if (sceneObject) { this.config.control.attach(sceneObject); }
        }
      } else {
        if (!shift && this.kinematicService.selectedJoints.length > 0) {
          this.deselectAllObjects();
        } else if (shift && this.kinematicService.selectedJoints.length === 1) {
          const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
          if (sceneObject) { this.config.control.detach(sceneObject); }
        }

        this.kinematicService.selectJoint(joint.id);
        this.setObjectColor(object, 0xfc7f03);
        if (this.kinematicService.selectedJoints.length === 1) {
          this.config.control.attach(object);
        }
      }
    }
  }


  setObjectColor(object: any, color: number) {
    object.traverse( ( child: any ) => {
      if ( child instanceof THREE.Mesh ) {
          child.material = new THREE.MeshStandardMaterial({ color: color });
      }
    });
  }


  deselectAllObjects() {
    if (this.kinematicService.selectedJoints.length === 1) {
      const sceneObject = this.config.sceneObjects.filter(s => s.name === this.kinematicService.selectedJoints[0].id)[0];
      if (sceneObject) {
        this.config.control.detach(sceneObject);
      }
    }
    this.kinematicService.deselectAll();

    for (const object of this.config.sceneObjects) {
      this.deselectObject(object);
    }

  }

  deselectObject(object: any) {
    this.kinematicService.deselectJoint(object.name);
    const objectColor = this.kinematicService.getJointColor(object.name);
    this.setObjectColor(object, objectColor);
  }

  deleteSelectedJoints() {
    if (this.kinematicService.selectedJoints.length > 0) {
      for (const joint of this.kinematicService.selectedJoints) {
        this.deleteObjectFromScene(joint.id);
        this.kinematicService.deleteJoint(joint.id);
      }
      this.animate();
    }
  }


  deleteObjectFromScene(name: string) {
    const sceneObject = this.config.scene.getObjectByName(name);
    if (sceneObject) {
      const index = this.config.sceneObjects.indexOf(sceneObject);
      if (index > -1) {
        this.config.sceneObjects.splice(index, 1);
      }
      this.config.scene.remove(sceneObject);

    }
  }


  updatePosition(object: any, model: Joint) {
    if (object) {

      if (model) {

        model.object3D.rotation.x = object.rotation.x * (180 / Math.PI);
        model.object3D.rotation.y = object.rotation.y * (180 / Math.PI);
        model.object3D.rotation.z = object.rotation.z * (180 / Math.PI);

        model.object3D.position.x = object.position.x;
        model.object3D.position.y = object.position.y;
        model.object3D.position.z = object.position.z;
      }
    }
  }


  hideObject(model: Joint) {
    const sceneObject = this.config.sceneObjects.filter(s => s.name === model.id)[0];
    if (sceneObject) {
      if (model.object3D.hidden) {
        this.config.scene.remove( sceneObject );
      } else {
        this.config.scene.add( sceneObject );
      }
      this.animate();
    }
  }


  groupObjects() {
    console.log(this.kinematicService.selectedJoints);
    if (this.kinematicService.selectedJoints.length > 0) {
      const group = new THREE.Group();

      for (const joint of this.kinematicService.selectedJoints) {
        const object = this.config.scene.getObjectByName(joint.id);
        console.log(object);
        group.add(object);
        // this.deleteObjectFromScene(object.name);
      }
      console.log(group);
      this.deselectAllObjects();
      this.config.scene.add( group );
      console.log(this.config.scene);
      // this.selectObject(group);
    }
  }

}

