import { Injectable } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots, DOF, setIKFromUrdf, urdfRobotToIKRoot, SOLVE_STATUS_NAMES } from 'closed-chain-ik-js-0.0.3/src';
import { Subject } from 'rxjs';
import { JointLink } from '../models/kinematic.model';
import { Root } from '../models/kinematic-connections.model';
import * as THREE from 'three';

import { Euler, Group } from 'three';
// import { KinematicLinkService } from './kinematic-link.service';
import { KinematicService } from './kinematic.service';

import URDFLoader from 'urdf-loader';
import { LoadingManager, sRGBEncoding } from 'three';
import { XacroLoader } from 'xacro-parser';
import { quat } from 'gl-matrix';



@Injectable()
export class ClosedChainIKService {


  // TODO: why is the solve stalling so frequently? Only when goal is set with rotation.
  // Matching rotation goal doesn't seem to work.
  solverOptions = {
    maxIterations: 10,
    divergeThreshold: 0.005,
    stallThreshold: 1e-3,
    translationErrorClamp: 0.25,
    rotationErrorClamp: 0.25,
    translationConvergeThreshold: 1e-3,
	  rotationConvergeThreshold: 1e-3,
    restPoseFactor: 0.001
  };

  ikRoot = null;

  solver: any;
  ikHelper: any;
  goal: any;



  addToScene: Subject<any> = new Subject();
  removeFromScene: Subject<any> = new Subject();
  updateJointsInScene: Subject<any> = new Subject();
  animateScene: Subject<any> = new Subject();

  rootNode: any = null;

  tempEuler = new Euler();

  frames: Array<any> = [];
  newFrames: Array<string> = [];
  targetObject: any;
  finalLink: any;

  createRoot = false;



  selectedGoalIndex = - 1;

  loadId = 0;
  averageTime = 0;
  averageCount = 0;
  drawThroughIkHelper = null;
  urdfRoot = null;

  goalToLinkMap = new Map();
  linkToGoalMap = new Map();
  goals = [];
  goalIcons = [];

  DEG2PI = Math.PI / 180;

  constructor(private kinematicService: KinematicService) {
    // this.targetObject.position.set( 0, 0, 0 );
    // this.addToScene.next(this.targetObject);
  }



  createRootsFromList(root: Root, sceneObjects: any) {
    // console.log(root, sceneObjects);
    this.frames = [];
    this.ikRoot = null;
    this.createRoot = false;
    if (root) {
      console.log(root);
      const startJoint = this.getStartJoint(root);
      this.processJoint(startJoint, null, sceneObjects, root);
    }
  }

  processJoint(joint: any, parentLink: any, sceneObjects: any, root: Root) {


    if (!this.createRoot) {
      // console.log(joint);
      const jointObj = this.kinematicService.getJoint(joint.id);
      const sceneObjectJoint = sceneObjects.filter(s => s.name === joint.id)[0];
      // console.log(jointObj.id);

      const jointEl = this.frames.filter(f => f.name === jointObj.id && f.isJoint)[0] ?
        this.frames.filter(f => f.name === jointObj.id && f.isJoint)[0] : this.createNewJointFromObject(jointObj, sceneObjectJoint);
      // console.log(jointEl);

      const link = parentLink === null || parentLink === undefined ? new Link() : this.frames.filter(f => f.name === parentLink.name && f.isLink)[0];
      // console.log(link);
      // console.log(link);
      if (parentLink === null || parentLink === undefined) {
        link.name = link.name === "" ? joint.id + ':C' : link.name;
        if (jointEl.children.length === 0) {
          jointEl.addChild(link);
        }
      } else {
        // console.log('add child to link', joint.id, link.name);
        if (!link.children.includes(jointEl)) {
          link.addChild(jointEl);
        }
      }

      // console.log(link);

      if (this.frames.filter(f => f.name === jointEl.name && jointEl.isJoint).length === 0) {
        this.frames.push(jointEl);
        // console.log(this.frames);
      }


      if (this.frames.filter(f => f.name === link.name && link.isLink).length === 0) {
        this.frames.push(link);
        // console.log(this.frames);
      }

      if (this.frames.filter(f => f.isJoint).length === root.joints.length) {
        this.createRoot = true;
        console.log('finished');
        console.log(this.frames);
        this.createRootsFromFrames(sceneObjects);
        return;
      }

      if (!this.createRoot) {
        for (const connector of jointObj.connectors) {
          if (connector.connected) {
            // console.log(connector);

            const connectedJointObj = this.kinematicService.getJoint(connector.object);
            const connectedJointInRoot = root.joints.filter(j => j.id === connectedJointObj.id)[0];
            // console.log(connectedJointObj);
            const connectorToOriginalObject = connectedJointObj.connectors.filter(c => c.object === joint.id)[0];
            const newConnectedJoint = this.createNewJointFromObject(connectedJointObj, sceneObjectJoint);

            const jointInFrames = this.frames.filter(f => f.name === newConnectedJoint.name)[0];

            if (jointInFrames === undefined) {
              link.addChild(newConnectedJoint);
              this.frames.push(newConnectedJoint);
            } else if (jointInFrames !== undefined) {
              // console.log('add ', jointInFrames, ' to ', link);
              // jointInFrames.addChild(link);
              // link.addChild(jointInFrames);
            }

            for (const connectorJO of connectedJointObj.connectors.filter(c => c.connected)) {

              if (connectorJO.object !== joint.id) {
                console.log('new' + connectorToOriginalObject.plane, connectorJO.plane);
                this.processJoint(connectedJointInRoot, (connectorToOriginalObject.plane === connectorJO.plane ? link : null), sceneObjects, root);

              }
            }
          }
        }
      }
    }
  }





  getStartJoint(root: Root) {
    if (root && root.joints.length > 0) {
      let startJoint = root.joints[0];

      for (const joint of root.joints) {
        // console.log(joint);
        if (joint.linkGroup[0].links.length === 0 || joint.linkGroup[1].links.length === 0) {
          return joint;
        } else if (startJoint.linkGroup[0].links.length >= joint.linkGroup[0].links.length && startJoint.linkGroup[1].links.length >= joint.linkGroup[1].links.length) {
          startJoint = joint;
        }
      }
      return startJoint;
    }
  }



  getConnectedObjects(root: Root, object: any) {
    // console.log(root, object);
    const linkedObjects = [];
    if (root && root.links.length > 0) {
      for (const link of root.links) {
        const connectedJoint = link.joints.filter(j => j.id === object.id && j.plane === object.plane)[0];
        // console.log(connectedJoint);
        if (connectedJoint) {
          linkedObjects.push(link.joints.filter(j => j.id !== object.id)[0]);
        }
      }
    }
    return linkedObjects;
  }


  getStartLinkRoot(root: Root) {
    if (root && root.joints.length > 0) {
      let joint = root.joints.filter(j => j.linkGroup[0].links.length + j.linkGroup[1].links.length === 1)[0];

      if (joint === undefined) {
        for (const item of root.joints) {
          for (const group of item.linkGroup) {
            const closureLinks = group.links.filter(l => l.closure);
            if (closureLinks.length > 0) {
              return item;
            }
          }
        }
        return root.joints[0];
      }
      return joint;
    }
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
            // quat.fromEuler( c.quaternion, c.rotation.x, c.object3D.rotation.y, c.object3D.rotation.z );
            // c.setWorldQuaternion(c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w);

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

    createTarget(object: any) {

      if (this.ikRoot) {
        if (this.targetObject) {
          this.removeFromScene.next(this.targetObject.name);
        }
        for (const root of this.ikRoot) {
          root.traverse(c => {

            if (c.isJoint) {
              const name = c.name;
              if (object.name === name) {
                this.targetObject = new Group();
                let worldPosition = new THREE.Vector3();
                object.getWorldPosition(worldPosition);
                console.log(worldPosition);
                this.targetObject.position.set( worldPosition.x, worldPosition.y, worldPosition.z );
                // this.targetObject.updateMatrix();
                this.finalLink = new Link();
                this.finalLink.setPosition(0, 0.5, 0);
                console.log(c.parent, c.child);
                // if (c.parent === null) {
                //   console.log('parent');
                //   this.finalLink.attachChild(c);
                // } else
                if (c.child === null) {
                  console.log('child');
                  c.addChild(this.finalLink);
                }
                // else {
                //   this.finalLink.makeClosure(c);
                // }
                // this.finalLink.updateMatrix();

                root.updateMatrixWorld( true );

                this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
                this.targetObject.matrix.decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );

                this.targetObject.name = 'target';
                const geometry = new THREE.SphereGeometry( 25, 32, 16 );
                const material = new THREE.MeshBasicMaterial( { color: 0xffff00, opacity: 0.5 } );
                const sphere = new THREE.Mesh( geometry, material );

                this.targetObject.add(sphere);
                this.addToScene.next( { object: this.targetObject, addControls: true } );

                this.goal = new Goal();

              	this.goal.makeClosure( this.finalLink );

                this.createRootsHelper();

                this.createSolver(root);

                this.updateGoalDoF();
                // console.log(this.solver);

              }
            }

          });
        }
      }

    }





  updateGoalDoF() {

		const dof = [DOF.X, DOF.Y, DOF.Z, DOF.EX, DOF.EY, DOF.EZ];

		this.goal.setGoalDoF( ...dof );

	}

  updateTargetObject() {
    if (this.ikRoot && this.targetObject) {
      for (const root of this.ikRoot) {
        root.updateMatrixWorld( true );
      }
      this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
      this.targetObject.matrix.decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );

      // this.solver.solve();
      this.ikHelper.updateStructure();

      // console.log(this.ikHelper);
      // console.log(this.ikRoot);

      // for (const root of this.ikRoot) {
      //   root.traverse( ( child: any ) => {
      //     if ( child.isJoint ) {
      //       let position_ = [];
      //       let quaternion_ = [];
      //       child.getWorldPosition(position_);
      //       child.getWorldQuaternion(quaternion_);
      //       this.updateJointsInScene.next({ joint: child, position: position_, quaternion: quaternion_ });
      //     }
      //   });
      // }

      // this.animateScene.next();

      // console.log(this.solver);
    }
  }




  createNewJointFromObject(joint: JointLink, sceneObject: any) {
    console.log('limits ', joint.limits);

    if (sceneObject) {
      const newJoint = new Joint();
      // newJoint.clearDoF();
      newJoint.name = joint.id;
      newJoint.setDoF( DOF.EZ ); //DOF.EZ
      // newJoint.setWorldPosition(
      //   sceneObject.position.x,
      //   sceneObject.position.y,
      //   sceneObject.position.z ); //0, 1, 0}
      // newJoint.setMatrixNeedsUpdate();

      // console.log(joint.limits);


      // newJoint.setRestPoseValues(object.frame.sceneObject.rotation.z);
      // newJoint.restPoseSet = true;
      // newJoint.targetSet = true;
      if (joint.limits.min * -1 > -10000 && joint.limits.max < 10000) {
        newJoint.setDoFValue(DOF.EZ, (joint.limits.max - joint.limits.min) * this.DEG2PI);
        newJoint.setMinLimit(DOF.EZ, -joint.limits.min * this.DEG2PI);
        newJoint.setMaxLimit(DOF.EZ, joint.limits.max * this.DEG2PI);
      }
      newJoint.setDoFValue(DOF.EX, 0);
      newJoint.setDoFValue(DOF.EY, 0);
      newJoint.setDoFValue(DOF.X, 0);
      newJoint.setDoFValue(DOF.Y, 0);
      newJoint.setDoFValue(DOF.Z, 0);

      newJoint.setWorldQuaternion(sceneObject.quaternion.x, sceneObject.quaternion.y, sceneObject.quaternion.z, sceneObject.quaternion.w);
      // newJoint.setMatrixNeedsUpdate();

      // console.log(newJoint);
      return newJoint;
    }
  }



  updateJointLimits(joint_id: any, limitMin: number, limitMax: number) {
    //get joint
    if (this.ikRoot) {
      // joint.setMinLimits( limitMin );
		  // joint.setMaxLimits( limitMax );
    }
  }




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
      this.addToScene.next({ object: this.ikHelper, addControls: false });
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

  createSolver(root: any) {
    this.solver = new Solver(root);
    Object.assign( this.solver, this.solverOptions );
  }


  removeTarget() {
    this.targetObject = null;
    this.solver = null;
  }



  render() {
    if (this.goal && this.targetObject && this.solver && this.ikRoot) {
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
      // console.log(this.ikRoot, this.solver, this.targetObject);
      this.solver.solve();
      // const solverOutput = this.solver.solve().map( s => SOLVE_STATUS_NAMES[ s ] ).join( '\n' );
      // console.log(solverOutput);
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
