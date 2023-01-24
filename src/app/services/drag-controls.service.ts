import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import * as THREE from 'three';
import { JointLink, URFD_Joint, JointType } from '../models/kinematic.model';
import { KinematicService } from './kinematic.service';
import { KinematicsDrawingService } from './kinematics-drawing.service';


@Injectable()
export class DragControlsService {

  distance: number;
  initialGrabPoint = new THREE.Vector3();
  grabPoint = new THREE.Vector3();
  prevHitPoint = new THREE.Vector3();
  newHitPoint = new THREE.Vector3();
  tempVector = new THREE.Vector3();
  pivotPoint = new THREE.Vector3();
  plane = new THREE.Plane();
  projectedStartPoint = new THREE.Vector3();
  projectedEndPoint = new THREE.Vector3();
  mouse = new THREE.Vector2();
  hitDistance = -1;
  manipulating = null;
  hovered = null;
  selected = null;
  // updateJointAngleScene: Subject<any> = new Subject();


  constructor(private kinematicDrawingService: KinematicsDrawingService, private kinematicService: KinematicService) {}




//previous hitpoint on mousedown, newhitpoint on mouse move ->
//update previous hitpoint at end of function

  update() {

    if (this.manipulating) {
      return;
    }

    const intersections = this.kinematicDrawingService.getIntersections();

    if (intersections && intersections.length > 1) {

      let hoveredJoint = null;

      if (intersections[0].object.name === 'no-pointer-events') {
        if (this.selected !== null && !this.kinematicDrawingService.config.move) {
          this.onDeselect(this.selected);
        }
        return;
      }

      if (intersections[0].object.parent && intersections[0].object.parent.name !== 'no-pointer-events' && intersections[0].object.parent.name !== '') {

        const hit = intersections[0];
        // console.log(hit);
        this.hitDistance = hit.distance;
        // console.log(this.hitDistance);
        hoveredJoint = intersections[0].object.parent;
        this.initialGrabPoint.copy(hit.point);
        // console.log(this.initialGrabPoint);
      }
      // console.log("hovered joint", hoveredJoint)
      // console.log("hovered", this.hovered);

      if (hoveredJoint !== this.hovered) {

        if (this.hovered && this.manipulating === null) {

            this.onUnhover(this.hovered);

        }

        this.hovered = hoveredJoint;

        if (hoveredJoint) {

            this.onHover(hoveredJoint);

        }
      }


    }

    // this.distance = intersect.distance;
    // console.log(this.distance, joint);
    // this.newHitPoint.copy(intersect.point);
    // console.log(this.prevHitPoint, this.newHitPoint);

    // const delta = this.getRevoluteDelta(joint, this.prevHitPoint, this.newHitPoint);
    // console.log(delta);

    // if (delta) {
    //   this.updateJointAngleScene.next({ joint: joint.id, delta: delta });

    // }

    // this.prevHitPoint.copy(this.newHitPoint);

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
    }
  }

  onDeselect(object: any) {

    if (object !== null && object.name !== 'no-pointer-events') {
      this.kinematicDrawingService.setObjectColor(object);
      if (!this.kinematicDrawingService.config.move) {
        this.kinematicDrawingService.config.control.detach();
        this.selected = null;
      }
    }
  }



  getRevoluteDelta(model: any, startPoint: THREE.Vector3, endPoint: THREE.Vector3) {
    // console.log(model.matrixWorld, startPoint, endPoint);
    this.tempVector
      .copy(new THREE.Vector3(0,0,1))
      .transformDirection(model.matrixWorld)
      .normalize();

    this.pivotPoint
      .set(0, 0, 0)
      .applyMatrix4(model.matrixWorld);
    this.plane
      .setFromNormalAndCoplanarPoint(this.tempVector, this.pivotPoint);

    // console.log(this.plane);
    this.plane.projectPoint(startPoint, this.projectedStartPoint);
    this.plane.projectPoint(endPoint, this.projectedEndPoint);



    // get the directions relative to the pivot
    this.projectedStartPoint.sub(this.pivotPoint);
    this.projectedEndPoint.sub(this.pivotPoint);

    // console.log(this.pivotPoint, this.projectedStartPoint, this.projectedEndPoint);

    this.tempVector.crossVectors(this.projectedStartPoint, this.projectedEndPoint);

    const direction = Math.sign(this.tempVector.dot(this.plane.normal));

    return direction * this.projectedEndPoint.angleTo(this.projectedStartPoint);
  }


  moveRay(toRay: any) {
    // console.log(toRay);

    // if (!this.kinematicDrawingService.config.move) {
    //   return;
    // }

    const { ray }  = this.kinematicDrawingService.config.rayCaster;

    if (this.manipulating) {
      ray.at(this.hitDistance, this.prevHitPoint);
      toRay.at(this.hitDistance, this.newHitPoint);

      let delta = 0;
      const selectedJoint = this.kinematicService.getObjectWithID(this.manipulating.parent.name);

      // console.log(selectedJoint);

      if (selectedJoint) {

        if (this.kinematicDrawingService.config.move) {

          if (selectedJoint.type === JointType.revolute || selectedJoint.type === JointType.continuous) {

              // console.log(this.prevHitPoint, this.newHitPoint);

              delta = this.getRevoluteDelta(this.manipulating.parent, this.prevHitPoint, this.newHitPoint);

          } else if (selectedJoint.type === JointType.prismatic) {

              // delta = this.getPrismaticDelta(manipulating, prevHitPoint, newHitPoint);

          }

          if (delta !== 0) {
            // console.log(delta);
            // console.log(this.manipulating);
            this.manipulating.rotation.z += delta;
            this.kinematicDrawingService.animate();
            // this.updateJoint(selectedJoint, selectedJoint.angle + delta);

          }
        }
      } else {
        if (this.selected) {
          this.onDeselect(this.selected);
        }
      }
    }
    this.kinematicDrawingService.config.rayCaster.ray.copy(toRay);
    this.update();
  }

  setSelected() {

    if ((this.manipulating === null && this.selected !== null) || this.manipulating !== this.selected) {
      if (this.kinematicDrawingService.config.move || (this.manipulating !== this.selected && this.manipulating !== null && this.selected !== null)) {
        this.onDeselect(this.selected);
      }
    }
    if (this.manipulating !== null || this.kinematicDrawingService.config.move) {
      this.selected = this.manipulating;
    }

    if (this.selected !== null) {
      this.onSelect(this.selected);
    }

  }

  setGrabbed(grabbed: boolean) {

    // console.log("set grabbed");
    // if (this.manipulating === null) {

    //   if (this.hovered === null) {

    //     return;

    //   }

    //   this.manipulating = this.hovered;
    //   this.kinematicDrawingService.config.orbit.enabled = false;
    //   // console.log(this.manipulating);
    //   this.onDragStart(this.hovered);

    // } else {

    //   // if (this.manipulating === null) {

    //   //   return;

    //   // }

    //   this.onDragEnd(this.manipulating);
    //   this.kinematicDrawingService.config.orbit.enabled = true;
    //   this.manipulating = null;


    // }
    // console.log(this.manipulating);

    if (grabbed) {

      if (this.manipulating !== null || this.hovered === null) {

          return;

      }

      this.manipulating = this.hovered;
      this.onDragStart(this.hovered);

    } else {

        if (this.manipulating === null) {
            return;
        }

        this.onDragEnd(this.manipulating);
        this.manipulating = null;
        this.update();

    }
    this.kinematicDrawingService.config.orbit.enabled = this.manipulating === null ? true : false;
  }






}
