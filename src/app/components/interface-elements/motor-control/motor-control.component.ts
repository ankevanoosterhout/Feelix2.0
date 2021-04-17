import { AfterViewInit, Component, OnInit } from '@angular/core';
import { Collection } from 'src/app/models/collection.model';
import { MicroController } from 'src/app/models/hardware.model';
import { HardwareService } from 'src/app/services/hardware.service';
import { MotorControlService } from 'src/app/services/motor-control.service';

@Component({
    selector: 'app-motor-control',
    templateUrl: './motor-control.component.html',
    styleUrls: ['./motor-control.component.css'],
})
export class MotorControlComponent implements OnInit, AfterViewInit {

  savedMicrocontrollers = [];
  dropdownVisible = '0';

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

  constructor(public motorControlService: MotorControlService, public hardwareService: HardwareService) {
    this.savedMicrocontrollers = this.hardwareService.getAllMicroControllers();
  }

  ngOnInit() {}

  ngAfterViewInit(): void {
    this.motorControlService.drawCollections(this.motorControlService.file.collections);
  }

  selectMicrocontroller(collectionID: string, microcontroller: MicroController) {
    this.motorControlService.file.collections.filter(c => c.id === collectionID)[0].microcontroller = microcontroller;
  }

  changeDropdown(collectionID: string) {
    this.dropdownVisible = this.dropdownVisible === collectionID ? '0' : collectionID;
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

  delete(id: string) {
    this.motorControlService.deleteCollection(id);
  }

  compareValue(val1: any, val2: any) {
    return val1 && val2 ? val1.value === val2.value : val1 === val2;
  }

  compareCOM(port1: any, port2: any) {
    return port1 && port2 ? port1.serialPort.path === port2.serialPort.path : port1 === port2;
  }

  saveCOMPort(collection: Collection) {
    this.motorControlService.updateCollection(collection);
  }

  public allowDrop(e: any) {
    e.preventDefault();
  }

  public drop(e: any) {
    e.preventDefault();
    let id = e.target;
    console.log(e, id);
  }

}
