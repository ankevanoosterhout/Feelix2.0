import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { File } from 'src/app/models/file.model';
import { v4 as uuid } from 'uuid';
import { Router } from '@angular/router';
import { DrawingService } from 'src/app/services/drawing.service';
import { Effect } from 'src/app/models/effect.model';


@Component({
  selector: 'app-effect-settings',
  template: `
  <div class="window-title-bar" *ngIf="!this.updateMode">New Effect</div>
  <div class="window-title-bar" *ngIf="this.updateMode">Update Effect</div>
  <div class="window-content">
      <form>
          <div class="inputfield">
              <div class="form-row">
                  <label>Name</label>
                  <input type="text" id="effectname" [(ngModel)]="this.effect.name" name="effectname">
              </div>

              <div class="inputfield-inset">
                <div class="inputfield-inset-title">Drawing canvas</div>

                <div class="form-row">
                  <label class="select units">Control Type</label>
                  <select class="form-control" id="select-units"
                      required (change)="updateRotationRange(prevUnits)" [(ngModel)]="effect.type" name="type">
                      <option *ngFor="let type of controlTypes" [ngValue]="type">{{ type }}</option>
                  </select>
                </div>


                <div class="form-row">
                    <label class="select units">Units</label>
                    <select class="form-control" id="select-units"
                        required (change)="updateRotationRange(prevUnits)" [(ngModel)]="effect.xUnit" name="xUnit">
                        <option *ngFor="let unit of unitOptions" [ngValue]="unit">{{ unit.name }}</option>
                    </select>
                </div>

                <div class="form-row">
                    <label>Range</label>
                    <input type="number" name="range-start" [(ngModel)]="effect.range.start">
                    <input type="number" name="range-end" [(ngModel)]="effect.range.end">
                </div>
              </div>

          </div>
          <div class="form-row buttons settings">
              <button (click)="close()">Cancel</button>
              <button id="submit" autofocus (click)="submit()" *ngIf="this.updateMode">Update</button>
              <button id="submit" autofocus (click)="submit()" *ngIf="!this.updateMode">Create</button>
          </div>
      </form>
    </div>
  `,
  styles: [`
    .window-content label.select:after {
      margin-top: 20px;
    }

    .window-content input {
      margin-right: 5px;
    }
  `]
})

export class EffectSettingsComponent implements OnInit {
  effect: Effect;
  updateMode = false;
  mode = 'default';
  effectCount = 2;
  buttonText = 'Create';

  unitOptionsLinear = [
    { name: 'MM', PR: 50 },
    { name: 'CM', PR: 5 },
    { name: 'radians', PR: (2 * Math.PI) }
  ];

  unitOptionsRadial = [
    { name: 'degrees', PR: 360 },
    { name: 'radians', PR: (2 * Math.PI) }
  ];

  unitOptions = [
    { name: 'mm', PR: 50 },
    { name: 'cm', PR: 5 },
    { name: 'degrees', PR: 360 },
    { name: 'radians', PR: (2 * Math.PI) }
  ];

  controlTypes = ['position', 'velocity', 'torque' ];

  prevUnits = 'degrees';
  initialUnits = { name: 'degrees', PR: 360 };


  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              public fileService: FileService, public drawingService: DrawingService,
              private router: Router) {

    if (this.router.url === '/effect-update-settings') {
      this.updateMode = true;
      this.buttonText = 'Update';
    }
  }

  updateRotationRange(units: any) {
    const _PR = this.unitOptions.filter(u => u.name === units)[0].PR;
    this.effect.range.end = (this.effect.range.end / this.effect.grid.units.PR) * _PR;
    this.effect.range.start = (this.effect.range.start / this.effect.grid.units.PR) * _PR;
    this.effect.grid.translation = _PR;
    this.effect.grid.units = { name: units, PR: _PR };
  }

  public submit() {

    if (!this.updateMode) {
      this.fileService.addEffect(this.effect);
    } else {
      this.fileService.updateEffect(this.effect);
    }
    this.close();
  }


  public close() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
    const file = this.fileService.getAllFileData();
    if (this.updateMode) {
      this.effect = file.activeEffect;
      console.log(this.effect);
      this.initialUnits = this.effect.grid.units;
      this.prevUnits = this.effect.grid.units.name;
    } else {
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send('getNumberOfNewFiles');
      }
      this.effect = new Effect(uuid());
      this.effect.name = 'effect-' + (file.effects.length + 1);
    }
  }
}

