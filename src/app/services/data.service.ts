import { Injectable } from '@angular/core';
import { Toolbar } from '../models/data.model';
import { Subject } from 'rxjs';
import { DrawingPlaneConfig } from '../models/drawing-plane-config.model';

@Injectable()
export class DataService {

  toolbar = new Toolbar();
  public dataObservable = new Subject<Toolbar>();
  public config: DrawingPlaneConfig;

  box: { left: number; top: number; width: number; height: number };


  public selection: Array<string> = [];
  public forceStepSelection: Array<string> = [];

  constructor() {
    this.saveToolbar();
  }

  get(): Toolbar {
    return this.toolbar;
  }

  updateReferencePoint(point: any) {
    this.toolbar.referencePoint = point;
    if (this.toolbar.boxSelection) {
      if (this.box) {
        this.calculateInputBoxes(this.box);
      }
    }
    this.saveToolbar();
  }

  updatePoints(x: number, y: number, w: number, h: number) {
    if (x !== null) { this.toolbar.points.x = Math.round(x * 100) / 100; } else { this.toolbar.points.x = null; }
    if (y !== null) { this.toolbar.points.y = Math.round(y * 100) / 100; } else { this.toolbar.points.y = null; }
    if (w !== null) { this.toolbar.points.w = Math.round(w * 100) / 100; } else { this.toolbar.points.w = null; }
    if (h !== null) { this.toolbar.points.h = Math.round(h * 100) / 100; } else { this.toolbar.points.h = null; }
    if (w === null && h === null) {
      this.toolbar.boxSelection = false;
    } else {
      this.toolbar.boxSelection = true;
    }
    this.saveToolbar();
  }

  setBoxSelection(state: boolean) {
    this.toolbar.boxSelection = state;
  }
  activeBoxSelection(): boolean {
    return this.toolbar.boxSelection;
  }

  setPreserveAspectRatio(bind: boolean) {
    this.toolbar.linked = bind;
    this.saveToolbar();
  }

  getPreserveAspectRatio(): boolean {
    return this.toolbar.linked;
  }

  reset() {
    this.toolbar = new Toolbar();
    this.saveToolbar();
  }

  activeSelection(): Array<string> {
    return this.selection;
  }

  isSelected(id: string): any {
    if (this.selection.filter(s => s === id).length > 0) {
      return true;
    } else {
      return false;
    }
  }

  saveToolbar() {
    this.dataObservable.next(this.toolbar);
  }

  selectElement(id: string, x: number, y: number, w: number, h: number) {
    this.selection = [ id ];
    this.updatePoints(x, y, w, h);
    this.saveToolbar();
  }

  addSelectedElement(id: string) {
    if (this.selection.indexOf(id) < 0) {
      this.selection.push(id);
    }
    if (this.selection.length > 1) {
      this.updatePoints(null, null, null, null);
    }
    this.saveToolbar();
  }

  addSelectedElements(elements: Array<string>) {
    if (elements.length > 0) {
      if (this.selection.length > 0) {
        this.selection = this.selection.concat(elements);
      } else {
        this.selection = elements;
      }
      if (this.selection.length > 1) {
        this.updatePoints(null, null, null, null);
      }
      this.saveToolbar();
    }
  }

  addSelectedForceStep(id: string, shift = false) {
    if (!shift) { this.forceStepSelection = []; }
    if (this.forceStepSelection.indexOf(id) < 0) {
      this.forceStepSelection.push(id);
    }
    this.saveToolbar();
  }

  deselectAll() {
    this.selection = [];
    this.toolbar.points.x = null;
    this.toolbar.points.y = null;
    this.toolbar.points.w = null;
    this.toolbar.points.h = null;
    this.toolbar.boxSelection = false;
    this.forceStepSelection = [];
    this.saveToolbar();
  }



  calculateInputBoxes(box: { left: number; top: number; width: number; height: number }) {

    this.box = box;

    this.toolbar.points.w = box.width;
    this.toolbar.points.h = box.height;

    if (this.toolbar.referencePoint.name === 'center') {
      this.toolbar.points.x = box.left + (box.width / 2);
      if (box.top !== null) { this.toolbar.points.y = box.top - (box.height / 2); }

    } else if (this.toolbar.referencePoint.id >= 0 && this.toolbar.referencePoint.id <= 2) {
      if (box.top !== null) { this.toolbar.points.y = box.top; }

      if (this.toolbar.referencePoint.name === 'n') {
        this.toolbar.points.x = box.left + (box.width / 2);
      } else if (this.toolbar.referencePoint.name === 'nw') {
        this.toolbar.points.x = box.left;
      } else if (this.toolbar.referencePoint.name === 'ne') {
        this.toolbar.points.x = box.left + box.width;
      }

    } else if (this.toolbar.referencePoint.name === 'e') {
      this.toolbar.points.x = box.left + box.width;
      if (box.top !== null) { this.toolbar.points.y = box.top - (box.height / 2); }

    } else if (this.toolbar.referencePoint.name === 'w') {
      this.toolbar.points.x = box.left;
      if (box.top !== null) {  this.toolbar.points.y = box.top - (box.height / 2); }

    } else if (this.toolbar.referencePoint.id >= 6 && this.toolbar.referencePoint.id <= 8) {
      if (box.top !== null) { this.toolbar.points.y = box.top - box.height; }

      if (this.toolbar.referencePoint.name === 's') {
        this.toolbar.points.x = box.left + box.width / 2;
      } else if (this.toolbar.referencePoint.name === 'sw') {
        this.toolbar.points.x = box.left;
      } else if (this.toolbar.referencePoint.name === 'se') {
        this.toolbar.points.x = box.left + box.width;
      }

      if (box.top === null) { this.toolbar.points.y = null; }
    }
    this.updatePoints(this.toolbar.points.x, this.toolbar.points.y, this.toolbar.points.w, this.toolbar.points.h);
  }

}
