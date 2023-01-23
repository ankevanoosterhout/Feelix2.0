// import { Injectable } from '@angular/core';
// import { Root } from '../models/kinematic-connections.model';
// import { Subject } from 'rxjs';

// //package json:    "fullik": "file:fullik-gh-pages",

// import * as THREE from 'three'
// // import * as TWEEN from 'tween'
// // import * as UIL from 'uil'

// import { KinematicService } from './kinematic.service';
// import { FIK } from 'fullik-gh-pages/src/FIK_dev.js'
// import { JointLink } from '../models/kinematic.model';

// import { IKConfig } from '../models/ik-config.model';


// @Injectable()
// export class FullIKService {


//   public config: IKConfig;

//   startLocaction = new FIK.V3();

//   chains: any = [];
//   ikRoot: any;
//   frames: any = [];
//   createRoot = false;
//   chain: any;
//   joints = [];


//   defaultBoneDirection = FIK.Z_NEG;
//   defaultBoneLength = 10;

//   constructor(private kinematicService: KinematicService){
//     this.config = new IKConfig();
//   }


//   create3DStructure(root: Root, joints: Array<JointLink>) {
//     console.log(root, joints);

//     this.chain = new FIK.Chain3D( 0xFFFF00 );
//     this.joints = [];


//     // const startJoint = this.getStartJoint(root);

//     // if (startJoint) {
//     //   console.log(startJoint);
//     //   this.processChainElement(startJoint, null, root);
//     // }
//   }

























//   // create3DStructure(root: Root, sceneObjects: any) {
//   //   console.log(root, sceneObjects);

//   //   this.chain = new FIK.Chain3D( 0xFFFF00 );
//   //   this.joints = [];

//   //   const startJoint = this.getStartJoint(root);

//   //   if (startJoint) {
//   //     console.log(startJoint);
//   //     this.processChainElement(startJoint, null, root);
//   //   }
//   // }



//   processChainElement(startJoint: any, previousLink: any, root: Root) {

//     //check if joint is used in other chain

//     const currentLink = this.selectLink(startJoint, previousLink);
//     const currentJoint = this.kinematicService.getJoint(startJoint.id);
//     const linkStartJoint = currentLink.joints.filter(j => j.id === startJoint.id)[0];
//     const linkNextJoint = currentLink.joints.filter(j => j.id !== startJoint.id)[0];
//     let connector: any;
//     let nextJoint: any;
//     if (!linkNextJoint && linkStartJoint && currentJoint) {
//       connector = currentJoint.connectors.filter(c => c.id === linkStartJoint.connector)[0];
//       console.log(connector);
//     } else if (linkNextJoint) {
//       nextJoint = this.kinematicService.getJoint(linkNextJoint.id);
//     }
//     this.addLinkToChain(currentJoint, nextJoint, connector);


//     if (nextJoint) {
//       const nextJointFromRoot = this.getNextJoint(root, nextJoint, currentLink);
//       this.processChainElement(linkNextJoint, currentLink, root);
//     }

//   }


//   selectLink(startJoint: any, previousLink: any) {
//     const previousConnection = previousLink ? previousLink.joints.filter(j => j.id === startJoint.id)[0] : null;
//     console.log(startJoint, previousConnection);
//     for (const linkGroup of startJoint.linkGroup) {
//       console.log(linkGroup);
//       if (linkGroup.links.length > 0) {
//         for (const link of linkGroup.links) {
//           console.log(link);
//           if (!previousConnection) {
//             return link;
//           } else {
//             for (const connector of link.joints) {
//               console.log(connector);
//               if (connector.plane !== previousConnection.plane) {
//                 return link;
//               }
//             }
//           }
//         }
//       }
//     }
//   }


//   createRootsFromList(root: Root, sceneObjects: any) {
//     console.log(root, sceneObjects);

//     this.frames = [];
//     this.ikRoot = new FIK.Chain3D( 0xFFFF00 );

//     console.log(this.ikRoot);

//     if (root) {
//       console.log(root);
//       const startJoint = this.getStartJoint(root);
//       this.processJoint(startJoint, null, sceneObjects, root);
//     }


//   }


//   processJoint(joint: any, parentLink: any, sceneObjects: any, root: Root) {


//     if (!this.createRoot) {
//       console.log(joint);
//       const jointObj = this.kinematicService.getJoint(joint.id);
//       const sceneObjectJoint = sceneObjects.filter(s => s.name === joint.id)[0];
//       // console.log(jointObj.id);

//       const jointInList = this.frames.filter(f => f.name === jointObj.id && f.isJoint)[0];
//       console.log(jointInList);
//       if (!jointInList) {
//         // this.createNewJointFromObject(jointObj, sceneObjectJoint, parentLink);

//       } else {
//         this.config.solver.add(this.ikRoot);
//         this.ikRoot = new FIK.Chain3D( 0x666666 );

//         //create new bone? or use existing one?
//       }

//       //next joint connection to other plane

//       // const jointEl = jointInList ? jointInList : this.createNewJointFromObject(jointObj, sceneObjectJoint);


//       // const link = parentLink === null || parentLink === undefined ? new Link() : this.frames.filter(f => f.name === parentLink.name && f.isLink)[0];
//       // console.log(link);
//       // console.log(link);
//       // if (parentLink === null || parentLink === undefined) {
//       //   link.name = link.name === "" ? joint.id + ':C' : link.name;
//       //   if (jointEl.children.length === 0) {
//       //     jointEl.addChild(link);
//       //   }
//       // } else {
//       //   // console.log('add child to link', joint.id, link.name);
//       //   if (!link.children.includes(jointEl)) {
//       //     link.addChild(jointEl);
//       //   }
//       // }

//       // console.log(link);

//       // if (this.frames.filter(f => f.name === jointEl.name && jointEl.isJoint).length === 0) {
//         // this.frames.push(jointEl);
//       //   // console.log(this.frames);
//       // }


//       // if (this.frames.filter(f => f.name === link.name && link.isLink).length === 0) {
//       //   this.frames.push(link);
//       //   // console.log(this.frames);
//       // }

//       // if (this.frames.filter(f => f.isJoint).length === root.joints.length) {
//       //   this.createRoot = true;
//       //   console.log('finished');
//       //   console.log(this.frames);
//       //   this.createRootsFromFrames(sceneObjects);
//       //   return;
//       // }

//       // if (!this.createRoot) {
//       //   for (const connector of jointObj.connectors) {
//       //     if (connector.connected) {
//       //       // console.log(connector);

//       //       const connectedJointObj = this.kinematicService.getJoint(connector.object);
//       //       const connectedJointInRoot = root.joints.filter(j => j.id === connectedJointObj.id)[0];
//       //       // console.log(connectedJointObj);
//       //       const connectorToOriginalObject = connectedJointObj.connectors.filter(c => c.object === joint.id)[0];
//       //       const newConnectedJoint = this.createNewJointFromObject(connectedJointObj, sceneObjectJoint);

//       //       const jointInFrames = this.frames.filter(f => f.name === newConnectedJoint.name)[0];

//       //       if (jointInFrames === undefined) {
//       //         link.addChild(newConnectedJoint);
//       //         this.frames.push(newConnectedJoint);
//       //       } else if (jointInFrames !== undefined) {
//       //         // console.log('add ', jointInFrames, ' to ', link);
//       //         // jointInFrames.addChild(link);
//       //         // link.addChild(jointInFrames);
//       //       }

//       //       for (const connectorJO of connectedJointObj.connectors.filter(c => c.connected)) {

//       //         if (connectorJO.object !== joint.id) {
//       //           console.log('new' + connectorToOriginalObject.plane, connectorJO.plane);
//       //           this.processJoint(connectedJointInRoot, (connectorToOriginalObject.plane === connectorJO.plane ? link : null), sceneObjects, root);

//       //         }
//       //       }
//       //     }
//       //   }
//       // }
//     }
//   }


//   addLinkToChain(joint: JointLink, nextJoint: JointLink, connector: any) {


//     console.log(joint, nextJoint, connector);
//     const startLoc = new FIK.V3(joint.sceneObject.position.x, joint.sceneObject.position.y, joint.sceneObject.position.z);

//     const endLoc = nextJoint ?
//       new FIK.V3(nextJoint.sceneObject.position.x, nextJoint.sceneObject.position.y, nextJoint.sceneObject.position.z) :
//       startLoc.plus( this.defaultBoneDirection.multiply( connector.size ));

//     const bone = new FIK.Bone3D( startLoc, endLoc );
//     console.log(bone);

//     this.chain.addBone(bone);

//     console.log(this.chain);

//   }

//   getStartJoint(root: Root) {
//     if (root && root.joints.length > 0) {
//       let startJoint = root.joints[0];

//       for (const joint of root.joints) {
//         // console.log(joint);
//         if (joint.linkGroup[0].links.length === 0 || joint.linkGroup[1].links.length === 0) {
//           return joint;
//         } else if (startJoint.linkGroup[0].links.length >= joint.linkGroup[0].links.length && startJoint.linkGroup[1].links.length >= joint.linkGroup[1].links.length) {
//           startJoint = joint;
//         }
//       }
//       return startJoint;
//     }
//   }

//   getNextJoint(root: Root, nextJoint: JointLink, link: any) {
//     if (root && root.joints.length > 0) {


//     }

//   }


//   updateSolver () {

//     // extraUpdate();
//     this.config.solver.update();

//   }
// }
