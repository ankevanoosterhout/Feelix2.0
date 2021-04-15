import { AfterViewInit, Component, OnInit } from '@angular/core';
import { MicroController } from 'src/app/models/hardware.model';
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

  constructor(public motorControlService: MotorControlService) {}

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

  upload() {}

  loop() {}

  play() {}

  delete(id: string) {
    this.motorControlService.deleteCollection(id);
  }

  compareValue(val1: any, val2: any) {
    return val1 && val2 ? val1.value === val2.value : val1 === val2;
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
