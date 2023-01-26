import { Injectable } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots, DOF } from 'closed-chain-ik/src';
import { Subject } from 'rxjs';
import { JointLink } from '../models/kinematic.model';
import { Root } from '../models/kinematic-connections.model';
import * as THREE from 'three';

// import { KinematicLinkService } from './kinematic-link.service';
import { KinematicService } from './kinematic.service';
import { IKConfig } from '../models/ik-config.model';

// import URDFLoader from 'urdf-loader';
// import { LoadingManager, sRGBEncoding } from 'three';
// import { XacroLoader } from 'xacro-parser';
// import { quat } from 'gl-matrix';

//package json: "closed-chain-ik": "file:closed-chain-ik",

@Injectable()
export class ClosedChainIKService {

  public ikConfig: IKConfig;
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

  // ikRoot = null;

  // solver: any;
  // ikHelper: any;
  // goal: any;



  addToScene: Subject<any> = new Subject();
  removeFromScene: Subject<any> = new Subject();
  updateJointsInScene: Subject<any> = new Subject();
  animateScene: Subject<any> = new Subject();
  updateTargetPosition: Subject<any> = new Subject();

  rootNode: any = null;

  tempEuler = new THREE.Euler();

  // frames: Array<any> = [];
  // newFrames: Array<string> = [];
  // targetObject: any;
  // finalLink: any;

  // createRoot = false;



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
    this.ikConfig = new IKConfig();
  }



  createRootsFromList(root: Root, sceneObjects: any) {
    // console.log(root, sceneObjects);
    this.ikConfig.frames = [];
    this.ikConfig.ikRoot = null;
    this.ikConfig.createRoot = false;
    if (root) {
      const startJoint = this.getStartJoint(root);
      this.processJoint(startJoint, null, sceneObjects, root);
    }
  }

  processJoint(joint: any, parentLink: any, sceneObjects: any, root: Root) {


    if (!this.ikConfig.createRoot) {
      console.log("process joint: ");
      console.log(joint);
      const jointObj = this.kinematicService.getJoint(joint.id);
      const sceneObjectJoint = sceneObjects.filter(s => s.name === joint.id)[0];
      // console.log(jointObj.id);

      let jointEl = this.ikConfig.frames.filter(f => f.name === jointObj.id && f.isJoint)[0]
      // jointEl = jointEl ? jointEl : this.createNewJointFromObject(jointObj, sceneObjectJoint);
      // console.log(jointEl);

      const link = parentLink === null || parentLink === undefined ? new Link() : this.ikConfig.frames.filter(f => f.name === parentLink.name && f.isLink)[0];
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

      if (this.ikConfig.frames.filter(f => f.name === jointEl.name && jointEl.isJoint).length === 0) {
        this.ikConfig.frames.push(jointEl);
        // console.log(this.frames);
      }


      if (this.ikConfig.frames.filter(f => f.name === link.name && link.isLink).length === 0) {
        this.ikConfig.frames.push(link);
        // console.log(this.frames);
      }


      // for (const connector of jointObj.connectors) {
      //   if (connector.connected) {
      //     console.log(connector);

      //     const connectedJointObj = this.kinematicService.getJoint(connector.object);
      //     const connectedJointInRoot = root.joints.filter(j => j.id === connectedJointObj.id)[0];
      //     console.log(connectedJointObj);
      //     const connectorToOriginalObject = connectedJointObj.connectors.filter(c => c.object === joint.id)[0];
      //     const newConnectedJoint = this.createNewJointFromObject(connectedJointObj, sceneObjectJoint);

      //     const jointInFrames = this.ikConfig.frames.filter(f => f.name === newConnectedJoint.name)[0];

      //     if (jointInFrames === undefined) {
      //       link.addChild(newConnectedJoint);
      //       this.ikConfig.frames.push(newConnectedJoint);
      //     } else if (jointInFrames !== undefined) {
      //       // console.log('add ', jointInFrames, ' to ', link);
      //       // jointInFrames.addChild(link);
      //       // link.addChild(jointInFrames);
      //     }

      //     for (const connectorJO of connectedJointObj.connectors.filter(c => c.connected)) {

      //       if (connectorJO.object !== joint.id) {
      //         console.log('new' + connectorToOriginalObject.plane, connectorJO.plane);
      //         this.processJoint(connectedJointInRoot, (connectorToOriginalObject.plane === connectorJO.plane ? link : null), sceneObjects, root);

      //       }
      //     }
      //   }
      // }


      console.log("items processed", this.ikConfig.frames.filter(f => f.isJoint).length, root.joints.length);
      if (this.ikConfig.frames.filter(f => f.isJoint).length === root.joints.length) {
        this.ikConfig.createRoot = true;
        console.log('finished');
        console.log(this.ikConfig.frames);
        this.createRootsFromFrames(sceneObjects);
        return;
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
    this.ikConfig.ikRoot = findRoots(this.ikConfig.frames);
    // console.log(this.ikRoot);
    for (const root of this.ikConfig.ikRoot) {
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
      this.createRootsHelper(root);
    }

  }

  setClosureLinkWithoutChild(link: any) {
    if (link.children) {
      for (const child of link.children) {
        this.setClosureLinkWithoutChild(child);
      }
    } else if (link.isLink) {
      this.ikConfig.goal.makeClosure(link);
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

      if (this.ikConfig.ikRoot) {
        for (const root of this.ikConfig.ikRoot) {
          root.traverse(c => {

            if (c.isJoint) {
              const name = c.name;
              if (object.name === name) {
                let worldPosition = new THREE.Vector3();
                object.getWorldPosition(worldPosition);
                this.ikConfig.targetObject.position.set(worldPosition.x, worldPosition.y, worldPosition.z);
                this.ikConfig.targetObject.updateMatrix();

                this.ikConfig.finalLink = new Link();
                this.ikConfig.finalLink.setPosition(0, 0.5, 0);
                console.log(c.parent, c.child);
                // c.addChild(this.ikConfig.finalLink);
                if (c.parent === null) {
                //   console.log('parent');
                  this.ikConfig.finalLink.addChild(c);
                }
                // else
                // if (c.child === null) {
                //   console.log('child');
                //   c.addChild(this.ikConfig.finalLink);
                // }
                // else {
                //   this.finalLink.makeClosure(c);
                // }
                // this.finalLink.updateMatrix();

                root.updateMatrixWorld( true );

                this.ikConfig.targetObject.matrix.set( ...this.ikConfig.finalLink.matrixWorld ).transpose();
                this.ikConfig.targetObject.matrix.decompose( this.ikConfig.targetObject.position, this.ikConfig.targetObject.quaternion, this.ikConfig.targetObject.scale );

                //change to update Sphere
                const geometry = new THREE.SphereGeometry( 25, 32, 16 );
                const material = new THREE.MeshBasicMaterial( { color: 0xffff00, opacity: 0.5 } );
                const sphere = new THREE.Mesh( geometry, material );

                this.ikConfig.targetObject.add(sphere);

                this.ikConfig.goal = new Goal();

              	this.ikConfig.goal.makeClosure( this.ikConfig.finalLink );

                this.createRootsHelper(root);

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

		const dof = [DOF.X, DOF.Y, DOF.Z];

		this.ikConfig.goal.setGoalDoF( ...dof );

	}

  updateTargetObject() {
    if (this.ikConfig.ikRoot && this.ikConfig.targetObject) {
      for (const root of this.ikConfig.ikRoot) {
        root.updateMatrixWorld( true );
      }
      console.log(this.ikConfig.finalLink);
      this.ikConfig.targetObject.matrix.set( ...this.ikConfig.finalLink.matrixWorld ).transpose();
      this.ikConfig.targetObject.matrix.decompose( this.ikConfig.targetObject.position, this.ikConfig.targetObject.quaternion, this.ikConfig.targetObject.scale );

      this.ikConfig.solver.solve();
      this.ikConfig.ikHelper.updateStructure();

      // console.log(this.ikConfig.ikHelper);
      // console.log(this.ikConfig.ikRoot);

      // for (const root of this.ikConfig.ikRoot) {
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

      this.animateScene.next();

      console.log(this.ikConfig.solver);
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
        // newJoint.setMinLimit(DOF.EZ, -joint.limits.min * this.DEG2PI);
        // newJoint.setMaxLimit(DOF.EZ, joint.limits.max * this.DEG2PI);
      }
      newJoint.setDoFValue(DOF.EX, 0);
      newJoint.setDoFValue(DOF.EY, 0);
      newJoint.setDoFValue(DOF.X, 0);
      newJoint.setDoFValue(DOF.Y, 0);
      newJoint.setDoFValue(DOF.Z, 0);

      newJoint.setWorldQuaternion(sceneObject.quaternion.x, sceneObject.quaternion.y, sceneObject.quaternion.z);
      // newJoint.setMatrixNeedsUpdate();

      console.log(newJoint);
      return newJoint;
    }
  }



  updateJointLimits(joint_id: any, limitMin: number, limitMax: number) {
    //get joint
    if (this.ikConfig.ikRoot) {
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
    // link.getWorldPosition( goal.position );
    // link.getWorldQuaternion( goal.quaternion );

    this.updateGoalDoF();
  }



  createRootsHelper(root: any) {
    if (root) {
      if (this.ikConfig.ikHelper) {
          // this.ikHelper.traverse( this.dispose );
        this.removeFromScene.next('ikHelper');
      }
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
      this.addToScene.next({ object: this.ikConfig.ikHelper, addControls: false });
    }
  }


  updateRoot() {
    this.ikConfig.ikRoot.updateMatrixWorld( true );
    // this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
    // this.targetObject.matrix.decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );
  }

  updateResolution(width: number, height: number) {
    if (this.ikConfig.ikHelper) {
      this.ikConfig.ikHelper.setResolution( width, height );
    }
  }

  createSolver(root: any) {
    this.ikConfig.solver = new Solver(root);
    Object.assign( this.ikConfig.solver, this.solverOptions );
  }


  removeTarget() {
    this.ikConfig.targetObject = null;
    this.ikConfig.solver = null;
  }



  render() {
    if (this.ikConfig.goal && this.ikConfig.solver && this.ikConfig.ikRoot && this.ikConfig.targetObject) {

      this.ikConfig.goal.setPosition(
        this.ikConfig.targetObject.position.x,
        this.ikConfig.targetObject.position.y,
        this.ikConfig.targetObject.position.z,
      );
      this.ikConfig.goal.setQuaternion(
        this.ikConfig.targetObject.quaternion.x,
        this.ikConfig.targetObject.quaternion.y,
        this.ikConfig.targetObject.quaternion.z,
        this.ikConfig.targetObject.quaternion.w,
      );
      // console.log(this.ikRoot, this.solver, this.targetObject);
      this.ikConfig.solver.solve();
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
