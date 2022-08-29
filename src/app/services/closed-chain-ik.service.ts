import { Injectable } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots,DOF } from 'closed-chain-ik-js-0.0.3/src';
import { Subject } from 'rxjs';
import { JointLink } from '../models/kinematic.model';
import { Root } from '../models/kinematic-connections.model';

import { Euler, Group } from 'three';
import { KinematicLinkService } from './kinematic-link.service';
import { KinematicService } from './kinematic.service';


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

  ikRoot = null;

  solver: any;
  ikHelper: any;
  goal: any;



  addToScene: Subject<any> = new Subject();
  removeFromScene: Subject<any> = new Subject();

  rootNode: any = null;

  tempEuler = new Euler();

  frames: Array<any> = [];
  newFrames: Array<string> = [];
  targetObject: any;
  finalLink: any;

  constructor(private kinematicLinkService: KinematicLinkService, private kinematicService: KinematicService) {
    // this.targetObject.position.set( 0, 0, 0 );
    // this.addToScene.next(this.targetObject);
  }


  createRootsFromList(root: Root, sceneObjects: any) {

    // console.log(root, sceneObjects, object);
    this.frames = [];
    if (root) {

      let startJoint = this.getStartLinkRoot(root);
      for (const link of startJoint.links) {
        if (!link.closure) {
          this.processLink(link, startJoint, sceneObjects, root);
        }
      }
    }
  }

  processLink(link: any, joint: any, sceneObjects: any, root: Root) {

    if (this.frames.filter(f => f.name === link.id).length === 0) {
      const newLink = new Link();
      newLink.name = link.id;

      let joint_1: any;
      let joint_2: any;

      if (this.frames.length > 0) {
        joint_1 = this.frames.filter(f => f.name === link.connJoints[0])[0];
        joint_2 = this.frames.filter(f => f.name === link.connJoints[1])[0];
      }

      if (joint_1 === undefined) {
        const joint = this.kinematicService.getJoint(link.connJoints[0]);
        if (joint) {
          const sceneObjectJoint = sceneObjects.filter(s => s.name === joint.id)[0];
          joint_1 = this.createNewJointFromObject(joint, sceneObjectJoint);
        }
        // console.log(joint_1);
      }

      if (joint_2 === undefined) {
        const joint = this.kinematicService.getJoint(link.connJoints[1]);
        if (joint) {
          const sceneObjectJoint = sceneObjects.filter(s => s.name === joint.id)[0];
          joint_2 = this.createNewJointFromObject(joint, sceneObjectJoint);
        }
        // console.log(joint_2);
      }

      const parentJoint = joint_1.name === joint.id ? joint_1 : joint_2;
      const childJoint = joint_1.name !== joint.id ? joint_1 : joint_2;

      // console.log(parentJoint, childJoint);

      if (parentJoint.child === null) {
        parentJoint.addChild(newLink);
        if (link.isClosure) {
          parentJoint.makeClosure(newLink);
        }
      }
      newLink.addChild(childJoint);

      this.frames.push(newLink);


      if (this.frames.filter(f => f.name === joint_1.name).length === 0) {
        this.frames.push(joint_1);
      }

      if (this.frames.filter(f => f.name === joint_2.name).length === 0) {
        this.frames.push(joint_2);
        this.newFrames.push(joint_2.name);
      }

      const newItem = this.getNextLinkRoot(link, joint, root);
      // console.log(newItem);
      if (newItem !== null) {
        for (const item of newItem.links) {
          this.processLink(item, newItem.joint, sceneObjects, root);
        }
      }
    }
    if (this.frames.filter(f => f.isLink).length === root.links.length) {
      this.createRootsFromFrames(sceneObjects);
    }
  }


  getStartLinkRoot(root: Root) {
    if (root && root.joints.length > 0) {
      let joint = root.joints.filter(j => j.links.length === 1)[0];

      if (joint === undefined) {
        for (const item of root.joints) {
          const closureLinks = item.links.filter(l => l.closure);
          if (closureLinks.length > 0) {
            return item;
          }
        }
        return root.joints[0];
      }
      return joint;
    }
  }

  getNextLinkRoot(currlink: Link, currJoint: Joint, root: Root) {
    // console.log(currlink, currlink.connJoints, currJoint);
    if (currlink.connJoints) {
      const newJointID = currlink.connJoints.filter(l => l !== currJoint.id)[0];
      //return newItem list
      if (newJointID) {
        const newJoint = root.joints.filter(j => j.id === newJointID)[0];
        // console.log(newJoint);
        if (newJoint) {
          return { joint: newJoint, links: newJoint.links.filter(l => l.id !== currlink.id) };
        }
      }
    }
    return null;
  }


  createRootsFromFrames(sceneObjects: any) {
    this.ikRoot = findRoots(this.frames);
    // console.log(this.ikRoot);
    for (const root of this.ikRoot) {
      root.traverse( c => {
        if (c.isJoint) {
          const sceneObject = sceneObjects.filter(s => s.name === c.name)[0];

          if (sceneObject) {
            c.setWorldPosition(sceneObject.position.x, sceneObject.position.y, sceneObject.position.z);
            c.setWorldQuaternion(sceneObject.quaternion.x, sceneObject.quaternion.y, sceneObject.quaternion.z, sceneObject.quaternion.w);

            c.updateMatrixWorld( false );
          }
        }
      });
    }
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


    // ikRoot.traverse( c => {

    //   if ( c.isJoint ) {

    //     const name = c.name;
    //     if ( name in urdfRoot.joints ) {

    //       c.setDoFValues( urdfRoot.joints[ name ].angle );

    //     }

    //   }

    // } );



  // createTarget() {
  //   this.finalLink = new Link();
  //   this.finalLink.setPosition( 0, 0.5, 0 );
  //   // this.ikRoot.updateMatrixWorld( true );
  //   // this.frames[this.frames.length - 1].addChild(this.finalLink);

  //   // this.createRootsFromFrames();

  //   this.targetObject = new Group();
  //   this.targetObject.position.set(0, 1, 0);
  //   this.addToScene.next( this.targetObject );


  //   this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
  //   this.targetObject.matrix
  //     .decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );

  //   this.goal = new Goal();
  //   this.goal.makeClosure( this.finalLink );

  //   this.solver = new Solver( this.ikRoot );
	//   Object.assign( this.solver, this.solverOptions );

  //   this.updateGoalDoF();

  //   return this.targetObject;
  // }


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




  createNewJointFromObject(joint: JointLink, sceneObject: any) {
    console.log(sceneObject.name);
    console.log(sceneObject.position, sceneObject.quaternion);

    const newJoint = new Joint();
    newJoint.clearDoF();
    newJoint.name = joint.id;
    newJoint.setDoF( DOF.EZ ); //DOF.EZ
    // newJoint.setWorldPosition(
    //   sceneObject.position.x,
    //   sceneObject.position.y,
    //   sceneObject.position.z ); //0, 1, 0}
    // newJoint.setMatrixNeedsUpdate();

    newJoint.setDoFValue( DOF.EZ, 1.8 * Math.PI);
    // newJoint.setRestPoseValues(object.frame.sceneObject.rotation.z);
    // newJoint.restPoseSet = true;
    newJoint.targetSet = true;

    newJoint.setMinLimit(DOF.EZ, - 0.9 * Math.PI );
    newJoint.setMaxLimit(DOF.EZ, 0.9 * Math.PI );
//     setMinLimit( dof : DOF, value : Number ) : Boolean
// setMaxLimit( dof : DOF, value : Number ) : Boolean
    // newJoint.setWorldQuaternion(sceneObject.quaternion.x, sceneObject.quaternion.y, sceneObject.quaternion.z, sceneObject.quaternion.w);
    // newJoint.setMatrixNeedsUpdate();

    console.log(newJoint.position, newJoint.quaternion);
    return newJoint;
  }



  updateJointLimits(joint_id: any, limitMin: number, limitMax: number) {
    //get joint
    if (this.ikRoot) {
      // joint.setMinLimits( limitMin );
		  // joint.setMaxLimits( limitMax );
    }
  }


  // addFinalLink(position: any) {
  //   this.finalLink = new Link();
  //   this.finalLink.setPosition( position.x, position.y, position.z );
  //   this.currRoot.addChild( this.finalLink );

  //   this.updateRoot();
  // }



  updateJoint(joint: any, position: any, DoF: any, DoFValue: number ) {
    joint.setDoF( DoF ); //DOF.EZ
    joint.setPosition( position.x, position.y, position.z ); //0, 1, 0
    joint.setDoFValues( DoFValue ); //Math.PI / 4
    console.log('updated joint ', joint);
    return joint;
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
