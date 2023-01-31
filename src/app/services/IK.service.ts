import { Injectable } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots, DOF, setIKFromUrdf, urdfRobotToIKRoot, SOLVE_STATUS_NAMES } from 'closed-chain-ik/src';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { IKConfig } from '../models/ik-config.model';
import { URFD_Joint, URFD_Link } from '../models/kinematic.model';


@Injectable()
export class IKService {

  public ikConfig: IKConfig;

  public static readonly MODEL_LOCATION = 'ngx-webstorage|roots';

  ikFrames: Array<any> = [];
  public rootsObservable = new Subject<any>();

  updateIKhelper: Subject<any> = new Subject();



  constructor(private localSt: LocalStorageService) {
    this.ikConfig = new IKConfig();

    const data = this.localSt.retrieve('roots');

    if (data) {
      console.log(data);
      this.ikFrames = data;
    }
  }


  newLink(urfd_link: URFD_Link, joint: any, parent = false) {
    const link = new Link();
    link.name = urfd_link.id;

    link.setPosition(urfd_link.dimensions.origin.x, urfd_link.dimensions.origin.y, urfd_link.dimensions.origin.z);

    const selectedName = joint !== null ? joint.parent.name : urfd_link.id.slice(0, -5);

    if (this.ikConfig.ikRoot !== null) {
      for (const root of this.ikConfig.ikRoot) {
        root.traverse( c => {

          if (c.isJoint) {

            const name = c.name;
            if (name === selectedName) {

              if (!parent) {

                c.attachChild(link);

              } else {

                if (c.parent === null) {
                  link.attachChild(c);
                  this.ikConfig.ikRoot = null;
                }
              }
            }
          }
        });
        this.createRootsHelper(root);
      }
    }
    this.ikFrames.push(link);
    this.findRootsFromFrames();
  }


  newJoint(urfd_joint: URFD_Joint, link: any, parent = false) {

    const joint = new Joint();
    joint.name = urfd_joint.id;
    joint.setDoF(DOF.Z);
    joint.setPosition(urfd_joint.dimensions.origin.x, urfd_joint.dimensions.origin.y, urfd_joint.dimensions.origin.z);


    const selectedName = link !== null ? link.parent.name : urfd_joint.id + '-link';


    if (this.ikConfig.ikRoot !== null) {
      for (const root of this.ikConfig.ikRoot) {
        root.traverse( c => {

          if (c.isLink) {

            if (c.name === selectedName) {

              if (!parent) {
                c.attachChild(joint);

              } else {

                if (c.parent === null) {
                  joint.attachChild(c);
                  this.ikConfig.ikRoot = null;
                }
              }
            }
          }
        });
        this.createRootsHelper(root);
      }

    }
    this.ikFrames.push(joint);
    this.findRootsFromFrames();

    return joint;
  }


  findRootsFromFrames() {
    if (this.ikConfig.ikRoot === null) {
      this.ikConfig.ikRoot = findRoots(this.ikFrames);
    }
    // console.log(this.ikFrames);
    console.log(this.ikConfig.ikRoot);
  }


  getFrameWithName(id: string) {
    return this.ikFrames.filter(f => f.name === id)[0];
  }


  updateAngle(id: string, delta: number) {
    this.ikConfig.ikRoot.traverse( c => {

      if ( c.isJoint ) {

        const name = c.name;
        if (name === id) {
          c.setDoFValues( c.angle + delta );
        }
      }
    });
  }


  getFrames() {
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
      this.updateIKhelper.next(this.ikConfig.ikHelper);
      // console.log(this.ikConfig.ikHelper);
    }
  }


  store() {
    this.rootsObservable.next(this.ikFrames);
    this.localSt.store('roots', this.ikFrames);
  }



}
