import { Injectable } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots, DOF, setIKFromUrdf, urdfRobotToIKRoot } from 'closed-chain-ik-js-0.0.3/src';
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


  constructor(private kinematicService: KinematicService) {
    // this.targetObject.position.set( 0, 0, 0 );
    // this.addToScene.next(this.targetObject);
  }



  createRootsFromList(root: Root, sceneObjects: any) {
    // console.log(root, sceneObjects);
    this.frames = [];
    this.ikRoot = null;
    if (root) {
      const startJoint = this.getStartJoint(root);
      // console.log(startJoint);
      this.processJoint(startJoint, null, sceneObjects, root);

    }
  }

  processJoint(joint: any, parentLink: any, sceneObjects: any, root: Root) {

    // console.log(joint, parentLink, root);
    // console.log(this.frames.filter(f => f.name === joint.id).length + " in list");
    if (this.frames.filter(f => f.name === joint.id).length === 0) {
      const newLink = new Link();
      const sceneObjectJoint = sceneObjects.filter(s => s.name === joint.id)[0];
      const jointObj = this.kinematicService.getJoint(joint.id);
      const plane = this.getConnectionPlane(root, joint);
      console.log(plane);
      const newJoint = this.createNewJointFromObject(jointObj, sceneObjectJoint, joint);

      if (newJoint) {

        if (parentLink) {
          parentLink.addChild(newJoint);
          if (this.frames.filter(f => f.name === parentLink.name).length === 0) {
            this.frames.push(parentLink);
          }
        }
        newJoint.addChild(newLink);
        this.frames.push(newJoint);

        // console.log(joint, joint.linkGroup);
        if (joint && joint.linkGroup) {
          for (const group of joint.linkGroup) {
            // console.log(group);
            for (const link of group.links) {
              // console.log(link);
              const linkedJoint = link.joints.filter(j => j.id !== joint.id)[0];
              const linkedJointInRoot = root.joints.filter(j => j.id === linkedJoint.id)[0];
              // const linkedJointObj = this.kinematicService.getJoint(linkedJoint.id);
              newLink.name = joint.id + ':C';
              // console.log(linkedJoint, linkedJointObj, linkedJointInRoot);

              this.processJoint(linkedJointInRoot, newLink, sceneObjects, root);

              const connectedObjects = this.getConnectedObjects(root, linkedJoint);
              // console.log(connectedObjects);
              for (const connectedObj of connectedObjects) {
                const connectedJoint = this.kinematicService.getJoint(connectedObj.id);
                // console.log(connectedJoint);
                if (connectedJoint) {
                  this.processJoint(connectedJoint, newLink, sceneObjects, root);
                }
              }
            }
          }
        }
      }
      if (this.frames.filter(f => f.isJoint).length === root.joints.length) {
        this.createRootsFromFrames(sceneObjects);
      }

      console.log (this.frames);
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




  getConnectionPlane(root: Root, object: any) {
    console.log(root, object);
    if (root && root.links.length > 0) {
      for (const link of root.links) {

        const connJoint = link.joints.filter(j => j.id !== object.id)[0];
        console.log(connJoint);

        // const connectedJoint = link.joints.filter(j => j.id === object.id && j.plane === object.plane)[0];
        // // console.log(connectedJoint);
        // if (connectedJoint) {
        //   linkedObjects.push(link.joints.filter(j => j.id !== object.id)[0]);
        // }
      }
    }
    return null;
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

  getNextLinkRoot(currlink: Link, currJoint: Joint, root: Root) {
    // console.log(currlink, currlink.connJoints, currJoint);
    if (currlink.connJoints) {
      const newJointID = currlink.connJoints.filter(l => l !== currJoint.id)[0];
      //return newItem list
      if (newJointID) {
        const newJoint = root.joints.filter(j => j.id === newJointID)[0];
        // console.log(newJoint);
        if (newJoint) {
          // return { joint: newJoint, links: newJoint.links.filter(l => l.id !== currlink.id) };
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
                this.targetObject.updateMatrix();
                this.finalLink = new Link();
                this.finalLink.setWorldPosition( worldPosition.x, worldPosition.y, worldPosition.z);
                console.log(c.parent, c.child);
                if (c.parent === null) {
                  this.finalLink.addChild(c);
                } else if (c.child === null) {
                  c.addChild(this.finalLink);
                }
                // else {
                //   this.finalLink.makeClosure(c);
                // }
                this.finalLink.updateMatrix();
                this.targetObject.name = 'target';
                const geometry = new THREE.SphereGeometry( 30, 32, 16 );
                const material = new THREE.MeshBasicMaterial( { color: 0xffff00, opacity: 0.5 } );
                const sphere = new THREE.Mesh( geometry, material );
                this.targetObject.add(sphere);
                this.addToScene.next( { object: this.targetObject, addControls: true } );

                this.goal = new Goal();
              	this.goal.makeClosure( this.finalLink );

                this.updateGoalDoF();

                this.solver = new Solver( this.ikRoot );
	              Object.assign( this.solver, this.solverOptions );

              }
            }

          });
        }
      }

    }

  // createTarget() {
  //   this.finalLink = new Link();
  //   this.finalLink.setPosition( 0, 0.5, 0 );
  //   // this.ikRoot.updateMatrixWorld( true );
  //   // this.frames[this.frames.length - 1].addChild(this.finalLink);

  //   // this.createRootsFromFrames();




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
    if (this.ikRoot && this.targetObject && this.solver) {
      for (const root of this.ikRoot) {
        root.updateMatrixWorld( true );
      }
      this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
      this.targetObject.matrix.decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );


      this.ikHelper.updateStructure();
    }
  }




  createNewJointFromObject(joint: JointLink, sceneObject: any, startJoint: any) {
    console.log(joint, sceneObject, startJoint);

    // const plane =
    // startJoint.linkGroup.filter(j => j.id === object.id && j.plane === object.plane)[0];

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

      newJoint.setDoFValue( DOF.EZ, 1.6 * Math.PI);
      // newJoint.setRestPoseValues(object.frame.sceneObject.rotation.z);
      // newJoint.restPoseSet = true;
      newJoint.targetSet = true;
//sceneObject.quaternion.y !== 0 ? DOF.EX : DOF.EY
      newJoint.setMinLimit(DOF.EZ, 0.2 * Math.PI);
      newJoint.setMaxLimit(DOF.EZ, 1.8 * Math.PI );
  //     setMinLimit( dof : DOF, value : Number ) : Boolean
  // setMaxLimit( dof : DOF, value : Number ) : Boolean
      // newJoint.setWorldQuaternion(sceneObject.quaternion.x, sceneObject.quaternion.y, sceneObject.quaternion.z, sceneObject.quaternion.w);
      // newJoint.setMatrixNeedsUpdate();

      console.log(newJoint);
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

  createSolver() {
    this.solver = new Solver(this.ikRoot);
    Object.assign( this.solver, this.solverOptions );
  }




  render() {
    // if (this.goal && this.targetObject) {
    //   this.goal.setPosition(
    //     this.targetObject.position.x,
    //     this.targetObject.position.y,
    //     this.targetObject.position.z,
    //   );
    //   this.goal.setQuaternion(
    //     this.targetObject.quaternion.x,
    //     this.targetObject.quaternion.y,
    //     this.targetObject.quaternion.z,
    //     this.targetObject.quaternion.w,
    //   );
    // }
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





  loadCuriosity() {

    return new Promise( ( resolve, reject ) => {

      const url = 'https://raw.githubusercontent.com/gkjohnson/curiosity_mars_rover-mirror/master/curiosity_mars_rover_description/urdf/curiosity_mars_rover.xacro';
      const xacroLoader = new XacroLoader();
      xacroLoader.rospackCommands = {

        find( pkg ) {

          switch ( pkg ) {

            case 'curiosity_mars_rover_description':
              return 'https://raw.githubusercontent.com/gkjohnson/curiosity_mars_rover-mirror/master/curiosity_mars_rover_description/';
            default:
              return pkg;

          }

        }

      };

      xacroLoader.load( url, xacro => {

        let ik, urdf, goalMap;

        const manager = new LoadingManager();
        manager.onLoad = () => {

          const toRemove = [];
          urdf.traverse( c => {

            if ( c.isLight || c.isLineSegments ) {

              toRemove.push( c );

            }

          } );

          toRemove.forEach( l => {

            l.parent.remove( l );

          } );

          this.convertColorsAndTextures( urdf );
          resolve( { ik, urdf, goalMap, helperScale: 0.3 } );

        };

        const urdfLoader = new URDFLoader( manager );
        urdfLoader.packages = {
          'curiosity_mars_rover_description': 'https://raw.githubusercontent.com/gkjohnson/curiosity_mars_rover-mirror/master/curiosity_mars_rover_description/'
        };
        urdf = urdfLoader.parse( xacro );
        urdf.joints.arm_03_joint.limit.upper = Math.PI * 3 / 2;
        ik = urdfRobotToIKRoot( urdf );

        // make the root fixed
        ik.clearDoF();
        quat.fromEuler( ik.quaternion, - 90, 0, 0 );
        ik.position[ 1 ] -= 0.5;
        ik.setMatrixNeedsUpdate();

        // start the joints off at reasonable angles
        urdf.setJointValue( 'arm_02_joint', - Math.PI / 2 );
        urdf.setJointValue( 'arm_03_joint', Math.PI );
        urdf.setJointValue( 'arm_04_joint', Math.PI );
        // urdf.setJointValue( 'joint_5', - Math.PI / 4 );
        setIKFromUrdf( ik, urdf );

        goalMap = new Map();
        const tool = ik.find( l => l.name === 'arm_tools' );
        const link = urdf.links.arm_tools;

        const ee = new Joint();
        ee.name = link.name;
        ee.makeClosure( tool );

        tool.getWorldPosition( ee.position );
        tool.getWorldQuaternion( ee.quaternion );
        ee.setMatrixNeedsUpdate();
        goalMap.set( ee, tool );

      }, reject );

    } );

  }

  convertColorsAndTextures( root ) {

    function _apply( material ) {

      material.color.convertSRGBToLinear();
      if ( material.map ) material.map.encoding = sRGBEncoding;

    }

    root.traverse( c => {

      if ( c.material ) {

        const material = c.material;
        if ( Array.isArray( material ) ) {

          material.forEach( _apply );

        } else {

          _apply( material );

        }

      }

    } );

  }


  loadModel( promise: any ) {


    if ( this.urdfRoot ) {

      this.urdfRoot.traverse( this.dispose );
      this.drawThroughIkHelper.traverse( this.dispose );
      this.ikHelper.traverse( this.dispose );

      this.removeFromScene.next(this.urdfRoot.name);
      this.removeFromScene.next(this.ikHelper.name);
      this.removeFromScene.next( this.targetObject.name );
    }

    this.targetObject = new Group();
    this.targetObject.position.set(0, 1, 0);
    console.log(this.targetObject);
    this.addToScene.next( { object: this.targetObject, addControls: false } );

    this.ikRoot = null;
    this.urdfRoot = null;
    this.ikHelper = null;
    this.goals.length = 0;
    this.goalToLinkMap.clear();
    this.linkToGoalMap.clear();
    this.selectedGoalIndex = - 1;

    this.loadId ++;
    const thisLoadId = this.loadId;
    promise
      .then( ( { goalMap, urdf, ik, helperScale = 1 } ) => {

        console.log(goalMap, urdf, ik);

        if ( this.loadId !== thisLoadId ) {

          return;

        }

        ik.updateMatrixWorld( true );

        // create the helper
        this.ikHelper = new IKRootsHelper( ik );
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

        urdf.traverse( c => {

          c.castShadow = true;
          c.receiveShadow = true;

        } );
        urdf.name = 'urdf';

        this.addToScene.next({ object: urdf, addControls: false });
        this.addToScene.next({ object: this.ikHelper, addControls: false });

        const loadedGoals = [];
        goalMap.forEach( ( link, goal ) => {

          loadedGoals.push( goal );
          this.goalToLinkMap.set( goal, link );
          this.linkToGoalMap.set( link, goal );

        } );

        console.log(goalMap, this.goalToLinkMap, this.linkToGoalMap);

        this.solver = new Solver( ik ); // : new Solver( ik );
        this.solver.maxIterations = 3;
        this.solver.translationErrorClamp = 0.25;
        this.solver.rotationErrorClamp = 0.25;
        this.solver.restPoseFactor = 0.01;
        this.solver.divergeThreshold = 0.05;

        if ( loadedGoals.length ) {

          this.targetObject.position.set( ...loadedGoals[ 0 ].position );
          this.targetObject.quaternion.set( ...loadedGoals[ 0 ].quaternion );
          this.selectedGoalIndex = 0;

        } else {

          this.selectedGoalIndex = - 1;

        }

        loadedGoals.forEach( g => {

          g.originalPosition = [ 0, 0, 0 ];
          g.originalQuaternion = [ 0, 0, 0, 1 ];

        } );

        this.ikRoot = ik;
        this.urdfRoot = urdf;
        this.goals.push( ...loadedGoals );

        // rebuildGUI();

      });

    }

}
