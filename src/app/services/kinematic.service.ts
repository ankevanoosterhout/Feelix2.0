import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { JointLink, Object3D, Connector, Point } from '../models/kinematic.model';
import * as THREE from 'three';


@Injectable()
export class KinematicService {

  joints: Array<JointLink> = [];

  selectedJoints = [];

  selConnPoints: Array<Point> = [];

  kinematicChain: Array<any> = [];
  kinematicChainList: Array<any> = [];

  importOBJModelToObjectGroup: Subject<any> = new Subject();


  constructor() {}

  addJoint(model: any): JointLink {
    const objectsInScene = this.joints.filter(j => j.type === model.type);
    const joint = new JointLink(uuid(), model.type + '-' + (objectsInScene.length + 1), model);

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

  anySelected(): boolean {
    if (this.selConnPoints.length > 0 || this.selectedJoints.length > 0) {
      return true;
    }
    return false;

  }

  deselectAll() {
    this.selectedJoints = [];
    this.selConnPoints = [];
  }

  // getSelectionPoint(parent_id: string, point_id: string): connectionPoint {
  //   return this.selConnPoints.filter(p => p.parent.id === parent_id && p.point.uuid === point_id)[0];
  // }

  getSelectionPoint(parent_id: string, id: string) {
    // console.log(parent_id, id);

    const joint = this.joints.filter(j => j.id === parent_id)[0];
    // console.log(joint);

    if (joint) {
      for (const item of joint.connectors) {
        // console.log(item.id, id);
        if (item.id === id) {
          // console.log(item);
          return item;
        }
      }
    }
    return;
  }


  checkIfPointIsSelected(parent_id: string, id: string) {
    return this.selConnPoints.filter(p => p.parent_id === parent_id && p.id === id)[0] ? true : false;
  }



  updateSelectionPointID(model_id: string, name: string, id: string) {
    // console.log(name);
    const joint = this.joints.filter(j => j.id === model_id)[0];
    // console.log(joint);

    if (joint) {
      for (const item of joint.connectors) {
        // console.log(item);
        if (item.name === name) {
          item.id = id;
          // console.log(item);
          return item;
        }
      }
    }
    return;
  }


  deleteSelectionPoint(parent_id: string, point_id: string) {
    const selectedPoint = this.selConnPoints.filter(p => p.id === point_id && p.parent_id === parent_id)[0];
    if (selectedPoint) {
      const index = this.selConnPoints.indexOf(selectedPoint);
      if (index > -1) {
        this.selConnPoints.splice(index, 1);
      }
    }
  }


  getJoint(id: string): JointLink {
    return this.joints.filter(j => j.id === id)[0];
  }

  getAllJoints(): Array<JointLink> {
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


  updateJointVisualization(id: string, object3D: Object3D) : JointLink {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      joint.object3D = object3D;
    }

    return joint;
  }

  getJointColor(id: string): number {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      return joint.object3D.color;
    }
    return;
  }


  updateConnectionPoint(id: string, point_: Connector): JointLink {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      let point = joint.connectors.filter(p => p.id === point_.id)[0];
      if (point) {
        point = point;
      }
      return joint;
    }
    return;
  }


  getPoint(joint_id: string, point_id: string): Connector {
    const joint = this.joints.filter(j => j.id === joint_id)[0];
    if (joint) {
      const point = joint.connectors.filter(p => p.id === point_id)[0];
      if (point) {
        return point;
      }
    }
    return;
  }


  addPoint(id: string) {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {

      const axis = joint.connectors.filter(p => p.plane === 'X').length > joint.connectors.filter(p => p.plane === 'Y').length ? 'Y' : 'X';
      const connectorsWithAxis = joint.connectors.filter(p => p.plane === axis);
      const angle = connectorsWithAxis.length === 0 ? 0 : connectorsWithAxis[connectorsWithAxis.length - 1].angle + 60;
      const vector = new THREE.Vector3(-Math.cos(angle * Math.PI/180 + (Math.PI / 2)), -Math.sin(angle * Math.PI/180 + (Math.PI / 2)),0);
      vector.normalize();

      const point = new Connector(null,'Yellow:' + axis + ':' + connectorsWithAxis.length, angle, axis, vector);
      joint.connectors.push(point);

      this.importOBJModelToObjectGroup.next({ pnt: point, model_id: joint.id });
    }
  }






}




