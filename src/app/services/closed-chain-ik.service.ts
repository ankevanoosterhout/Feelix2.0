import { Injectable, OnInit } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal,	DOF, SOLVE_STATUS_NAMESSolver } from 'closed-chain-ik-js-0.0.3/src';
import { Subject } from 'rxjs';
import { JointLink } from '../models/kinematic.model';
import * as THREE from 'three';
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
  targetObject = new THREE.Group();
  finalLink: any;

  addToScene: Subject<any> = new Subject();


  constructor() {
    this.targetObject.position.set( 0, 1, 1 );
    this.addToScene.next(this.targetObject);
  }

  connectObjects(objects: Array<any>) {
    console.log(objects);

    for (const object of objects) {
      if (object.frame.isJoint) {

        const jointInRoot = this.checkIfJointIsInRoot(object.frame);

        const newLink = new Link();
        console.log(newLink);
        const newJoint = this.createNewJoint(object.frame.object3D.position, DOF.EZ, Math.PI * 2, object.frame.object3D.rotation.z);
        newJoint.name = object.frame.id;

        newJoint.setMinLimits( - 0.9 * Math.PI );
		    newJoint.setMaxLimits( 0.9 * Math.PI );

        newLink.addChild(newJoint);

        if ( this.currRoot ) {
          this.currRoot.addChild( newLink );
        }

        if ( this.ikRoot === null ) {
          this.ikRoot = newLink;
        }

        this.currRoot = newJoint;

        console.log("link", newLink);
        console.log("joint", newJoint);
        console.log("currRoot", this.currRoot);
        console.log("ikRoot", this.ikRoot);
      }
    }
  }

  checkIfJointIsInRoot(joint: any) {
    console.log(joint);
    if (this.ikRoot) {
      const jointInRoot = this.ikRoot.children.filter(c => c.name === joint.id)[0];
      //check joint in root
      console.log(jointInRoot);
      console.log(jointInRoot.DoF);
      return jointInRoot;
    }
  }
  // connectObjects(objects: Array<any>) {
  //   console.log(objects);

  //   let newJoint: Joint = null;
  //   let newLink: Link = null;
  //   let linkObject: any = null;

  //   for (const object of objects) {
  //     if (object.frame.isJoint) {
  //       // let inRoot = this.ikRoot.filter(i => i.name === object.frame.id)[0];
  //       newJoint = this.createNewJoint(object.frame.object3D.position, DOF.EZ, Math.PI * 2);
  //       newJoint.name = object.frame.id;
  //       // }
  //       console.log(newJoint);

  //       newLink = new Link();
  //       linkObject = object.frame;
  //       console.log(linkObject);

  //       newLink.addChild( newJoint );
  //       console.log(newLink);
  //       console.log(this.currRoot, this.ikRoot);

  //       if ( this.currRoot ) {
  //         this.currRoot.addChild( newLink );
  //         console.log(this.currRoot);
  //       }

  //       if ( this.ikRoot === null ) {
  //         this.ikRoot = newLink;
  //         console.log(this.ikRoot);
  //       }

  //       this.currRoot = newJoint;
  //       console.log(this.currRoot);
  //     }

  //     // console.log(newLink, newJoint);
  //     // if (newJoint) {
  //     //   newLink.addChild( newJoint );
  //     //   console.log(newLink);
  //     //   console.log(this.currRoot, this.ikRoot);

  //     //   if ( this.currRoot ) {
  //     //     this.currRoot.addChild( newLink );
  //     //     console.log(this.currRoot);
  //     //   }

  //     //   if ( this.ikRoot === null ) {
  //     //     this.ikRoot = newLink;
  //     //     console.log(this.ikRoot);
  //     //   }

  //     //   this.currRoot = newJoint;
  //     //   console.log(this.currRoot);


  //       // if (linkObject) {
  //         // console.log(linkObject.object3D.position);
  //         // this.addFinalLink(linkObject.object3D.position);
  //         // this.createRootsHelper();
  //       // }
  //     // }
  //   }
  //   this.createRootsHelper();
  // }


  updateModelOnMoveTarget(targetObject: any) {

  }


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


  createRootsHelper() {
    console.log(this.ikRoot);
    this.ikHelper = new IKRootsHelper( [ this.ikRoot ] );
    this.ikHelper.setResolution( window.innerWidth, window.innerHeight );

    this.ikHelper.traverse( c => {
      if ( c.material ) {
        c.material.color.set( 0xe91e63 ).convertSRGBToLinear();
      }
    });
    console.log(this.ikHelper);
    this.addToScene.next(this.ikHelper);
  }


  updateRoot() {
    this.ikRoot.updateMatrixWorld( true );
    this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
    this.targetObject.matrix.decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );
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



  updateGoalDoF() {

		const dof = [];
		dof.push( DOF.X, DOF.Y, DOF.Z );
		dof.push( DOF.EX, DOF.EY, DOF.EZ );

		this.goal.setGoalDoF( ...dof );

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


}
