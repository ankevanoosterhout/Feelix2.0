import { Injectable, OnInit } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots,	DOF, SOLVE_STATUS_NAMESSolver } from 'closed-chain-ik-js-0.0.3/src';
import { Subject } from 'rxjs';
import { JointLink } from '../models/kinematic.model';
import { KinematicConnection, KinematicConnectionList } from '../models/kinematic-connections.model';

import * as THREE from 'three';
import { Euler, Group } from 'three';
import { KinematicsConfig } from '../models/kinematics-config.model';
import { KinematicLinkService } from './kinematic-link.service';

// import { KinematicsConfig } from '../models/kinematics-config.model';
// import { IKRootsHelper } from 'closed-chain-ik-js-0.0.3/src/core/utils/findRoots.js';

@Injectable()
export class ClosedChainIKService {


  // TODO: why is the solve stalling so frequently? Only when goal is set with rotation.
  // Matching rotation goal doesn't seem to work.
  solverOptions = {
    maxIterations: 3,
    divergeThreshold: 0.005,
    stallThreshold: 1e-3,
    translationErrorClamp: 0.25,
    rotationErrorClamp: 0.25,
    translationConvergeThreshold: 1e-3,
    rotationConvergeThreshold: 1e-3,
    restPoseFactor: 0.001,
  };

  ikRoots = [];

  solver: any;
  ikHelper: any;
  ikRoot = null;
  currRoot = null;
  goal: any;



  addToScene: Subject<any> = new Subject();
  removeFromScene: Subject<any> = new Subject();

  rootNode: any = null;

  tempEuler = new Euler();

  frames: Array<any> = [];
  newFrames: Array<string> = [];
  targetObject: any;
  finalLink: any;

  constructor(private kinematicLinkService: KinematicLinkService) {
    // this.targetObject.position.set( 0, 0, 0 );
    // this.addToScene.next(this.targetObject);
  }


  createRootsFromList(connList: KinematicConnectionList, sceneObjects: any, object: any) {

    console.log(connList, sceneObjects, object);
    this.frames = [];
    if (connList) {

      const object_connections = this.kinematicLinkService.getLinkedObjects(connList.key, object.name);
      console.log(object_connections);

    }

  }


  // createRootFromList(connList: KinematicConnectionList) {

  //   console.log(connList);

  //   const frameList = [];
  //   for (const item of connList.list) {
  //     const link = new Link();
  //     link.name = item.key;
  //     frameList.push(link);

  //     const joint1 = frameList.filter(f => f.id === item.values[0].object_id)[0];
  //     const joint2 = frameList.filter(f => f.id === item.values[1].object_id)[0];

  //     if (joint1) {
  //       console.log(joint1);
  //     }
  //   }

  //   console.log(frameList);

  // }


  createRootStructure(conn: KinematicConnection, objects: Array<any>, links: any) {
    console.log(conn, objects, links);

    const link = new Link();
    link.name = conn.key;
    this.frames.push(link);

    let joint_1: any;
    let joint_2: any;

    if (this.frames.length > 0) {
      joint_1 = this.frames.filter(f => f.name === objects[0].frame.id)[0];
      joint_2 = this.frames.filter(f => f.name === objects[1].frame.id)[0];
    }

    console.log(link, joint_1, joint_2);

    if (joint_1 === undefined) {
      joint_1 = this.createNewJointFromObject(objects[0]);
      console.log(joint_1);
    }

    if (joint_2 === undefined) {
      joint_2 = this.createNewJointFromObject(objects[1]);
      console.log(joint_2);
    }
    console.log(link, joint_1, joint_2);

    if (joint_1.child === null) {
      joint_1.addChild(link);
      link.addChild(joint_2);
    } else if (joint_1.parent === null) {
      joint_2.addChild(link);
      link.addChild(joint_1);
    }
    if (this.frames.filter(f => f.name === joint_1.name).length === 0) {
      this.frames.push(joint_1);
      this.newFrames.push(joint_1.name);
    }

    if (this.frames.filter(f => f.name === joint_2.name).length === 0) {
      this.frames.push(joint_2);
      this.newFrames.push(joint_2.name);
    }

    console.log(this.frames);
    this.createRootsFromFrames();

  }





  addObjectToRootStructure(object: any, parentLink: string, childLink: string) {

    console.log(object, parentLink, childLink);

    let jointObject = this.createNewJointFromObject(object);
    let newParentLink = null;
    let newChildLink = null;

    if (this.frames.length > 0) {
      newChildLink = this.frames.filter(f => f.name === childLink)[0];
      newParentLink = this.frames.filter(f => f.name === newParentLink)[0];
    }

    if (newChildLink === null) {
      if (childLink) {
        newChildLink = new Link();
        newChildLink.name = childLink;
        jointObject.addChild(newChildLink);
        this.frames.push(newChildLink);
      }
    }

    if (newParentLink === null) {
      if (parentLink) {
        newParentLink = new Link();
        newParentLink.name = parentLink;
        newParentLink.addChild(jointObject);
        this.frames.push(newParentLink);
      }
    }
    jointObject.updateMatrix();
    this.frames.push(jointObject);

    this.createRootsFromFrames();

    // if (this.ikRoot === null) {
    //   this.ikRoot = newParentLink ? newParentLink : jointObject;
    // }
    // console.log(this.ikRoot);

    // this.currRoot = newChildLink;
    // console.log(this.currRoot);
    // this.createRootsHelper();
  }


  createRootsFromFrames() {
    const roots = findRoots(this.frames);
    console.log(roots);
    this.ikRoot = roots;
    console.log(this.frames, this.newFrames);
    let newStructure = false;

    for (const root of this.ikRoot) {
      root.traverse( c => {
        if (c.isJoint) {
          console.log(this.newFrames.includes(c.name));
          if (this.newFrames.includes(c.name) && c.children) {
            newStructure = true;
          }
          if (this.newFrames.includes(c.name) || newStructure) {
            c.setWorldPosition(c.position[0], c.position[1], c.position[2] );
            c.setWorldQuaternion(c.quaternion[ 0], c.quaternion[1], c.quaternion[2], c.quaternion[3] );
            c.setMatrixNeedsUpdate();
          }
        }
      });
    }
    this.newFrames = [];
    this.createRootsHelper();
  }

  setClosureLinkWithoutChild(link: any) {
    if (link.children) {
      for (const child of link.children) {
        this.setClosureLinkWithoutChild(child);
      }
    } else if (link.isLink) {
      this.goal.makeClosure(link);
    }
  }

  // updatePosition(frame: any, parentPosition = null) {
  //   if (frame.children) {
  //     for (const child of frame.children) {
  //       if (child.isJoint) {
  //         console.log(JSON.stringify(child.position));
  //         if (parentPosition !== null) {
  //           // child.setPosition(child.position[0] - parentPosition[0], child.position[1] - parentPosition[1], child.position[2] - parentPosition[2]);
  //           child.updateMatrix();
  //           this.updatePosition(child, child.position);

  //           console.log(JSON.stringify(child.position));
  //         }
  //       }
  //     }
  //   }
  // }



  joinObjects(objects: Array<any>) {
    console.log(objects);

    let link = null;
    let newItem = true;


    for (const object of objects) {
      // newItem = true;
      let joint = null;

      if (object.frame.isJoint) {

        if (this.ikRoot) {
          console.log(this.currRoot, this.ikRoot);
          this.ikRoot.traverse(c => {
            if (newItem) {
              if (c.isJoint) {
                if (c.name === object.frame.id) {
                  console.log("IN ROOT", c);
                  newItem = false;
                  joint = c;
                }
              } else if (c.isLink) {
                if (c.parent.name === object.frame.id) {
                  console.log("IN ROOT", c.parent);
                  newItem = false;
                  joint = c.parent;
                }
              }
            }
          });
        }

        if (joint === null) {
          console.log("NOT IN ROOT", object.frame);
          // joint = this.createNewJointFromObject(object, position);
        }

        if (link === null) {
          link = new Link();
          console.log(link, joint);
          joint.addChild(link);

        } else if (link) {
          link.addChild(joint);

          if (newItem) {
            if (this.currRoot) {
              console.log(link);
              this.currRoot.addChild( link );

              // else {
              //   this.currRoot = link.addChild(this.currRoot);
              // }
            }

            if ( this.ikRoot === null) {
              this.ikRoot = link;
            }
          }
          this.currRoot = joint;
        }
      }
    }

    this.createRootsHelper();
  }



  setIKFromObject( ikRoot: any, object: any ) {

    ikRoot.setDoFValue( DOF.X, object.position.x );
    ikRoot.setDoFValue( DOF.Y, object.position.y );
    ikRoot.setDoFValue( DOF.Z, object.position.z );

    this.tempEuler.copy( object.rotation );
    this.tempEuler.reorder( 'ZYX' );
    ikRoot.setDoFValue( DOF.EX, this.tempEuler.x );
    ikRoot.setDoFValue( DOF.EY, this.tempEuler.y );
    ikRoot.setDoFValue( DOF.EZ, this.tempEuler.z );

    // ikRoot.traverse( c => {

    //   if ( c.isJoint ) {

    //     const name = c.name;
    //     if ( name in urdfRoot.joints ) {

    //       c.setDoFValues( urdfRoot.joints[ name ].angle );

    //     }

    //   }

    // } );
  }


  createTarget() {
    this.finalLink = new Link();
    this.finalLink.setPosition( 0, 0.5, 0 );
    // this.ikRoot.updateMatrixWorld( true );
    // this.frames[this.frames.length - 1].addChild(this.finalLink);

    this.createRootsFromFrames();

    this.targetObject = new Group();
    this.targetObject.position.set(0, 1, 0);
    this.addToScene.next( this.targetObject );


    this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
    this.targetObject.matrix
      .decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );

    this.goal = new Goal();
    this.goal.makeClosure( this.finalLink );

    this.solver = new Solver( this.ikRoot );
	  Object.assign( this.solver, this.solverOptions );

    this.updateGoalDoF();

    return this.targetObject;
  }


  updateGoalDoF() {

		const dof = [DOF.X, DOF.Y, DOF.Z, DOF.EX, DOF.EY, DOF.EZ];

		this.goal.setGoalDoF( ...dof );

	}

  updateTargetObject() {
    this.ikRoot.updateMatrixWorld( true );
		this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
		this.targetObject.matrix
			.decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );
  }




  createNewJointFromObject(object: any) {
    console.log(object);

    const newJoint = new Joint();
    newJoint.clearDoF();
    newJoint.name = object.frame.id;
    newJoint.setDoF( DOF.EZ ); //DOF.EZ
    newJoint.setWorldPosition(
      object.frame.object3D.position.x,
      object.frame.object3D.position.y,
      object.frame.object3D.position.z ); //0, 1, 0}
    // newJoint.setMatrixNeedsUpdate();

    newJoint.setDoFValue( DOF.EZ, 1.8 * Math.PI);
    // newJoint.setRestPoseValues(object.frame.sceneObject.rotation.z);
    // newJoint.restPoseSet = true;
    newJoint.targetSet = true;

    newJoint.setMinLimit(DOF.EZ, - 0.9 * Math.PI );
    newJoint.setMaxLimit(DOF.EZ, 0.9 * Math.PI );
//     setMinLimit( dof : DOF, value : Number ) : Boolean
// setMaxLimit( dof : DOF, value : Number ) : Boolean
    newJoint.setWorldQuaternion(object.frame.sceneObject.quaternion.x, object.frame.sceneObject.quaternion.y, object.frame.sceneObject.quaternion.z, object.frame.sceneObject.quaternion.w);
    // newJoint.setMatrixNeedsUpdate();

    console.log(newJoint.position, newJoint.quaternion);
    return newJoint;
  }


  // createNewJointFromObject(object: any, position: Array<number>) {
  //   console.log(object.frame.sceneObject, position);

  //   const newJoint = new Joint();
  //   newJoint.name = object.frame.id;
  //   newJoint.setDoF( (object.point.plane === 'Z' ? DOF.EZ : DOF.EX) ); //DOF.EZ
  //   newJoint.setPosition(
  //     object.frame.sceneObject.position.x - position[0],
  //     object.frame.sceneObject.position.y - position[1],
  //     object.frame.sceneObject.position.z - position[2] ); //0, 1, 0}
  //   newJoint.setDoFValue( (object.point.plane === 'Z' ? DOF.EZ : DOF.EX), object.frame.sceneObject.rotation.z );
  //   newJoint.setRestPoseValues(object.frame.sceneObject.rotation.z);
  //   newJoint.restPoseSet = true;

  //   newJoint.setMinLimits( - 0.9 * Math.PI );
  //   newJoint.setMaxLimits( 0.9 * Math.PI );
  //   newJoint.setQuaternion(object.frame.sceneObject.quaternion.x, object.frame.sceneObject.quaternion.y, object.frame.sceneObject.quaternion.z, object.frame.sceneObject.quaternion.w);
  //   newJoint.setMatrixWorldNeedsUpdate();
  //   console.log(newJoint);


  //   return newJoint;
  // }


  updateJointLimits(joint_id: any, limitMin: number, limitMax: number) {
    //get joint
    // joint.setMinLimits( limitMin );
		// joint.setMaxLimits( limitMax );
  }


  addFinalLink(position: any) {
    this.finalLink = new Link();
    this.finalLink.setPosition( position.x, position.y, position.z );
    this.currRoot.addChild( this.finalLink );

    this.updateRoot();
  }


  createNewJoint(position: any, DoF: any, DoFValue: number, restPosition: number) {
    const joint = new Joint();
    joint.setDoF( DoF ); //DOF.EZ
    joint.setPosition( position.x, position.y, position.z ); //0, 1, 0
    joint.setDoFValues( DoFValue ); //Math.PI / 4
    joint.setRestPoseValues(restPosition);
    joint.restPoseSet = true;
    console.log('new joint ', joint);
    return joint;
  }


  updateJoint(joint: any, position: any, DoF: any, DoFValue: number ) {
    joint.setDoF( DoF ); //DOF.EZ
    joint.setPosition( position.x, position.y, position.z ); //0, 1, 0
    joint.setDoFValues( DoFValue ); //Math.PI / 4
    console.log('updated joint ', joint);
    return joint;
  }

  createStructure() {
    // findRoots(this.structure);
  }


  createGoal(link: Link) {
    const goal = new Goal();
    link.getWorldPosition( goal.position );
    link.getWorldQuaternion( goal.quaternion );

    this.updateGoalDoF();
  }



  findRootsFrameArray(frames: Array<any>) {
    this.ikRoot.findRoots(frames);

    this.createRootsHelper();
  }


  createRootsHelper() {
    console.log(this.ikRoot);
    if (this.ikRoot !== null) {
      if (this.ikHelper) {
          // this.ikHelper.traverse( this.dispose );
        this.removeFromScene.next('ikHelper');
      }
      this.ikHelper = new IKRootsHelper( this.ikRoot );
      this.ikHelper.setResolution( window.innerWidth, window.innerHeight );
      this.ikHelper.setJointScale(80);
      this.ikHelper.name = 'ikHelper';
      // this.ikHelper.setColor( this.ikHelper.color );
      this.ikHelper.traverse( c => {
        if (c.material) {
          c.material.color.setHex( 0xe91e63 );
        }
        c.visible = true;
      });

      console.log(this.ikHelper);
      this.addToScene.next(this.ikHelper);
    }
  }


  updateRoot() {
    this.ikRoot.updateMatrixWorld( true );
    // this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
    // this.targetObject.matrix.decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );
  }

  updateResolution(width: number, height: number) {
    if (this.ikHelper) {
      this.ikHelper.setResolution( width, height );
    }
  }

  createSolver() {
    this.solver = new Solver(this.ikRoot);
    Object.assign( this.solver, this.solverOptions );
  }




  render() {
    if (this.goal && this.targetObject) {
      this.goal.setPosition(
        this.targetObject.position.x,
        this.targetObject.position.y,
        this.targetObject.position.z,
      );
      this.goal.setQuaternion(
        this.targetObject.quaternion.x,
        this.targetObject.quaternion.y,
        this.targetObject.quaternion.z,
        this.targetObject.quaternion.w,
      );
    }
  }



  dispose( c: any ) {

    if ( c.geometry ) {

      c.geometry.dispose();

    }

    if ( c.material ) {

      if ( Array.isArray( c.material ) ) {
        c.material.forEach( this.disposeMaterial );
      } else {
        this.disposeMaterial( c.material );
      }

    }

  }


  disposeMaterial( material: any ) {

    material.dispose();
    for ( const key in material ) {

      if ( material[ key ] && material[ key ].isTexture ) {

        material[ key ].dispose();
      }
    }
  }


}
