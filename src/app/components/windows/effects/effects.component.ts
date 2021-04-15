import { Component, OnInit, Inject, AfterViewInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { VariableService } from '../../../services/variable.service';
import { EffectLibraryService } from 'src/app/services/effect-library.service';
import { EffectVisualizationService } from 'src/app/services/effect-visualization.service';
import { DrawingService } from 'src/app/services/drawing.service';
import { CollectionService } from 'src/app/services/collection.service';

@Component({
    selector: 'app-effects',
    templateUrl: './effects.component.html',
    styleUrls: ['./effects.component.css'],
})
export class EffectsComponent implements OnInit, AfterViewInit {
  activeTab = 0;

  activeEffectDetails = null;
  advancedVisible = true;
  detailsVisible = true;
  dynamicVisible = false;
  repeatVisible = false;
  qualityVisible = false;

  mirror = false;

  inLibrary = false;

  standardEffects = this.variableService.getEffects();

  tabs = [ { id: 0, name: 'Effects', selected: true, disabled: false },
           { id: 1, name: 'Library', selected: false, disabled: false  },
           { id: 2, name: 'Details', selected: false, disabled: false  }  ];

  buttons = [ { name: 'add', icon: '../../src/assets/icons/buttons/add.svg' },
              { name: 'remove', icon: '../../src/assets/icons/buttons/bin.svg' }];

  directionOptions = [
    { name: 'any', val: null },
    { name: 'clockwise', val: 'cw' },
    { name: 'counterclockwise',  val: 'ccw' }
  ];

  DVs = [
    { name: 'position', val: null },
    { name: 'force intensity', val: null },
    { name: 'force direction',  val: null },
    { name: 'scale', val: null },
  ];

  IVs = [
    { name: 'time', val: null },
    { name: 'speed', val: null },
    { name: 'relative position',  val: null },
  ];

  qualityOptions = [
    { level: 0, name: 'low', division: 8 },
    { level: 1, name: 'normal', division: 4 },
    { level: 2, name: 'high', division: 2 },
    { level: 3, name: 'maximum', division: 1 }
  ];

  repeatOptions = ['position', 'time'];

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService,
              private variableService: VariableService, public effectLibraryService: EffectLibraryService,
              private effectVisualizationService: EffectVisualizationService, public drawingService: DrawingService,
              private collectionService: CollectionService) {

  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');

    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('getEffects');
    }
  }

  ngAfterViewInit(): void {
    this.drawScrollbar();
    this.drawFileEffects();
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('getActiveTab');
    }
  }

  public dragstart(item: any) {
    this.electronService.ipcRenderer.send('ondragstart', item);
    this.document.querySelector('#overlay-' + item.id).classList.add('dragging');
  }

  public dragstartLib(item: any) {
    this.electronService.ipcRenderer.send('ondragstartLib', item);
    this.document.querySelector('#overlayEffect-' + item.id).classList.add('dragging');
  }

  public dragend(item: any) {
    this.document.querySelector('#overlay-' + item.id).classList.remove('dragging');
  }

  public dragendLib(item: any) {
    this.document.querySelector('#overlayEffect-' + item.id).classList.remove('dragging');
  }

  drawScrollbar() {
    const inner = parseInt(this.document.getElementById('inner').style.height, 10);
    const outer = parseInt(this.document.getElementById('outer').style.height, 10);

    if (inner + 5 > outer) {
      const ratio = (outer / (inner + 5));
      this.document.getElementById('handle').style.height = (ratio * outer) + 'px';
    }
  }


  selectTab(id: number) {
    for (const tab of this.tabs) {
      if (tab.id !== id) {
        tab.selected = false;
      } else {
        this.activeTab = id;
        tab.selected = true;
      }
    }
    if (this.activeTab === 0) {
      this.drawFileEffects();
    } else if (this.activeTab === 1) {
      this.drawLibraryEffects();
    }
  }


  drawEffects(effects: any) {
    for (const item of effects) {
      const div = this.document.getElementById('effectSVG-' + item.id);
      if (div) {
        this.effectVisualizationService.drawEffect(item, 'position');
      }
    }
  }

  drawLibraryEffects() {
    this.effectLibraryService.getEffectsFromLocalStorage();
    setTimeout(() => { this.drawEffects(this.effectLibraryService.effectLibrary); }, 150);
  }

  drawFileEffects() {
    setTimeout(() => { this.drawEffects(this.drawingService.file.effects); }, 150);
  }

  changeQuality(effect: any) {
    const qualityLevel = effect.details.quality.level;
    const quality = this.qualityOptions.filter(q => q.level === qualityLevel)[0];
    effect.details.quality = quality;
  }

  updateVariableValue(effect: any, value: any) {
    effect.details.parameter.value = value;
  }

  updateEffect(effect: any) {
  }

  repeatEffect(effect: any) {
    if (effect.details.repeat.instances > 20) { effect.details.repeat.instances = 20; }
  }

  mirrorEffect(mirror: boolean, effect: any) {
  }

  changeLayerEffect(effect: any) {
  }

  saveToLibrary(effect: any) {
    this.inLibrary = true;
    this.document.getElementById('tab-1').click();
  }

  editEffectItem(effectID: string) {
    // this.drawingService.openEffect(effectID);
  }

  deleteEffectItem(effectID: string) {
    // this.drawingService.deleteEffect(effectID);
  }

  deleteLibraryItem(libEffectID: string) {
    this.effectLibraryService.deleteEffect(libEffectID);
    this.drawLibraryEffects();
  }

  exportLibraryItem(libEffectID: string) {
    const item = this.effectLibraryService.getEffect(libEffectID);
    this.electronService.ipcRenderer.send('export', item);
  }

}
