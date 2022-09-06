import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { Point, JointLink } from '../models/kinematic.model';
import { KinematicsConfig } from '../models/kinematics-config.model';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { KinematicService } from './kinematic.service';
import { ClosedChainIKService } from './closed-chain-ik.service';
import { KinematicLinkService } from './kinematic-link.service';


@Injectable()
export class KinematicsDrawingService {

  public config: KinematicsConfig;

  selectObjectFromScene: Subject<any> = new Subject();
  updateModelPosition: Subject<any> = new Subject();

  loadOBJ: Subject<any> = new Subject();
  updateKinematicsProgress: Subject<any> = new Subject();
  selectControl: Subject<any> = new Subject();
  updateCameraView: Subject<any> = new Subject();
  selectCameraView: Subject<any> = new Subject();
  loadModelFromLink: Subject<any> = new Subject();
  updateJointAngleScene: Subject<any> = new Subject();


  constructor(@Inject(DOCUMENT) private document: Document, private kinematicService: KinematicService, private closedChainIKService: ClosedChainIKService,
              private kinematicLinkService: KinematicLinkService) {
    this.config = new KinematicsConfig();

    this.closedChainIKService.addToScene.subscribe(res => {
      console.log(res);
      this.addObjectToScene(res.object, res.addControls);
    });

    this.closedChainIKService.removeFromScene.subscribe(res => {
      this.removeObjectFromScene(res);
    });

    this.closedChainIKService.updateJointsInScene.subscribe(res => {
      this.updateJointsInRoot(res.joint, res.position, res.quaternion);
    });

    this.closedChainIKService.animateScene.subscribe(res => {
      this.animate();
    });
  }



  public selectSceneObject( object: any ) {
    this.selectObjectFromScene.next(object);
  }

  updateProgess(_status: String, _progress: number) {
    this.updateKinematicsProgress.next({ status: _status, progress: _progress });
  }


  updateCamera() {
    this.updateCameraView.next();
  }
  selectCamera() {
    this.selectCameraView.next();
  }

  updateControlMode(name: string) {
    if (name !== 'rotateAxis' && name !== 'move') {
      this.config.control.setMode( name );
      this.config.move = false;
    } else if ('move') {
      this.config.move = true;
    }
  }

  selectControlMode(name: string) {
    this.selectControl.next(name);
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
    this.config.control.setSpace( 'local' );
    this.config.control.addEventListener( 'objectChange', (event: any) => {
      if (this.kinematicService.selectedJoints.length === 1) {
        const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
        if (sceneObject) {
          this.updatePosition(sceneObject, this.kinematicService.selectedJoints[0], true);
        }
      }
    });

    this.config.control.addEventListener( 'mouseUp', (event: any) => {
      if (this.config.move) {
        console.log('update target');
        this.closedChainIKService.updateTargetObject();
      }
    });

    this.config.control.addEventListener( 'dragging-changed', ( event: any ) => {
      // this.config.orbit.enabled = this.config.draggableObject !== undefined ? false : !event.value;
      this.config.orbit.enabled = !event.value;

      // console.log('dragging changed controls', this.config.orbit.enabled);
      // if (this.kinematicService.selectedJoints.length === 1) {
      //   const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
      //   if (sceneObject) { this.updatePosition(sceneObject, this.kinematicService.selectedJoints[0]); }
      // }
    });

    this.config.control.setTranslationSnap( 10 );
    this.config.control.setRotationSnap( THREE.MathUtils.degToRad(15) );
    this.config.control.setScaleSnap( 0.25 );

    this.config.pivotPoint = new THREE.Object3D();
    this.config.scene.add(this.config.pivotPoint);

    this.config.scene.add( this.config.control );
    this.addRotationCircle();
    // this.config.rotaryControls.addEventListener( 'dragging-changed', ( event: any ) => {
    //   this.config.orbit.enabled = !event.value;
    //   console.log('dragging changed rotary', this.config.orbit.enabled);
    // });


    this.config.orbit.update();

    const joints = this.kinematicService.getAllJoints();

    if (joints) {
      for (const joint of joints) {
        this.loadModelFromLink.next(joint);
      }
      this.deselectAllObjects();
    }

    // const promise = this.closedChainIKService.loadCuriosity();
    // console.log(promise);
    // this.closedChainIKService.loadModel( promise );
  };





  addObjectToScene(object: any, addControls = false) {
    if (object) {
      this.config.scene.add(object);
      console.log(this.config.scene);
      if (addControls) {
        const sceneObject = this.config.scene.getObjectByName(object.name);
        this.config.control.attach(sceneObject);
      }
      this.animate();
    }
  }

  removeObjectFromScene(name: string) {
    const object = this.config.scene.getObjectByName(name);
    if (object) {
      this.config.scene.remove(object);
    }
    this.animate();
  }



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


  drawArrowHelper(origin : THREE.Vector3, dir: THREE.Vector3, color: number) {
    //normalize the direction vector (convert to vector of length 1)
    dir.normalize();
    const length = 20;

    const arrowHelper = new THREE.ArrowHelper( dir, origin, length, color );
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

    this.closedChainIKService.render();

    this.config.renderer.render(this.config.scene, this.config.currentCamera);
  }


  getIntersects(shift: boolean) {

    this.config.rayCaster.setFromCamera(this.config.mousePosition, this.config.currentCamera);
    const intersects = this.config.rayCaster.intersectObjects(this.config.scene.children);
    // console.log(intersects);

    // if (intersects && intersects[0].object.parent.name === 'rotary_control') {
    //   console.log('draggable');
    //   this.config.draggableObject = intersects[0].object.parent;

    // } else {
      if (!intersects[0].isTransformControlsPlane) {

        for (const intersect of intersects) {
        // console.log(intersect);




          // if (intersects && intersect.object.parent.name === 'rotary_control') {
          //   this.config.draggableObject = intersect.object.parent;
          //   console.log('rotate');

          //   this.config.pivotPoint.rotation.z = this.getAngleRotaryElement();
          //   break;

          // } else

          if (intersect.object && intersect.object instanceof THREE.Mesh) {
            // console.log(intersect.object);
            const selectedElement = this.getObjectDetailsFromName(intersect.object.name);
            // console.log(selectedElement);
            if (selectedElement) {
              // console.log(selectedElement);
              if (selectedElement.color === 'Yellow') {
                this.selectConnectionElement(intersect.object, shift);
                break;
              } else if (selectedElement.color === 'Gray' && selectedElement.axis === 'M') {
                this.selectMovableElement(intersect.object, selectedElement.val);
                break;
              }
            }
          }

          const joint = this.kinematicService.joints.filter(j => j.sceneObject.id === intersect.object.parent.id || (intersect.object.parent.parent && j.sceneObject.id === intersect.object.parent.parent.id))[0];

          if (joint) {
            this.selectObject(joint.sceneObject, shift);
            this.animate();

            break;
          }
        }

        // } else {
          // break;
        // }
      }
    // }
  }



  getAngleRotaryElement() {
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
    if (sceneObject) {
      const v1 = sceneObject.position;
      const v2 = this.config.intersects;
      const crossproduct = v1.dot(v2);
      // console.log(v1, v2, crossproduct);

      let magnitude_v1 = Math.sqrt(Math.pow(v1.x, 2) + Math.pow(v1.y, 2) + Math.pow(v1.z, 2));
      if (magnitude_v1 === 0) { magnitude_v1 = 0.01; }
      let magnitude_v2 = Math.sqrt(Math.pow(v2.x, 2) + Math.pow(v2.y, 2) + Math.pow(v2.z, 2));
      if (magnitude_v2 === 0) { magnitude_v2 = 0.01; }

      const angle = (crossproduct / magnitude_v1) / magnitude_v2;
      // console.log(sceneObject);
      sceneObject.rotation.z = angle;

      return angle;
    }
    return 0;
  }

  getObjectDetailsFromName(name: string) {
    if (name) {
      const nameList = name.split(':');
      if (nameList.length > 1) {
        return { axis: nameList[1], color: nameList[0], val: nameList.length > 2 ? nameList[2] : null };
      }
    }
    return;
  }


  updateJointsInRoot(joint: any, position: Array<number>, quaternion: Array<number>) {

    const sceneObject = this.config.scene.getObjectByName(joint.name);
    console.log(sceneObject);
    // console.log(sceneObject.position, joint.position);
    // console.log(sceneObject.quaternion, joint.quaternion);
    console.log(sceneObject.quaternion, quaternion, sceneObject.rotation);

    if (sceneObject) {
      // sceneObject.matrix.set(sceneObject.matrix);

      sceneObject.position.set( position[0], position[1], position[2] );
      console.log(joint);
      // sceneObject.quaternion.setFromRotationMatrix(joint.matrix);
      sceneObject.updateMatrix();
      sceneObject.quaternion.set( quaternion[0], quaternion[1], quaternion[2], quaternion[3] );

      const jointObject = this.kinematicService.getJoint(joint.name);
      jointObject.angle = joint.dofValues[5] * -(180/Math.PI);

      if (jointObject) {
        this.updateJointAngleScene.next(jointObject);
      }
    }
  }


  // dragObject() {
    // If 'holding' an object, move the object
    // if (this.config.draggableObject) {

      // const found = this.config.rayCaster.intersectObjects(this.config.scene.children);
       // `found` is the metadata of the objects, not the objetcs themsevles
      // if (found.length) {
      //   for (let obj3d of found) {
      //     if (!obj3d.object.isDraggablee) {
      //       this.config.draggableObject.rotation.z += 0.01;
      //       break;
      //     }
      //   }
      // }
    // }
  // }


  selectObject(object: any, shift = false) {
    // console.log(object);

    const joint = this.kinematicService.joints.filter(j => j.id === object.name)[0];
    if (joint) {
      const isSelectedIndex = this.kinematicService.selectedJoints.indexOf(joint);
      if (isSelectedIndex > -1) {
        this.deselectObject(object);
        this.config.control.detach();

      } else {
        if (!shift && this.kinematicService.selectedJoints.length > 0) {
          this.deselectAllObjects();
        } else if (shift && this.kinematicService.selectedJoints.length === 1) {
          this.config.control.detach();
        }
        if (object.isGroup) {
          this.kinematicService.selectJoint(joint.id);
          this.setObjectColor(object, this.config.selectColor);
          // console.log(object);
          if (this.kinematicService.selectedJoints.length === 1) {
            if (!this.config.move) {
              this.config.control.attach(object);
            } else {
              console.log(object);
              // const target = this.closedChainIKService.createTarget();
              // this.config.control.attach(target);
              // this.config.closedChaindService.createRootsFromStructure();
              const root = this.kinematicLinkService.getRootWithObject(object.name);
              console.log(root);
              if (root) {
                this.closedChainIKService.createRootsFromList(root, this.config.scene.children.filter(c => c.isGroup));
                this.closedChainIKService.createTarget(object);
              }
            }
          }
        }
      }
    }
  }


  setObjectColor(object: any, color = null) {
    object.traverseVisible( ( child: any ) => {
      if (child.isGroup) {
        for (const childEl of child) {
          if ( childEl instanceof THREE.Mesh ){
            this.updateColor(childEl, color);
          }
        }
      } else if ( child instanceof THREE.Mesh ) {
        this.updateColor(child, color);
      }
    });
  }

  updateColor(child: any, color = null) {
    const child_color = child.name.split(":");
    if (color) {
      child.material = new THREE.MeshStandardMaterial({ color: color });
    } else {
      if (child_color[0] === 'Red') {
        child.material = new THREE.MeshStandardMaterial({ color: 0xf70505 });
      } else if (child_color[0] === 'Blue') {
        child.material = new THREE.MeshStandardMaterial({ color: 0x53d7f5 });
      } else if (child_color[0] === 'Yellow') {
        child.material = new THREE.MeshStandardMaterial({ color: 0xfc7f03 });
      } else if (child_color[0] === 'Gray') {
        child.material = new THREE.MeshStandardMaterial({ color: 0x333333 });
      } else {
        child.material = new THREE.MeshStandardMaterial({ color: 0x7b7b7b });
      }
    }
  }


  selectConnectionElement(object: any, shift = false) {
    // console.log(object);
    this.config.inputActive = false;
    if (object && object.parent) {
      const joint = this.kinematicService.joints.filter(j => j.sceneObject.id === object.parent.id || (object.parent.parent && j.sceneObject.id === object.parent.parent.id))[0];
      if (joint) {

        if (this.kinematicService.checkIfPointIsSelected(joint.id, object.uuid)) {
          // console.log('is selected');
          shift ? this.deselectSelectionPoint(joint.sceneObject.uuid, object) : this.deselectAllObjects();
        } else {
          // const point = new connectionPoint(sceneObject, object);
          // shift ? this.kinematicService.selConnPoints.push(point) : this.kinematicService.selConnPoints = [ point ];
          const point = new Point(joint.id, object.uuid);
          if (!shift) {
            this.deselectAllObjects();
            this.kinematicService.selConnPoints = [ point ];
          } else {
            this.kinematicService.selConnPoints.push(point)
          }
          this.updateColor(object, this.config.selectColor);

          // this.setObjectColor(object, this.config.selectColor);
          // console.log(object);
          // console.log(this.kinematicService.selConnPoints);
        }
      }
    }
  }

  selectMovableElement(object: any, val: any) {

    if (object && object.parent) {

      const joint = this.kinematicService.joints.filter(j => j.sceneObject.id === object.parent.id || (object.parent.parent && j.sceneObject.id === object.parent.parent.id))[0];

      if (joint) {
        if (val && val === 'E') {
          this.deselectAllObjects();
          this.kinematicService.selectedJoints = [ joint ];
          console.log(val);
          this.setObjectColor(object, this.config.selectColor);

          //extend the arm
          //show arrow in direction of
        } else {
          this.deselectAllObjects();
          this.kinematicService.selectedJoints = [joint];
          // this.config.control.detach();
          this.setObjectColor(object, this.config.selectColor);

          // // console.log(sceneObject);
          // const circlePosition = joint.sceneObject.position.clone();
          // circlePosition.z + 15;
          // const circleOrientation = joint.sceneObject.quaternion.clone()
          // this.updateRotation(circlePosition, circleOrientation);
          // this.toggleRotationCircle(true);

          // this.config.pivotPoint.rotation.set(0,0,0);
          // const parent = object.parent;
          // object.parent.getWorldPosition(this.config.pivotPoint.position);
          // this.config.pivotPoint.attach(object);
          // // this.config.pivotPoint.rotation.z = this.getAngleRotaryElement();
          // this.config.pivotPoint.rotation.z = object.rotation.z;

          // parent.attach(object);
        }
      }
    }
  }

  addRotationCircle() {
    this.loadOBJ.next({ url: 'rotary_control.obj', name: 'rotary_control' });
  }

  updateRotation(p: THREE.Vector3, q: THREE.Quaternion) {
    // this.loadSVGImage('./assets/images/svg/rotary_control.svg', 'rotary_control', p, q, angle);
    const circle = this.config.scene.getObjectByName('rotary_control');
    // console.log(circle);
    if (circle) {
      circle.position.set(p.x, p.y, p.z);
      circle.quaternion.set(q.x, q.y, q.z, q.w);
      this.animate();
    }
  }


  updateRotaryAngle(angle: number) {
    // console.log(angle * (180/Math.PI));
    const circle = this.config.scene.getObjectByName('rotary_control');
    if (circle) {
      circle.rotation.z = angle;
    }
    this.animate();
  }


  toggleRotationCircle(visible: boolean) {
    const circle = this.config.scene.getObjectByName('rotary_control');
    // console.log(circle, visible);

    circle.traverse( ( child: any ) => {
      child.visible = visible;
    });
    this.animate();
    // this.config.orbit.enabled = !visible;
    // this.config.orbit.update();

  }

  deselectSelectionPoint(id: string, object: any) {
    this.kinematicService.deleteSelectionPoint(id, object.uuid);
    this.updateColor(object);
    this.animate();
  }


  deselectAllObjects() {
    // console.log(this.config.scene);
    // console.log(this.config.scene.getObjectByName('target'));
    if (this.kinematicService.anySelected()) {
      // console.log('deselect draggable object');
      this.config.draggableObject = undefined;
      this.toggleRotationCircle(false);
      this.config.control.detach();

      for (const object of this.kinematicService.joints) {
        this.deselectObject(object.sceneObject);
      }
      for (const item of this.kinematicService.selConnPoints) {
        const sceneObject = this.config.scene.getObjectByName(item.parent_id);
        if (sceneObject) {
          this.setObjectColor(sceneObject);
        }
      }
      this.kinematicService.deselectAll();
    }
    if (this.config.tmpPlane) {
      this.config.scene.remove(this.config.tmpPlane);
    }
    // if (this.config.move) {
    const target = this.config.scene.getObjectByName('target');
    if (target) {
      console.log(target);
      this.config.scene.remove(target);
      this.closedChainIKService.removeTarget();
    }
    this.animate();

  }


  deselectObject(object: any) {
    this.kinematicService.deselectJoint(object.name);
    this.setObjectColor(object);
  }


  deleteSelectedJoints() {
    if (this.kinematicService.selectedJoints.length > 0) {
      if (this.kinematicService.selectedJoints.length === 1) {
        this.config.control.detach();
      }
      for (const joint of this.kinematicService.selectedJoints) {
        this.deleteObjectFromScene(joint.id);
        this.kinematicLinkService.deleteAllLinks(joint.id);
        this.kinematicService.deleteJoint(joint.id);
      }
      this.animate();
    }
  }

  deleteAllJoints() {
    if (this.kinematicService.selectedJoints.length === 1) {
      this.config.control.detach();
    }
    for (const joint of this.kinematicService.joints) {
      const sceneObject = this.config.scene.getObjectByName(joint.id);
      if (sceneObject) {
        this.config.scene.remove(sceneObject);
      }
    }
    this.kinematicService.deleteAll();
    this.kinematicLinkService.deleteAll();
    this.animate();
  }



  copySelectedJoints() {
    const newSelectedJoints = [];
    if (this.kinematicService.selectedJoints.length > 0) {
      for (const joint of this.kinematicService.selectedJoints) {
        const copySceneObject = joint.sceneObject.clone();
        const newJoint = this.kinematicService.copyJoint(joint.id, copySceneObject);
        newSelectedJoints.push(newJoint);
        this.config.scene.add(newJoint.sceneObject);

        const sceneObject = this.config.scene.filter(newJoint.id);

        // for (const connector of newJoint.connectors) {
        //   // console.log(newJoint.sceneObject.children);
        //   // console.log(connector);
        //   sceneObject.traverse( (child: any) => {
        //     // console.log(child);
        //     if (child instanceof THREE.Mesh) {
        //       // this.updateObjectDetails(child, newJoint.id, connector.name);
        //       this.kinematicService.updateSelectionPointID(newJoint.id, connector.name, child.uuid);
        //     }
        //   });
        // }
        newJoint.sceneObject = sceneObject;
      }
      // this.deselectAllObjects();
      // this.kinematicService.selectedJoints = newSelectedJoints;
    }
  }


  deleteObjectFromScene(name: string) {
    const sceneObject = this.config.scene.getObjectByName(name);
    if (sceneObject) {
      this.config.scene.remove(sceneObject);
    }
  }


  updatePosition(object: any, model: JointLink, updateChildren = false) {
    if (object) {
      if (model) {
        model.sceneObject = object;

        // const diffRotation = {
        //   x: object.rotation.x - model.object3D.rotation.x * (Math.PI / 180),
        //   y: object.rotation.y - model.object3D.rotation.y * (Math.PI / 180),
        //   z: object.rotation.z - model.object3D.rotation.z * (Math.PI / 180)
        // };

        const diffTranslation = {
          x: object.position.x - model.object3D.position.x,
          y: object.position.y - model.object3D.position.y,
          z: object.position.z - model.object3D.position.z
        };

        model.object3D.rotation.x = object.rotation.x * (180 / Math.PI);
        model.object3D.rotation.y = object.rotation.y * (180 / Math.PI);
        model.object3D.rotation.z = object.rotation.z * (180 / Math.PI);

        model.object3D.position.x += diffTranslation.x;
        model.object3D.position.y += diffTranslation.y;
        model.object3D.position.z += diffTranslation.z;


        // if (updateChildren) {
        //   this.updateChildren(model, diffTranslation);
        // }
      }
      this.kinematicService.updateJoint(model);
      // this.kinematicService.updateJointVisualization(model.id, model.object3D);
    }
  }

  updateChildren(model: JointLink, diffTranslation: any, prevModel = null) {
    // console.log(model.connectors);
    for (const item of model.connectors) {
      if (item.connected) {
        if (prevModel === null || prevModel.id !== item.object) {
          const connectedObject = this.kinematicService.joints.filter(j => j.id === item.object)[0];
          if (connectedObject) {
            // console.log('translate children ', diffTranslation);
            this.translateObject(connectedObject, diffTranslation);
            this.updateChildren(connectedObject, diffTranslation, model);
          }
        }
      }
    }
  }

  translateObject(model: JointLink, diffTranslation: any) {
    const sceneObject = this.config.scene.getObjectByName(model.id);
    sceneObject.position.set(sceneObject.position.x + diffTranslation.x, sceneObject.position.y + diffTranslation.y, sceneObject.position.z + diffTranslation.z);
    model.sceneObject = sceneObject;
    model.object3D.position.x += diffTranslation.x;
    model.object3D.position.y += diffTranslation.y;
    model.object3D.position.z += diffTranslation.z;
  }


  hideObject(model: JointLink) {
    if (model.object3D.hidden) {
      this.config.scene.remove( model.sceneObject );
    } else {
      this.config.scene.add( model.sceneObject );
    }
    this.animate();
  }


  groupObjects() {
    if (this.kinematicService.selectedJoints.length > 0) {
      const group = new THREE.Group();

      for (const joint of this.kinematicService.selectedJoints) {
        const object = this.config.scene.getObjectByName(joint.id);
        group.add(object);
        // this.deleteObjectFromScene(object.name);
      }
      this.deselectAllObjects();
      this.config.scene.add( group );
      // console.log(this.config.scene);
      this.selectObject(group);
    }
  }


  getRotation(origin: string, target: string) {
    let rotation: THREE.Vector3;
    if (!origin.includes('Y') && !target.includes('Y')) {
      rotation = new THREE.Vector3(0,1,0);
    } else if (!origin.includes('X') && !target.includes('X')) {
      rotation = new THREE.Vector3(1,0,0);
    } else if (!origin.includes('Z') && !target.includes('Z')) {
      rotation = new THREE.Vector3(0,0,1);
    }
    return rotation;
  }



  getBBox(obj: any) {
    const pointBBox = new THREE.Box3(new THREE.Vector3(), new THREE.Vector3());
    pointBBox.setFromObject(obj);
    // const helper = new THREE.BoxHelper(obj, 0xff0000);
    // helper.update();
    // this.config.scene.add(helper);
    return pointBBox;
  }


  getDirectionVector(object: any, axis:any): THREE.Vector3 {
    // console.log(object, axis);
    const worldDirection = new THREE.Vector3();
    object.getWorldDirection(worldDirection);
    worldDirection.normalize();
    // this.drawArrowHelper(object.position, worldDirection, 0x2121d8);
    const updatedWorldDirect = new THREE.Vector3( axis.vector3.x, axis.vector3.y, axis.vector3.z );
    updatedWorldDirect.applyQuaternion(object.quaternion);
    updatedWorldDirect.normalize();
    // this.drawArrowHelper(object.position, updatedWorldDirect, 0x000000);
    return updatedWorldDirect;
  }


  getBBoxPnt(object: any, name: string): THREE.Vector3 {
    let boxCenterPointTarget = new THREE.Vector3();
    object.traverse( ( child: any ) => {
      if ( child instanceof THREE.Mesh ) {
        if (child.name === name) {
          const box = this.getBBox(child);
          box.getCenter(boxCenterPointTarget);
          // console.log(boxCenterPointTarget);
        }
      }
    });
    return boxCenterPointTarget;
  }



  identifyOrigin(items: Array<JointLink>) {
    const newList = [];
    let tmp = 0;
    for (const item of items) {
      const value = this.kinematicLinkService.getNrOfLinksObject(item.id);
      // console.log(value);
      if (value > tmp) {
        newList.unshift(item);
        tmp = value;
      } else {
        newList.push(item);
      }
    }
    return newList;
  }

  // identifyOrigin(items: Array<JointLink>) {
  //   const newList = [];
  //   for (const item of items) {
  //     if (item.connectors.filter(c => c.connected).length > 0) {
  //       newList.unshift(item);
  //     } else {
  //       newList.push(item);
  //     }
  //   }
  //   return newList;
  // }



  joinObjects() {
    // console.log(this.kinematicService.selConnPoints);

    // check for existing connections
    if (this.kinematicService.selConnPoints.length === 2) {
      if (this.kinematicService.selConnPoints[0].parent_id === this.kinematicService.selConnPoints[1].parent_id) {
        this.updateProgess('not possible to connect the selected points', 0);
        return;
      }

      let models = this.identifyOrigin([this.kinematicService.getJoint(this.kinematicService.selConnPoints[0].parent_id), this.kinematicService.getJoint(this.kinematicService.selConnPoints[1].parent_id)]);

      let sceneModels = [];
      let connPnts = [];
      // console.log(this.kinematicService.joints);
      for (const model of models) {
        let sceneModel = this.config.scene.getObjectByName(model.id);
        // console.log(model.id, sceneModel);
        sceneModel.updateMatrix();
        sceneModels.push(sceneModel);

        for (const point of this.kinematicService.selConnPoints) {
          if (point.parent_id === model.id) {
            let connPnt = this.kinematicService.getSelectionPoint(model.id, point.id);
            connPnts.push(connPnt);
          }
        }
      }
      // console.log(models, sceneModels, connPnts);
      sceneModels[1].rotation.set(sceneModels[0].rotation.x, sceneModels[0].rotation.y, sceneModels[0].rotation.z);

      const pnt_dir_origin = this.getDirectionVector(sceneModels[0], connPnts[0]);
      const pnt_dir_target = this.getDirectionVector(sceneModels[1], connPnts[1]);

      console.log(pnt_dir_origin, pnt_dir_target);

      const quaternion = new THREE.Quaternion();
      const reverseOrigin = new THREE.Vector3();
      reverseOrigin.multiplyVectors(pnt_dir_target, new THREE.Vector3(-1,-1,-1));
      quaternion.setFromUnitVectors(pnt_dir_origin, reverseOrigin);
      const matrix = new THREE.Matrix4();
      matrix.makeRotationFromQuaternion( quaternion );
      sceneModels[1].applyMatrix4( matrix );
      sceneModels[1].updateMatrix();

      console.log('update angle', connPnts[0].plane, connPnts[1].plane);
      if (connPnts[0].plane !== 'Z' && connPnts[1].plane !== 'Z' && !(pnt_dir_origin.x === pnt_dir_target.x && pnt_dir_origin.y === pnt_dir_target.y && pnt_dir_origin.z === pnt_dir_target.z)) {
        console.log(pnt_dir_origin, pnt_dir_target, reverseOrigin);
        // if (connPnts[0].angle !== connPnts[1].angle && connPnts[0].angle%90 !== 0) {
          const angle1 = connPnts[0].plane === 'Y' ? (connPnts[0].angle + models[0].angle) * (Math.PI/180) : connPnts[0].angle * (Math.PI/180);
          const angle2 = connPnts[1].plane === 'Y' ? (connPnts[1].angle + models[1].angle) * (Math.PI/180) : connPnts[1].angle * (Math.PI/180);
          const updatedAngle = (sceneModels[0].rotation.z + angle1) - (angle2 + Math.PI);
          console.log(connPnts[0].angle, connPnts[1].angle, updatedAngle);
          sceneModels[1].rotation.z = updatedAngle;
          sceneModels[1].updateMatrix();
        // }
      }

      // sceneModels[1].updateMatrixWorld();
      this.animate();

      let centerPntOrigin = this.getBBoxPnt(sceneModels[0], connPnts[0].name);
      let centerPntTarget = this.getBBoxPnt(sceneModels[1], connPnts[1].name);

      const translationMatrix = new THREE.Matrix4();
      translationMatrix.makeTranslation(centerPntOrigin.x - centerPntTarget.x, centerPntOrigin.y - centerPntTarget.y, centerPntOrigin.z - centerPntTarget.z);
      sceneModels[1].applyMatrix4( translationMatrix );

      this.animate();

      this.updatePosition(sceneModels[0], models[0]);
      this.updatePosition(sceneModels[1], models[1]);

      models[0].sceneObject = sceneModels[0];
      models[1].sceneObject = sceneModels[1];

      connPnts[0].connected = true;
      connPnts[0].object = models[1].id;
      connPnts[1].connected = true;
      connPnts[1].object = models[0].id;

      this.kinematicService.updateConnectionPoint(models[0].id, connPnts[0]);
      this.kinematicService.updateConnectionPoint(models[1].id, connPnts[1]);

      // console.log(models[0].sceneObject);

      this.kinematicLinkService.createNewConnection([{ frame: models[0], point: connPnts[0] }, { frame: models[1], point: connPnts[1] }]);


      // console.log(this.config.scene);

    } else if (this.kinematicService.selConnPoints.length > 2) {
      this.updateProgess('too many items selected', 0);
      // console.log('too many items selected');
    } else if (this.kinematicService.selConnPoints.length < 2) {
      this.updateProgess('select two points', 0);
      // console.log('select two connection points');
    }
  }


  updateConnectedObjects(object: any) {
    for (const connector of object.connectors) {
      if (connector.connected) {
        //set this.kinematicService.selConnPoints
        // recalculate connections
      }
    }
  }




  // obj - your object (THREE.Object3D or derived)
// point - the point of rotation (THREE.Vector3)
// axis - the axis of rotation (normalized THREE.Vector3)
// theta - radian value of rotation
// pointIsWorld - boolean indicating the point is in world coordinates (default = false)
//  rotateAboutPoint(obj, point, axis, theta, pointIsWorld){
//     pointIsWorld = (pointIsWorld === undefined)? false : pointIsWorld;

//     if(pointIsWorld){
//         obj.parent.localToWorld(obj.position); // compensate for world coordinate
//     }

//     obj.position.sub(point); // remove the offset
//     obj.position.applyAxisAngle(axis, theta); // rotate the POSITION
//     obj.position.add(point); // re-add the offset

//     if(pointIsWorld){
//         obj.parent.worldToLocal(obj.position); // undo world coordinates compensation
//     }

//     obj.rotateOnAxis(axis, theta); // rotate the OBJECT
//   }



}

