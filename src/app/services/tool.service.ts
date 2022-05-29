import { Injectable } from '@angular/core';
import { Cursor } from '../models/tool.model';

@Injectable()
export class ToolService {

  toolSet = [
    new Cursor(0, 'Brush Tool', 'brush', false, './assets/icons/tools/brush-icon.svg', 'b',
              'url(./assets/icons/tools/brush.png) 1 20, none', []),
    new Cursor(1, 'Pen Tool', 'pen', false, './assets/icons/tools/pen-icon.svg', 'p', 'url(./assets/icons/tools/cursor-pen.png), none',
              [
                { name: 'add', cursor: 'url(./assets/icons/tools/cursor-pen-add.png), none' },
                { name: 'close', cursor: 'url(./assets/icons/tools/cursor-pen-close.png), none' },
                { name: 'remove', cursor: 'url(./assets/icons/tools/cursor-pen-remove.png), none' },
                { name: 'start', cursor: 'url(./assets/icons/tools/cursor-pen-start.png), none' },
                { name: 'remove-cp', cursor: 'url(./assets/icons/tools/cursor-pen-remove-cp.png), none' }
              ]),
    new Cursor(2, 'Anchor Tool', 'anchor', false, './assets/icons/tools/anchor.svg', 'q',
              'url(./assets/icons/tools/cursor-cp-control.png), none', []),
    new Cursor(3, 'Selection Tool', 'sel', false, './assets/icons/tools/arrow.svg', 'v', 'url(./assets/icons/tools/cursor-arrow.png), none', []),
    new Cursor(4, 'Direct Selection Tool', 'dsel', false, './assets/icons/tools/arrow-o.svg', 'a', 'default', []),
    new Cursor(5, 'Force Position Tool', 'thick', false, './assets/icons/tools/line-thickness-icon.svg', 'f',
              'url(./assets/icons/tools/cursor-line-thickness.png), none',
              [
                { name: 'left', cursor: 'url(./assets/icons/tools/cursor-line-thickness-left.png), none' },
                { name: 'right', cursor: 'url(./assets/icons/tools/cursor-line-thickness-right.png), none' }
              ]),
    new Cursor(6, 'Scissors Tool', 'scis', false, './assets/icons/tools/scissors.svg', 's',
              'url(./assets/icons/tools/cursor-scissors.png), none', []),
    new Cursor(7, 'Zoom Tool', 'zoom', false, './assets/icons/tools/zoom.svg', 'i', 'url(./assets/icons/tools/cursor-zoom.png), none',
              [
                { name: 'min', cursor: 'url(./assets/icons/tools/cursor-zoom-min.png), none' }
              ])
  ];

  constructor() {}

  getTools() {
    return this.toolSet;
  }

  disable(slug: string) {
    this.toolSet.filter(t => t.slug === slug)[0].disabled = true;
  }

  enable(slug: string) {
    this.toolSet.filter(t => t.slug === slug)[0].disabled = false;
  }

  getToolByAcc(key: string) {
    return this.toolSet.filter(f => f.acceleration === key)[0];
  }

  getToolById(id: number) {
    return this.toolSet[id];
  }




}
