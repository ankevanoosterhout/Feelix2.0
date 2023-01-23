import { Injectable } from '@angular/core';
import { Joint, Link, LinkedJoint, Root } from '../models/kinematic-connections.model';
import { v4 as uuid } from 'uuid';
import { Subject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { JointLink } from '../models/kinematic.model';



@Injectable()
export class KinematicLinkService {

  public static readonly MODEL_LOCATION = 'ngx-webstorage|roots';

  roots: Array<Root> = [];
  public rootsObservable = new Subject<Root[]>();

  constructor(private localSt: LocalStorageService) {

    const data = this.localSt.retrieve('roots');

    if (data) {
      this.roots = data;
      console.log(this.roots);
    }
  }


  createNewConnection(objects: any) {

    const linkInRoot = this.findLink(objects[0].frame.id, objects[1].frame.id);

    if (linkInRoot === undefined) {
      // console.log(objects);

      let selectedRoot = this.getRootWithObject(objects[1].frame.id);
      // console.log(selectedRoot);

      let newLink = new Link(uuid(), [ new LinkedJoint(objects[0].frame.id, objects[0].point.id, objects[0].point.plane), new LinkedJoint(objects[1].frame.id, objects[1].point.id, objects[1].point.plane)]);
      let root = this.getRootWithObject(objects[0].frame.id);

      for (const object of objects) {

        // console.log(root);

        if (root === undefined) {
          root = selectedRoot !== undefined ? selectedRoot : new Root(uuid());
          console.log(root);
          if (this.roots.filter(r => r.key === root.key).length === 0) {
            this.roots.push(root);
          }
        }

        if (root.links.length > 0 && selectedRoot !== undefined && selectedRoot.key !== root.key) {
          let newRoot: any;
          //merge roots
          newRoot = new Root(uuid());
          newRoot.joints = root.joints.concat(selectedRoot.joints);
          newRoot.links = root.links.concat(selectedRoot.links);

          const root1_index = this.roots.indexOf(root);
          this.roots.splice(root1_index, 1);

          const root2_index = this.roots.indexOf(selectedRoot);
          this.roots.splice(root2_index, 1);

          root = newRoot;
          selectedRoot = undefined;

          this.roots.push(root);
        }

        // console.log(root.joints.filter(j => j.id === object.frame.id)[0], object.frame.id);

        let joint = root.joints.filter(j => j.id === object.frame.id)[0];

        const group = object.point.plane === 'Y' ? 1 : 0;
        // console.log(group);
        // console.log(object.point);
        // console.log(joint);

        if (joint === undefined) {
          const newJoint = new Joint(object.frame.id);
          newJoint.linkGroup[group].links.push(newLink);
          root.joints.push(newJoint);
        } else if (joint !== undefined) {
          // console.log(joint);
          joint.linkGroup[group].links.push(newLink);
        }
        // console.log(joint);
      }

      root.links.push(newLink);

      // console.log(this.roots);
      this.store();
    }
  }




  findLink(joint_1: string, joint_2: string) {
    for (const root of this.roots) {
      for (const link of root.links) {
        if (link.joints.filter(j => j.id === joint_1).length > 0 && link.joints.filter(j => j.id === joint_2).length > 0) {
          return link;
        }
      }
    }
    return;
  }

  isObjectConnected(id: string) {
    for (const root of this.roots) {
      for (const joint of root.joints) {
        if (joint.id === id) {
          return root.key;
        }
      }
    }
    return null;
  }


  getRootWithObject(id: string) {
    for (const root of this.roots) {
      // console.log(root.joints, id);
      for (const joint of root.joints) {
        // console.log(joint.id, id);
        if (joint.id === id) {
          return root;
        }
      }
      // const inList = root.joints.filter(j => j.id === id)[0];
      // console.log(inList);
      // if (inList) {
      //   return root;
      // }
    }
    return;
  }





  // getLinkedObjects(key: any, id: string): Array<any> {
  //   const root = this.roots.filter(c => c.key === key)[0];
  //   // console.log(root);
  //   let items = [];
  //   if (root) {
  //     const joint = root.joints.filter(o => o.id === id)[0];

  //     if (joint) {
  //       for (const link of joint.links) {
  //         const linkedObject = link.joints.filter(j => j.id !== id)[0];
  //         items.push(linkedObject);
  //       }
  //     }
  //   }
  //   return items;
  // }


  getListWithKey(key: string) {
    return this.roots.filter(c => c.key === key)[0];
  }





  getNrOfLinksObject(id: string) {
    for (const root of this.roots) {
      // console.log(root);
      const joint = root.joints.filter(j => j.id === id)[0];
      if (joint) {
        return joint.linkGroup[0].links.length + joint.linkGroup[1].links.length;
      }

    }
    return 0;
  }

  deleteAllLinks(id: string) {
    for (const root of this.roots) {
      // console.log(root);
      const joint = root.joints.filter(o => o.id === id)[0];
      if (joint) {
        // console.log(joint);
        //get related value object, if object has no more connections to
        const index = root.joints.indexOf(joint);
        for (const link of root.links) {
          if (joint.linkGroup[0].links.includes(link) || joint.linkGroup[1].links.includes(link)) {
            const indexOfLink = root.links.indexOf(link);
            root.links.splice(indexOfLink, 1);
          }
        }
        root.joints.splice(index, -1);
        // split in groups?
      }

      if (root.links.length === 0) {
        const index = this.roots.indexOf(root);
        if (index > -1) {
          this.roots.splice(index, 1);
        }
      }
    }
    this.store();
    //recalculate link structure
  }

  deleteAll() {
    this.roots = [];
    this.store();
  }



  store() {
    this.rootsObservable.next(this.roots);
    this.localSt.store('roots', this.roots);
  }





}
