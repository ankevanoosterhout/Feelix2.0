import { Component, OnInit, HostListener, Inject } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import * as THREE from 'three';
import { KinematicsConfig } from 'src/app/models/kinematics-config.model';
import { KinematicsDrawingService } from 'src/app/services/kinematics-drawing.service';
import { DOCUMENT } from '@angular/common';
import { ClosedChainIKService } from 'src/app/services/closed-chain-ik.service';

@Component({
    selector: 'app-kinematics',
    templateUrl: './kinematics.component.html',
    styleUrls: ['../windows/effects/effects.component.css','./kinematics.component.css']
})
export class KinematicsComponent implements OnInit {

  public config: KinematicsConfig;

  public page = 'Kinematics';
  public status = 'Ready';
  public progress = 0;

  params = {
    controls: 'translate',
    solvePosition: true,
    solveRotation: false,
  };


  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private kinematicsDrawingService: KinematicsDrawingService,
              private electronService: ElectronService, private closedChainService: ClosedChainIKService) {

    this.config = this.kinematicsDrawingService.config;

    this.electronService.ipcRenderer.on('gridVisible', (event: Event, visible: boolean) => {
      const items = ['mesh', 'grid'];
      for (const item of items) {
        const object = this.config.scene.getObjectByName(item);
        if (object) {
          object.visible = visible;
        }
      }
      this.kinematicsDrawingService.animate();
    });

    this.electronService.ipcRenderer.on('deselect', (event: Event) => {
      this.kinematicsDrawingService.deselectAllObjects();
    });

    this.electronService.ipcRenderer.on('delete', (event: Event) => {
      this.kinematicsDrawingService.deleteSelectedJoints();
    });


    this.electronService.ipcRenderer.on('copy', (event: Event) => {
      this.kinematicsDrawingService.copySelectedJoints();
    });



    this.kinematicsDrawingService.selectObjectFromScene.subscribe(res => {
      this.kinematicsDrawingService.selectObject(res);
    });

    this.kinematicsDrawingService.updateCameraView.subscribe(res => {
      this.updateCamera();
    });


    this.kinematicsDrawingService.updateKinematicsProgress.subscribe(data => {
      this.progress = data.progress;
      this.status = data.status;
      this.document.getElementById('msg').innerHTML = this.status;
      const width = 244 * (this.progress / 100);
      this.document.getElementById('progress').style.width = width + 'px';
    });

  }





  ngOnInit(): void {
    this.kinematicsDrawingService.init();
    this.kinematicsDrawingService.animate();
  }


  getWindowSize() {
    this.config.height = window.innerHeight;
    this.config.width = window.innerWidth;
    this.config.aspect = window.innerWidth / window.innerHeight;
  }


  @HostListener('window:resize', ['$event'])
  onResize(e: Event) {
    this.onWindowResize();
    this.closedChainService.updateResolution(window.innerWidth, window.innerHeight);
  }


  onWindowResize() {
    this.getWindowSize();

    this.config.cameraPersp.aspect = this.config.aspect;
    this.config.cameraPersp.updateProjectionMatrix();

    this.config.cameraOrtho.left = this.config.cameraOrtho.bottom * this.config.aspect;
    this.config.cameraOrtho.right = this.config.cameraOrtho.top * this.config.aspect;
    this.config.cameraOrtho.updateProjectionMatrix();

    this.config.renderer.setSize( window.innerWidth, window.innerHeight );

    this.kinematicsDrawingService.animate();
  }


  @HostListener('document:mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    e.preventDefault();

    this.config.mousePosition.x = (e.clientX / this.config.width) * 2 - 1;
    this.config.mousePosition.y = - (e.clientY / this.config.height) * 2 + 1;

    if (this.config.draggableObject) {
      this.kinematicsDrawingService.getIntersects(this.config.shift);
      this.config.rayCaster.setFromCamera(this.config.mousePosition, this.config.currentCamera);
      this.config.rayCaster.ray.intersectPlane(this.config.plane, this.config.intersectPoint);

      const matrix = new THREE.Matrix4();
      const finalPosition = this.config.intersectPoint.clone();
      finalPosition.x = -this.config.intersectPoint.y;
      finalPosition.y = this.config.intersectPoint.x;
      console.log(this.config.intersectPoint);
      matrix.lookAt(
        finalPosition,
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, 1)
      );
      console.log(matrix);
      if (this.config.draggableObject) {
        this.config.draggableObject.quaternion.setFromRotationMatrix(matrix);
        this.config.draggableObject.rotateX(Math.PI/2);
      }
    }

    this.kinematicsDrawingService.animate();
  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(e: MouseEvent) {
    this.config.mousedown = true;
    // this.config.mousePosition.x = (e.clientX / this.config.width) * 2 - 1;
    // this.config.mousePosition.y = - (e.clientY / this.config.height) * 2 + 1;
    this.kinematicsDrawingService.getIntersects(this.config.shift);

    if (this.config.draggableObject) {
      this.config.orbit.enabled = false;
    }
  }

  // @HostListener('document:mouseup', ['$event'])
  // onMouseUp(e: MouseEvent) {
  //   this.config.mousedown = false;
  // }


  @HostListener('document:mouseup', ['$event'])
  onMouseUp(e:MouseEvent) {
    e.preventDefault();

    if (this.config.draggableObject) {
      console.log('deselect draggable object');
      this.config.draggableObject = undefined;
      this.config.orbit.enabled = true;
    }


    if (this.config.rootActive) {

      this.closedChainService.updateRoot();

    }


  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
      // const key = e.key;
    if (!this.config.inputActive) {
      if (e.shiftKey && !this.config.shift) {
        this.config.shift = true;
        this.config.control.setTranslationSnap( undefined );
        this.config.control.setRotationSnap( undefined );
        this.config.control.setScaleSnap( undefined );
      }
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    if (!this.config.inputActive) {
      const key = e.key;
      if (!e.shiftKey) {
        this.config.shift = false;
        this.config.control.setTranslationSnap( 10 );
        this.config.control.setRotationSnap( THREE.MathUtils.degToRad(15) );
        this.config.control.setScaleSnap( 0.25 );
      }

      if (key === 'Delete' || key === 'Backspace') {
        this.kinematicsDrawingService.deleteSelectedJoints();

      } else if (key === 'd') {
        this.kinematicsDrawingService.deselectAllObjects();
      } else if (key === 'r') {
        // this.config.control.setMode( 'rotate' );
        this.kinematicsDrawingService.selectControlMode('rotate');
        this.params.controls = 'rotate';
        this.config.move = false;
      } else if (key === 'm') {
        this.config.move = true;
      }
      // else if (key === 's') {
      //   this.config.control.setMode( 'scale' );
      // }
      else if (key === 't') {
        // this.config.control.setMode( 'translate' );
        this.kinematicsDrawingService.selectControlMode('translate');
        this.config.move = false;
        this.params.controls = 'translate';
      } else if (key === 'c') {
        this.kinematicsDrawingService.selectCamera();

      }
    }
  }

  updateCamera() {
    const position = this.config.currentCamera.position.clone();

    this.config.currentCamera = this.config.currentCamera.isPerspectiveCamera ? this.config.cameraOrtho : this.config.cameraPersp;
    this.config.currentCamera.position.copy( position );

    this.config.orbit.object = this.config.currentCamera;
    this.config.control.camera = this.config.currentCamera;

    this.config.currentCamera.lookAt( this.config.orbit.target.x, this.config.orbit.target.y, this.config.orbit.target.z );
    this.onWindowResize();
  }







}
