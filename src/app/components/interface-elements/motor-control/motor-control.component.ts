import { AfterViewInit, Component, Inject, OnInit } from '@angular/core';
import { Collection, Layer } from 'src/app/models/collection.model';
import { Details } from 'src/app/models/effect.model';
import { v4 as uuid } from 'uuid';
import { MicroController } from 'src/app/models/hardware.model';
import { HardwareService } from 'src/app/services/hardware.service';
import { MotorControlService } from 'src/app/services/motor-control.service';
import { DOCUMENT } from '@angular/common';

@Component({
    selector: 'app-motor-control',
    templateUrl: './motor-control.component.html',
    styleUrls: ['./motor-control.component.css'],
})
export class MotorControlComponent implements OnInit, AfterViewInit {

  microcontrollers = [];

  draggingListItem = null;

  scaleOptions = [
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
  ]

  constructor(@Inject(DOCUMENT) private document: Document, public motorControlService: MotorControlService, public hardwareService: HardwareService) {
    this.microcontrollers = this.hardwareService.getAllMicroControllers();
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
      this.motorControlService.drawCollections();
    });
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

  upload(collectionID: string) {}

  loop(collectionID: string) {
    const collection = this.motorControlService.file.collections.filter(c => c.id === collectionID)[0];
    const loop = collection.rotation.loop;
    if (loop) {
      collection.rotation.start = 0;
      collection.rotation.end = 360;
      this.motorControlService.updateCollection(collection);
    }
  }

  play(collectionID: string) {}

  delete(collection: Collection) {
    this.motorControlService.deleteCollection(collection);
  }

  changeUnits(collection: Collection) {
    const oldUnits = collection.rotation.units;
    if (oldUnits.name === 'degrees') {
      collection.rotation.units = { name: 'radians', PR: 2*Math.PI }
    } else if (oldUnits.name === 'radians') {
      collection.rotation.units = { name: 'degrees', PR: 360 }
    }
    const multiply = (collection.rotation.units.PR/oldUnits.PR);
    collection.rotation.start *= multiply;
    collection.rotation.end *= multiply;
    for (const effect of collection.effects) {
      effect.position.x *= multiply;
      effect.position.width *= multiply;
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
        if (collection && tmpEffect) {
          const effectDetails = new Details(uuid(), tmpEffect.id, tmpEffect.name);
          effectDetails.position.width = tmpEffect.size.width;
          effectDetails.position.x = collection.config.newXscale.invert(e.offsetX) - (effectDetails.position.width / 2 );

          this.motorControlService.drawTmpEffect(effectDetails, collection, tmpEffect.grid.xUnit);
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

  public resetDraggingListItemVariable() {
    this.draggingListItem = null;
    this.deselectAllRowItemsDrop();
  }


  public drop(e: any, el: any) {
    e.preventDefault();
    if (this.draggingListItem === null) {
      const id = e.target.id;
      const tmpEffect = this.motorControlService.getTmpEffect();
      if (tmpEffect && tmpEffect.paths.length > 0) {

        if (id) {
          const collection = this.getCollectionFromClassName(id);
          const multiply = collection.rotation.units.PR / tmpEffect.grid.xUnit.PR;

          if (collection && tmpEffect) {
            const nrOfInstancesOfEffect = collection.effects.filter(e => e.effectID === tmpEffect.id).length;
            const effectDetails = new Details(uuid(), tmpEffect.id, tmpEffect.name + '-col-' + (nrOfInstancesOfEffect + 1));
            effectDetails.position.width = tmpEffect.size.width * multiply;
            effectDetails.position.x = collection.config.newXscale.invert(e.offsetX) - ((effectDetails.position.width * multiply) / 2);
            effectDetails.position.height = tmpEffect.size.height;
            effectDetails.position.y = 0;

            collection.effects.push(effectDetails);
            this.motorControlService.drawCollection(collection);
          }
        }
      }
      this.motorControlService.deleteTmpEffect();
      this.motorControlService.config.tmpEffect = null;
    }
  }

  public dragListItem(e: any) {
    if (!this.motorControlService.getTmpEffect()) {
      const draggableItemID = e.target.id.substring(4);
      const collectionItem = this.motorControlService.file.collections.filter(c => c.id === draggableItemID)[0];
      if (collectionItem) {
        const collectionItemIndex = this.motorControlService.file.collections.indexOf(collectionItem);
        if (collectionItemIndex > -1) {
          this.draggingListItem = collectionItem;
        }
      }
    }
  }

  public allowDropListItem(e: any, el: any) {
    e.preventDefault();
    if (this.draggingListItem !== null && !this.motorControlService.getTmpEffect()) {
      let className = e.target.classList[0];
      if (e.target.id !== null && (className === 'motor-control-rows' || className === 'column-visualization' || className === 'row' || className === 'collection')) {
        const targetID = e.target.id.substring(4);
        const collectionItem = this.motorControlService.file.collections.filter(c => c.id === targetID)[0];
        if (collectionItem) {
          this.deselectAllRowItemsDrop(collectionItem.id);

        }
      }
    }
  }

  public dragendListItem(e: any) {
    e.preventDefault();
    if (this.draggingListItem !== null && !this.motorControlService.getTmpEffect()) {
      this.deselectAllRowItemsDrop();
    }

  }

  public reorderList(e: any, el: any) {
    e.preventDefault();
    if (this.draggingListItem !== null && !this.motorControlService.getTmpEffect()) {
      let className = e.target.classList[0];
      console.log(e.target, className, el);
      if (e.target.id !== null && (className === 'motor-control-rows' || className === 'column-visualization' || className === 'row' || className === 'collection')) {
        const targetID = e.target.id.substring(4);
        const collectionItem = this.motorControlService.file.collections.filter(c => c.id === targetID)[0];
        const dragItem = this.motorControlService.file.collections.filter(c => c.id === this.draggingListItem.id)[0];

        if (collectionItem && dragItem && collectionItem.id !== dragItem.id) {
          this.deselectAllRowItemsDrop();
          const dragItemIndex = this.motorControlService.file.collections.indexOf(this.draggingListItem);
          if (dragItemIndex > -1) {
            this.motorControlService.file.collections.splice(dragItemIndex, 1);
            const collectionIndex = this.motorControlService.file.collections.indexOf(collectionItem);
            if (collectionIndex > -1) {
              this.motorControlService.file.collections.splice(collectionIndex, 0, this.draggingListItem);
              this.motorControlService.saveFile(this.motorControlService.file);
            }
          }
        }
      }
      this.draggingListItem = null;
    }
  }

  deselectAllRowItemsDrop(id = null) {
    const rowElements = this.document.getElementsByClassName('motor-control-rows');
    Array.prototype.filter.call(rowElements, (row: HTMLElement) => {
      if (row.id.substring(4) === id) {
        row.classList.add('active');
      } else if (row.classList.contains('active')) {
        row.classList.remove('active')
      }
    });
  }


}
