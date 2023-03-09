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
import { EffectType, EffectTypeLabelMapping } from 'src/app/models/configuration.model';

@Component({
  selector: 'app-fixed-toolbar',
  templateUrl: './fixed-toolbar.component.html',
  styleUrls: ['./fixed-toolbar.component.css']
})
export class FixedToolbarComponent implements OnInit {

  public EffectTypeLabelMapping = EffectTypeLabelMapping;

  toolbar = new Toolbar();
  public innerHeight: number;
  public innerWidth: number;

  type = EffectType.torque;
  xAxis = 'deg';
  yAxis = '%';
  rotationType = 'dependent';

  transformData: object;
  activeSelection = this.dataService.activeBoxSelection();

  pointsCopy: any;
  enabled = true;

  // typeOptions = [EffectType.torque, EffectType.position, EffectType.velocity, EffectType.pneumatic];
  public typeOptions = Object.values(EffectType).filter(value => typeof value === 'number');
  rotationOptions = ['independent', 'dependent'];

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


  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, public dataService: DataService, private bezierService: BezierService,
              public drawingService: DrawingService, private electronService: ElectronService, public effectLibraryService: EffectLibraryService,
              private cloneService: CloneService) {

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
    this.drawingService.updateEffectType();
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
      this.dataService.color = this.drawingService.file.configuration.colors.filter(c => c.type === this.drawingService.file.activeEffect.type)[0].hash[0];
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
    this.drawingService.file.configuration.colors.filter(c => c.type === this.drawingService.file.activeEffect.type)[0].hash[0] = this.dataService.color;
    // this.drawingService.saveFile(this.drawingService.file);
    this.drawingService.updateConfigActiveFile(this.drawingService.file.configuration);
  }

  updateColor2() {
    this.drawingService.file.configuration.colors.filter(c => c.type === EffectType.position)[0].hash[1] = this.dataService.color2;
    // this.drawingService.saveFile(this.drawingService.file);
    this.drawingService.updateConfigActiveFile(this.drawingService.file.configuration);
  }

  getPercentage(oldVal: number, newVal: number) {
    return newVal / oldVal;
  }

  createNewEffect() {
    this.document.body.style.cursor = 'wait';
    // this.drawingService.saveEffect();
    this.electronService.ipcRenderer.send('effectSettings', 'effect-settings');
  }

  openEffectSettings() {
    this.document.body.style.cursor = 'wait';
    // this.drawingService.saveEffect();
    this.electronService.ipcRenderer.send('effectSettings', 'effect-update-settings');
  }

  saveActiveEffect() {
    this.drawingService.saveEffect();
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

  updateRange() {
    if (this.drawingService.file.activeEffect.range_y.end < this.drawingService.file.activeEffect.range_y.start) {
      this.drawingService.file.activeEffect.range_y.end = this.drawingService.file.activeEffect.range_y.start + 1;
    }
    this.drawingService.updateActiveEffect(this.drawingService.file);
    this.drawingService.redraw();
  }

}
