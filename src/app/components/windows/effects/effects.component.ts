import { Component, OnInit, Inject, AfterViewInit } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
import { EffectLibraryService } from 'src/app/services/effect-library.service';
import { EffectVisualizationService } from 'src/app/services/effect-visualization.service';
import { DrawingService } from 'src/app/services/drawing.service';
import { FileService } from 'src/app/services/file.service';
import { Effect, RepeatInstance } from 'src/app/models/effect.model';
import { v4 as uuid } from 'uuid';
import { CloneService } from 'src/app/services/clone.service';

@Component({
    selector: 'app-effects',
    templateUrl: './effects.component.html',
    styleUrls: ['./effects.component.css'],
})
export class EffectsComponent implements OnInit, AfterViewInit {
  activeTab = 0;

  activeEffectDetails = null;
  transformVisible = true;
  positionVisible = true;
  detailsVisible = true;
  repeatVisible = false;
  reflectVisible = false;
  qualityVisible = false;

  effect: Effect = null;

  inLibrary = false;

  tabs = [ { id: 0, name: 'Effects', selected: true, disabled: false },
           { id: 1, name: 'Library', selected: false, disabled: false  },
           { id: 2, name: 'Details', selected: false, disabled: false  }  ];

  buttons = [ { name: 'add', icon: '../../src/assets/icons/buttons/add.svg' },
              { name: 'remove', icon: '../../src/assets/icons/buttons/bin.svg' }];

  // directionOptions = [
  //   { name: 'clockwise', val: 'cw' },
  //   { name: 'counterclockwise',  val: 'ccw' }
  // ];

  displayOptions = [
    { name: 'list', src: '../../src/assets/icons/buttons/list.svg', slug: 'list', selected: false },
    { name: 'small thumbnails', src: '../../src/assets/icons/buttons/small-thumbnail.svg', slug: 'small-thumbnails', selected: false },
    { name: 'large thumbnails', src: '../../src/assets/icons/buttons/large-thumbnail.svg', slug: 'large-thumbnails', selected: true }
  ];

  sortOptions = [
    { name: 'name', slug: 'name' },
    { name: 'type', slug: 'type' },
    { name: 'date modified', slug: 'date-modified' },
    { name: 'date created', slug: 'date-created' }
  ]

  // DVs = [
  //   { name: 'position', val: null },
  //   { name: 'force intensity', val: null },
  //   { name: 'force direction',  val: null },
  //   { name: 'scale', val: null },
  // ];

  // IVs = [
  //   { name: 'time', val: null },
  //   { name: 'speed', val: null },
  //   { name: 'relative position',  val: null },
  // ];

  qualityOptions = [
    { level: 0, name: 'low', division: 8 },
    { level: 1, name: 'normal', division: 4 },
    { level: 2, name: 'high', division: 2 },
    { level: 3, name: 'maximum', division: 1 }
  ];

  // repeatOptions = ['position', 'time'];

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService, public effectLibraryService: EffectLibraryService,
              private effectVisualizationService: EffectVisualizationService, public drawingService: DrawingService,
              private fileService: FileService, private cloneService: CloneService) {


    this.drawingService.drawEffectsInLibrary.subscribe(res => {
      if (this.activeTab === 0) {
        this.drawFileEffects();
      } else if (this.activeTab === 1) {
        this.drawLibraryEffects();
      } else if (this.activeTab === 2) {
        if (this.drawingService.file.activeCollectionEffect) {
          this.effect = this.drawingService.file.effects.filter(e => e.id === this.drawingService.file.activeCollectionEffect.effectID)[0];
        }
      }
    });

    this.effectLibraryService.showLibraryTab.subscribe(res => {
      this.selectTab(1);
    });

  }

  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');

    // if (this.electronService.isElectronApp) {
    //   this.electronService.ipcRenderer.send('getEffects');
    // }
  }

  ngAfterViewInit(): void {
    this.drawScrollbar();
    this.drawFileEffects();
  }

  public dragstart(item: any) {
    this.drawingService.setTmpEffect(item);
    this.document.getElementById('overlayEffect-' + item.id).classList.add('dragging');
  }

  public dragend(item: any) {
    this.document.getElementById('overlayEffect-' + item.id).classList.remove('dragging');
    this.drawingService.config.tmpEffect = null;
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
    } else if (this.activeTab === 2) {
      if (this.drawingService.file.activeCollectionEffect) {
        this.effect = this.drawingService.file.effects.filter(e => e.id === this.drawingService.file.activeCollectionEffect.effectID)[0];
      }
    }
  }


  drawEffects(effects: any) {
    for (const effect of effects) {
      const div = this.document.getElementById('effectSVG-' + effect.id);
      if (div) {
        this.effectVisualizationService.drawEffect(effect, this.drawingService.file.configuration.colors, this.drawingService.file.configuration.libraryViewSettings, 'file');
      }
    }
  }

  drawLibEffects(libEffects: any) {
    for (const libEffect of libEffects) {
      const div = this.document.getElementById('effectSVG-' + libEffect.effect.id);
      if (div) {
        this.effectVisualizationService.drawEffect(libEffect.effect, this.drawingService.file.configuration.colors, this.drawingService.file.configuration.libraryViewSettings, 'library');
      }
    }
  }

  drawLibraryEffects() {
    this.effectLibraryService.getEffectsFromLocalStorage();
    setTimeout(() => { this.drawLibEffects(this.effectLibraryService.effectLibrary); }, 100);
  }

  drawFileEffects() {
    // console.log(this.drawingService.file.effects);
    setTimeout(() => { this.drawEffects(this.drawingService.file.effects); }, 100);
  }

  changeQuality(effect: any) {
    const qualityLevel = effect.details.quality.level;
    const quality = this.qualityOptions.filter(q => q.level === qualityLevel)[0];
    effect.details.quality = quality;
  }

  updateVariableValue(effect: any, value: any) {
    effect.details.parameter.value = value;
  }

  updateCollectionEffect() {
    this.fileService.updateCollectionEffect(
      this.drawingService.file.activeCollection,
      this.drawingService.file.activeCollectionEffect);
  }


  updateLibEffectName(effect: any) {
    let fileEffect = this.effectLibraryService.getEffect(effect.id);
    if (fileEffect) {
      fileEffect.effect.name = effect.name;
      const openTab = this.drawingService.file.configuration.openTabs.filter(t => t.id === effect.id)[0];
      if (openTab) { openTab.name = effect.name; }
    }
    this.sortItemsEffectList();
  }

  updateEffectName(effect: any) {
    let fileEffect = this.drawingService.file.effects.filter(e => e.id === effect.id)[0];
    if (fileEffect) {
      fileEffect.name = effect.name;
      const openTab = this.drawingService.file.configuration.openTabs.filter(t => t.id === effect.id)[0];
      if (openTab) { openTab.name = effect.name; }
    }
  }

  repeatEffect(effect: any) {
    if (effect.details.repeat.instances > 20) { effect.details.repeat.instances = 20; }
  }

  editEffectItem(effectID: string) {
    const fileEffect = this.drawingService.file.effects.filter(e => e.id === effectID)[0];
    this.fileService.openEffect(effectID);
    this.electronService.ipcRenderer.send('updateToolbar', { type: fileEffect.type });
  }

  exportEffectItem(effectID: string) {
    let effect = this.drawingService.file.effects.filter(e => e.id === effectID)[0];
    if (effect) {
      this.electronService.ipcRenderer.send('export', { effect: effect });
    }
  }

  deleteEffectItem(effectID: string) {
    for (const collection of this.drawingService.file.collections) {
      if (collection.effects.filter(e => e.effectID === effectID).length > 0) {
        this.drawingService.showMessageDialog({ msg: 'This effect is currently in use, are you sure you want to delete it?', type: 'verification', action: 'deleteEffect', d: effectID });
        return;
      }
    }
    this.fileService.deleteEffect(effectID);
  }

  exportLibEffectItem(libEffectID: string) {
    const item = this.effectLibraryService.getEffect(libEffectID);
    if (item) {
      this.electronService.ipcRenderer.send('export', { effect: item.effect });
    }
  }

  deleteLibraryItem(libEffectID: string) {
    this.effectLibraryService.deleteEffect(libEffectID);
    this.drawLibraryEffects();
  }

  editLibraryEffectItem(libEffectID: string) {
    const item = this.effectLibraryService.getEffect(libEffectID);

    if (item) {
      const copyItem = this.cloneService.deepClone(item);
      copyItem.effect.name += '-copy';
      copyItem.effect.id = uuid();
      copyItem.effect.date.modified = new Date().getTime();
      this.fileService.addEffect(copyItem.effect);
    }
  }

  compareSlug(unit1: any, unit2: any) {
    return unit1 && unit2 ? unit1.slug === unit2.slug : unit1 === unit2;
  }

  display(view: string) {
    this.drawingService.file.configuration.libraryViewSettings = view;
    this.fileService.updateConfig(this.drawingService.file.configuration);
  }


  updateValue(id: string) {
    let valueStr = (this.document.getElementById(id) as HTMLInputElement).value;
    if (valueStr) {
      let value = parseFloat(valueStr);
      if (id === 'position-x') {
        this.drawingService.file.activeCollectionEffect.position.x = value;
      } else if (id === 'position-y') {
        this.drawingService.file.activeCollectionEffect.position.y = value;
      } else if (id === 'position-width') {
        if (value > 0.0) {
          const newXscale = this.updateScale(this.drawingService.file.activeCollectionEffect.position.width, value, this.drawingService.file.activeCollectionEffect.scale.x);
          this.drawingService.file.activeCollectionEffect.position.width = value;
          this.drawingService.file.activeCollectionEffect.scale.x = newXscale;
        }
      } else if (id === 'position-height') {
        if (value > 0.0) {
          const newYscale = this.updateScale(this.drawingService.file.activeCollectionEffect.position.height, value, this.drawingService.file.activeCollectionEffect.scale.y);
          this.drawingService.file.activeCollectionEffect.position.height = value;
          this.drawingService.file.activeCollectionEffect.scale.y = newYscale;
        }
      } else if (id === 'scale-x') {
        this.updateEffectWidth(value);
      } else if (id === 'scale-y') {
        this.updateEffectHeight(value);

      } else if (id === 'scale') {
        this.updateEffectWidth(value);
        this.updateEffectHeight(value);
      }
      (this.document.getElementById(id) as HTMLInputElement).value = value.toFixed(2).toString();
    }
    this.updateCollectionEffect();
  }

  updateEffectWidth(value: number) {
    if (value > 0) {
      const newWidth = this.updateScale(this.drawingService.file.activeCollectionEffect.scale.x, value, this.drawingService.file.activeCollectionEffect.position.width);
      this.drawingService.file.activeCollectionEffect.position.width = newWidth;
      this.drawingService.file.activeCollectionEffect.scale.x = value;
    }
  }

  updateEffectHeight(value: number) {
    if (value > 0) {
      const newHeight = this.updateScale(this.drawingService.file.activeCollectionEffect.scale.y, value, this.drawingService.file.activeCollectionEffect.position.height);
      this.drawingService.file.activeCollectionEffect.position.height = newHeight;
      this.drawingService.file.activeCollectionEffect.scale.y = value;
    }
  }

  updateScale(old1: number, new1:number, old2:number) {
    return (old2 / old1) * new1;
  }

  updateUniformResize() {
    if (this.drawingService.file.activeCollectionEffect.scale.uniform) {
      if (this.drawingService.file.activeCollectionEffect.scale.x !== this.drawingService.file.activeCollectionEffect.scale.y) {
        this.updateEffectHeight(this.drawingService.file.activeCollectionEffect.scale.x);
      }
    }
    this.updateCollectionEffect();
  }

  showCompleteValue(id = null) {
    if (id === 'position-x') {
      (this.document.getElementById(id) as HTMLInputElement).value = this.drawingService.file.activeCollectionEffect.position.x.toString();
    } else if (id === 'position-y') {
      (this.document.getElementById(id) as HTMLInputElement).value = this.drawingService.file.activeCollectionEffect.position.y.toString();
    } else if (id === 'scale' || id === 'scale-x') {
      (this.document.getElementById(id) as HTMLInputElement).value = this.drawingService.file.activeCollectionEffect.scale.x.toString();
    } else if (id === 'scale-y') {
      (this.document.getElementById(id) as HTMLInputElement).value = this.drawingService.file.activeCollectionEffect.scale.y.toString();
    } else if (id === 'position-width') {
      (this.document.getElementById(id) as HTMLInputElement).value = this.drawingService.file.activeCollectionEffect.position.width.toString();
    } else if (id === 'position-height') {
      (this.document.getElementById(id) as HTMLInputElement).value = this.drawingService.file.activeCollectionEffect.position.height.toString();
    }
    this.drawingService.setInputFieldsActive(true);
  }

  hideCompleteValue(id = null) {
    if (id) {
      let value = parseFloat((this.document.getElementById(id) as HTMLInputElement).value);
      if (value) {
        let decimals = this.countDecimals(value);
        if (decimals > 3) { decimals = 3; }
        if (decimals < 2) { decimals = 2; }
        (this.document.getElementById(id) as HTMLInputElement).value = value.toFixed(decimals).toString();
      }
    }
    this.drawingService.setInputFieldsActive(false);
  }

  updateEffectRepeat() {
    const newN = this.drawingService.file.activeCollectionEffect.repeat.instances;
    const oldN = this.drawingService.file.activeCollectionEffect.repeat.repeatInstances.length + 1;
    if (newN > 0) {
      const difference = newN - oldN;
      if (difference > 0) {
        for (let i = oldN; i < difference + oldN; i++) {
          const position = this.drawingService.file.activeCollectionEffect.position.x + (this.drawingService.file.activeCollectionEffect.position.width * i);
          const newInstance = new RepeatInstance(uuid(), position);
          this.drawingService.file.activeCollectionEffect.repeat.repeatInstances.push(newInstance);
        }
      } else if (difference < 0) {
        for (let b = difference; b < 0; b++) {
          if (this.drawingService.file.activeCollectionEffect.repeat.repeatInstances.length > 0) {
            this.drawingService.file.activeCollectionEffect.repeat.repeatInstances.pop();
          }
        }
      }
    } else {
      this.drawingService.file.activeCollectionEffect.repeat.instances = oldN;
    }
    this.updateCollectionEffect();
  }

  updateRepeatInstanceXValue(id: string) {
    const value = (this.document.getElementById('r-' + id) as HTMLInputElement).value;
    this.drawingService.file.activeCollectionEffect.repeat.repeatInstances.filter(r => r.id === id)[0].x = parseFloat(value);
    this.updateCollectionEffect();
  }

  countDecimals(value: number) {
    if(Math.floor(value) === value) return 0;
    return value.toString().split('.').length > 1 && value.toString().split('.')[1].length || 0;
  }

  updateQuality() {
    if (this.drawingService.file.activeCollectionEffect.quality < 1) {
      this.drawingService.file.activeCollectionEffect.quality = 1;
    } else {
      this.drawingService.file.activeCollectionEffect.quality = Math.round(this.drawingService.file.activeCollectionEffect.quality);
    }
    for (const collEffect of this.drawingService.file.activeCollection.effects) {
      if (collEffect.effectID === this.drawingService.file.activeCollectionEffect.effectID) {
        collEffect.quality = this.drawingService.file.activeCollectionEffect.quality;
      }
    }
    if (this.drawingService.file.activeCollection.effectDataList.length > 0) {
      this.document.getElementById('render-' + this.drawingService.file.activeCollection.id).click();
      this.document.getElementById('render-' + this.drawingService.file.activeCollection.id).click();
    }

    this.fileService.updateCollection(this.drawingService.file.activeCollection);
  }


  sortItemsEffectList() {
    this.fileService.sortEffects(this.drawingService.file.configuration.sortType);
  }

  sortItems(sortType: string) {
    this.effectLibraryService.sortLibraryEffectsBy(sortType, this.drawingService.file.configuration.sortDirection);
    this.sortItemsEffectList();
  }

  toggleSortDirection() {
    this.drawingService.file.configuration.sortDirection = this.drawingService.file.configuration.sortDirection === 'first-last' ? 'last-first' : 'first-last';
    this.sortItems(this.drawingService.file.configuration.sortType);
  }




}
