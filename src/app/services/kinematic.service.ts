import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { v4 as uuid } from 'uuid';
import { LocalStorageService } from 'ngx-webstorage';
import { JointLink, Object3D, Connector, Point, ConnectorSize, ModelFile, URFD_Joint, Model, URFD_Link } from '../models/kinematic.model';
import * as THREE from 'three';
import { FileSaverService } from 'ngx-filesaver';
import { KinematicLinkService } from './kinematic-link.service';


@Injectable()
export class KinematicService {

  public static readonly  LOAD_FILE = 'loadModel';
  public static readonly  LOAD_FILE_LOCATION = 'loadModelLocation';

  public static readonly MODEL_LOCATION = 'ngx-webstorage|models';
  public static readonly MODEL_FILES_LOCATION = 'ngx-webstorage|modelFiles';

  joints: Array<JointLink> = [];

  frames: Array<any> = [];

  models: Array<ModelFile> = [];

  public modelObservable = new Subject<ModelFile[]>();
  public jointObservable = new Subject<JointLink[]>();

  selectedJoints = [];

  selConnPoints: Array<Point> = [];

  importOBJModelToObjectGroup: Subject<any> = new Subject();
  loadModels: Subject<any> = new Subject();
  deleteJointsScene: Subject<any> = new Subject();

  fs: any;

  constructor(private localSt: LocalStorageService, private _FileSaverService: FileSaverService, private kinematicLinkService: KinematicLinkService) {

    this.fs = (window as any).fs;

    localStorage.removeItem(KinematicService.LOAD_FILE);
    localStorage.removeItem(KinematicService.LOAD_FILE_LOCATION);


    // const data = this.localSt.retrieve('models');

    // if (data) {
    //   this.joints = data;
    // }


    const storedFiles = this.localSt.retrieve('modelFiles');
    console.log(storedFiles);
    if (storedFiles && storedFiles.length > 0) {
      this.models = storedFiles;
      // console.log(this.models);
      this.setAnyActive();
    } else {
      this.createDefaultModel('Untitled-1');
    }


    window.addEventListener( 'storage', event => {
      // console.log(event, event.storageArea, localStorage, event.key);
      if (event.storageArea === localStorage) {
        if (event.key === KinematicService.MODEL_FILES_LOCATION) {
          const models: ModelFile[] = JSON.parse(localStorage.getItem(KinematicService.MODEL_FILES_LOCATION));
          console.log(models);
          this.models = models;
          this.modelObservable.next(this.models);
        }

        if (event.key.startsWith(KinematicService.LOAD_FILE)) {
          const fileLocation: string = JSON.parse(localStorage.getItem(KinematicService.LOAD_FILE_LOCATION));
          console.log(fileLocation);
          this.parseFile(localStorage.getItem(KinematicService.LOAD_FILE)).then((model: ModelFile) => {
            try {
              model.path = fileLocation;
              model.isActive = false;
              this.models.push(model);
              this.store();
              this.setActive(model);
            } catch (error) {
            }
          });

          localStorage.removeItem(KinematicService.LOAD_FILE);
          localStorage.removeItem(KinematicService.LOAD_FILE_LOCATION);
        }
      }
    }, false );


  }


  add(model: ModelFile) {
    // console.log(model);
    this.models.push(model);
    this.setActive(model);
    this.store();
  }


  newModel(model: ModelFile) {
    console.log(model);
    this.updateActiveModel();
    this.add(model);
  }


  setActive(activeModel: ModelFile) {
    // console.log(activeModel);
    // if (!activeModel.isActive) {
    this.loadFile(activeModel);
      // this.loadJoints(activeModel.joints);
      // this.loadLinks(activeModel.links);
    // }
    for (const model of this.models) {
      model.isActive = model.id === activeModel.id ? true : false;
    }
  }


  setAnyActive() {
    const currentactiveFile = this.models.filter(m => m.isActive)[0];
    if (!currentactiveFile) {
      if (this.models.length > 0) {
        this.setActive(this.models[0]);
        this.store();
      } else {
        this.createDefaultModel('untitled-1');
      }
    } else {
      this.setActive(currentactiveFile);
    }
  }

  getActiveModel() {
    const activeModel = this.models.filter(m => m.isActive)[0];
    if (activeModel) {
      activeModel.joints = this.joints;
      activeModel.links = this.kinematicLinkService.roots;
      this.store();
    }
    return activeModel;
  }

  loadFile(model: ModelFile) {
    this.deleteJointsScene.next();
    if (model.joints) {
      this.joints = model.joints;
      this.kinematicLinkService.roots = model.links;
      this.store();
      this.loadModels.next();
    }
  }

  getAll() {
    return this.models;
  }


  save(modelObj: ModelFile, close = false) {

    const model = modelObj ? modelObj : this.models.filter(m => m.isActive)[0];

    if (model && model.isActive) {
      model.joints = this.joints;
    }
    if (model) {
      if (model.path) {
        fetch(model.path).then((res) => {
          this.saveChangesToFile(model);
        }).catch((err) => {
          this.saveFileWithDialog(model);
        });
      } else {
        this.saveFileWithDialog(model);
      }

      if (close) {
        model.isActive = false;
        this.setAnyActive();
        this.deleteModel(model);
      }
    }
  }

  saveFileWithDialog(model: ModelFile) {
    const blob = new Blob([JSON.stringify(model)], { type: 'text/plain' });
    const currentFileName = model.name + '.mFeelix';
    this._FileSaverService.save(blob, currentFileName, 'text/plain');
    // this._FileSaverService.save(blob, file.name + '.json');
  }

  saveChangesToFile(model: ModelFile) {
    model.date.modified = new Date().getTime();
    model.date.changed = false;
    this.store();
    try {
      this.fs.writeFileSync(model.path, JSON.stringify(model), 'utf-8');
    } catch (e) {
      alert('Failed to save file data');
    }
  }

  parseFile(file: any) {
    return new Promise((resolve, reject) => {
      resolve(JSON.parse(file));
    });
  }

  updateActiveModel() {
    if (this.models.length > 0) {
      const activeModel = this.models.filter(m => m.isActive)[0];
      if (activeModel) {
        activeModel.joints = this.joints;
        activeModel.links = this.kinematicLinkService.roots;
        this.store();
      }
    }
  }

  deleteModel(model: ModelFile) {
    const modelObj = this.models.filter(m => m.id === model.id)[0];
    if (modelObj) {
      if (modelObj.isActive) {
        this.deleteJointsScene.next();
        this.joints = [];
        this.kinematicLinkService.deleteAll();
      }
      const index = this.models.indexOf(modelObj);
      if (index > -1) {
        this.models.splice(index, 1);
      }
    }
  }


  createDefaultModel(name: string) {
    const defaultFile = new ModelFile(uuid(), name);
    this.add(defaultFile);
  }

  addJoint(model: any): JointLink {
    const joint = new JointLink(uuid(), model);
    console.log(joint);
    const similarObjects = this.joints.filter(j => j.isMotor === joint.isMotor && j.isJoint === joint.isJoint).length;
    joint.name += '-' + (similarObjects + 1);
    this.joints.push(joint);
    this.store();

    return joint;
  }

  addNewJoint(model: Model): URFD_Joint {
    const urfd_joint = new URFD_Joint(uuid(), model);

    const similarObjects = this.frames.filter(j => j.config.active).length;
    urfd_joint.name += '-' + (similarObjects + 1);

    console.log(urfd_joint);
    this.frames.push(urfd_joint);
    this.store();

    return urfd_joint;
  }

  addNewLink(model: Model): URFD_Link {
    const urfd_link = new URFD_Link(uuid(), model);

    const similarObjects = this.frames.filter(l => l instanceof URFD_Link).length;
    urfd_link.name += '-' + (similarObjects + 1);

    this.frames.push(urfd_link);
    return urfd_link;
  }

  // addJoint(model: any): JointLink {
  //   const joint = new JointLink(uuid(), model);
  //   const similarObjects = this.joints.filter(j => j.isMotor === joint.isMotor && j.isJoint === joint.isJoint).length;
  //   joint.name += '-' + (similarObjects + 1);
  //   this.joints.push(joint);
  //   this.store();

  //   return joint;
  // }

  deleteJoint(id: string) {
    this.deselectJoint(id);
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      const index = this.joints.indexOf(joint);
      if (index > -1) {
        this.joints.splice(index, 1);
        this.store();
      }
    }
  }

  deleteAll() {
    this.deselectAll();
    this.joints = [];
    this.kinematicLinkService.deleteAll();
    const activeModel = this.models.filter(m => m.isActive)[0];
    if (activeModel) {
      activeModel.joints = [];
      activeModel.links = [];
    }
    this.store();
  }

  copyJoint(id: string, sceneObject: any) {
    const joint = this.joints.filter(j => j.id === id)[0];
    console.log(joint.id, joint.connectors);
    if (joint) {
      const newID = uuid();
      sceneObject.name = newID;
      console.log(sceneObject.name, newID);
      const newJoint = new JointLink(newID, null);
      console.log(newJoint.id);
      newJoint.object3D = joint.object3D;
      newJoint.isJoint = joint.isJoint;
      newJoint.isMotor = joint.isMotor;
      newJoint.modelType = joint.modelType;
      newJoint.name = joint.name + '-copy';
      newJoint.motor = null;
      newJoint.sceneObject = sceneObject;
      newJoint.connectors = joint.connectors;
      console.log(newJoint.id, newJoint.connectors);
      this.joints.push(newJoint);
      // console.log(this.joints);
      this.store();

      return newJoint;
    }
  }


  updateObjectDetails(object: any, model_id: string, point_name: string, color = null) {
    // console.log(object);
    object.traverse( ( child: any ) => {
      if ( child instanceof THREE.Mesh ) {
        // if (color) {
        //   child.material = new THREE.MeshStandardMaterial({ color: color });
        // }
        const child_color = child.name.split(":");
        if (child_color[0] === "Yellow") {
          child.name = point_name;
          child.material = new THREE.MeshStandardMaterial({ color: 0xfc7f03 });
          const updatedPoint = this.updateSelectionPointID(model_id, point_name, child.uuid);
          if (color !== null && updatedPoint) { object.name = updatedPoint.id; }

        } else if (child_color[0] === 'Gray') {
          child.material = new THREE.MeshStandardMaterial({ color: 0x333333 });
        }
        if (child_color.length === 3 && child_color[2] === "E") {
          // child.name = point.name;
          const updatedExtension = this.updateArmExtensionID(model_id, point_name, child.uuid);
          // console.log(updatedExtension);
          // if (updatedPoint) { object.name = updatedPoint.id; }
        }
      }
    });
    return object;
  }


  anySelected(): boolean {
    if (this.selConnPoints.length > 0 || this.selectedJoints.length > 0) {
      return true;
    }
    return false;

  }

  deselectAll() {
    this.selectedJoints = [];
    this.selConnPoints = [];
  }

  // getSelectionPoint(parent_id: string, point_id: string): connectionPoint {
  //   return this.selConnPoints.filter(p => p.parent.id === parent_id && p.point.uuid === point_id)[0];
  // }

  getSelectionPoint(parent_id: string, id: string) {
    // console.log(parent_id, id);

    const joint = this.joints.filter(j => j.id === parent_id)[0];
    // console.log(joint);

    if (joint) {
      for (const item of joint.connectors) {
        // console.log(item.id, id);
        if (item.id === id) {
          // console.log(item);
          return item;
        }
      }
    }
    return;
  }


  checkIfPointIsSelected(parent_id: string, id: string) {
    return this.selConnPoints.filter(p => p.parent_id === parent_id && p.id === id)[0] ? true : false;
  }



  updateSelectionPointID(model_id: string, name: string, id: string) {
    // console.log(name);
    const joint = this.joints.filter(j => j.id === model_id)[0];
    // console.log(joint);

    if (joint) {
      for (const item of joint.connectors) {
        // console.log(item);
        if (item.name === name) {
          item.id = id;
          this.store();
          // console.log(item);
          return item;
        }
      }
    }
    return;
  }

  updateArmExtensionID(model_id: string, name: string, id: string) {
    // console.log(name);
    const joint = this.joints.filter(j => j.id === model_id)[0];
    // console.log(joint);

    if (joint) {
      for (const item of joint.connectors) {
        // console.log(item);
        if (item.name === name) {
          item.block_id = id;
          this.store();
          // console.log(item);
          return item;
        }
      }
    }
    return;
  }


  deleteSelectionPoint(parent_id: string, point_id: string) {
    const selectedPoint = this.selConnPoints.filter(p => p.id === point_id && p.parent_id === parent_id)[0];
    if (selectedPoint) {
      const index = this.selConnPoints.indexOf(selectedPoint);
      if (index > -1) {
        this.selConnPoints.splice(index, 1);
      }
    }
  }


  getJoint(id: string): JointLink {
    return this.joints.filter(j => j.id === id)[0];
  }

  getAllJoints(): Array<JointLink> {
    return this.joints;
  }

  getObjectWithID(id: string): any {
    return this.frames.filter(f => f.id === id)[0];
  }

  deselectJoint(id: string) {
    const joint = this.selectedJoints.filter(j => j.id === id)[0];
    if (joint) {
      const index = this.selectedJoints.indexOf(joint);
      this.joints.filter(j => j.id === id)[0].selected = false;
      if (index > -1) {
        this.selectedJoints.splice(index, 1);
      }
    }
  }

  selectJoint(id: string) {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      joint.selected = true;
      this.selectedJoints.push(joint);
    }
  }


  updateJointVisualization(id: string, object3D: Object3D) : JointLink {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      joint.object3D = object3D;
      this.store();
    }

    return joint;
  }

  getJointColor(id: string): number {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      return joint.object3D.color;
    }
    return;
  }


  updateConnectionPoint(id: string, point_: Connector): JointLink {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {
      let point = joint.connectors.filter(p => p.id === point_.id)[0];
      if (point) {
        point = point;
        this.store();
      }
      return joint;
    }
    return;
  }

  updateJoint(joint: JointLink) {
    let jointInList = this.joints.filter(j => j.id === joint.id)[0];
    if (jointInList) {
      jointInList = joint;
      this.store();
    }
  }

  getPoint(joint_id: string, point_id: string): Connector {
    const joint = this.joints.filter(j => j.id === joint_id)[0];
    if (joint) {
      const point = joint.connectors.filter(p => p.id === point_id)[0];
      if (point) {
        return point;
      }
    }
    return;
  }


  getConnectorSize(plane: string, type: number, isMotor: boolean) {
    if (plane === 'X' || type === 2) {
      return new ConnectorSize(1.5, 1, 1.5, isMotor ? 23.575 : 18.48);
    } else if (plane === 'Y') {
      return new ConnectorSize(2.5, 1, 2.5, isMotor ? 26.5 : 23);
    } else if (plane === 'Z') {
      return new ConnectorSize(1, 1, 1, 17.2);
    }
  }


  addPoint(id: string) {
    const joint = this.joints.filter(j => j.id === id)[0];
    if (joint) {

      const axis = joint.connectors.filter(p => p.plane === 'X').length > joint.connectors.filter(p => p.plane === 'Y').length ? 'Y' : 'X';
      const connectorsWithAxis = joint.connectors.filter(p => p.plane === axis);
      const angle = connectorsWithAxis.length === 0 ? 0 : connectorsWithAxis[connectorsWithAxis.length - 1].angle + 60;
      const vector = new THREE.Vector3(-Math.cos(angle * Math.PI/180 + (Math.PI / 2)), -Math.sin(angle * Math.PI/180 + (Math.PI / 2)),0);
      vector.normalize();

      const point = new Connector(null,'Yellow:' + axis + ':' + connectorsWithAxis.length, angle, axis, vector);
      point.size = this.getConnectorSize(point.plane, joint.modelType, joint.isMotor);
      joint.connectors.push(point);
      this.store();

      this.importOBJModelToObjectGroup.next({ pnt: point, model_id: joint.id });
    }
  }




  store() {
    this.modelObservable.next(this.models);
    this.jointObservable.next(this.joints);
    this.localSt.store('models', this.joints);
    this.localSt.store('modelFiles', this.models);
  }



}




