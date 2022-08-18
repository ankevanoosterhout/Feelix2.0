import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import * as THREE from 'three';
import { KinematicService } from 'src/app/services/kinematic.service';
import { Connector, JointLink, Model } from 'src/app/models/kinematic.model';
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
    new Model(0, 'motor', 1, true, 'active_joint_1.png', [ { g:'B', url:'active_joint_1_base.obj'}, { g:'Z', url: 'active_joint_connector_Z.obj' }], 0xff2200),
    new Model(1, 'motor', 2, true, 'active_joint_2.png', [{ g:'B', url:'active_joint_2_base.obj'}, { g:'Z', url: 'active_joint_connector_Z.obj' }], 0xff2200),
    new Model(2, 'joint', 1, false, 'passive_joint_1.png', [{ g:'B', url:'passive_joint_1_base.obj'}, { g:'Z', url: 'passive_joint_connector_Z.obj' }], 0x02a3d9 ),
    new Model(3, 'joint', 2,false, 'passive_joint_2.png', [{ g:'B', url:'passive_joint_2_base.obj'}, { g:'Z', url: 'passive_joint_connector_Z.obj' }], 0x02a3d9 ),
    new Model(4, 'arm', 0, false, 'arm.png', [{ g:'C', url:'arm.obj'} ], 0x333333),
    new Model(5, 'connector', 0,false, 'cube.png', [{ g:'C', url:'cube.obj'}], 0x333333)
  ];

//this.kinematicService.selectedJoints[0].type === 'motor' && this.kinematicService.selectedJoints[0].subtype === 'b' && type === 'i'

  constructor(public kinematicService: KinematicService, private kinematicsDrawingService: KinematicsDrawingService,
              private electronService: ElectronService, public hardwareService: HardwareService) {

    this.config = this.kinematicsDrawingService.config;

    this.electronService.ipcRenderer.on('controlsVisible', (event: Event, visible: boolean) => {
      this.visible[0] = visible;
    });

    this.kinematicService.importOBJModelToObjectGroup.subscribe(res => {
      this.importOBJModelToGroup(res.pnt, res.model_id);
    });

    this.kinematicsDrawingService.updateModelPosition.subscribe(res => {
      this.updateModel(res);
    });

    this.kinematicsDrawingService.loadOBJ.subscribe(res => {
      this.importOBJModel(res.url, res.name);

    });
  }


  updateModel(model: JointLink) {
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

  updateJoint(joint: JointLink) {
    this.kinematicService.updateJointVisualization(joint.id, joint.object3D);
    this.updateModel(this.kinematicService.getJoint(joint.id));
  }

  selectJointObject(object: JointLink) {
    const sceneObject = this.config.scene.getObjectByName(object.id);
    if (sceneObject) {
      this.kinematicsDrawingService.selectSceneObject(sceneObject);
    }
  }


  deletePoint(id: string, point_id: string) {
    const joint = this.kinematicService.joints.filter(j => j.id === id)[0];
    if (joint) {

      const point = joint.connectors.filter(p => p.id === point_id)[0];

      if (point) {
        this.removeConnectorImage(point.name);
        const index = joint.connectors.indexOf(point);
        if (index > -1) { joint.connectors.splice(index, 1); }
      }
    }
  }



  addModel(model: any) {
    const modelObject = this.kinematicService.addJoint(model);
    this.loadOBJModel(modelObject);
  }


  loadOBJModel(model: any) {
    const group = new THREE.Group();
    group.name = model.id;

    for (const object of model.object3D.objectUrls) {
      this.config.loader.load('./assets/models/' + object.url, (object: any) => {   // called when resource is loaded

        object.name = model.g;

        object.traverse( ( child: any ) => {
            if ( child instanceof THREE.Mesh ) {
              this.kinematicsDrawingService.updateColor(child);
              const child_color = child.name.split(":");
              // console.log(child_color);
              if (child_color[0] === "Yellow") {
                // console.log(model.id);
                this.kinematicService.updateSelectionPointID(model.id, child.name, child.uuid);
              }

            }
        });

        group.add(object);

      }, (xhr: any) => {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      }, (error: any) => {
        console.log( 'Error loading model' );
      });

    }
    this.config.sceneObjects.push(group);
    this.config.scene.add( group );

  }




  importOBJModelToGroup(point: Connector, model_id: string) {
    // console.log(point);
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);

    if (sceneObject && sceneObject.isGroup && point) {
      const imageUrl = (this.kinematicService.selectedJoints[0].active ? 'active':'passive') + '_joint_' + this.kinematicService.selectedJoints[0].modelType + '_connector_' + point.plane + '.obj';
      // console.log(imageUrl);
      this.config.loader.load('./assets/models/' + imageUrl, (object: any) => {   // called when resource is loaded
        object.name = point.name;

        object.traverse( ( child: any ) => {
            if ( child instanceof THREE.Mesh ) {
              child.material = new THREE.MeshStandardMaterial({ color: this.config.selectColor });
              const child_color = child.name.split(":");
              // console.log(child_color);
              if (child_color[0] === "Yellow") {
                // console.log(model_id);
                this.kinematicService.updateSelectionPointID(model_id, point.name, child.uuid);
              }
            }
        });
        object.rotation.z = point.angle * (Math.PI/180);
        sceneObject.add(object);
        // console.log(sceneObject);

      }, (xhr: any) => {
        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      }, (error: any) => {
        console.log( 'Error loading model' );
      });
    }
  }


  importOBJModel(url: string, name: string) {
    this.config.rotaryControls = new THREE.Group();
    this.config.rotaryControls.name = name;
    this.config.loader.load('./assets/models/' + url, (object: any) => {   // called when resource is loaded
      object.name = name;

      object.traverse( ( child: any ) => {
          if ( child instanceof THREE.Mesh ) {
            this.kinematicsDrawingService.updateColor(child);
          }
      });
      object.visible = false;
      this.config.rotaryControls.add(object);
      this.config.rotaryControls.draggable = true;
      this.config.scene.add(this.config.rotaryControls);




      this.kinematicsDrawingService.animate();

    }, (xhr: any) => {
      console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    }, (error: any) => {
      console.log( 'Error loading model' );
    });
  }



  updatePointAngle(point: Connector) {
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
    console.log(sceneObject, point);
    if (sceneObject && sceneObject.isGroup) {

      const group = sceneObject.children.filter(c => c.name === point.name)[0];
      console.log(sceneObject, group, point.id);
      if (group) {
        group.rotation.z = point.angle * (Math.PI/180);
        console.log(group, point.angle);
        this.kinematicsDrawingService.animate();
      }
    }
  }



  updatePointType(id: string, point: Connector) {
    const joint = this.kinematicService.joints.filter(j => j.id === id)[0];
    if (joint) {
      // const connectorGroup = joint.connectors.filter(g => g.axis === axis)[0];
      // if (connectorGroup) {
        // if (point.type === 'i') point.type = 'o';
        // else if (point.type === 'o') point.type = 'i';
        // else if (point.type === 't') point.type = 'b';
        // else if (point.type === 'b') point.type = 't';
      // }
      // this.kinematicService.selectedJoints[0] = this.kinematicService.updateConnectionPoint(id, axis, point);
      this.removeConnectorImage(point.name);
      this.importOBJModelToGroup(point, joint.id);
      this.kinematicsDrawingService.animate();
    }
  }


  removeConnectorImage(name: string) {
    console.log(name);
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
    if (sceneObject && sceneObject.isGroup) {
      const group = sceneObject.children.filter(c => c.name === name)[0];
      if (group) {
        sceneObject.remove(group);
      }
    }
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

  inputActive(active: boolean) {
    this.config.inputActive = active;
  }



  changeSize(element: JointLink) {
    const sceneObject = this.config.scene.getObjectByName(element.id);
    const newScale = element.size / 40;
    if (sceneObject) {
      sceneObject.traverse( ( child: any ) => {
        if ( child.name === 'Gray:A' ) {
          child.scale.z = newScale;
        } else if( child.name === 'Yellow:Z:1') {
          child.position.z = (newScale * 20) - 20;
        } else if( child.name === 'Yellow:Z:-1') {
          child.position.z = (newScale * -20) + 20;
        }
      });
    }

  }


}
