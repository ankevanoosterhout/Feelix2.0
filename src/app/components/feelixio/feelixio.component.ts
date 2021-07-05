import { Component, OnInit, AfterViewInit, Inject, HostListener } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { DOCUMENT } from '@angular/common';
import { FeelixioDrawService } from 'src/app/services/feelixio-draw.service';
import { FeelixioFileService } from 'src/app/services/feelixio-file.service';
import { FeelixioFile, EffectObject, MotorObject, ComponentLink } from 'src/app/models/feelixio-file.model';
import { ComponentObject } from 'src/app/models/component.model';
import { FeelixioConfig } from 'src/app/models/feelixio-config.model';
import { FeelixioDrawElementsService } from 'src/app/services/feelixio-draw-elements.service';
import { v4 as uuid } from 'uuid';
import { MatDialog } from '@angular/material/dialog';
import { DialogComponent } from 'src/app/components/windows/dialog.component';
import { FeelixioValidationService } from 'src/app/services/feelixio-validation.service';
import { FeelixioRenderService } from 'src/app/services/feelixio-render.service';
import { CloneService } from 'src/app/services/clone.service';

@Component({
    selector: 'app-feelixio',
    template: `<div id="feelixio-field-inset"></div>`,
    styleUrls: ['./feelixio.component.css'],
})
export class FeelixioComponent implements OnInit, AfterViewInit {

  public feelixioFile: FeelixioFile;
  public config: FeelixioConfig;


  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              private feelixioDrawService: FeelixioDrawService, private feelixioFileService: FeelixioFileService,
              private feelixioDrawElementService: FeelixioDrawElementsService, private validationService: FeelixioValidationService,
              private feelixioRenderService: FeelixioRenderService, public dialog: MatDialog, private cloneService: CloneService) {

    this.config = this.feelixioDrawService.config;

    this.feelixioDrawService.drawFile.subscribe(res => {
      this.drawFileData();
    });

    this.feelixioDrawElementService.showMsg.subscribe(res => {
      this.showMessage(res.msg, res.type);
    });

    this.feelixioDrawElementService.saveFile.subscribe(res => {
      this.saveFileData(res);
    });

    this.feelixioDrawElementService.updateOutputParameters.subscribe(res => {
      this.updateParameters(res);
    });

    this.electronService.ipcRenderer.on('updateFeelixio', (event: Event, data: any) => {
      this.feelixioFileService.newFile();
    });

    this.electronService.ipcRenderer.on('updateStatus', (event: Event, data: any) => {
      if (data.microcontroller && data.connected !== undefined && !data.connected) {
        this.feelixioRenderService.clearIntervalDataSend();
      }
    });

    this.electronService.ipcRenderer.on('customVarData', (event: Event, data: any) => {
      if (this.feelixioFile.config.running) {
        const customVariables = this.feelixioFile.components.filter(c => c.type === 'custom' && c.port &&
          c.port.serialPort.path === data.port && c.parameters.output[0].id === data.variableIndex);

        for (const variable of customVariables) {
          if (variable.parameters.output[0].defaultVal && variable.parameters.output[0].defaultVal.category) {
            let newValue: any;
            if (variable.parameters.output[0].defaultVal.category.val === 'int') {
              newValue = parseInt(data.value, 10);
            } else if (variable.parameters.output[0].defaultVal.category.val === 'float') {
              newValue = parseFloat(data.value);
            } else if (variable.parameters.output[0].defaultVal.category.val === 'boolean') {
              newValue = data.value === '1' ? 'true' : 'false';
            }
            if (newValue && newValue !== variable.parameters.output[0].defaultVal.type.val) {
              variable.parameters.output[0].defaultVal.type.val = newValue;
              const outputLinks = this.feelixioFile.links.filter(l => l.output.component.id === variable.id);
              this.updateParameters(outputLinks);
            }
          }
        }
        this.drawFileData();
      }
    });

  }

  ngOnInit(): void {
    this.feelixioFile = this.feelixioFileService.getActiveFile();
    this.setFilesInServices(this.feelixioFile);
    this.feelixioDrawElementService.setRenderedFalse();
    this.feelixioDrawService.createPlane();
    this.drawFileData();

    this.feelixioFileService.feelixioFileObservable.subscribe(feelixioFiles => {
      const newFile = feelixioFiles.filter(f => f.isActive)[0];
      this.setFilesInServices(newFile);

      if (newFile._id !== this.feelixioFile._id) {
        this.feelixioFile = newFile;
        this.feelixioDrawElementService.setRenderedFalse();
        this.feelixioDrawService.createPlane();
      } else {
        this.feelixioFile = newFile;
      }
      this.drawFileData();
    });
  }



  ngAfterViewInit(): void {
    this.setEventHandlers();
  }


  setFilesInServices(file: FeelixioFile) {
    this.feelixioDrawElementService.feelixioFile = file;
    this.feelixioDrawService.feelixioFile = file;
    this.validationService.feelixioFile = file;
    this.feelixioRenderService.feelixioFile = file;
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    const key = e.key;
    if (key === 'Delete' || key === 'Backspace') {
      if (!this.feelixioDrawService.config.activeInput) {
        this.feelixioDrawElementService.deleteActiveComponent();
      }
    }
  }


  @HostListener('window:resize', ['$event'])
  onResize(event: { target: { innerWidth: number; innerHeight: number; }; }) {
    this.feelixioDrawService.config.svgDx = event.target.innerWidth - 300;
    this.feelixioDrawService.config.svgDy = event.target.innerHeight - this.feelixioDrawService.config.margin.top;
    const oldSize = { x: this.config.chartDx, y: this.config.chartDy };

    this.config.chartDx = this.config.svgDx - this.config.margin.right;
    this.config.chartDy = this.config.svgDy - this.config.margin.bottom;

    const resizeDiff = { x: this.config.chartDx - oldSize.x, y: this.config.chartDy - oldSize.y };
    this.feelixioFile.config.field.offsetX += (resizeDiff.x / 2);
    this.feelixioFile.config.field.offsetY -= (resizeDiff.y / 2);

    this.feelixioDrawService.createPlane();
    this.drawFileData();
  }

  setEventHandlers() {
    this.document.querySelector('#feelixio-field-inset').addEventListener('dragover', (event: any) => {
      event.preventDefault();
      if (!this.feelixioFile.config.running && this.config.tmpEffect !== null && event.pageX > 300) {
        const height = this.getTmpObjectheight();

        this.config.tmpEffect.coords = {
          x: this.feelixioFile.config.scale.scaleX.invert(event.pageX),
          y: this.feelixioFile.config.scale.scaleY.invert(event.pageY + (height / 2)) };
        this.feelixioDrawElementService.drawEffect(this.config.tmpEffect);
      }
    });

    this.document.querySelector('#feelixio-field-inset').addEventListener('dragleave', (event: any) => {
      event.preventDefault();
      if (!this.feelixioFile.config.running && this.config.tmpEffect !== null && event.pageX <= 300) {
        this.feelixioDrawElementService.deleteEffect(this.config.tmpEffect.id);
      }
    });

    this.document.querySelector('#feelixio-field-inset').addEventListener('drop', (event: any) => {
      event.preventDefault();
      if (!this.feelixioFile.config.running && this.config.tmpEffect !== null) {
        let newObject: any;
        if (event.pageX > 300) {
          const height = this.getTmpObjectheight();
          const coords = {
            x: this.feelixioFile.config.scale.scaleX.invert(event.pageX),
            y: this.feelixioFile.config.scale.scaleY.invert(event.pageY + (height / 2)) };

          if (this.config.tmpEffect instanceof MotorObject) {
            newObject = new MotorObject(uuid(), this.config.tmpEffect.microcontroller, this.config.tmpEffect.motorID, coords);
            if (this.feelixioFile.hardware.filter(m =>
              m.microcontroller.serialPort.path === this.config.tmpEffect.microcontroller.serialPort.path &&
              m.motorID === this.config.tmpEffect.motorID).length === 0) {
              this.feelixioFile.hardware.push(newObject);
            } else {
              this.feelixioDrawElementService.deleteEffect(this.config.tmpEffect.id);
              this.showMessage('This motor has already been added to the field.', 'message');
            }

          } else if (this.config.tmpEffect instanceof EffectObject) {
            newObject = new EffectObject(uuid(), this.config.tmpEffect.effect, null, coords);
            this.feelixioFile.effects.push(newObject);

          } else if (this.config.tmpEffect instanceof ComponentObject) {
            newObject = this.cloneService.deepClone(this.config.tmpEffect);
            for (const input of newObject.parameters.input) {
              input.id = uuid();
            }
            for (const output of newObject.parameters.output) {
              output.id = newObject.type === 'custom' ?
                this.feelixioFile.components.filter(c => c.type === 'custom').length : uuid();
            }
            newObject.id = uuid();
            newObject.coords = coords;
            this.feelixioFile.components.push(newObject);
          }
          this.feelixioDrawElementService.deleteEffect(this.config.tmpEffect.id);
          this.feelixioFileService.update(this.feelixioFile);
        }
        this.config.tmpEffect = null;
        this.feelixioDrawElementService.updateActiveComponent(newObject);
        this.feelixioDrawService.drawFileData();
      }
    });
  }


  getTmpObjectheight() {
    const parameterLength = this.config.tmpEffect.parameters.input.filter(p => !p.hidden).length >
    this.config.tmpEffect.parameters.output.filter(p => !p.hidden).length ?
    this.config.tmpEffect.parameters.input.filter(p => !p.hidden).length :
    this.config.tmpEffect.parameters.output.filter(p => !p.hidden).length;

    return (parameterLength * 20) + 25;
  }



  drawFileData() {
    this.feelixioDrawElementService.drawFileData();
  }

  saveFileData(file: FeelixioFile) {
    this.feelixioFileService.update(file);
  }

  updateParameters(links: Array<ComponentLink>) {
    this.feelixioRenderService.updateLinkedParameters(links);
  }

  showMessage(msg: string, type: string) {
    const btns = ['ok'];

    // if (file.date.changed) {
    const dialogConfig = this.dialog.open(DialogComponent, {
      width: '380px',
      data: { message: msg, buttons: btns },
      disableClose: true,
      autoFocus: true,
      panelClass: 'custom-modalbox'
    });

    dialogConfig.afterClosed().subscribe(
        data => {
          if (data === 'ok') {
            return false;
          }
        }
    );
  }




}
