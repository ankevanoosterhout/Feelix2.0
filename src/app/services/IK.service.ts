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
  updateModels: Subject<any> = new Subject();

  solverOptions = {
    maxIterations: 5,
    divergeThreshold: 0.005,
    stallThreshold: 1e-3,
    translationErrorClamp: 0.25,
    rotationErrorClamp: 0.25,
    translationConvergeThreshold: 1e-3,
    rotationConvergeThreshold: 1e-3,
    restPoseFactor: 0.001,
  };

  constructor(private localSt: LocalStorageService) {
    this.ikConfig = new IKConfig();

    const data = this.localSt.retrieve('roots');

    if (data) {
      // console.log(data);
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
    // joint.setDoFValue(DOF.EZ, Math.PI * 2);

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
    this.ikConfig.solver = new Solver( this.ikConfig.ikRoot );
    Object.assign( this.ikConfig.solver, this.solverOptions );
    // console.log(this.ikFrames);
    // console.log(this.ikConfig.ikRoot);
  }


  getFrameWithName(id: string) {
    return this.ikFrames.filter(f => f.name === id)[0];
  }


  updateAngle(id: string, quaternion: any) {
    // console.log('update root angles ', id, quaternion);
    for (const root of this.ikConfig.ikRoot) {
      root.traverse( c => {

        // if ( c.isJoint ) {

          const name = c.name;
          if (name === id) {

            // c.setWorldPosition( position.x, position.y, position.z);
            c.setWorldQuaternion( quaternion._x, quaternion._y, quaternion._z, quaternion._w );
            c.updateMatrixWorld(true);
            // console.log(c);
          }
        // }
        // this.createRootsHelper(root);
      });
    }
    this.ikConfig.solver.updateStructure();
    // this.ikConfig.ikRoot.updateStructure();
    this.ikConfig.ikHelper.updateStructure();

    this.updateModels.next(this.ikConfig.ikRoot);

    this.showRootsHelper(true);

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
      this.showRootsHelper(true);
      this.updateIKhelper.next(this.ikConfig.ikHelper);
      // console.log(this.ikConfig.ikHelper);
    }
  }

  showRootsHelper(visible: boolean) {
    this.ikConfig.ikHelper.traverse( c => {
      if (c.material) {
        c.material.color.setHex( 0xe91e63 );
      }
      c.visible = visible;
    });
  }


  store() {
    this.rootsObservable.next(this.ikFrames);
    this.localSt.store('roots', this.ikFrames);
  }


  updateObjectQuaternion(id: string, quaternion: any, updateChildren = false) {
    // console.log('update quaternion ', id);
    for (const root of this.ikConfig.ikRoot) {
      root.traverse( c => {

        // if ( c.isJoint ) {

        const name = c.name;
        if (name === id) {
          c.setQuaternion( quaternion.x, quaternion.y, quaternion.z, quaternion.w );
          c.updateMatrix();
          // console.log(c);
        }
        // }
      });
    }
  }



}
