import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { Collection, Layer } from 'src/app/models/collection.model';
import { Details } from 'src/app/models/effect.model';
import { v4 as uuid } from 'uuid';
import { MicroController } from 'src/app/models/hardware.model';
import { HardwareService } from 'src/app/services/hardware.service';
import { MotorControlService } from 'src/app/services/motor-control.service';
import { DOCUMENT } from '@angular/common';
import { CloneService } from 'src/app/services/clone.service';
import { UploadService } from 'src/app/services/upload.service';
import { ElectronService } from 'ngx-electron';

@Component({
    selector: 'app-motor-control',
    templateUrl: './motor-control.component.html',
    styleUrls: ['./motor-control.component.css'],
})
export class MotorControlComponent implements OnInit, AfterViewInit {

  microcontrollers = [];

  draggingListItem = null;

  scaleOptions = [
    { text: '50%', value: 50 },
    { text: '75%', value: 75 },
    { text: '100%', value: 100 },
    { text: '125%', value: 125 },
    { text: '150%', value: 150 },
    { text: '250%', value: 250 },
    { text: '500%', value: 500 }
  ];

  scale = 100;

  PID_Controller = [
    { name: 'P', val: 0.5 },
    { name: 'I', val: 0.25 },
    { name: 'D',  val: 0.15 }
  ];

  visualizationTypes = [
    { name: 'torque' },
    { name: 'position' },
    { name: 'velocity' }
  ];

  unitOptions = [
    { name: 'degrees', PR: 360 },
    { name: 'radians', PR: 2*Math.PI }
  ];

  constructor(@Inject(DOCUMENT) private document: Document, public motorControlService: MotorControlService, public hardwareService: HardwareService,
              private cloneService: CloneService, private uploadService: UploadService, private electronService: ElectronService) {

    this.microcontrollers = this.hardwareService.getAllMicroControllers();

    this.electronService.ipcRenderer.on('playData', (event: Event, data: any) => {
      const selectedCollection = this.motorControlService.file.collections.filter(c => c.microcontroller && c.microcontroller.serialPort.path === data.serialPath && c.playing)[0];
      if (selectedCollection) {
        let angle = selectedCollection.rotation.units.name === 'degrees' ? data.angle * (180/Math.PI) : data.angle;
        if (selectedCollection.rotation.loop) {
          const range = selectedCollection.rotation.end - selectedCollection.rotation.start;
          angle = this.fmod(data.angle * (180/Math.PI), range);
          if (angle < 0) {
            if (selectedCollection.rotation.units.name === 'degrees') {
              angle += range;
            } else {
              angle += (range * (Math.PI/180));
            }
          }
        }

        const velocity = selectedCollection.rotation.units.name === 'degrees' ? data.velocity * (180/Math.PI) : data.velocity;

        selectedCollection.microcontroller.motors.filter(m => m.id === selectedCollection.motorID)[0].state.position.current = angle;
        selectedCollection.microcontroller.motors.filter(m => m.id === selectedCollection.motorID)[0].state.speed = velocity;
        if (this.document.getElementById('position-' + selectedCollection.id) !== null) {
          (this.document.getElementById('position-' + selectedCollection.id) as HTMLElement).innerHTML = (Math.round(angle * 100) / 100) + ' ';
          (this.document.getElementById('speed-' + selectedCollection.id) as HTMLElement).innerHTML = (Math.round(velocity * 100) / 100) + ' ';
        }
        this.motorControlService.drawCursor(selectedCollection);
      }
    });

    this.electronService.ipcRenderer.on('zero_electric_angle', (event: Event, data: any) => {
      const microcontroller = this.hardwareService.getMicroControllerByCOM(data.serialPath);

      if (microcontroller) {
        microcontroller.motors.filter(m => m.id === data.motorID)[0].config.calibration.value = data.zero_electric_angle;
        microcontroller.motors.filter(m => m.id === data.motorID)[0].config.calibration.direction = data.direction === 1 ? 'CW' : 'CCW';
        this.hardwareService.updateMicroController(microcontroller);
      }
    });

    this.electronService.ipcRenderer.on('upload_succesful', (event: Event, collection: any) => {
      const selectedCollection = this.motorControlService.file.collections.filter(c => c.id === collection)[0];
      if (selectedCollection) {
        selectedCollection.playing = true;
        this.motorControlService.updateCollection(selectedCollection);
      }
    });

  }

  ngOnInit() {
    this.hardwareService.microcontrollerObservable.subscribe(microcontrollers => {
      this.microcontrollers = microcontrollers;
      for (const microcontroller of this.microcontrollers) {
        const collections = this.motorControlService.file.collections;
        let microcontrollerCollection = collections.filter(c => c.microcontroller && c.microcontroller.id === microcontroller.id)[0];
        if (microcontrollerCollection) {
          microcontrollerCollection = microcontroller;
        }
      }
      // this.motorControlService.drawCollections();
    });
  }

  fmod(val: number, mod: number) {
    return ((val * 100) % (mod * 100) / 100);
  }

  ngAfterViewInit(): void {
    this.motorControlService.drawCollections();
  }

  selectMicrocontroller(collectionID: string, microcontroller: MicroController) {
    this.motorControlService.file.collections.filter(c => c.id === collectionID)[0].microcontroller = microcontroller;
  }


  toggleVisibility(collection: Collection, layer: Layer) {
    collection.layers.filter(l => l.name === layer.name)[0].visible = !collection.layers.filter(l => l.name === layer.name)[0].visible;
    this.motorControlService.saveCollection(collection);
  }

  toggleLocked(collection: Collection, layer: Layer) {
    collection.layers.filter(l => l.name === layer.name)[0].locked = !collection.layers.filter(l => l.name === layer.name)[0].locked;
    this.motorControlService.saveCollection(collection);
  }

  render(collection: Collection, upload = false) {
    let time = 0;
    if (collection.rotation.units.name === 'radians' && collection.effectDataList.length === 0) {
      time = 200;
      collection.rotation.units = { name: 'degrees', PR: 360 };
      this.changeUnits(collection);
    }
    setTimeout(() => {
      if (collection.effectDataList.length > 0) {
        collection.effectDataList = [];
        collection.overlappingData = [];
        collection.renderedData = [];
      } else {
        this.uploadService.renderCollection(collection, this.motorControlService.file.effects);
      }
      this.motorControlService.updateCollection(collection);
      if (upload && collection.effectDataList.length > 0) {
        this.upload(collection);
      }
    }, time);

  }

  upload(collection: Collection) {
    if (collection.effectDataList.length > 0) {
      const microcontroller = this.hardwareService.getMicroControllerByCOM(collection.microcontroller.serialPort.path);
      const uploadModel = this.uploadService.createUploadModel(collection, microcontroller);

      const activeCollection = this.motorControlService.file.collections.filter(c => c.microcontroller && c.microcontroller.serialPort.path === collection.microcontroller.serialPort.path && c.playing)[0];
      if (activeCollection) {
        activeCollection.playing = false;
        this.motorControlService.updateCollection(activeCollection);
      }

      if (this.motorControlService.file.collections.filter(c => c.microcontroller && c.microcontroller.serialPort.path === collection.microcontroller.serialPort.path && c.playing))
      this.electronService.ipcRenderer.send('upload', uploadModel);
    } else {
      this.render(collection, true);
    }
  }

  play(collection: Collection) { }

  loop(collectionID: string) {
    const collection = this.motorControlService.file.collections.filter(c => c.id === collectionID)[0];
    collection.rotation.loop = !collection.rotation.loop;
    if (collection.rotation.loop) {
      collection.rotation.start = 0;
      collection.rotation.end = 360 * (collection.rotation.units.PR / 360);
    }
    this.motorControlService.drawCollection(collection);
    this.motorControlService.updateCollection(collection);
  }



  delete(collection: Collection) {
    this.motorControlService.deleteCollection(collection);
  }

  changeUnits(collection: Collection) {
    let oldUnits;
    if (collection.rotation.units.name === 'degrees') {
      oldUnits = { name: 'radians', PR: 2*Math.PI }
    } else if (collection.rotation.units.name === 'radians') {
      oldUnits = { name: 'degrees', PR: 360 }
    }
    const multiply = (collection.rotation.units.PR/oldUnits.PR);
    collection.rotation.start *= multiply;
    collection.rotation.end *= multiply;
    for (const effect of collection.effects) {
      effect.position.x *= multiply;
      effect.position.width *= multiply;
      for (const instance of effect.repeat.repeatInstances) {
        instance.x *= multiply;
      }
    }
    this.motorControlService.updateCollection(collection);
  }

  compareValue(val1: any, val2: any) {
    return val1 && val2 ? val1.value === val2.value : val1 === val2;
  }

  compareCOM(port1: any, port2: any) {
    return port1 && port2 ? port1.serialPort.path === port2.serialPort.path : port1 === port2;
  }
  compareID(el1: any, el2: any) {
    return el1 && el2 ? el1.id === el2.id : el1 === el2;
  }

  compareName(el1: any, el2: any) {
    return el1 && el2 ? el1.name === el2.name : el1 === el2;
  }

  updateRangeValues(collection: Collection) {
    collection.rotation.start = parseFloat((this.document.getElementById('range-start') as HTMLInputElement).value);
    collection.rotation.end = parseFloat((this.document.getElementById('range-end') as HTMLInputElement).value);
    this.motorControlService.updateCollection(collection);
  }


  saveCollection(collection: Collection) {
    this.motorControlService.updateCollection(collection);
  }

  getCollectionFromClassName(id: string) {
    if (id) {
      const collectionID = id.substring(4);
      if (collectionID) {
        const collection = this.motorControlService.file.collections.filter(c => c.id === collectionID)[0];
        return collection;
      }
    }
    return;
  }

  public allowDrop(e: any, el: any) {
    e.preventDefault();
    if (this.draggingListItem === null) {
      const id = e.target.id;
      const tmpEffect = this.motorControlService.getTmpEffect();
      if (tmpEffect && tmpEffect.paths.length > 0) {

        const collection = this.getCollectionFromClassName(id);
        const dropEffect = tmpEffect.storedIn === 'library' && this.motorControlService.file.effects.filter(e => e.id === tmpEffect.id).length > 0 ?
          this.motorControlService.file.effects.filter(e => e.id === tmpEffect.id)[0] : tmpEffect;

        if (collection && tmpEffect) {
          const multiply = collection.rotation.units.PR / dropEffect.grid.xUnit.PR;
          const effectDetails = new Details(uuid(), dropEffect.id, dropEffect.name + '-' + collection.name);
          effectDetails.position.width = dropEffect.size.width * multiply;
          effectDetails.position.x = collection.config.newXscale.invert(e.offsetX) - (effectDetails.position.width / 2);
          effectDetails.position.height = dropEffect.size.height;
          effectDetails.position.y = 0;
          effectDetails.position.top = dropEffect.size.top;
          effectDetails.position.bottom = dropEffect.size.bottom;

          this.motorControlService.drawTmpEffect(effectDetails, collection, dropEffect);
        }
      }
    }
  }

  public removeTmpEffect(e: any, el: any) {
    e.preventDefault();
    this.motorControlService.deleteTmpEffect();
  }

  public resetTmpEffect() {
    this.motorControlService.config.tmpEffect = null;
  }


  public drop(e: any, el: any) {
    e.preventDefault();
    if (this.draggingListItem === null) {
      const id = e.target.id;
      const tmpEffect = this.motorControlService.getTmpEffect();
      if (tmpEffect && tmpEffect.paths.length > 0) {

        if (id) {
          const collection = this.getCollectionFromClassName(id);
          const dropEffect = tmpEffect.storedIn === 'library' && this.motorControlService.file.effects.filter(e => e.id === tmpEffect.id).length > 0 ?
            this.motorControlService.file.effects.filter(e => e.id === tmpEffect.id)[0] : tmpEffect;

          const multiply = collection.rotation.units.PR / dropEffect.grid.xUnit.PR;

          if (collection && tmpEffect) {
            const effectDetails = new Details(uuid(), dropEffect.id, dropEffect.name + '-' + collection.name);
            effectDetails.position.width = dropEffect.size.width * multiply;
            effectDetails.position.x = collection.config.newXscale.invert(e.offsetX) - (effectDetails.position.width / 2);
            effectDetails.position.height = dropEffect.size.height;
            effectDetails.position.y = 0;
            effectDetails.position.top = dropEffect.size.top;
            effectDetails.position.bottom = dropEffect.size.bottom;

            collection.effects.push(effectDetails);

            if (tmpEffect.storedIn === 'library' && this.motorControlService.file.effects.filter(e => e.id === tmpEffect.id).length === 0) {
              const copyTmpEffect = this.cloneService.deepClone(tmpEffect);
              copyTmpEffect.storedIn = 'file';
              copyTmpEffect.date.modified = new Date().getTime();
              copyTmpEffect.id === uuid();
              const instances = this.motorControlService.file.effects.filter(e => e.name.includes(copyTmpEffect.name + '-copy') && e.date.created === copyTmpEffect.date.created).length;
              copyTmpEffect.name += instances > 0 ? '-copy-' + instances : '-copy';

              this.motorControlService.file.effects.push(copyTmpEffect);
            }

            collection.renderedData = [];
            collection.effectDataList = [];

            this.motorControlService.drawCollectionEffects(collection);
          }
        }
      }
      this.motorControlService.deleteTmpEffect();
      this.motorControlService.config.tmpEffect = null;
    }
  }

  moveCollection(id: string, direction: number) {
    const collectionObject = this.motorControlService.file.collections.filter(c => c.id === id)[0];
    if (collectionObject) {
      const index = this.motorControlService.file.collections.indexOf(collectionObject);
      const collectionCopy = this.cloneService.deepClone(collectionObject);
      let newIndex = direction < 0 ? index - 1 : index + 1;
      if (newIndex < 0) { newIndex = this.motorControlService.file.collections.length - 1; }
      if (newIndex >= this.motorControlService.file.collections.length) { newIndex = 0; }
      this.motorControlService.file.collections.splice(index, 1);
      this.motorControlService.file.collections.splice(newIndex, 0, collectionCopy);

      setTimeout(() => {
        this.motorControlService.drawCollections(this.motorControlService.file.collections);
      }, 50);
    }
  }

}
