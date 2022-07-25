import { Injectable, Inject } from '@angular/core';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Joint, Object3D, Model } from '../models/kinematic.model';
import { KinematicsConfig } from '../models/kinematics-config.model';
import { Cursor } from '../models/tool.model';



@Injectable()
export class KinematicService {

  joints: Array<Joint> = [];

  selectedJoints = [];


  constructor() {}

  addJoint(model: any): Joint {
    const objectsInScene = this.joints.filter(j => j.type === model.type);
    const joint = new Joint(uuid(), model.type + '-' + (objectsInScene.length + 1), model.type, model.active, model.objectUrl, model.color);
    this.joints.push(joint);
    return joint;
  }

  deleteJoint(id: string) {
    this.deselectJoint(id);
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      const index = this.joints.indexOf(joint);
      if (index > -1) {
        this.joints.splice(index, 1);
      }
    }
  }

  deselectAll() {
    this.selectedJoints = [];
  }

  getJoint(id: string): Joint {
    return this.joints.filter(j => j.id === id)[0];
  }

  getAllJoints(): Array<Joint> {
    return this.joints;
  }

  deselectJoint(id: string) {
    const joint = this.selectedJoints.filter(j => j.id === id)[0];
    if (joint) {
      const index = this.selectedJoints.indexOf(joint);
      this.joints.filter(j => j.id === id)[0].selected = false;
      if (index > -1) {
        this.selectedJoints.splice(index, 1);
      }
    }
  }

  selectJoint(id: string) {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      joint.selected = true;
      this.selectedJoints.push(joint);
    }
  }

  updateJointVisualization(id: string, object3D: Object3D) {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      joint.object3D = object3D;
    }
  }

  getJointColor(id: string): number {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      return joint.object3D.color;
    }
    return;
  }





}
