import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Subject } from 'rxjs';
import { Point, JointLink } from '../models/kinematic.model';
import { KinematicsConfig } from '../models/kinematics-config.model';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { KinematicService } from './kinematic.service';

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

  constructor(@Inject(DOCUMENT) private document: Document, private kinematicService: KinematicService) {
    this.config = new KinematicsConfig();
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
    if (name !== 'rotateAxis') {
      this.config.control.setMode( name );
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
    this.config.control.addEventListener( 'change', (event: any) => {
      if (this.kinematicService.selectedJoints.length === 1) {
        const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
        if (sceneObject) { this.updatePosition(sceneObject, this.kinematicService.selectedJoints[0]); }
      }
    });

    this.config.control.addEventListener( 'dragging-changed', ( event: any ) => {
      // this.config.orbit.enabled = this.config.draggableObject !== undefined ? false : !event.value;
      this.config.orbit.enabled = !event.value;

      console.log('dragging changed controls', this.config.orbit.enabled);
      // if (this.kinematicService.selectedJoints.length === 1) {
      //   const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
      //   if (sceneObject) { this.updatePosition(sceneObject, this.kinematicService.selectedJoints[0]); }
      // }
    });

    this.config.control.setTranslationSnap( 10 );
    this.config.control.setRotationSnap( THREE.MathUtils.degToRad(15) );
    this.config.control.setScaleSnap( 0.25 );

    this.config.scene.add( this.config.control );
    this.addRotationCircle();
    // this.config.rotaryControls.addEventListener( 'dragging-changed', ( event: any ) => {
    //   this.config.orbit.enabled = !event.value;
    //   console.log('dragging changed rotary', this.config.orbit.enabled);
    // });


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
      for (const intersect of intersects) {
        // console.log(intersect);


        if (!intersect.isTransformControlsPlane) {


          if (intersects && intersect.object.parent.name === 'rotary_control') {
            this.config.draggableObject = intersect.object.parent;
            console.log('rotate');

            this.config.pivotPoint.rotation.z = this.getAngleRotaryElement();
            break;

          } else if (intersect.object && intersect.object.isMesh) {
            const selectedElement = this.getObjectDetailsFromName(intersect.object.name);
            if (selectedElement) {
              // console.log('selected element', selectedElement);
              if (selectedElement.color === 'Yellow') {
                // console.log('select ', selectedElement.type);
                this.selectConnectionElement(intersect.object, shift);
                break;
              } else if (selectedElement.color === 'Gray' && selectedElement.axis === 'M') {
                this.selectMovableElement(intersect.object);
                break;
              }
            }
          }

          const sceneObject = this.config.sceneObjects.filter(s => s.id === intersect.object.parent.id || (intersect.object.parent.parent && s.id === intersect.object.parent.parent.id))[0];
          // console.log(sceneObject);

          if (sceneObject) {
            this.selectObject(sceneObject, shift);
            this.animate();
            break;
          }

        } else {
          break;
        }
      }
    // }
  }



  getAngleRotaryElement() {
    const sceneObject = this.config.scene.getObjectByName(this.kinematicService.selectedJoints[0].id);
    if (sceneObject) {
      const v1 = sceneObject.position;
      const v2 = this.config.intersects;
      const crossproduct = v1.dot(v2);
      console.log(v1, v2, crossproduct);

      let magnitude_v1 = Math.sqrt(Math.pow(v1.x, 2) + Math.pow(v1.y, 2) + Math.pow(v1.z, 2));
      if (magnitude_v1 === 0) { magnitude_v1 = 0.01; }
      let magnitude_v2 = Math.sqrt(Math.pow(v2.x, 2) + Math.pow(v2.y, 2) + Math.pow(v2.z, 2));
      if (magnitude_v2 === 0) { magnitude_v2 = 0.01; }

      return (crossproduct / magnitude_v1) / magnitude_v2;
    }
    return 0;
  }

  getObjectDetailsFromName(name: string) {
    if (name) {
      const nameList = name.split(':');
      if (nameList.length > 1) {
        return { axis: nameList[1], color: nameList[0], offset: nameList.length > 2 ? parseInt(nameList[2]) : 0 };
      }
    }
    return;
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
            this.config.control.attach(object);
          }
        }
      }
    }
  }


  setObjectColor(object: any, color = null) {
    object.traverse( ( child: any ) => {
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
    console.log(object);
    if (object && object.parent) {
      const sceneObject = this.config.sceneObjects.filter(s => s.id === object.parent.id || (object.parent.parent && s.id === object.parent.parent.id))[0];
      // console.log(sceneObject);
      if (sceneObject) {
        const parent = this.kinematicService.joints.filter(j => j.id === sceneObject.name)[0];
        console.log(parent);


        if (this.kinematicService.checkIfPointIsSelected(parent.id, object.uuid)) {
          console.log('is selected');
          shift ? this.deselectSelectionPoint(sceneObject.id, object) : this.deselectAllObjects();
        } else {
          // const point = new connectionPoint(sceneObject, object);
          // shift ? this.kinematicService.selConnPoints.push(point) : this.kinematicService.selConnPoints = [ point ];
          const point = new Point(parent.id, object.uuid);
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

  selectMovableElement(object: any) {
    if (object && object.parent) {
      // this.deselectAllObjects();
      const sceneObject = this.config.sceneObjects.filter(s => s.id === object.parent.id || (object.parent.parent && s.id === object.parent.parent.id))[0];

      // console.log(sceneObject);
      const joint = this.kinematicService.getJoint(sceneObject.name);
      if (sceneObject && joint) {
        this.deselectAllObjects();
        this.kinematicService.selectedJoints = [joint];
        // this.config.control.detach();
        this.setObjectColor(object, this.config.selectColor);

        console.log(sceneObject);
        const circlePosition = sceneObject.position.clone();
        const circleOrientation = sceneObject.quaternion.clone()
        this.updateRotation(circlePosition, circleOrientation);
        this.toggleRotationCircle(true);
        this.config.pivotPoint = new THREE.Object3D();
        this.config.scene.add(this.config.pivotPoint);
        this.config.pivotPoint.rotation.set(0,0,0);
        const parent = object.parent;
        object.parent.getWorldPosition(this.config.pivotPoint.position);
        this.config.pivotPoint.attach(object);
        this.config.pivotPoint.rotation.z = this.getAngleRotaryElement();
        parent.attach(object);
      }
    }
  }

  addRotationCircle() {
    this.loadOBJ.next({ url: 'rotary_control.obj', name: 'rotary_control' });
  }

  updateRotation(p: THREE.Vector3, q: THREE.Quaternion) {
    // this.loadSVGImage('./assets/images/svg/rotary_control.svg', 'rotary_control', p, q, angle);
    const circle = this.config.scene.getObjectByName('rotary_control');
    console.log(circle);
    if (circle) {
      circle.position.set(p.x, p.y, p.z);
      circle.quaternion.set(q.x, q.y, q.z, q.w);
      this.animate();
    }
  }


  updateRotaryAngle(angle: number) {
    console.log(angle * (180/Math.PI));
    const circle = this.config.scene.getObjectByName('rotary_control');
    if (circle) {
      circle.rotation.z = angle;
    }
    this.animate();
  }


  toggleRotationCircle(visible: boolean) {
    const circle = this.config.scene.getObjectByName('rotary_control');
    console.log(circle, visible);

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

    console.log(this.kinematicService.anySelected());
    if (this.kinematicService.anySelected()) {
      console.log('deselect draggable object');
      this.config.draggableObject = undefined;
      this.toggleRotationCircle(false);
      this.config.control.detach();

      for (const object of this.config.sceneObjects) {
        this.deselectObject(object);
      }
      for (const item of this.kinematicService.selConnPoints) {
        const sceneObject = this.config.scene.getObjectByName(item.parent_id);
        if (sceneObject) {
          this.setObjectColor(sceneObject);
        }
      }
      this.kinematicService.deselectAll();
      this.animate();
    }
    if (this.config.tmpPlane) {
      this.config.scene.remove(this.config.tmpPlane);
    }
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


  updatePosition(object: any, model: JointLink) {
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


  hideObject(model: JointLink) {
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


  alignOrientation(object_origin: any, object_target: any, point_origin: any, point_target: any) {

    object_target.rotation.set(object_origin.rotation.x, object_origin.rotation.y, object_origin.rotation.y);
    // object_target.updateMatrix();
    // this.animate();

    if (point_origin[1] !== point_target[1]) {
      // console.log(point_origin[1], point_target[1]);
      const rotation = this.getRotation(point_origin[1], point_target[1]);
      if (rotation.x) {
        object_target.rotateOnAxis(rotation, Math.PI/2);
      }
      // object_target.updateMatrix();

      console.log(rotation);

      // this.animate();
    }
    return object_target;
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

    const worldDirection = new THREE.Vector3();
    object.getWorldDirection(worldDirection);
    // console.log(worldDirection);
    this.drawArrowHelper(object.position, worldDirection, 0x2121d8);

    // const updatedWorldDirect = new THREE.Vector3();
    // updatedWorldDirect.multiplyVectors(worldDirection, axis.vector3);
    // console.log(updatedWorldDirect);
    // this.drawArrowHelper(object.position, updatedWorldDirect, 0xff2200);

    // const updatedWorldDirect2 = worldDirection.clone();

   // const quaternion = new THREE.Quaternion();
    // const angle = axis.plane === 'Z' ? Math.PI : Math.PI / 2;
    // console.log(angle);
    // quaternion.setFromAxisAngle( axis.vector3, angle );

    // updatedWorldDirect2.applyQuaternion( quaternion );
     // const angle = axis.plane === 'Z' ? Math.PI : Math.PI / 2;

    // const matrix = new THREE.Matrix4();
    // matrix.compose(object.position, object.quaternion, new THREE.Vector3(1,1,1));

    // const updatedWorldDirect2 = worldDirection.clone();
    // updatedWorldDirect2.projectOnVector(axis.vector3);
    // updatedWorldDirect2.applyAxisAngle( axis.vector3, angle );

    const updatedWorldDirect = axis.vector3.clone();
    updatedWorldDirect.applyQuaternion(object.quaternion);

    this.drawArrowHelper(object.position, updatedWorldDirect, 0x000000);

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


  joinObjects() {

    if (this.kinematicService.selConnPoints.length === 2) {
      if (this.kinematicService.selConnPoints[0].parent_id === this.kinematicService.selConnPoints[1].parent_id) {
        this.updateProgess('selection points are from the same object', 0);
        return;
      }

      console.log(this.kinematicService.selConnPoints);

      const joint_origin = this.kinematicService.getJoint(this.kinematicService.selConnPoints[0].parent_id);
      const joint_target = this.kinematicService.getJoint(this.kinematicService.selConnPoints[1].parent_id);
      const sceneObject_origin = this.config.scene.getObjectByName(this.kinematicService.selConnPoints[0].parent_id);
      const sceneObject_target = this.config.scene.getObjectByName(this.kinematicService.selConnPoints[1].parent_id);

      sceneObject_target.updateMatrix();
      sceneObject_origin.updateMatrix();

      sceneObject_target.rotation.set(sceneObject_origin.rotation.x, sceneObject_origin.rotation.y, sceneObject_origin.rotation.y);

      const connPoint_origin = this.kinematicService.getSelectionPoint(joint_origin.id, this.kinematicService.selConnPoints[0].id);
      const connPoint_target = this.kinematicService.getSelectionPoint(joint_target.id, this.kinematicService.selConnPoints[1].id);

      console.log(connPoint_origin, connPoint_target);

      const pnt_dir_origin = this.getDirectionVector(sceneObject_origin, connPoint_origin);
      const pnt_dir_target = this.getDirectionVector(sceneObject_target, connPoint_target);

      console.log(pnt_dir_origin, pnt_dir_target);

      const quaternion = new THREE.Quaternion(); // create one and reuse it
      const reverseOrigin = new THREE.Vector3();
      reverseOrigin.multiplyVectors(pnt_dir_target, new THREE.Vector3(-1,-1,-1));
      quaternion.setFromUnitVectors(pnt_dir_origin, reverseOrigin);
      const matrix = new THREE.Matrix4(); // create one and reuse it
      matrix.makeRotationFromQuaternion( quaternion );
      console.log(quaternion);
      sceneObject_target.applyMatrix4( matrix );

      sceneObject_target.updateMatrix();

      this.animate();

      let centerPntOrigin = this.getBBoxPnt(sceneObject_origin, connPoint_origin.name);
      let centerPntTarget = this.getBBoxPnt(sceneObject_target, connPoint_target.name);

      const translationMatrix = new THREE.Matrix4();
      translationMatrix.makeTranslation(centerPntOrigin.x - centerPntTarget.x, centerPntOrigin.y - centerPntTarget.y, centerPntOrigin.z - centerPntTarget.z);
      sceneObject_target.applyMatrix4( translationMatrix );

      this.animate();

    } else if (this.kinematicService.selConnPoints.length > 2) {
      this.updateProgess('too many items selected', 0);
      // console.log('too many items selected');
    } else if (this.kinematicService.selConnPoints.length < 2) {
      this.updateProgess('select two points', 0);
      // console.log('select two connection points');
    }


  }



  /* load svg image */


  // loadSVGImage(url: string, name: string, p: any, q: any, angle: number) {
  //   this.config.SVGloader.load(url, (data: any) => {// called when the resource is loaded
  //       console.log(data);
  //       const paths = data.paths;
  //       const group = new THREE.Group();
  //       group.name = name;
  //       group.scale.multiplyScalar( 0.1 );

  //       for ( let i = 0; i < paths.length; i ++ ) {
  //           let path = paths[ i ];
  //           let material = new THREE.MeshStandardMaterial({ color: path.color, side: THREE.DoubleSide, depthWrite: false });
  //           let shapes = path.toShapes( true );
  //           for ( var j = 0; j < shapes.length; j ++ ) {
  //             var shape = shapes[ j ];
  //             var geometry = new THREE.ShapeBufferGeometry( shape );
  //             geometry.applyMatrix4(new THREE.Matrix4().makeScale ( 1, 1, -1 )) // <-- this
  //             var mesh = new THREE.Mesh( geometry, material );
  //             group.add( mesh );
  //         }
  //       }
  //       console.log(group);
  //       group.isDraggable = true;
  //       group.position.set(p.x,p.y,p.z);
  //       group.quaternion.set(q.x,q.y,q.z,q.w);
  //       group.rotateZ(angle);

  //       this.config.scene.add( group );
  //     },
  //     // called when loading is in progresses
  //     ( xhr: any ) => {
  //       console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
  //     },
  //     // called when loading has errors
  //     ( error: any ) => {
  //       console.log( 'Error loading SVG ' + error );
  //     }
  //   );
  // }
}

