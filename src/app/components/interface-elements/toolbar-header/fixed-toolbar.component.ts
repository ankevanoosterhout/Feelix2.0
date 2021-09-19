import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { DataService } from 'src/app/services/data.service';
import { Toolbar } from '../../../models/data.model';
import { DrawingService } from 'src/app/services/drawing.service';
import { DOCUMENT } from '@angular/common';
import { BezierService } from 'src/app/services/bezier.service';
import { ElectronService } from 'ngx-electron';
import { EffectLibraryService } from 'src/app/services/effect-library.service';
import { Unit } from 'src/app/models/effect.model';
import { CloneService } from 'src/app/services/clone.service';

@Component({
  selector: 'app-fixed-toolbar',
  template: `
  <div class="fixed-toolbar" id="fixed-toolbar" ondrag="return false">

    <div *ngIf="this.drawingService.file.configuration.horizontalScreenDivision < (100/innerHeight) * (innerHeight - 50)">
      <div class="form-row">
        <ul class="buttons-list">
          <li id="new" (click)="createNewEffect()"><img src="./assets/icons/tools/collections.svg" title="New effect"></li>
          <li id="settings" (click)="openEffectSettings()"><img src="./assets/icons/tools/settings.svg" title="Effect settings"></li>
          <li id="save" (click)="saveEffectToLibrary(this.drawingService.file.activeEffect)"><img src="./assets/icons/buttons/save.svg" title="Save effect to library"></li>
        </ul>
      </div>

      <div class="form-row" *ngIf="this.drawingService.file.activeEffect" title="select effect visualization type">
        <input type="color" id="color-picker" name="color-picker" [(ngModel)]="this.dataService.color" (change)="updateColor()">
        <label class="select color-picker"></label>
        <select class="form-control" id="select" (change)="this.updateEffectType()" [(ngModel)]="this.drawingService.file.activeEffect.type" name="type">
            <option *ngFor="let type of typeOptions" [ngValue]="type">{{ type }}</option>
        </select>
      </div>

      <div class="form-row" *ngIf="this.drawingService.file.activeEffect" title="select units x-axis">
        <label class="select axes">x </label>
        <select class="form-control" id="select" value="{{ this.drawingService.file.activeEffect.grid.xUnit.name }}" (change)="this.drawingService.updateUnitsActiveEffect($event.target.value)"
          name="x-axis">
            <option *ngFor="let type of this.drawingService.config.xAxisOptions" [ngValue]="type">{{ type.name }}</option>
        </select>
      </div>

      <div class="form-row" *ngIf="this.drawingService.file.activeEffect" title="select units y-axis">
        <label class="select axes">y </label>
        <select class="form-control" id="select" [(ngModel)]="this.drawingService.file.activeEffect.grid.yUnit" name="y-axis" [compareWith]="compareUnits">
            <option *ngFor="let type of yAxisOptions" [ngValue]="type">{{ type.name }}</option>
        </select>
      </div>

      <div class="form-row" *ngIf="this.drawingService.file.activeEffect && this.drawingService.file.activeEffect.type !== 'velocity'" title="select type of haptic effect">
        <label class="select"></label>
        <select class="form-control" id="select" [(ngModel)]="this.drawingService.file.activeEffect.rotation"
          (change)="this.drawingService.saveEffect(this.drawingService.file.activeEffect)" name="rotation-type">
            <option *ngFor="let type of rotationOptions" [ngValue]="type">{{ type }}</option>
        </select>
      </div>

      <ul>
        <li id="align-buttons" *ngIf="this.innerWidth > 1280">
          <div>
            <ul class="align" id="distribute">
                <li *ngFor="let item of distribute" (click)="selectItem(item.value);">
                  <img src="{{ item.icon }}" title="align {{ item.value }}"></li>
            </ul>
            <ul class="align" id="align">
                <li *ngFor="let item of align" (click)="selectItem(item.value);">
                  <img src="{{ item.icon }}" title="align {{ item.value }}"></li>
            </ul>
          </div>
        </li>

        <li id="reference-point" class="scaling-options" [ngClass]="{ active: toolbar.boxSelection }" *ngIf="this.innerWidth > 1070">
            <div class="bg-line"></div>
            <div class="row">
                <div *ngFor="let point of referencePoints" class="point"
                  [ngClass]="{ active: toolbar.referencePoint.name === point.name }"
                  (click)="selectReferencePoint(point);"></div>
            </div>
        </li>

        <li id="current-x" class="scaling-options" *ngIf="this.innerWidth > 1070">
          <label class="coordinates-label">x</label>
          <input type="number" id="x-value" name="points-x" [(ngModel)]="toolbar.points.x"
          (click)="focus()" (change)="onChange('x-value')">
          <div class="arrows"><div class="arrow up x" id="upX" name="upX" (click)="transform('x', 1);"></div>
          <div class="arrow down x" id="downX" name="downX" (click)="transform('x', -1);"></div></div>
        </li>

        <li id="current-y" class="scaling-options" *ngIf="this.innerWidth > 1070">
          <label class="coordinates-label">y</label>
          <input type="number" id="y-value" name="points-y" (change)="onChange('y-value')" [(ngModel)]="toolbar.points.y"
          (click)="focus()">
          <div class="arrows"><div class="arrow up y" id="upY" name="upY" (click)="transform('y', 1);"></div>
          <div class="arrow down y" id="downY" name="downY" (click)="transform('y', -1);"></div></div>
        </li>

        <li id="current-w" class="scaling-options" *ngIf="this.innerWidth > 1070">
          <label class="coordinates-label">w</label>
          <input type="number" id="w-value" name="points-w" (change)="onChange('w-value')" [(ngModel)]="toolbar.points.w"
          (click)="focus()">
          <div class="arrows"><div class="arrow up w" id="upW" name="upW" (click)="transform('w', 1);"></div>
          <div class="arrow down w" id="downW" name="downW" (click)="transform('w', -1);"></div></div>
        </li>

        <li id="link" class="scaling-options" *ngIf="this.innerWidth > 1070">
          <div class="aspectRatio active" (click)="toolbar.linked = !toolbar.linked">
            <img *ngIf="toolbar.linked" src="./assets/icons/align/link.svg" title="aspect ratio">
            <img *ngIf="!toolbar.linked" src="./assets/icons/align/unlink.svg" title="aspect ratio">
          </div>
        </li>

        <li id="current-h" class="scaling-options" *ngIf="this.innerWidth > 1070">
          <label class="coordinates-label">h</label>
          <input type="number" id="h-value" name="points-h" (change)="onChange('h-value')" [(ngModel)]="toolbar.points.h"
          (click)="focus()">
          <div class="arrows"><div class="arrow up h" id="upH" name="upH" (click)="transform('h', 1, toolbar.points.h);"></div>
          <div class="arrow down h" id="downH" name="downH" (click)="transform('h', -1, toolbar.points.h);"></div></div>
        </li>
      </ul>
    </div>
    <div class="attach-toolbar" id="toggleDrawPlane"><div class="attach-arrow" (click)="toggleDrawPlane()"></div></div>
  </div>
  `,
  styleUrls: ['./fixed-toolbar.component.css']
})
export class FixedToolbarComponent implements OnInit {

  toolbar = new Toolbar();
  public innerHeight: number;
  public innerWidth: number;

  loop = false;
  rendered = false;
  play = false;
  returnToStart = false;

  type = 'torque';
  xAxis = 'degrees';
  yAxis = 'voltage (%)';
  rotationType = 'dependent';

  transformData: object;
  activeSelection = this.dataService.activeBoxSelection();

  pointsCopy: any;
  enabled = true;

  typeOptions = ['torque','position','velocity'];
  rotationOptions = ['independent', 'dependent'];

  yAxisOptions = [ new Unit('voltage (%)', 100), new Unit('velocity (%)', 100) ];

  referencePoints = [
    { name: 'nw', id: 0 },
    { name: 'n', id: 1 },
    { name: 'ne', id: 2 },
    { name: 'w', id: 3 },
    { name: 'center', id: 4 },
    { name: 'e', id: 5 },
    { name: 'sw', id: 6 },
    { name: 's', id: 7 },
    { name: 'se', id: 8 }
  ];

  align = [
    { id: 0, value: 'top', icon: './assets/icons/align/align-top.svg' },
    { id: 1, value: 'middle', icon: './assets/icons/align/align-middle.svg' },
    { id: 2, value: 'bottom', icon: './assets/icons/align/align-bottom.svg' }
  ];

  distribute = [
    { id: 3, value: 'left', icon: './assets/icons/align/distributed-left.svg' },
    { id: 4, value: 'center', icon: './assets/icons/align/distributed-center.svg' },
    { id: 5, value: 'right', icon: './assets/icons/align/distributed-right.svg' }
  ];

  playButton = {
    id: 'play', icon: '../../src/assets/icons/buttons/play.svg',
    icon2: '../../src/assets/icons/buttons/stop.svg',
    active: false, hidden: !this.rendered
  };

  forwardButton = {
    id: 'forward', icon: '../../src/assets/icons/buttons/forward.svg',
    active: false, hidden: !this.rendered
  };

  backButton = {
    id: 'back', icon: '../../src/assets/icons/buttons/back.svg',
    active: false, hidden: !this.rendered
  };

  return = {
    id: 'return',  alt: 'return to start position before play',
    icon: '../../src/assets/icons/buttons/rotate-to-start.svg',
    active: this.returnToStart, hidden: false };

  loopButton = {
    id: 'loop', icon: '../../src/assets/icons/buttons/refresh.svg',
    active: this.loop, hidden: false };

  editButtons = [
    { id: 'upload', alt: 'upload', icon: '../../src/assets/icons/buttons/upload.svg' },
    { id: 'merge', alt: 'merge keyframes', icon: '../../src/assets/icons/buttons/merge.svg' },
    { id: 'mirror', alt: 'mirror keyframe', icon: '../../src/assets/icons/buttons/mirror.svg' }
  ];

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, public dataService: DataService, private bezierService: BezierService,
              public drawingService: DrawingService, private electronService: ElectronService, public effectLibraryService: EffectLibraryService,
              private cloneService: CloneService) {

    // this.electronService.ipcRenderer.on('updateButtonState', (event: Event, data: any) => {
    //   this.loop = data.loop;
    //   this.rendered = data.rendered;
    //   this.returnToStart = data.returnToStart;
    // });

    this.innerHeight = window.innerHeight;
    this.innerWidth = window.innerWidth;

    this.electronService.ipcRenderer.on('saveEffectToLibrary', (event: Event, lock: boolean) => {
      this.saveEffectToLibrary();
    });

    this.electronService.ipcRenderer.on('exportEffect', (event: Event, lock: boolean) => {
      if (this.drawingService.file.activeEffect) {
        this.exportEffect(this.drawingService.file.activeEffect.id);
      }
    });
  }


  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.innerHeight = window.innerHeight;
    this.innerWidth = window.innerWidth;
  }


  public transform(type: string, diff: number) {
    this.unFocusAll();

    if (this.toolbar.points.w < 1) { this.toolbar.points.w = 1; }
    if (this.toolbar.points.h < 1) { this.toolbar.points.h = 1; }

    const translate = {
        width: 1,
        height: 1,
        horizontal: 0,
        vertical: 0,
        offsetX: 0,
        offsetY: 0
    };

    if (type === 'x') {
      const newValue = Math.round(this.toolbar.points.x + diff);
      translate.horizontal = newValue - this.toolbar.points.x;
      this.toolbar.points.x = newValue;

    } else if (type === 'y') {
      const newValue = Math.round(this.toolbar.points.y + diff);
      translate.vertical = newValue - this.toolbar.points.y;
      this.toolbar.points.y = newValue;

    } else if (type === 'w') {
      const newValue = Math.round(this.toolbar.points.w + diff);
      translate.width = this.getPercentage(this.toolbar.points.w, newValue);
      this.toolbar.points.w = newValue;
      if (this.toolbar.linked && this.toolbar.points.w !== null)  {
        translate.height = translate.width;
      }
    } else if (type === 'h') {
      const newValue = Math.round(this.toolbar.points.h + diff);
      translate.height = this.getPercentage(this.toolbar.points.h, newValue);
      this.toolbar.points.h = newValue;
      if (this.toolbar.linked && this.toolbar.points.w !== null) {
        translate.width = translate.height;
      }
    }

    if (this.dataService.selection.length === 1) {
      this.drawingService.updateGuide(this.toolbar.points, this.dataService.selection);
    }
    this.bezierService.translateElement(translate, this.toolbar.referencePoint);
    this.drawingService.getBoxSizeActivePaths();
  }

  public selectReferencePoint(point: any) {
    this.toolbar.referencePoint = this.referencePoints[point.id];
    this.dataService.updateReferencePoint(this.toolbar.referencePoint);
  }

  public selectItem(value: string) {
    this.drawingService.alignSelectedItems(value);
  }


  public updateEffectType() {
    if (this.drawingService.config.editBounds.yMin < 0 && this.drawingService.file.activeEffect.type === 'position' ) {
      this.drawingService.scaleActiveEffectFromTorqueToPosition(0.5, 100);
    } else if (this.drawingService.config.editBounds.yMin >= 0 && this.drawingService.file.activeEffect.type !== 'position') {
      this.drawingService.scaleActiveEffectFromTorqueToPosition(2, 100);
    }
    this.dataService.color = this.drawingService.file.configuration.colors.filter(c => c.type === this.drawingService.file.activeEffect.type)[0].hash;
    this.drawingService.updateActiveEffect(this.drawingService.file);
    this.drawingService.updateConfigActiveFile(this.drawingService.file.configuration);
    this.electronService.ipcRenderer.send('updateToolbar', { type: this.drawingService.file.activeEffect.type });
  }

  public toggleDrawPlane() {
    this.drawingService.toggleDrawPlane();
  }

  ngOnInit(): void {
    this.dataService.dataObservable.subscribe(data => {
      this.toolbar = data;
    });

    if (this.drawingService.file.activeEffect) {
      this.dataService.color = this.drawingService.file.configuration.colors.filter(c => c.type === this.drawingService.file.activeEffect.type)[0].hash;
    }
  }


  focus() {
    this.drawingService.setInputFieldsActive(true);
    this.pointsCopy = this.cloneService.deepClone(this.toolbar.points);
  }


  onChange(id: string) {
    this.unFocusAll();

    const translate = {
      width: 1,
      height: 1,
      horizontal: 0,
      vertical: 0,
      offsetX: 0,
      offsetY: 0
    };
    const original = this.pointsCopy;
    if (id === 'x-value') {
      translate.horizontal = this.toolbar.points.x - original.x;
    } else if (id === 'y-value') {
      translate.vertical = this.toolbar.points.y - original.y;
    } else if (id === 'w-value') {
      translate.width = this.getPercentage(original.w, this.toolbar.points.w);
      if (this.toolbar.linked && this.toolbar.points.w !== null)  {
        translate.height = translate.width;
      }

    } else if (id === 'h-value') {
      translate.height = this.getPercentage(original.h, this.toolbar.points.h);
      if (this.toolbar.linked && this.toolbar.points.w !== null) {
        translate.width = translate.height;
      }
    }
    if (this.dataService.selection.length === 1) {
      this.drawingService.updateGuide(this.toolbar.points, this.dataService.selection);
    }
    this.bezierService.translateElement(translate, this.toolbar.referencePoint);
    this.drawingService.getBoxSizeActivePaths();
  }

  unFocusAll() {
    this.drawingService.setInputFieldsActive(false);
    this.document.getElementById('x-value').blur();
    this.document.getElementById('y-value').blur();
    this.document.getElementById('w-value').blur();
    this.document.getElementById('h-value').blur();
  }

  updateColor() {
    this.drawingService.file.configuration.colors.filter(c => c.type === this.drawingService.file.activeEffect.type)[0].hash = this.dataService.color;
    // this.drawingService.saveFile(this.drawingService.file);
    this.drawingService.updateConfigActiveFile(this.drawingService.file.configuration);
  }

  getPercentage(oldVal: number, newVal: number) {
    return newVal / oldVal;
  }

  createNewEffect() {
    // this.document.getElementById('field-inset').style.cursor = 'wait';
    // this.drawingService.saveEffect();
    this.electronService.ipcRenderer.send('effectSettings', 'effect-settings');
  }

  openEffectSettings() {
    // this.document.getElementById('field-inset').style.cursor = 'wait';
    // this.drawingService.saveEffect();
    this.electronService.ipcRenderer.send('effectSettings', 'effect-update-settings');
  }

  saveEffectToLibrary() {
    this.drawingService.saveEffect();
    setTimeout(() => this.effectLibraryService.addEffect(this.drawingService.file.activeEffect), 200);
  }

  exportEffect(effectID: string) {
    const item = this.effectLibraryService.getEffect(effectID);
    this.electronService.ipcRenderer.send('export', item);
  }

  compareUnits(unit1: Unit, unit2: Unit) {
    return unit1 && unit2 ? unit1.name === unit2.name : unit1 === unit2;
  }


}
