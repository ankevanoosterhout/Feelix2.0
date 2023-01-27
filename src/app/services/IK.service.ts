import { Injectable } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots, DOF, setIKFromUrdf, urdfRobotToIKRoot, SOLVE_STATUS_NAMES } from 'closed-chain-ik/src';
import { IKConfig } from '../models/ik-config.model';
import { URFD_Joint, URFD_Link } from '../models/kinematic.model';


@Injectable()
export class IKService {

  public ikConfig: IKConfig;

  constructor() {
    this.ikConfig = new IKConfig();
  }


  newLink(urfd_link: URFD_Link) {
    const link = new Link();
    console.log(urfd_link, urfd_link.id.slice(0,-5));
    link.name = urfd_link.id;

    if (this.ikConfig.ikRoot !== null) {

      for (const root of this.ikConfig.ikRoot) {
        root.traverse( c => {

          if (c.isJoint) {

            const name = c.name;
            if (name === urfd_link.id.slice(0,-5)) {
              c.addChild(link);
            }

          }
        });
        this.createRootsHelper(root);
      }
    }
    this.ikConfig.frames.push(link);
    console.log(this.ikConfig.frames);
    this.findRootsFromFrames();
  }


  newJoint(urfd_joint: URFD_Joint, link = null) {
    console.log(urfd_joint);
    console.log(link);
    const joint = new Joint();
    joint.name = urfd_joint.id;
    joint.setDoF(DOF.Z);
    if (link) {
      joint.setPosition(urfd_joint.dimensions.origin.x - link.parent.position.x, urfd_joint.dimensions.origin.y - link.parent.position.y, urfd_joint.dimensions.origin.z - link.parent.position.z);
    } else {
      joint.setPosition(urfd_joint.dimensions.origin.x, urfd_joint.dimensions.origin.y, urfd_joint.dimensions.origin.z);
    }

    console.log(joint);

    if (link !== null && this.ikConfig.ikRoot !== null) {

      for (const root of this.ikConfig.ikRoot) {
        root.traverse( c => {

          if (c.isLink) {

            console.log('find link', c.name, link.parent.name);

            if (c.name === link.parent.name) {
              c.addChild(joint);
            }

          }
        });
        this.createRootsHelper(root);
      }
    }
    this.ikConfig.frames.push(joint);
    console.log(this.ikConfig.frames);
    this.findRootsFromFrames();

    return joint;
  }


  findRootsFromFrames() {
    if (this.ikConfig.ikRoot === null) {
      this.ikConfig.ikRoot = findRoots(this.ikConfig.frames);
    }
    console.log(this.ikConfig.ikRoot);
  }


  getFrameWithName(id: string) {
    // console.log(id);
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


  getRoots() {
    return this.ikConfig.ikRoot;
  }


  createRootsHelper(root: any) {
    if (root) {
      this.ikConfig.ikHelper = new IKRootsHelper( root );
      this.ikConfig.ikHelper.setResolution( window.innerWidth, window.innerHeight );
      this.ikConfig.ikHelper.setJointScale(80);
      this.ikConfig.ikHelper.name = 'ikHelper';
      // this.ikHelper.setColor( this.ikHelper.color );
      this.ikConfig.ikHelper.traverse( c => {
        if (c.material) {
          c.material.color.setHex( 0xe91e63 );
        }
        c.visible = true;
      });

      console.log(this.ikConfig.ikHelper);
    }
  }




}
