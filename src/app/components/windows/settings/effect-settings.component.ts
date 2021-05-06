import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { FileService } from 'src/app/services/file.service';
import { v4 as uuid } from 'uuid';
import { Router } from '@angular/router';
import { Effect, Unit } from 'src/app/models/effect.model';


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
                  <select class="form-control" id="select-type" [(ngModel)]="effect.type" name="type">
                      <option *ngFor="let type of controlTypes" [ngValue]="type">{{ type }}</option>
                  </select>
                </div>


                <div class="form-row">
                    <label class="select units">Units</label>
                    <select class="form-control" id="select-units"
                        (change)="updateRotationRange()" [(ngModel)]="effect.grid.xUnit" name="xUnit" [compareWith]="compareUnits">
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

  prevUnits = { name: 'degrees', PR: 360 };
  initialUnits = { name: 'degrees', PR: 360 };


  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              public fileService: FileService, private router: Router) {

    if (this.router.url === '/effect-update-settings') {
      this.updateMode = true;
      this.buttonText = 'Update';
    }
  }

  compareUnits(unit1: Unit, unit2: Unit) {
    return unit1 && unit2 ? unit1.name === unit2.name : unit1 === unit2;
  }


  updateRotationRange() {
    this.effect.range.end *= (this.effect.grid.xUnit.PR / this.prevUnits.PR);
    this.effect.range.start *= (this.effect.grid.xUnit.PR / this.prevUnits.PR);
    // this.effect.grid.translation = units.PR;
    this.prevUnits = this.effect.grid.xUnit;
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
      if (file.activeEffect) {
        this.effect = file.activeEffect;
        this.initialUnits = this.effect.grid.xUnit;
        this.prevUnits = this.effect.grid.xUnit;
      }
      console.log(this.effect);

    } else {
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send('getNumberOfNewFiles');
      }
      this.effect = new Effect(uuid());
      this.effect.name = 'effect-' + (file.effects.length + 1);
    }
  }
}

