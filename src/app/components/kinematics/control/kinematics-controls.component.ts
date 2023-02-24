import { Component, Inject, AfterViewInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import * as THREE from 'three';
import { KinematicService } from 'src/app/services/kinematic.service';
import { Connector, ConnectorSize, JointLink, Model, Point, URFD_Joint, URFD_Link, Vector3 } from 'src/app/models/kinematic.model';
import { HardwareService } from 'src/app/services/hardware.service';

import { KinematicsConfig } from 'src/app/models/kinematics-config.model';
import { KinematicsDrawingService } from 'src/app/services/kinematics-drawing.service';
import { DragControlsService } from 'src/app/services/drag-controls.service';
import { IKService } from 'src/app/services/IK.service';
import { DOCUMENT } from '@angular/common';

@Component({
    selector: 'app-kinematics-control',
    templateUrl: './kinematics-control.component.html',
    styleUrls: ['../../windows/effects/effects.component.css','./../kinematics.component.css']
})
export class KinematicsControlComponent implements AfterViewInit {

  public visible = [true, false, false, false, false, false, false, false];

  public config: KinematicsConfig;

  infinity = -3.4576917263943217389012348562315E+1203466;


  models = [
    new Model(0, 'revolute', true, 'active_joint_1.png', [ { g:'B', url:'active_joint_stator.obj'} ], 0xcc0000, { x: 0, y: 0, z: Math.PI },
    new ConnectorSize(1.5, 1, 25.075, 23.575, new THREE.Vector3(0,1,0)), new ConnectorSize(2.5, 1, 29, 26.5, new THREE.Vector3(0,1,0)), Math.PI, [ { g:'A', url:'joint_rotor.obj'} ]),

    new Model(0, 'revolute', false, 'passive_joint_1.png', [ { g:'B', url:'passive_joint_stator.obj'} ], 0x0000e6, { x: 0, y: 0, z: Math.PI },
    new ConnectorSize(1.5, 1, 19.93, 18.43, new THREE.Vector3(0,1,0)), new ConnectorSize(2.5, 1, 25.5, 23, new THREE.Vector3(0,1,0)), Math.PI, [ { g:'A', url:'passive_joint_rotor.obj'} ]),

    new Model(0, 'revolute', true, 'active_joint_3.png', [ { g:'A', url:'active_joint_stator_Z_top.obj'} ], 0xcc0000, { x: -(Math.PI/2), y:0, z: 0 },
    new ConnectorSize(1, 1, 16.5, 15.5, new THREE.Vector3(0,1,0)), new ConnectorSize(1, 1, 16.5, 15.5, new THREE.Vector3(0,1,0)), 0, [ { g:'A', url:'active_joint_stator_Z_bottom.obj'} ]),

    new Model(0, 'revolute', false, 'passive_joint_3.png', [ { g:'B', url:'passive_joint_stator_Y.obj'} ], 0x0000e6, {   x: -(Math.PI/2), y:0, z: 0 },
    new ConnectorSize(1, 1, 16.5, 15.5, new THREE.Vector3(0,1,0)), new ConnectorSize(1, 1, 16.5, 15.5, new THREE.Vector3(0,1,0)), 0),

    new Model(0, 'fixed', false, 'fixed_joint.png', [ { g:'B', url:'fixed_joint_base.obj'}, { g:'Z', url: 'fixed_joint_connector_X.obj' }], 0x222222, { x: 0, y: 0, z: Math.PI },
    new ConnectorSize(1.5, 1, 25.075, 23.575, new THREE.Vector3(0,1,0)), new ConnectorSize(1.5, 1, 25.075, 23.575, new THREE.Vector3(0,1,0)))
  ];



//this.kinematicService.selectedJoints[0].type === 'motor' && this.kinematicService.selectedJoints[0].subtype === 'b' && type === 'i'

  constructor(@Inject(DOCUMENT) private document: Document, public kinematicService: KinematicService, private kinematicsDrawingService: KinematicsDrawingService,
              private electronService: ElectronService, public hardwareService: HardwareService, public ikService: IKService, private dragControlService: DragControlsService) {

    this.config = this.kinematicsDrawingService.config;

    this.electronService.ipcRenderer.on('controlsVisible', (event: any, data: any) => {
      this.visible[0] = data;
    });

    console.log(this.models);


    // this.kinematicService.importOBJModelToObjectGroup.subscribe(res => {
    //   this.importOBJModelToGroup(res.pnt, res.model_id);
    // });

    this.kinematicsDrawingService.updateModelPosition.subscribe(res => {
      this.updateJoint(res);
    });

    this.kinematicsDrawingService.loadModelFromLink.subscribe(res => {
      this.loadOBJModel(res);
    });


    this.ikService.updateIKhelper.subscribe(res => {
      this.kinematicsDrawingService.updateRootsHelper(res);
    });


    this.ikService.updateModels.subscribe(res => {
      this.updateModelsFromRoot(res);
    });


    // this.dragControlService.selectFrame.subscribe(res => {
    //   this.selectedFrame = this.kinematicService.getFrame(res);
    //   console.log(this.selectedFrame);
    // });

    // this.kinematicsDrawingService.updateJointAngleScene.subscribe(res => {
    //   this.updateJointAngle(res);
    // });

    // this.dragControls.updateJointAngleScene.subscribe(res => {
    //   const joint = this.kinematicService.getJoint(res.joint);
    //   if (joint) {
    //     joint.angle += res.delta;
    //     this.updateJointAngle(joint);
    //   }
    // });

    // console.log(this.infinity);
  }


  ngAfterViewInit(): void {
    (this.document.getElementById('display_models') as HTMLInputElement).checked = true;
    // this.loadSavedModels();
  }

  onControlsMouseover() {
    this.ikService.ikConfig.drag.rayCaster.layers.disableAll();
    this.kinematicsDrawingService.setControlsActive.next(true);
  }

  onControlsMouseout() {
    this.ikService.ikConfig.drag.rayCaster.layers.enableAll();
    this.kinematicsDrawingService.setControlsActive.next(false);
  }


  updateJoint(frame: any) {
    if (frame) {
      // const object = this.config.scene.getObjectByName(frame.id);

      // if (object) {
      //   object.position.x = frame.dimensions.origin.x;
      //   object.position.y = frame.dimensions.origin.y;
      //   object.position.z = frame.dimensions.origin.z;

      //   object.rotation.x = frame.dimensions.rpy.x * (Math.PI / 180);
      //   object.rotation.y = frame.dimensions.rpy.y * (Math.PI / 180);
      //   object.rotation.z = frame.dimensions.rpy.z * (Math.PI / 180);

      //   object.quaternion.setFromEuler(object.rotation);

      //   object.updateMatrix();


      //   // joint.sceneObject = object;
      // }
    }

    // this.kinematicService.updateJoint(joint);
    // this.kinematicService.updateJointVisualization(joint.id, joint.object3D);

  }


  loadSavedModels() {
    // console.log('load models');
    // console.log(this.kinematicService.frames);
    for (const frame of this.kinematicService.frames) {

      this.loadOBJModel(frame);
      this.kinematicsDrawingService.animate();
    }
    // console.log(this.config.scene);

  }



  deletePoint(id: string, point_id: string) {
    const joint = this.kinematicService.frames.filter(j => j.id === id)[0];

    if (joint) {
      const point = joint.connectors.filter(p => p.id === point_id)[0];

      if (point) {
        this.removeConnectorImage(point);
        const index = joint.connectors.indexOf(point);
        if (index > -1) { joint.connectors.splice(index, 1); }
      }
    }
  }

  addFrame(model: Model) {

    if (this.ikService.ikConfig.drag.selected && this.ikService.ikConfig.drag.selected.parent) {
      const selectedFrame = this.kinematicService.getFrame(this.ikService.ikConfig.drag.selected.parent.name);
      console.log(selectedFrame);
      const updatedModel = this.updatePosition(selectedFrame, model);
      if (selectedFrame instanceof URFD_Joint) {
        this.addLink(updatedModel, this.ikService.ikConfig.drag.selected, null, true);
      } else {
        this.addJoint(updatedModel, this.ikService.ikConfig.drag.selected, null, false);
      }
    } else {
      console.log(model);
      this.addJoint(model, null, null, false);
    }

  }


  addJoint(model: Model, selected: any, urfd_link: URFD_Link = null, parent = false) {
    let selectedName = null;

    if (selected !== null || urfd_link !== null) {
      selectedName = selected !== null ? selected.parent.name : urfd_link.id.slice(0, -5);
    }

    const urfd_joint = this.kinematicService.addNewJoint(!parent ? null : selectedName, model, parent);

    this.ikService.newJoint(urfd_joint, selected, parent);
    this.loadOBJModel(urfd_joint);

    if (!parent && model.linkObjectUrls) {
      this.addLink(model, null, urfd_joint, false);
    }

    this.kinematicsDrawingService.animate();
  }



  addLink(model: Model, selected: any, urfd_joint: URFD_Joint = null, parent = false) {
    let selectedName = null;

    if (!parent && (selected !== null || urfd_joint !== null)) {
      selectedName = selected !== null ? selected.parent.name : urfd_joint.id;
    }

    const urfd_link = this.kinematicService.addNewLink(selectedName, model, parent);

    this.ikService.newLink(urfd_link, selected, parent);
    this.loadOBJModel(urfd_link);

    if (parent && model.objectUrls) {
      this.addJoint(model, null, urfd_link, true);
    }

    this.kinematicsDrawingService.animate();
  }



  updatePosition(SF: any, model: Model) : Model {

    console.log('update position');
    console.log(SF, model, this.ikService.ikConfig.drag.selected.parent);
    // const frame = this.kinematicService.getFrame(this.dragControlService.selected.parent.name);
    const modelType = SF instanceof URFD_Link ? model.baseSize : model.linkSize;
    const modelCopy = JSON.parse(JSON.stringify(model));
    const x = SF.size.axis.x === 1 ? SF.size.value + modelType.value : 0;
    const y = SF.size.axis.y === 1 ? SF.size.value + modelType.value : 0;
    const z = SF.size.axis.z === 1 ? SF.size.value + modelType.value : 0;

    // const x2 = modelType.axis.x === 1 ? SF.size.value + modelType.value : 0;
    // const y2 = modelType.axis.y === 1 ? SF.size.value + modelType.value : 0;
    // const z2 = modelType.axis.z === 1 ? SF.size.value + modelType.value : 0;

    const position = new THREE.Vector3(x, y, z);

    // const position2 = new THREE.Vector3(x2, y2, z2);

    console.log(position, this.ikService.ikConfig.drag.selected.parent.position);

    position.applyMatrix4(this.ikService.ikConfig.drag.selected.parent.matrixWorld);
    const updatedPosition = this.dragControlService.getRotatedPosition(this.ikService.ikConfig.drag.selected.parent, position);

    console.log(updatedPosition);

    const translationMatrix = new THREE.Matrix4()
        .makeTranslation(this.ikService.ikConfig.drag.selected.parent.position.x,
                         this.ikService.ikConfig.drag.selected.parent.position.y,
                         this.ikService.ikConfig.drag.selected.parent.position.z);


    console.log(translationMatrix);

    updatedPosition.applyMatrix4(translationMatrix);

    console.log(updatedPosition);
    //lookAt
    //const rotationMatrix = new THREE.Matrix4().makeRotationFromQuaternion(this.ikService.ikConfig.drag.selected.parent.quaternion);

    modelCopy.origin.x = updatedPosition.x;
    modelCopy.origin.y = updatedPosition.y;
    modelCopy.origin.z = updatedPosition.z;

    // console.log('updated position ', updatedPosition);

    const a = new THREE.Euler();
    a.setFromQuaternion(this.ikService.ikConfig.drag.selected.parent.quaternion);

    modelCopy.rpy.x += a.x;
    modelCopy.rpy.y += a.y;
    modelCopy.rpy.z += modelCopy.startAngle;

    if (model.rpy.x !== 0) { modelCopy.rpy.y -= a.z }

    return modelCopy;
  }



  loadOBJModel(model: any) {
    // console.log(model);
    const group = new THREE.Group();
    group.name = model.id;


    for (const item of model.object3D.objectUrls) {
      // console.log(item);
      this.config.loader.load('./assets/models/' + item.url, (object: any) => {   // called when resource is loaded
        // console.log(object);
        object.name = item.g;

        object.traverseVisible( ( child: any ) => {
            if ( child instanceof THREE.Mesh ) {
              this.kinematicsDrawingService.updateColor(child);
            }
        });

        group.add(object);

      }, (xhr: any) => {
        // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
      }, (error: any) => {
        // console.log( 'Error loading model' );
      });
    }

    this.config.scene.add( group );
    group.position.set(model.dimensions.origin.x, model.dimensions.origin.y, model.dimensions.origin.z);
    group.rotation.set(model.dimensions.rpy.x, model.dimensions.rpy.y, model.dimensions.rpy.z);

    const frame = this.kinematicService.getFrame(model.id);
    frame.dimensions.rpy.x = group.rotation.x;
    frame.dimensions.rpy.y = group.rotation.y;
    frame.dimensions.rpy.z = group.rotation.z;

    // group.matrixAutoUpdate = false;

    // this.ikService.updateObjectQuaternion(frame.id, group.quaternion, false);


    // console.log(group, frame);

  }


  displayModels() {

    this.ikService.ikConfig.screen.displayModels = !this.ikService.ikConfig.screen.displayModels;

    this.config.scene.traverse(c => {

      if (c.type === 'Group') {
        const name = c.name;
        // console.log(c);
        if (this.kinematicService.inList(name)) {
          c.visible = this.ikService.ikConfig.screen.displayModels ? true : false;
        }
      }
    });

    this.kinematicsDrawingService.animate();
  }

  showRootsHelper() {
    this.ikService.ikConfig.screen.displayIK = !this.ikService.ikConfig.screen.displayIK;
    this.config.scene.traverse( c => {
      if (c.name === 'ikHelper') {
        c.visible = this.ikService.ikConfig.screen.displayIK;
      }
    });
    this.ikService.ikConfig.screen.displayIK ? this.kinematicsDrawingService.addObjectToScene(this.ikService.ikConfig.ikHelper, false) : this.kinematicsDrawingService.removeObjectFromScene('ikHelper');
  }



  updateModelsFromRoot(roots: any) {
    // console.log(roots);
    // for (const root of roots) {
      // root.traverse( c => {
      //   console.log(c.position, c.quaternion);
      //   const frameObject = this.config.scene.getObjectByName(c.name);
      //   console.log(frameObject.position, frameObject.quaternion);
      //   // if (frameObject) {
      //     // frameObject.quaternion.set(c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w);
      //     // frameObject.position.set(c.position.x, c.position.y, c.position.z);
      //   //   // frameObject.applyMatrix4(c.matrixWorld);
      //     // frameObject.updateMatrix();
      //   //   this.kinematicService.updateFramePositionFromObject(frameObject);
      //   // }
      // });
    // }
    // console.log(this.ikService.ikFrames);

    // for (const frame of this.ikService.ikFrames) {
    //   const frameObject = this.config.scene.getObjectByName(frame.name);
    //   console.log(frame, frameObject.position, frameObject.quaternion);
    //   frameObject.quaternion.set(frame.quaternion.x, frame.quaternion.y, frame.quaternion.z, frame.quaternion.w);
    //   frameObject.position.set(frame.position.x, frame.position.y, frame.position.z);
    //   frameObject.updateMatrix();
    // }

    // this.kinematicsDrawingService.animate();
  }


  // importOBJModelToGroup(point: Connector, model_id: string, joint = null) {
  //   if (joint === null) {
  //     joint = this.kinematicService.selectedFrames[0];
  //   }
  //   const sceneObject = this.config.scene.getObjectByName(joint.id);

  //   if (sceneObject && sceneObject.isGroup && point) {
  //     const imageUrl = (joint.active ? 'active':'passive') + '_joint_' + joint.modelType + '_connector_' + point.plane + '.obj';

  //     this.config.loader.load('./assets/models/' + imageUrl, (object: any) => {   // called when resource is loaded
  //       // console.log(object);
  //       object = this.kinematicService.updateObjectDetails(object, model_id, point.name, this.config.selectColor);

  //       object.rotation.z = point.plane === 'Y' ? (point.angle + joint.angle) * (Math.PI/180) : point.angle * (Math.PI/180);
  //       sceneObject.add(object);

  //       // this.updatePointSize(model_id, point);

  //     }, (xhr: any) => {
  //       // console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
  //     }, (error: any) => {
  //       // console.log( 'Error loading model' );
  //     });
  //   }
  // }




  updatePointAngle(point: Connector) {
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedFrames[0].id);
    if (sceneObject && sceneObject.isGroup) {

      sceneObject.traverse( ( child: any ) => {
        if ( child.isGroup ) {
          const selectedMesh = child.children.filter(c => c.name === point.id)[0];
          if (selectedMesh) {
            const angleRad = point.plane === 'Y' ? (point.angle + this.kinematicService.selectedFrames[0].angle) * (Math.PI/180) : point.angle * (Math.PI/180);
            selectedMesh.rotation.z = angleRad;
            point.vector3 = new THREE.Vector3(-Math.cos(angleRad + (Math.PI / 2)), -Math.sin(angleRad + (Math.PI / 2)),0);
            point.vector3.normalize();
            this.kinematicsDrawingService.animate();
          }
        }
      });

      // this.updateJointLimits(this.kinematicService.selectedFrames[0]);
    }
  }



  // updatePointType(id: string, point: Connector) {
  //   const joint = this.kinematicService.frames.filter(j => j.id === id)[0];
  //   if (joint) {
  //     const connector = joint.connectors.filter(p => p.id === point.id)[0];
  //     if (connector) {
  //       connector.plane = connector.plane === 'X' ? 'Y' : 'X';
  //       // connector.size = this.kinematicService.getConnectorSize(connector.plane, joint.modelType, joint.isMotor);
  //     }
  //     this.kinematicService.selectedFrames[0] = this.kinematicService.updateConnectionPoint(id, point);
  //     this.removeConnectorImage(point);
  //     this.importOBJModelToGroup(point, joint.id);
  //     this.kinematicsDrawingService.animate();
  //     // this.updateJointLimits(this.kinematicService.selectedJoints[0]);
  //   }
  // }



  // updateJointLimits(joint: URFD_Joint) {
  //   if (joint) {
  //     const connY = joint.connectors.filter(c => c.plane === 'Y');
  //     const connX = joint.connectors.filter(c => c.plane === 'X');

  //     if ((connY.length === 0 || connX.length === 0) || joint.modelType === 2) {
  //       joint.limits.min = -this.infinity;
  //       joint.limits.max = this.infinity
  //     } else {
  //       let min = 360;
  //       let max = 0;
  //       for (const connector of connY) {

  //         if (connector.angle < min) {
  //           min = connector.angle;
  //           if (max === 0) { max = min; }
  //         }
  //         if (connector.angle > max) {
  //           max = connector.angle;
  //         }
  //       }

  //       let minX = 0;
  //       let maxX = 360;

  //       for (const connector of connX) {
  //         console.log(connector.angle, minX, maxX);
  //         if (connector.angle > minX && connector.angle < min) {
  //           minX = connector.angle;
  //         }
  //         if (connector.angle < maxX && connector.angle > max) {
  //           maxX = connector.angle;
  //         }
  //       }

  //       joint.limits.min = min - minX;
  //       joint.limits.max = maxX - max;
  //     }
  //   }
  //   this.updateJoint(this.kinematicService.selectedFrames[0]);
  // }



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
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedFrames[0].id);
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

  // stopPropagation(event: Event) {
  //   event.stopPropagation();
  // }

  inputActive(active: boolean) {
    this.config.inputActive = active;
  }



  // updatePointSize(joint_id: string, point: Connector) {
  //   const sceneObject = this.config.scene.getObjectByName(joint_id);
  //   const joint = this.kinematicService.frames.filter(j => j.id === joint_id)[0];
  //   if (joint) {
  //     const connector = joint.connectors.filter(c => c.id === point.id)[0];
  //     connector.size.scale = point.size.value / point.size.original;
  //     connector.size.value = point.size.value;
  //     // console.log(point);
  //     if (sceneObject) {
  //       sceneObject.traverseVisible( ( child: any ) => {
  //         if (child.uuid === point.block_id ) {
  //           child.scale.y = connector.size.scale;
  //           child.position.y = -point.size.offset * (connector.size.scale - 1);
  //           // console.log(child.position);
  //         } else if( child.uuid === point.id) {
  //           child.position.y = point.plane === 'Y'? connector.size.value - 2.5 : connector.size.value - 2;
  //         }
  //       });
  //       joint.sceneObject = sceneObject;
  //       this.kinematicService.selectedFrames = [ joint ];
  //     }
  //     this.kinematicsDrawingService.animate();

  //   }
  // }


  changeSize(frame: any) {
    const sceneObject = this.config.scene.getObjectByName(frame.id);
    if (frame.size.value - frame.size.offset >= 0) {
      frame.size.scale = (frame.size.value - frame.size.offset) / frame.size.original;
      if (sceneObject) {
        sceneObject.traverseVisible( ( child: any ) => {
          if ( child.name === 'Gray:A:0' ) {
            child.scale.y = frame.size.scale;
            child.position.y = (frame.size.scale - 1) * -frame.size.offset;
          } else if ( child.name === 'Gray:A:1' ) {
            child.scale.z = frame.size.scale;
            child.position.z = (frame.size.scale - 1) * -frame.size.offset;
          } else if( child.name === 'Yellow:XY:0') {
            child.position.y = frame.size.value - frame.size.offset - frame.size.original;
          }
        });

        this.kinematicsDrawingService.animate();
      }

    } else {
      frame.size.value = frame.size.offset;
    }
  }



  updateJointAngle(frame: any) {

    const frameObject = this.config.scene.getObjectByName(frame.id);
    // console.log(frameObject);


    // console.log(joint);
    //update all Y connectors and rotary indicator
    // const sceneObject = this.config.scene.getObjectByName(joint.id);
    // const Yconnectors = joint.connectors.filter(c => c.plane === 'Y');
    // // console.log(sceneObject, Yconnectors);
    // if (sceneObject) {
    //   sceneObject.traverse( (child: any) => {
    //     if (child.name === 'Z') {
    //       child.rotation.z = joint.angle * (Math.PI/180);
    //     }

    //     if (Yconnectors && Yconnectors.filter(c => c.id === child.name)[0]) {
    //       const connector = joint.connectors.filter(c => c.id === child.name)[0];
    //       if (connector) {
    //         const angleRad = (connector.angle + joint.angle) * (Math.PI/180);
    //         connector.vector3 = new THREE.Vector3(-Math.cos(angleRad + (Math.PI / 2)), -Math.sin(angleRad + (Math.PI / 2)),0);
    //         child.rotation.z = angleRad;
    //         this.kinematicService.updateConnectionPoint(joint.id, connector);
    //       }
    //     }
    //   });

    //   joint.sceneObject = sceneObject;
    //   this.kinematicService.updateJoint(joint);

    //   this.kinematicsDrawingService.animate();
    // }
  }


}
