import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { Joint, Object3D, Model, ConnectorGroup, Connector } from '../models/kinematic.model';



@Injectable()
export class KinematicService {

  joints: Array<Joint> = [];

  selectedJoints = [];

  kinematicChain: Array<any> = [];
  kinematicChainList: Array<any> = [];

  importOBJModelToObjectGroup: Subject<any> = new Subject();


  constructor() {}

  addJoint(model: any): Joint {
    const objectsInScene = this.joints.filter(j => j.type === model.type);
    const joint = new Joint(uuid(), model.type + '-' + (objectsInScene.length + 1), model, [ uuid(), uuid(), uuid(), uuid() ]);

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


  updateConnectionPoint(id: string, axis: string, point_: Connector): Joint {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      const group = joint.connectors.filter(g => g.axis === axis)[0];
      if (group) {
        let point = group.points.filter(p => p.id === point_.id)[0];
        if (point) {
          point = point;
        }
      }
      return joint;
    }
    return;
  }



  deletePoint(id: string, axis: string, point_name: string) {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      const connectorGroup = joint.connectors.filter(c => c.axis === axis)[0];
      if (connectorGroup) {
        const point = connectorGroup.points.filter(p => p.name === point_name)[0];
        if (point) {
          const index = connectorGroup.points.indexOf(point);
          if (index > -1) { connectorGroup.points.splice(index, 1); }
        }
      }
    }
  }

  addPoint(id: string, axis: string) {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      const connectorGroup = joint.connectors.filter(c => c.axis === axis)[0];
      if (connectorGroup) {
        const angle = connectorGroup.points.length === 0 ? 0 : connectorGroup.points[connectorGroup.points.length - 1].angle + 60;
        const numberOfType1Items = connectorGroup.points.filter(p => p.type === 'i' || p.type === 't').length;
        const type = connectorGroup.points.length - numberOfType1Items < numberOfType1Items ? 1 : 2;

        console.log(type, angle);

        if (connectorGroup.axis === 'Z') {
          const point = new Connector(uuid(), 'point ' + (connectorGroup.points.length + 1), angle, type === 1 ? 't' : 'b');
          console.log(point);
          connectorGroup.points.push(point);
          this.importOBJModelToObjectGroup.next(point);
        } else {
          const point = new Connector(uuid(), 'point ' + (connectorGroup.points.length + 1), angle, type === 1 ? 'i' : 'o');
          console.log(point);
          connectorGroup.points.push(point);
          this.importOBJModelToObjectGroup.next(point);
        }
      }
    }
  }
}


