import { Component } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import * as THREE from 'three';
import { KinematicService } from 'src/app/services/kinematic.service';
import { Connector, JointLink, Model, Point } from 'src/app/models/kinematic.model';
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

  infinity = -3.4576917263943217389012348562315E+1203466;

  models = [
    new Model(0, 'motor', 1, true, 'active_joint_1.png', [ { g:'B', url:'active_joint_1_base.obj'}, { g:'Z', url: 'active_joint_connector_Z.obj' }], 0xff2200),
    new Model(1, 'motor', 2, true, 'active_joint_2.png', [{ g:'B', url:'active_joint_2_base.obj'}, { g:'Z', url: 'active_joint_connector_Z.obj' }], 0xff2200),
    new Model(2, 'joint', 1, false, 'passive_joint_1.png', [{ g:'B', url:'passive_joint_1_base.obj'}, { g:'Z', url: 'passive_joint_connector_Z.obj' }], 0x02a3d9 ),
    new Model(3, 'joint', 2,false, 'passive_joint_2.png', [{ g:'B', url:'passive_joint_2_base.obj'}, { g:'Z', url: 'passive_joint_connector_Z.obj' }], 0x02a3d9 ),
    // new Model(4, 'arm', 0, false, 'arm.png', [{ g:'C', url:'arm.obj'} ], 0x333333),
    // new Model(5, 'connector', 0,false, 'cube.png', [{ g:'C', url:'cube.obj'}], 0x333333)
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
      this.updateJoint(res);
    });

    this.kinematicsDrawingService.loadOBJ.subscribe(res => {
      this.importOBJModel(res.url, res.name);
    });

    this.kinematicsDrawingService.loadModelFromLink.subscribe(res => {
      this.loadOBJModel(res);
    });

    console.log(this.infinity);
  }


  updateJoint(joint: JointLink) {
    if (joint) {
      const object = this.config.scene.getObjectByName(joint.id);

      if (object) {
        object.position.x = joint.object3D.position.x;
        object.position.y = joint.object3D.position.y;
        object.position.z = joint.object3D.position.z;

        object.rotation.x = joint.object3D.rotation.x * (Math.PI / 180);
        object.rotation.y = joint.object3D.rotation.y * (Math.PI / 180);
        object.rotation.z = joint.object3D.rotation.z * (Math.PI / 180);

        object.quaternion.setFromEuler(object.rotation);
        
        object.updateMatrix();


        joint.sceneObject = object;
      }
    }

    this.kinematicService.updateJoint(joint);
    // this.kinematicService.updateJointVisualization(joint.id, joint.object3D);
  }

  // updateJoint(joint: JointLink) {
  //   // this.kinematicService.updateJointVisualization(joint.id, joint.object3D);
  //   this.updateJoint(joint);
  // }

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
        this.removeConnectorImage(point);
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

    for (const item of model.object3D.objectUrls) {
      this.config.loader.load('./assets/models/' + item.url, (object: any) => {   // called when resource is loaded

        object.name = item.g;

        object.traverseVisible( ( child: any ) => {
            if ( child instanceof THREE.Mesh ) {
              this.kinematicsDrawingService.updateColor(child);
              const child_color = child.name.split(":");
              // console.log(child_color);
              if (child_color[0] === "Yellow") {
                // console.log(model.id);
                this.kinematicService.updateSelectionPointID(model.id, child.name, child.uuid);
              }
            }
            if (child.name === 'Z') {
              child.rotation.z = model.angle * (Math.PI/180);
            }
        });

        group.add(object);

      }, (xhr: any) => {
        // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      }, (error: any) => {
        // console.log( 'Error loading model' );
      });
    }

    this.kinematicService.joints.filter(j => j.id === model.id)[0].sceneObject = group;
    this.config.scene.add( group );

    for (const connector of model.connectors) {
      if (connector.plane !== 'Z') {
        this.importOBJModelToGroup(connector, model.id, model);
      }
    }
    this.updateJoint(model);
    // this.updateJointAngle(this.kinematicService.joints.filter(j => j.id === model.id)[0]);

  }




  importOBJModelToGroup(point: Connector, model_id: string, joint = null) {
    if (joint === null) {
      joint = this.kinematicService.selectedJoints[0];
    }
    const sceneObject = this.config.scene.getObjectByName(joint.id);

    if (sceneObject && sceneObject.isGroup && point) {
      const imageUrl = (joint.active ? 'active':'passive') + '_joint_' + joint.modelType + '_connector_' + point.plane + '.obj';

      this.config.loader.load('./assets/models/' + imageUrl, (object: any) => {   // called when resource is loaded
        // console.log(object);
        object = this.kinematicService.updateObjectDetails(object, model_id, point.name, this.config.selectColor);

        object.rotation.z = point.plane === 'Y' ? (point.angle + joint.angle) * (Math.PI/180) : point.angle * (Math.PI/180);
        sceneObject.add(object);

        this.updatePointSize(model_id, point);

      }, (xhr: any) => {
        // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      }, (error: any) => {
        // console.log( 'Error loading model' );
      });
    }
  }


  importOBJModel(url: string, name: string) {
    this.config.rotaryControls = new THREE.Group();
    this.config.rotaryControls.name = name;
    this.config.loader.load('./assets/models/' + url, (object: any) => {   // called when resource is loaded
      object.name = name;

      object.traverseVisible( ( child: any ) => {
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
      // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
    }, (error: any) => {
      // console.log( 'Error loading model' );
    });
  }



  updatePointAngle(point: Connector) {
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
    if (sceneObject && sceneObject.isGroup) {

      sceneObject.traverse( ( child: any ) => {
        if ( child.isGroup ) {
          const selectedMesh = child.children.filter(c => c.name === point.id)[0];
          if (selectedMesh) {
            const angleRad = point.plane === 'Y' ? (point.angle + this.kinematicService.selectedJoints[0].angle) * (Math.PI/180) : point.angle * (Math.PI/180);
            selectedMesh.rotation.z = angleRad;
            point.vector3 = new THREE.Vector3(-Math.cos(angleRad + (Math.PI / 2)), -Math.sin(angleRad + (Math.PI / 2)),0);
            point.vector3.normalize();
            this.kinematicsDrawingService.animate();
          }
        }
      });

      this.updateJointLimits(this.kinematicService.selectedJoints[0]);
    }
  }



  updatePointType(id: string, point: Connector) {
    const joint = this.kinematicService.joints.filter(j => j.id === id)[0];
    if (joint) {
      const connector = joint.connectors.filter(p => p.id === point.id)[0];
      if (connector) {
        connector.plane = connector.plane === 'X' ? 'Y' : 'X';
        connector.size = this.kinematicService.getConnectorSize(connector.plane, joint.modelType, joint.isMotor);
      }
      this.kinematicService.selectedJoints[0] = this.kinematicService.updateConnectionPoint(id, point);
      this.removeConnectorImage(point);
      this.importOBJModelToGroup(point, joint.id);
      this.kinematicsDrawingService.animate();
      // this.updateJointLimits(this.kinematicService.selectedJoints[0]);
    }
  }



  updateJointLimits(joint: JointLink) {
    if (joint) {
      const connY = joint.connectors.filter(c => c.plane === 'Y');
      const connX = joint.connectors.filter(c => c.plane === 'X');

      if ((connY.length === 0 || connX.length === 0) || joint.modelType === 2) {
        joint.limits.min = -this.infinity;
        joint.limits.max = this.infinity
      } else {
        let min = 360;
        let max = 0;
        for (const connector of connY) {

          if (connector.angle < min) {
            min = connector.angle;
            if (max === 0) { max = min; }
          }
          if (connector.angle > max) {
            max = connector.angle;
          }
        }

        let minX = 0;
        let maxX = 360;

        for (const connector of connX) {
          console.log(connector.angle, minX, maxX);
          if (connector.angle > minX && connector.angle < min) {
            minX = connector.angle;
          }
          if (connector.angle < maxX && connector.angle > max) {
            maxX = connector.angle;
          }
        }

        joint.limits.min = min - minX;
        joint.limits.max = maxX - max;
      }
    }
    this.updateJoint(this.kinematicService.selectedJoints[0]);
  }



  getClosestConnector(connectors: any, angle: number) {
    let movableRange = 360;
    for (const conn of connectors) {
      console.log(conn.angle, angle);
      if (conn.angle - angle < movableRange && conn.angle - angle > 0) {
        movableRange = conn.angle - angle;
      }
    }
    return movableRange;
  }


  removeConnectorImage(point: Connector) {
    // console.log(name);
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
    if (sceneObject && sceneObject.isGroup) {
      // const group = sceneObject.children.filter(c => c.name === name)[0];
      sceneObject.traverseVisible( ( child: any ) => {
        if ( child.isGroup ) {
          const selectedMesh = child.children.filter(c => c.name === point.id)[0];
          sceneObject.remove(selectedMesh);
        }
      });

      // if (group) {
        // sceneObject.remove(group);
      // }
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



  updatePointSize(joint_id: string, point: Connector) {
    const sceneObject = this.config.scene.getObjectByName(joint_id);
    const joint = this.kinematicService.joints.filter(j => j.id === joint_id)[0];
    if (joint) {
      const connector = joint.connectors.filter(c => c.id === point.id)[0];
      connector.size.scale = point.size.value / point.size.original;
      connector.size.value = point.size.value;
      // console.log(point);
      if (sceneObject) {
        sceneObject.traverseVisible( ( child: any ) => {
          if (child.uuid === point.block_id ) {
            child.scale.y = connector.size.scale;
            child.position.y = -point.size.offset * (connector.size.scale - 1);
            // console.log(child.position);
          } else if( child.uuid === point.id) {
            child.position.y = point.plane === 'Y'? connector.size.value - 2.5 : connector.size.value - 2;
          }
        });
        joint.sceneObject = sceneObject;
        this.kinematicService.selectedJoints = [ joint ];
      }
      this.kinematicsDrawingService.animate();

    }
  }


  changeSize(element: JointLink) {
    const sceneObject = this.config.scene.getObjectByName(element.id);
    const newScale = element.size / 40;
    if (sceneObject) {
      sceneObject.traverseVisible( ( child: any ) => {
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



  updateJointAngle(joint: JointLink) {
    //update all Y connectors and rotary indicator
    const sceneObject = this.config.scene.getObjectByName(joint.id);
    const Yconnectors = joint.connectors.filter(c => c.plane === 'Y');

    if (sceneObject) {
      sceneObject.traverse( (child: any) => {
        if (child.name === 'Z') {
          child.rotation.z = joint.angle * (Math.PI/180);
        }

        if (Yconnectors && Yconnectors.filter(c => c.id === child.name)[0]) {
          const connector = joint.connectors.filter(c => c.id === child.name)[0];
          if (connector) {
            const angleRad = (connector.angle + joint.angle) * (Math.PI/180);
            connector.vector3 = new THREE.Vector3(-Math.cos(angleRad + (Math.PI / 2)), -Math.sin(angleRad + (Math.PI / 2)),0);
            child.rotation.z = angleRad;
            this.kinematicService.updateConnectionPoint(joint.id, connector);
          }
        }
      });

      joint.sceneObject = sceneObject;
      this.kinematicService.updateJoint(joint);

      this.kinematicsDrawingService.animate();
    }
  }


}
