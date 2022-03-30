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

  undefinedVar = null;

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

  unitOptionsVelocity = [
    { name: 'ms', PR: 1000 },
    // { name: 'degrees', PR: 360 },
    // { name: 'radians', PR: 2*Math.PI }
  ];

  unitOptionsVelocityY = [
    { name: 'velocity (%)', PR: 100 },
    { name: 'degrees', PR: 360 }
  ];

  oldUnits = { name: 'degrees', PR: 360 };

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

        selectedCollection.microcontroller.motors.filter(m => m.id === selectedCollection.motorID.name)[0].state.position.current = angle;
        selectedCollection.microcontroller.motors.filter(m => m.id === selectedCollection.motorID.name)[0].state.speed = velocity;
        selectedCollection.time = data.time;
        if (this.document.getElementById('position-' + selectedCollection.id) !== null) {
          if (selectedCollection.rotation.units.name !== 'ms') {
            (this.document.getElementById('position-' + selectedCollection.id) as HTMLElement).innerHTML = (Math.round(angle * 100) / 100) + ' ';
          }
        }
        (this.document.getElementById('speed-' + selectedCollection.id) as HTMLElement).innerHTML = (Math.round(velocity * 100) / 100) + ' ';
        if (selectedCollection.rotation.units.name === 'ms') {
          (this.document.getElementById('time-' + selectedCollection.id) as HTMLElement).innerHTML = selectedCollection.time + ' ';
        }
        this.motorControlService.drawCursor(selectedCollection);
      }
    });

    this.electronService.ipcRenderer.on('zero_electric_angle', (event: Event, data: any) => {
      const microcontroller = this.hardwareService.getMicroControllerByCOM(data.serialPath);
      if (microcontroller) {
        const motor = microcontroller.motors.filter(m => m.id === data.motorID)[0];
        if (motor) {
          motor.config.calibration.value = data.zero_electric_angle;
          motor.config.calibration.direction = data.direction === 1 ? 'CW' : 'CCW';
          this.hardwareService.updateMicroController(microcontroller);
        }
      }
    });

    this.electronService.ipcRenderer.on('upload_succesful', (event: Event, collection: any) => {
      const selectedCollection = this.motorControlService.file.collections.filter(c => c.id === collection)[0];
      if (selectedCollection) {
        if (selectedCollection.rotation.units.name !== 'ms') {
          selectedCollection.playing = true;
          this.motorControlService.updateCollection(selectedCollection);
        }
      }
    });

    this.electronService.ipcRenderer.on('deleteMicrocontrollerCollections', (event: Event, microcontroller: any) => {
      for (const collection of this.motorControlService.file.collections) {
        if (collection.microcontroller && collection.microcontroller.id === microcontroller.id) {
          collection.microcontroller = null;
          this.motorControlService.updateCollection(collection);
        }
      }
    });

    this.electronService.ipcRenderer.on('updateStatus', (event: Event, data: any) => {
      this.hardwareService.updatePlay(data.microcontroller.port.path, data.microcontroller.type, data.connected);

      if (!data.connected) {
        for (const c of this.motorControlService.file.collections) {
          if (c.playing && c.microcontroller && c.microcontroller.serialPort.path === data.microcontroller.port.path) {
            c.playing = false;
            this.motorControlService.updateCollection(c);
          }
        }
      }

    });
  }


  ngOnInit() {
    this.hardwareService.microcontrollerObservable.subscribe(microcontrollers => {
      this.microcontrollers = microcontrollers;

      for (const microcontroller of this.microcontrollers) {
        const microcontrollerCollections = this.motorControlService.file.collections.filter(c => c.microcontroller && c.microcontroller.serialPort.path === microcontroller.serialPort.path);

        for (const collection of microcontrollerCollections) {
          collection.microcontroller = microcontroller;
        }
      }
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
        if (this.motorControlService.file.effects.length > 0) {
          this.uploadService.renderCollection(collection, this.motorControlService.file.effects);
        }
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
      this.electronService.ipcRenderer.send('upload', uploadModel);

    } else {
      this.render(collection, true);
    }
  }

  play(play: boolean, collection: Collection) {
    if (collection.effects.length > 0) {
      if (collection.effectDataList.length > 0) {
        this.electronService.ipcRenderer.send('play_collection', { play: play, motor_id: collection.motorID.name, collection_name: collection.name, port: collection.microcontroller.serialPort.path });
        if (play) {
          if (collection.time > collection.rotation.end || collection.time == undefined) {
            collection.time = 0;
          }
          collection.playing = true;
          this.motorControlService.saveCollection(collection);
        } else {
          collection.playing = false;
        }
      } else {
        this.upload(collection);
      }
    }
  }

  loop(collectionID: string) {
    const collection = this.motorControlService.file.collections.filter(c => c.id === collectionID)[0];
    collection.rotation.loop = !collection.rotation.loop;
    if (collection.rotation.loop && collection.rotation.units.name !== 'ms') {
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
    const multiply = (collection.rotation.units.PR/this.oldUnits.PR);

    if (multiply !== 1) {

      collection.rotation.start *= multiply;
      collection.rotation.end *= multiply;

      if (collection.rotation.units.name === 'ms') {
        collection.rotation.start = 0;
        if (collection.rotation.end < collection.rotation.start) {
          collection.rotation.end += 1000;
        }
      }

      for (const effect of collection.effects) {
        effect.position.x *= multiply;
        effect.position.width *= multiply;
        for (const instance of effect.repeat.repeatInstances) {
          instance.x *= multiply;
        }
      }
      this.oldUnits = collection.rotation.units;
      this.motorControlService.updateCollection(collection);
    }
  }


  changeUnitsY(collection: Collection) {
    if (collection.rotation.units_y.name === 'velocity (%)') {
      collection.rotation.start_y = -100;
      collection.rotation.end_y = 100;
    } else if (collection.rotation.units_y.name === 'degrees') {
      for (const collEffect of collection.effects) {
        const effect = this.motorControlService.file.effects.filter(e => e.id === collEffect.effectID)[0];
        if (effect) {
          if (effect.range_y.start < collection.rotation.start_y) { collection.rotation.start_y = effect.range_y.start; }
          if (effect.range_y.end > collection.rotation.end_y) { collection.rotation.end_y = effect.range_y.end; }
        }
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
    if (collection.rotation.units.name !== 'ms') {
      collection.rotation.start = collection.rotation.units.name !== 'ms' ? parseFloat((this.document.getElementById('range-start') as HTMLInputElement).value) : 0;
    }
    collection.rotation.end = parseFloat((this.document.getElementById('range-end') as HTMLInputElement).value);
    this.motorControlService.updateCollection(collection);
  }

  updateRangeYValues(collection: Collection) {
    // this.motorControlService.updateCollection(collection);
  }


  updateVisualizationType(collection: Collection) {
    if (collection.visualizationType === 'position') {
      collection.rotation.start_y = 0;
      collection.rotation.end_y = 100;

      if (collection.rotation.units.name === 'ms') {
        this.oldUnits = collection.rotation.units;
        collection.rotation.units = { name: 'degrees', PR: 360 };
        this.changeUnits(collection);

        collection.rotation.units_y = { name: 'voltage (%)', PR: 100 };
        // this.changeUnitsY(collection);
      }
    }
    if (collection.visualizationType === 'torque') {
      collection.rotation.start_y = -100;
      collection.rotation.end_y = 100;
      if (collection.rotation.units.name === 'ms') {
        this.oldUnits = collection.rotation.units;
        collection.rotation.units = { name: 'degrees', PR: 360 };
        this.changeUnits(collection);

        collection.rotation.units_y = { name: 'voltage (%)', PR: 100 };
        // this.changeUnitsY(collection);
      }
    }
    if (collection.visualizationType === 'velocity') {
      collection.rotation.start_y = -100;
      collection.rotation.end_y = 100;
      this.oldUnits = collection.rotation.units;
      collection.rotation.units = { name: 'ms', PR: 1000 };
      this.changeUnits(collection);
      collection.rotation.units_y = { name: 'velocity (%)', PR: 100 };
      this.changeUnitsY(collection);
    }
    this.motorControlService.drawCollection(collection);
  }

  saveCollection(collection: Collection) {
    if (collection.microcontroller && collection.microcontroller.id) {
      if (collection.motorID.name === 'A') { collection.motorID.index = 0; }
      if (collection.motorID.name === 'B') { collection.motorID.index = 1; }
      if (collection.motorID.name === 'C') { collection.motorID.index = 2; }
      if (collection.motorID.name === 'D') { collection.motorID.index = 3; }
      if (collection.motorID.name === 'E') { collection.motorID.index = 4; }
    }
    this.motorControlService.updateCollection(collection);
  }

  saveMotorData(collection: Collection, datatype = null, data = null) {

    const coll_microcontroller = this.hardwareService.getMicroControllerByCOM(collection.microcontroller.serialPort.path);
    if (coll_microcontroller) {
      if (collection.visualizationType === 'position' || collection.rotation.units_y.name === 'degrees') {
        coll_microcontroller.motors.filter(m => m.id === collection.motorID.name)[0].position_pid = collection.microcontroller.motors[collection.motorID.index].position_pid;
      }
      if (collection.visualizationType === 'velocity' && collection.rotation.units_y.name !== 'degrees') {
        coll_microcontroller.motors.filter(m => m.id === collection.motorID.name)[0].velocity_pid = collection.microcontroller.motors[collection.motorID.index].velocity_pid;
        coll_microcontroller.motors.filter(m => m.id === collection.motorID.name)[0].config.velocityLimit = collection.microcontroller.motors[collection.motorID.index].config.velocityLimit;
      }
      if (collection.visualizationType === 'torque') {
        coll_microcontroller.motors.filter(m => m.id === collection.motorID.name)[0].config.voltageLimit = collection.microcontroller.motors[collection.motorID.index].config.voltageLimit;
      }

      this.hardwareService.updateMicroController(coll_microcontroller);

      if (datatype && data) {
        const dataStr = data.length > 1 ? ':' + data.join(":") : data[0];
        this.electronService.ipcRenderer.send('update_motor_variable', { char: datatype, d: dataStr, motor_id: collection.motorID.name, port: collection.microcontroller.serialPort.path });
        this.motorControlService.drawCollection(collection);
      }
    }
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
          if (collection) {
            const multiply = collection.rotation.units.PR / tmpEffect.grid.xUnit.PR;

            if (collection && tmpEffect && !(tmpEffect.type === 'velocity' && collection.visualizationType !== 'velocity')) {

              const copyTmpEffect = this.cloneService.deepClone(tmpEffect);

              if (tmpEffect.storedIn === 'library') {
                copyTmpEffect.storedIn = 'file';
                copyTmpEffect.date.modified = new Date().getTime();
                copyTmpEffect.id = uuid();
                const instances = this.motorControlService.file.effects.filter(e => e.name.includes(copyTmpEffect.name + '-copy') && e.date.created === copyTmpEffect.date.created).length;
                copyTmpEffect.name += instances > 0 ? '-copy-' + instances : '-copy';

                this.motorControlService.file.effects.push(copyTmpEffect);
              }

              const effectDetails = new Details(uuid(), copyTmpEffect.id, copyTmpEffect.name + '-' + collection.name);
              effectDetails.position.width = tmpEffect.size.width * multiply;
              effectDetails.position.x = collection.config.newXscale.invert(e.offsetX) - (effectDetails.position.width / 2);
              effectDetails.position.height = tmpEffect.size.height;
              effectDetails.position.y = 0;
              effectDetails.position.top = tmpEffect.size.top;
              effectDetails.position.bottom = tmpEffect.size.bottom;
              if (tmpEffect.grid.xUnit.name === 'ms') { effectDetails.quality = Math.ceil(effectDetails.position.width / 50); }
              else { effectDetails.quality = Math.ceil(effectDetails.position.width / 50); }

              collection.effects.push(effectDetails);

              collection.renderedData = [];
              collection.effectDataList = [];

              if (collection.visualizationType === 'velocity' && tmpEffect.type === 'velocity' && tmpEffect.grid.yUnit.name === 'degrees') {
                if (collection.rotation.start_y > tmpEffect.range_y.start) { collection.rotation.start_y = tmpEffect.range_y.start; }
                if (collection.rotation.end_y < tmpEffect.range_y.end) { collection.rotation.end_y = tmpEffect.range_y.end; }

                this.motorControlService.drawCollection(collection);
              } else {
                this.motorControlService.drawCollectionEffects(collection);
              }
            }
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
