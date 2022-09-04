import { Injectable } from '@angular/core';
import { Solver, Link,	Joint, IKRootsHelper, Goal, findRoots, DOF, setIKFromUrdf, urdfRobotToIKRoot, SOLVE_STATUS_NAMES } from 'closed-chain-ik-js-0.0.3/src';
import { Subject } from 'rxjs';
import { JointLink } from '../models/kinematic.model';
import { LinkGroup, Root } from '../models/kinematic-connections.model';
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
    rotationConvergeThreshold: 1e-3
    // restPoseFactor: 0.001,
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

  DEG2PI = Math.PI / 180;

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

      const link = parentLink === null || parentLink === undefined ? new Link() : this.frames.filter(f => f.name === parentLink.name && f.isLink)[0];
      // console.log(link);
      if (parentLink === null || parentLink === undefined) {
        link.name = link.name === "" ? joint.id + ':C' : link.name;
        jointEl.addChild(link);
      } else {
        // console.log('add child to link', joint.id, link.name);
        link.addChild(jointEl);
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

    if (this.frames.filter(f => f.isJoint).length === root.joints.length) {
      this.createRoot = true;
      console.log('finished');
      console.log(this.frames);
      this.createRootsFromFrames(sceneObjects);
      return;
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
    console.log(this.ikRoot);
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
                this.targetObject.position.set( 0, 0, 0 );
                // this.targetObject.updateMatrix();
                this.finalLink = new Link();
                this.finalLink.setPosition( 0, 0, 0);
                console.log(c.parent, c.child);
                if (c.parent === null) {
                  this.finalLink.addChild(c);
                } else if (c.child === null) {
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
                console.log(this.solver);

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
    if (this.ikRoot && this.targetObject && this.solver) {
      for (const root of this.ikRoot) {
        root.updateMatrixWorld( true );
      }
      this.targetObject.matrix.set( ...this.finalLink.matrixWorld ).transpose();
      this.targetObject.matrix.decompose( this.targetObject.position, this.targetObject.quaternion, this.targetObject.scale );

      // this.solver.solve();
      // this.ikHelper.updateStructure();
    }
  }




  createNewJointFromObject(joint: JointLink, sceneObject: any) {
    // console.log(joint, sceneObject);

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
      if (joint.limits.min > -10000 && joint.limits.max < 10000) {
        newJoint.setDoFValue(DOF.EZ, (joint.limits.max - joint.limits.min) * this.DEG2PI);
        newJoint.setMinLimit(DOF.EZ, joint.limits.min * this.DEG2PI);
        newJoint.setMaxLimit(DOF.EZ, joint.limits.max * this.DEG2PI);
      }

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

  createSolver(root: any) {
    this.solver = new Solver(root);
    Object.assign( this.solver, this.solverOptions );
  }




  render() {
    if (this.goal && this.targetObject && this.solver) {
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

      if (this.solver && this.ikRoot) {
        const solverOutput = this.solver.solve().map( s => SOLVE_STATUS_NAMES[ s ] ).join( '\n' );
        console.log(solverOutput);
      }
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
