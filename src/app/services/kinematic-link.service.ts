import { Injectable } from '@angular/core';
import { Joint, Link, Root } from '../models/kinematic-connections.model';
import { v4 as uuid } from 'uuid';
import { Subject } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';



@Injectable()
export class KinematicLinkService {

  public static readonly MODEL_LOCATION = 'ngx-webstorage|roots';

  roots: Array<Root> = [];
  public rootsObservable = new Subject<Root[]>();

  constructor(private localSt: LocalStorageService) {

    const data = this.localSt.retrieve('roots');

    if (data) {
      this.roots = data;
    }
  }

  createNewConnection(objects: any) {
    // console.log(objects);

    const linkInRoot = this.findLink(objects[0].frame.id, objects[1].frame.id);

    if (linkInRoot === undefined) {
      const newLink = new Link(uuid(), false, [objects[0].frame.id, objects[1].frame.id], [objects[0].point.id, objects[1].point.id]);
      const root1 = this.getRootWithObject(objects[0].frame.id);
      const root2 = this.getRootWithObject(objects[1].frame.id);

      if (root1 === undefined && root2 === undefined) {

        const newRoot = new Root(uuid());

        newRoot.links.push(newLink);

        for (const obj of objects) {
          const newJoint = new Joint(obj.frame.id, [ newLink ]);
          newRoot.joints.push(newJoint);
        }

        this.roots.push(newRoot);

      } else if (root1 !== undefined && root2 !== undefined) {

        const newRoot = new Root(uuid());

        if (root1.key !== root2.key) {

          newRoot.joints = root1.joints.concat(root2.joints);
          newRoot.links = root1.links.concat(root2.links);

          const root1_index = this.roots.indexOf(root1);
          this.roots.splice(root1_index, 1);

          const root2_index = this.roots.indexOf(root2);
          this.roots.splice(root2_index, 1);
        }

        let i = 0;
        for (const object of objects) {
          const root = i === 0 ? root1 : root2;
          const joint = root1.key !== root2.key ? newRoot.joints.filter(j => j.id === object.id)[0] : root.joints.filter(j => j.id === objects[i].frame.id)[0];
          // console.log(joint);
          // console.log(root1.key === root2.key)
          if (joint) {
            if (joint.links.length > 2 || root1.key === root2.key) {
              newLink.closure = true;
            }
            joint.links.push(newLink);
          }
          i++;
        }

        if (root1.key !== root2.key) {
          newRoot.links.push(newLink);
        } else {
          root1.links.push(newLink);
        }

        if (root1.key !== root2.key) {
          this.roots.push(newRoot);
        }

      } else {

        const root = root1 !== undefined ? root1 : root2;

        const newJoint = new Joint(root1 === undefined ? objects[0].frame.id : objects[1].frame.id, [ newLink ]);
        const jointInRoot = root.joints.filter(j => j.id === (root1 !== undefined ? objects[0].frame.id : objects[1].frame.id))[0];

        if (jointInRoot) {
          if (jointInRoot.links.length > 2) {
            newLink.closure = true;
          }
          jointInRoot.links.push(newLink);
        }

        root.links.push(newLink);
        root.joints.push(newJoint);
      }

      console.log(this.roots);


      this.store();
    }
  }



  findLink(joint_1: string, joint_2: string) {
    for (const root of this.roots) {
      for (const link of root.links) {
        if (link.connJoints.includes(joint_1) && link.connJoints.includes(joint_2)) {
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
    // console.log(id, this.roots);
    for (const root of this.roots) {
      // console.log(root);

      const inList = root.joints.filter(j => j.id === id)[0];
      if (inList) {
        return root;
      }
    }
  }


  getLinkedObjects(key: any, id: string): Array<any> {
    const root = this.roots.filter(c => c.key === key)[0];
    // console.log(root);
    let items = [];
    if (root) {
      const joint = root.joints.filter(o => o.id === id)[0];

      if (joint) {
        for (const link of joint.links) {
          const linkedObject = link.connJoints.filter(j => j !== id)[0];
          items.push(linkedObject);
        }
      }
    }
    return items;
  }


  getListWithKey(key: string) {
    return this.roots.filter(c => c.key === key)[0];
  }



  getNrOfLinksObject(id: string) {
    for (const root of this.roots) {
      // console.log(root);
      const joint = root.joints.filter(j => j.id === id)[0];
      if (joint) {
        return joint.links.length;
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
          if (joint.links.includes(link)) {
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

  checkIfRootHasSplit() {

  }

  store() {
    this.rootsObservable.next(this.roots);
    this.localSt.store('roots', this.roots);
  }





}
