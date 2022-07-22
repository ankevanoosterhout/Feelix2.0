import { Injectable, Inject } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { Joint, Object3D } from '../models/kinematic.model';



@Injectable()
export class KinematicService {

  joints: Array<Joint> = [];

  selectedJoints = [];


  models = [
    { modeltype: 'joint', thumbnail: 'active_joint.png', id: 0 },
    { modeltype: 'joint', thumbnail: 'passive_joint.png', id: 1 },
    { modeltype: 'translation', thumbnail: 'translation.png', id: 2 },
    { modeltype: 'translation', thumbnail: 'translation_z.png', id: 3 },
    { modeltype: 'arm', thumbnail: 'arm.png', id: 4 },
    { modeltype: 'arm', thumbnail: 'arm.png', id: 5 }
  ]

  constructor() {}

  addJoint() {
    const joint = new Joint(uuid(), 'A');
    joint.active = true;
    joint.grounded = false;
    joint.object3D.OBJ = 'active_joint.obj';
    this.joints.push(joint);
  }

  deleteJoint(id: string) {
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
      if (index > -1) {
        this.selectedJoints.splice(index, 1);
      }
    }
  }

  selectJoint(id: string) {
    const joint = this.joints.filter(j => j.id === id)[0];
    this.selectedJoints.push(joint);
  }

  updateJointVisualization(id: string, object3D: Object3D) {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      joint.object3D = object3D;
    }
    console.log(this.joints);
  }


}
