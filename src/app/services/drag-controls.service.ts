import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import * as THREE from 'three';
import { RAD2DEG } from 'three/src/math/MathUtils';
import { IKConfig } from '../models/ik-config.model';
import { JointType, URFD_Joint, URFD_Link } from '../models/kinematic.model';
import { IKService } from './IK.service';
import { KinematicService } from './kinematic.service';
import { KinematicsDrawingService } from './kinematics-drawing.service';


@Injectable()
export class DragControlsService {


  public c: IKConfig;


  // selectFrame: Subject<any> = new Subject();

  constructor(private kinematicDrawingService: KinematicsDrawingService, private kinematicService: KinematicService, private ikService: IKService) {
    this.c = this.ikService.ikConfig;
  }


  getIntersections() {
    this.c.drag.rayCaster.setFromCamera(this.c.drag.mousePosition, this.kinematicDrawingService.config.currentCamera);
    return this.c.drag.rayCaster.intersectObject(this.kinematicDrawingService.config.scene, true);
  }


  update() {

    if (this.c.drag.manipulating) {
      return;
    }

    const intersections = this.getIntersections();

    if (intersections && intersections.length > 1) {

      let hoveredJoint = null;

      if (intersections[0].object.name === 'no-pointer-events') {
        if (this.c.drag.selected !== null && !this.kinematicDrawingService.config.move) {
          this.onDeselect(this.c.drag.selected);
        }
        return;
      }

      if (intersections[0].object.parent && intersections[0].object.parent.name !== 'no-pointer-events' && intersections[0].object.parent.name !== '') {

        const hit = intersections[0];
        // console.log(hit);
        this.c.drag.hitDistance = hit.distance;
        // console.log(this.hitDistance);
        hoveredJoint = intersections[0].object.parent;
        this.c.drag.initialGrabPoint.copy(hit.point);
        // console.log(this.initialGrabPoint);
      }
      // console.log("hovered joint", hoveredJoint)
      // console.log("hovered", this.hovered);

      if (hoveredJoint !== this.c.drag.hovered) {

        if (this.c.drag.hovered && this.c.drag.manipulating === null) {

            this.onUnhover(this.c.drag.hovered);

        }

        this.c.drag.hovered = hoveredJoint;

        if (hoveredJoint) {

            this.onHover(hoveredJoint);

        }
      }
    }
  }


  onHover(object: any) {
    //setObjectColor
    // this.kinematicDrawingService.setObjectColor(object, this.kinematicDrawingService.config.selectColor);

  }

  onUnhover(object: any) {
    //setObjectColor
    // if (this.selected === null) {
    //   this.kinematicDrawingService.setObjectColor(object);
    // }
  }

  onDragStart(object: any) {

  }

  onDragEnd(object: any) {

  }

  onSelect(object: any) {
    if (object !== null && object.name !== 'no-pointer-events') {
      this.kinematicDrawingService.setObjectColor(object, this.kinematicDrawingService.config.selectColor);
      if (!this.kinematicDrawingService.config.move) {
        this.kinematicDrawingService.config.control.attach(object.parent);
      }
      this.kinematicService.selectFrame(object.parent.name);
    }
  }

  onDeselect(object: any) {

    if (object !== null && object.name !== 'no-pointer-events') {
      this.kinematicDrawingService.setObjectColor(object);
      if (!this.kinematicDrawingService.config.move) {
        this.kinematicDrawingService.config.control.detach();
        this.c.drag.selected = null;
        this.kinematicService.deselectFrame(object.parent.name);
      }
    }
  }

  getRotatedPosition(model: any, startPoint: THREE.Vector3) {
    //console.log(model, startPoint);
    this.c.drag.tempVector
      .copy(new THREE.Vector3(0,0,1))//0,0,1
      .transformDirection(model.matrixWorld)
      .normalize();

    this.kinematicDrawingService.drawArrowHelper(model.position, this.c.drag.tempVector, 0x000000);
    //console.log(this.c.drag.tempVector);

    this.c.drag.pivotPoint
      .set(0, 0, 0)
      .applyMatrix4(model.matrixWorld);
    this.c.drag.plane
      .setFromNormalAndCoplanarPoint(this.c.drag.tempVector, this.c.drag.pivotPoint);

    this.c.drag.plane.projectPoint(startPoint, this.c.drag.projectedStartPoint);
    this.c.drag.projectedStartPoint.sub(this.c.drag.pivotPoint);

    return this.c.drag.projectedStartPoint;
  }



  getRevoluteDelta(model: any, startPoint: THREE.Vector3, endPoint: THREE.Vector3) {
    // console.log(model.matrixWorld, startPoint, endPoint);
    this.c.drag.tempVector
      .copy(new THREE.Vector3(0,0,1))
      .transformDirection(model.matrixWorld)
      .normalize();

    this.c.drag.pivotPoint
      .set(0, 0, 0)
      .applyMatrix4(model.matrixWorld);
    this.c.drag.plane
      .setFromNormalAndCoplanarPoint(this.c.drag.tempVector, this.c.drag.pivotPoint);

    // console.log(this.plane);
    this.c.drag.plane.projectPoint(startPoint, this.c.drag.projectedStartPoint);
    this.c.drag.plane.projectPoint(endPoint, this.c.drag.projectedEndPoint);



    // get the directions relative to the pivot
    this.c.drag.projectedStartPoint.sub(this.c.drag.pivotPoint);
    this.c.drag.projectedEndPoint.sub(this.c.drag.pivotPoint);

    // console.log(this.pivotPoint, this.projectedStartPoint, this.projectedEndPoint);

    this.c.drag.tempVector.crossVectors(this.c.drag.projectedStartPoint, this.c.drag.projectedEndPoint);

    const direction = Math.sign(this.c.drag.tempVector.dot(this.c.drag.plane.normal));

    return direction * this.c.drag.projectedEndPoint.angleTo(this.c.drag.projectedStartPoint);
  }


  moveRay(toRay: any) {

    const { ray }  = this.c.drag.rayCaster;

    if (this.c.drag.manipulating) {
      ray.at(this.c.drag.hitDistance, this.c.drag.prevHitPoint);
      toRay.at(this.c.drag.hitDistance, this.c.drag.newHitPoint);

      let delta = 0;
      const frame = this.kinematicService.getFrame(this.c.drag.manipulating.parent.name);
      // console.log(frame);

      if (frame) {

        // this.kinematicService.selectFrame(frame);

        if (this.kinematicDrawingService.config.move) {

          if (frame.type === JointType.revolute || frame.type === JointType.continuous) {

              delta = this.getRevoluteDelta(this.c.drag.manipulating.parent, this.c.drag.prevHitPoint, this.c.drag.newHitPoint);

          } else if (frame.type === JointType.prismatic) {

              // delta = this.getPrismaticDelta(manipulating, prevHitPoint, newHitPoint);

          }

          if (delta !== 0) {

            this.c.drag.manipulating.parent.rotation.z += delta;
            this.c.drag.manipulating.parent.updateMatrix();

            if (frame) {
              const linkedObject = this.kinematicDrawingService.getObjectFromScene((frame instanceof URFD_Joint ? frame.id + '-link' : frame.id.slice(0,-5)));
              // console.log(linkedObject);
              if (linkedObject) {
                this.kinematicService.updateAngle(this.c.drag.manipulating.parent.name, this.c.drag.manipulating.parent.rotation.z, linkedObject.rotation.z);
              }
              // const framePosition = new THREE.Vector3();
              // this.c.drag.manipulating.getWorldPosition(framePosition);
              const frameQuaternion = new THREE.Quaternion();
              this.c.drag.manipulating.parent.getWorldQuaternion(frameQuaternion);

              if (frameQuaternion.x !== NaN && frameQuaternion.x !== undefined) {
                this.ikService.updateAngle(frame.id, frameQuaternion);
              }
              // this.updateAngle(frame, this.c.drag.manipulating.parent.rotation.z);
            }
            // this.updateJoint(selectedJoint, selectedJoint.angle + delta);
            // console.log(this.c.drag.manipulating.parent.name);

            this.kinematicDrawingService.animate();
          }
        }
      } else {
        if (this.c.drag.selected) {
          this.onDeselect(this.c.drag.selected);
        }
      }
    }
    this.c.drag.rayCaster.ray.copy(toRay);
    this.update();
  }


  // updateAngle(frame: any, angle: number) {
  //   console.log(frame.id, angle);
  //   const idOfConnComp = frame instanceof URFD_Link ? frame.id.slice(0,-5) : frame.id + '-link';
  //   console.log(idOfConnComp);
  //   console.log(frame.dimensions.rpy.z - angle);

    // frame.dimensions.rpy.z = angle;

    // console.log(frame.dimensions.rpy);

    // if (idOfConnComp) {
    //   const connComp = this.kinematicService.getFrame(idOfConnComp);
      // console.log(connComp);
      // if (connComp) {
      //   console.log(frame.dimensions.rpy.z - connComp.dimensions.rpy.z);
    //     frame instanceof URFD_Joint ? frame.angle += delta : connComp.angle += delta;
  //     }
  //   }
  // }

  setSelected() {
    // console.log('set selected ', this.c.drag.manipulating, this.c.drag.selected, (this.c.drag.manipulating !== this.c.drag.selected));
    if ((this.c.drag.manipulating === null && this.c.drag.selected !== null) || this.c.drag.manipulating !== this.c.drag.selected) {
      if (this.kinematicDrawingService.config.move || (this.c.drag.manipulating !== this.c.drag.selected && this.c.drag.manipulating !== null && this.c.drag.selected !== null)) {
        this.onDeselect(this.c.drag.selected);
      }
    }
    if (this.c.drag.manipulating !== null || this.kinematicDrawingService.config.move) {
      this.c.drag.selected = this.c.drag.manipulating;
    }

    if (this.c.drag.selected !== null) {
      this.onSelect(this.c.drag.selected);
    }

  }

  setGrabbed(grabbed: boolean) {

    if (grabbed) {
      // console.log(this.manipulating, this.hovered);
      if (this.c.drag.manipulating !== null || this.c.drag.hovered === null) {

          return;

      }

      this.c.drag.manipulating = this.c.drag.hovered;
      this.onDragStart(this.c.drag.hovered);

    } else {

        if (this.c.drag.manipulating === null) {
            return;
        }

        this.onDragEnd(this.c.drag.manipulating);
        this.c.drag.manipulating = null;
        this.update();

    }
    this.kinematicDrawingService.config.orbit.enabled = this.c.drag.manipulating === null ? true : false;
  }






}
