import { Injectable } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots, DOF, setIKFromUrdf, urdfRobotToIKRoot, SOLVE_STATUS_NAMES } from 'closed-chain-ik/src';
import { IKConfig } from '../models/ik-config.model';
import { Model, URFD_Joint } from '../models/kinematic.model';


@Injectable()
export class IKService {

  public ikConfig: IKConfig;

  constructor() {
    this.ikConfig = new IKConfig();
  }


  newLink(details: any, joint = null) {
    const link = new Link();
    link.name = details.name;

    if (joint && this.ikConfig.ikRoot !== null) {
      console.log(joint.parent.name, this.ikConfig.ikRoot);

      for (const root of this.ikConfig.ikRoot) {
        root.traverse( c => {

          if (c.isJoint) {

            const name = c.name;
            console.log(name);
            if (name === joint.parent.name) {
              console.log('add ', link);
              c.addChild(link);
            }

          }
        });
      }
    }
    this.ikConfig.frames.push(link);
    this.findRootsFromFrames();
  }


  newJoint(urfd_joint: URFD_Joint, link = null) {
    console.log(urfd_joint);
    const joint = new Joint();
    joint.name = urfd_joint.id;
    joint.setDoF(DOF.Z);
    joint.setPosition(urfd_joint.dimensions.origin.x, urfd_joint.dimensions.origin.y, urfd_joint.dimensions.origin.z);

    console.log(joint);

    if (link && this.ikConfig.ikRoot !== null) {
      console.log(link.parent.name, this.ikConfig.ikRoot);

      for (const root of this.ikConfig.ikRoot) {
        root.traverse( c => {

          if (c.isLink) {

            const name = c.name;

            if (name === link.parent.name) {
              c.addChild(joint);
            }

          }
        });
      }
    }
    this.ikConfig.frames.push(joint);
    this.findRootsFromFrames();
  }


  findRootsFromFrames() {
    if (this.ikConfig.ikRoot === null) {
      this.ikConfig.ikRoot = findRoots(this.ikConfig.frames);
    }
    console.log(this.ikConfig.ikRoot);
  }


  getFrameWithName(id: string) {
    console.log(id);
    return this.ikConfig.frames.filter(f => f.name === id)[0];
  }


  updateAngle(id: string, delta: number) {
    this.ikConfig.ikRoot.traverse( c => {

      if ( c.isJoint ) {

        const name = c.name;
        if (name === id) {
          c.setDoFValues( c.angle + delta );
        }
      }

    } );
    //update root;
  }





}
