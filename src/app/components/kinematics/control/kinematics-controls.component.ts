import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import * as THREE from 'three';
import { KinematicService } from 'src/app/services/kinematic.service';
import { Joint, Model } from 'src/app/models/kinematic.model';
import { HardwareService } from 'src/app/services/hardware.service';

import { KinematicsConfig } from 'src/app/models/kinematics-config.model';
import { KinematicsDrawingService } from 'src/app/services/kinematics-drawing.service';

@Component({
    selector: 'app-kinematics-control',
    templateUrl: './kinematics-control.component.html',
    styleUrls: ['../../windows/effects/effects.component.css','./../kinematics.component.css']
})
export class KinematicsControlComponent {

  public visible = [true, false, false, false, false, false, false];

  public config: KinematicsConfig;


  models = [
    new Model(0, 'joint', true, 'active_joint.png', 'active_joint.obj', 0xff2200),
    new Model(1, 'joint', false, 'passive_joint.png', 'active_joint.obj', 0x02a3d9 ),
    new Model(2, 'translation', false, 'translation.png', 'translation.obj', 0x333333),
    new Model(3, 'translation', false, 'translation_z.png', 'translation_z.obj', 0x333333),
    new Model(4, 'arm', false, 'arm.png', 'arm.obj', 0x333333),
    new Model(5, 'arm', false, 'arm.png', 'arm.obj', 0x333333)
  ];



  constructor(public kinematicService: KinematicService, private kinematicsDrawingService: KinematicsDrawingService,
              private electronService: ElectronService, public hardwareService: HardwareService) {

    this.config = this.kinematicsDrawingService.config;

    this.electronService.ipcRenderer.on('controlsVisible', (event: Event, visible: boolean) => {
      this.visible[0] = visible;
    });
  }


  updateModel(model: Joint) {
    if (model) {
      const object = this.config.scene.getObjectByName(model.id);

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

  updateJoint(joint: Joint) {
    this.kinematicService.updateJointVisualization(joint.id, joint.object3D);
    this.updateModel(this.kinematicService.getJoint(joint.id));
  }

  selectJointObject(object: Joint) {
    const sceneObject = this.config.scene.getObjectByName(object.id);
    if (sceneObject) {
      this.kinematicsDrawingService.selectSceneObject(sceneObject);
    }
  }



  addModel(model: any) {
    const modelObject = this.kinematicService.addJoint(model);
    this.loadModel(modelObject);
  }


  loadModel(model: any) {
    this.loadOBJModel(model.object3D.objectUrl, model.id, model.object3D.color);
  }

  loadOBJModel(url: string, id: string, color: number) {
    this.config.loader.load('./assets/models/' + url, (object: any) => {   // called when resource is loaded
        object.name = id;
        object.traverse( ( child: any ) => {
            if ( child instanceof THREE.Mesh ) {
                child.material = new THREE.MeshStandardMaterial({ color: color });
            }
        });
        this.config.scene.add( object );
        this.config.sceneObjects.push(object);
      }, (xhr: any) => {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      }, (error: any) => {
        console.log( 'Error loading model' );
      }
    );
  }


  move() {
    this.config.control.setMode( 'translate' );
  }

  rotate() {
    this.config.control.setMode( 'rotate' );
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }


}
