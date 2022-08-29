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
    console.log(objects);
   //check if link exists
    const linkInRoot = this.findLink(objects[0].frame.id, objects[1].frame.id);
    console.log(linkInRoot);
    if (!linkInRoot) {
      const newLink = new Link(uuid(), false, [objects[0].frame.id, objects[1].frame.id]);
      const root1 = this.getRootWithObject(objects[0].frame.id);
      const root2 = this.getRootWithObject(objects[1].frame.id);

      console.log(root1, root2);

      if (root1 === undefined && root2 === undefined) {
        //create new list
        console.log('both undefined');
        const newRoot = new Root(uuid());
        console.log(newRoot);

        newRoot.links.push(newLink);

        for (const object of objects) {
          const newJoint = new Joint(object.frame.id, [ newLink ]);
          console.log(newJoint);
          newRoot.joints.push(newJoint);
        }

        this.roots.push(newRoot);

      } else if (root1 !== undefined && root2 !== undefined) {
        console.log(root1.key === root2.key);

        console.log('both defined');
        //merge roots
        const newRoot = root1.key !== root2.key ? new Root(uuid()) : root1;

        if (root1.key !== root2.key) {

          newRoot.joints = root1.joints.concat(root2.joints);
          newRoot.links = root1.links.concat(root2.links);

          console.log(newRoot);

          const root1_index = this.roots.indexOf(root1);
          this.roots.splice(root1_index, 1);

          console.log(root1_index);

          const root2_index = this.roots.indexOf(root2);
          this.roots.splice(root2_index, 1);

          console.log(root1_index);
        }

        for (const object of objects) {
          const joint = newRoot.joints.filter(j => j.id === object.id)[0];
          if (joint) {
            if (joint.links.length > 2 || root1.key === root2.key) {
              newLink.closure = true;
            }
            joint.links.push(newLink);
          }
        }

        newRoot.links.push(newLink);

        if (root1.key !== root2.key) {
          this.roots.push(newRoot);
        } else {
          this.roots.filter(r => r.key === root1.key)[0] = newRoot;
        }


      } else {

        console.log('one defined');
        const root = root1 !== undefined ? root1 : root2;
        console.log(root);

        const newJoint = new Joint(root1 !== undefined ? objects[0].frame.id : objects[1].frame.id, [ newLink ]);
        const jointInRoot = root.joints.filter(j => j.id === (root1 !== undefined ? objects[0].frame.id : objects[1].frame.id))[0];
        console.log(jointInRoot);
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
    for (const root of this.roots) {
      console.log(root);

      const inList = root.joints.filter(j => j.id === id)[0];
      if (inList) {
        return root;
      }
    }
  }


  getLinkedObjects(key: any, id: string): Array<any> {
    const root = this.roots.filter(c => c.key === key)[0];
    console.log(root);
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
      console.log(root);
      const joint = root.joints.filter(j => j.id === id)[0];
      if (joint) {
        return joint.links.length;
      }

    }
    return 0;
  }

  deleteAllLinks(id: string) {
    for (const root of this.roots) {
      console.log(root);
      const joint = root.joints.filter(o => o.id === id)[0];
      if (joint) {
        console.log(joint);
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
