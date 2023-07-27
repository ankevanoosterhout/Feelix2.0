import { Component, OnInit, Inject } from "@angular/core";
import { MotorControlService } from 'src/app/services/motor-control.service';
import { HardwareService } from 'src/app/services/hardware.service';
import { ActuatorType, MicroController } from 'src/app/models/hardware.model';
import { CloneService } from 'src/app/services/clone.service';
import { UploadService } from 'src/app/services/upload.service';
import { ElectronService } from 'ngx-electron';
import { DOCUMENT } from '@angular/common';
import { ipcRenderer } from "electron";


@Component({
  selector: 'app-torquetuner-settings',
  templateUrl: './torquetuner-settings.component.html',
  styles: [`
  #bottom-section {
    /* user-select: none; */
    display:inline-block;
    position:relative;
    height:calc(65vh - 20px);
    margin-top: 0;
    width:100%;
  }

  #top-section {
    display:inline-block;
    height: calc(35vh - 23px);
    position:relative;
    margin-top: 22px;
    width: 100%;
    overflow: hidden;
  }
  `]
})
export class TorqueTunerSettingsComponent implements OnInit{

microcontrollers = [];
collections = [];

constructor(@Inject(DOCUMENT) private document: Document, public motorControlService: MotorControlService, public hardwareService: HardwareService,
private cloneService: CloneService, private uploadService: UploadService, private electronService: ElectronService) {
  
  this.microcontrollers = this.hardwareService.getAllMicroControllers();
  
  this.electronService.ipcRenderer.on('collections_update',(event : Event, data : any) => {
    
    if(data) {
      console.log("recieved collections");
      this.collections = [data];
    }
    else {
      console.log("No collection to send");
    }

  })
}

  // connect_to_TT(collection){
  //   this.electronService.ipcRenderer.send('tryToEstablishConnection_TT', collection);
  // }
  // disconnect_from_TT(){

  // }
  print_collections(){
    console.log(this.collections);
  }
  print_collection(collection){
    console.log(collection);
  }

  ngOnInit(): void {
      
      this.hardwareService.microcontrollerObservable.subscribe(microcontrollers => {
        this.microcontrollers = microcontrollers;
      });
  }
}