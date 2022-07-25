import { Component, OnInit, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import * as THREE from 'three';
import { KinematicsConfig } from 'src/app/models/kinematics-config.model';
import { KinematicsDrawingService } from 'src/app/services/kinematics-drawing.service';

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


  // tslint:disable-next-line: variable-name
  constructor(private kinematicsDrawingService: KinematicsDrawingService, private electronService: ElectronService) {

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


    this.kinematicsDrawingService.selectObjectFromScene.subscribe(res => {
      this.kinematicsDrawingService.selectObject(res);
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
    this.kinematicsDrawingService.animate();
  }

  // @HostListener('document:mousedown', ['$event'])
  // onMouseDown(e: MouseEvent) {
  //   this.config.mousedown = true;
  //   this.config.mousePosition.x = (e.clientX / this.config.width) * 2 - 1;
  //   this.config.mousePosition.y = - (e.clientY / this.config.height) * 2 + 1;
  // }

  // @HostListener('document:mouseup', ['$event'])
  // onMouseUp(e: MouseEvent) {
  //   this.config.mousedown = false;
  // }


  @HostListener('document:mouseup', ['$event'])
  onMouseUp(e:MouseEvent) {
    console.log(e);
    this.config.mousePosition.x = (e.clientX / this.config.width) * 2 - 1;
    this.config.mousePosition.y = - (e.clientY / this.config.height) * 2 + 1;

    this.kinematicsDrawingService.getIntersects(this.config.shift);
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    // const key = e.key;
    if (e.shiftKey) {
      console.log('keydown', e.shiftKey);
      this.config.shift = true;
      this.config.control.setTranslationSnap( 10 );
      this.config.control.setRotationSnap( THREE.MathUtils.degToRad(15) );
      this.config.control.setScaleSnap( 0.25 );
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    const key = e.key;
    if (!e.shiftKey) {
      this.config.shift = false;
    }

    if (key === 'Delete' || key === 'Backspace') {
      this.kinematicsDrawingService.deleteSelectedJoints();

    // } else if (key === 'd') {
    //   this.deselectAllObjects();
    } else if (key === 'r') {
      this.config.control.setMode( 'rotate' );
    } else if (key === 's') {
      this.config.control.setMode( 'scale' );
    } else if (key === 't') {
      this.config.control.setMode( 'translate' );
    } else if (key === 'c') {
      const position = this.config.currentCamera.position.clone();

      this.config.currentCamera = this.config.currentCamera.isPerspectiveCamera ? this.config.cameraOrtho : this.config.cameraPersp;
      this.config.currentCamera.position.copy( position );

      this.config.orbit.object = this.config.currentCamera;
      this.config.control.camera = this.config.currentCamera;

      this.config.currentCamera.lookAt( this.config.orbit.target.x, this.config.orbit.target.y, this.config.orbit.target.z );
      this.onWindowResize();

    }
  }










}