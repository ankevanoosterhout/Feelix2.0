import { Injectable } from '@angular/core';
import { KeyConstruct, KinematicConnection, KinematicConnectionList } from '../models/kinematic-connections.model';
import { v4 as uuid } from 'uuid';
import { ClosedChainIKService } from './closed-chain-ik.service';


@Injectable()
export class KinematicLinkService {


  connections: Array<KinematicConnectionList> = [];


  constructor(private closedChainIKService: ClosedChainIKService) {}


  createNewConnection(objects: any) {
    console.log(objects);

    const kinematicConnection = new KinematicConnection(uuid());
    const keys = [];
    for (const obj of objects) {
      kinematicConnection.values.push(new KeyConstruct(obj.frame.id, obj.point.id));
      keys.push(this.isObjectConnected(obj.frame.id));
    }
    console.log(keys);

    if (keys[0] && keys[1]) {
      let lists = [];
      let indexes = [];
      for (const key of keys) {
        const connList = this.getListWithKey(key);
        const index = this.connections.indexOf(connList);
        if (index > -1) {
          indexes.push(index);
          lists.push(connList.list);
        }
      }
      const newKinematicLinkItem = new KinematicConnectionList(uuid());
      const mergedList = lists[0].concat(lists[1]);
      newKinematicLinkItem.list = mergedList;

      for (const index of indexes) {
        if (index > -1) {
          this.connections.splice(index, 1);
        }
      }
      this.connections.push(newKinematicLinkItem);

    } else if (keys[0] || keys[1]) {
      const key = keys[0] !== null ? keys[0] : keys[1];
      const connList = this.getListWithKey(key);
      if (connList) {
        connList.list.push(kinematicConnection);
      }

    } else if (keys[0] === null && keys[1] === null) {
      const connList = new KinematicConnectionList(uuid());
      connList.list.push(kinematicConnection);
      this.connections.push(connList);
    }
    const nrOfLinkedObjects = [ this.getNrOfLinksObject(objects[0].frame.id), this.getNrOfLinksObject(objects[0].frame.id)];

    this.closedChainIKService.createRootStructure(kinematicConnection, objects, nrOfLinkedObjects);

    // this.closedChainIKService.joinObjects(objects);

  }

  isObjectConnected(id: string): Array<string> {
    for (const connItem of this.connections) {
      for (const item of connItem.list) {
        for (const val of item.values) {
          if (val.object_id === id) {
            return [connItem.key, item.key];
          }
        }
      }
    }
    return null;
  }





  getListWithKey(key: string) {
    return this.connections.filter(c => c.key === key)[0];
  }



  getNrOfLinksObject(id: string) {
    for (const connItem of this.connections) {
      for (const item of connItem.list) {
        const inList = item.values.filter(v => v.object_id === id)[0];
        if (inList) {
          return connItem.list.length;
        }
      }
    }
    return 0;
  }

  deleteAllLinks(id: string) {
    for (const connItem of this.connections) {
      for (const item of connItem.list) {
        const inList = item.values.filter(v => v.object_id === id)[0];
        if (inList) {
          console.log(inList);
          //get related value object, if object has no more connections to
          const index = connItem.list.indexOf(item);
          connItem.list.splice(index, -1);
          // split in groups?
        }
      }
    }
    //recalculate link structure
  }

  // export class KeyConstruct {
  //   object_id: string;
  //   connection_id: string;
  //   axis: string;

  //   constructor(object_id: string, connection_id: string, axis: string) {
  //     this.object_id = object_id;
  //     this.connection_id = connection_id;
  //     this.axis = axis;
  //   }
  // }


  // export class KinematicConnection {

  //   key: string;
  //   values: Array<KeyConstruct>;

  //   constructor(key: string, values: Array<KeyConstruct>, group: string) {
  //     this.key = key;
  //     this.values = values;
  //   }
  // }


  // export class KinematicConnectionList {
  //   list: Array<KinematicConnection>;
  // }




}
