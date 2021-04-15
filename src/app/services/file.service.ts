import { Injectable } from '@angular/core';
import { File } from '../models/file.model';
import { Effect } from '../models/effect.model';
import { v4 as uuid } from 'uuid';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { FileSaverService } from 'ngx-filesaver';
import { NodeService } from './node.service';
import { Collection } from '../models/collection.model';
import { OpenTab } from '../models/configuration.model';

@Injectable()
export class FileService {

  public static readonly  LOAD_FILE = 'loadFile';
  public static readonly  LOAD_FILE_LOCATION = 'loadFileLocation';
  public static readonly  FILES_LOCATION = 'ngx-webstorage|files';

  public fileObservable = new Subject<File[]>();
  fs: any;

  files = [];

  // tslint:disable-next-line: variable-name
  constructor( private localSt: LocalStorageService, private _FileSaverService: FileSaverService, private nodeService: NodeService) {
    this.fs = (window as any).fs;
    // if loadfile exists, remove it from localstorage (on startup)
    localStorage.removeItem(FileService.LOAD_FILE);
    localStorage.removeItem(FileService.LOAD_FILE_LOCATION);

    // retrive files stored in local storage
    const storedFiles = this.localSt.retrieve('files');
    if (storedFiles) {
      this.files = storedFiles;
      this.setAnyActive();
    }

    // listen for new files made by the user
    /*
    this.localSt.observe('files').subscribe(value => {
      console.log(value);
      this.files = value;
      this.fileObservable.next(this.files);
    });
    */

    // listen for files opened by the user and files changes

    window.addEventListener( 'storage', event => {
      if (event.storageArea === localStorage) {
        if (event.key === FileService.FILES_LOCATION) {
          const files: File[] = JSON.parse(localStorage.getItem(FileService.FILES_LOCATION));
          this.files = files;
          this.fileObservable.next(this.files);
        }

        if (event.key.startsWith(FileService.LOAD_FILE)) {
          const fileLocation: string = JSON.parse(localStorage.getItem(FileService.LOAD_FILE_LOCATION));

          this.parseFile(localStorage.getItem(FileService.LOAD_FILE)).then((file: File) => {
            try {
              file.path = fileLocation;
              this.files.push(file);
              this.setActive(file);
            } catch (error) {
            }
          });

          localStorage.removeItem(FileService.LOAD_FILE);
          localStorage.removeItem(FileService.LOAD_FILE_LOCATION);
        }
      }
    }, false );


  }

  createDefault(name: string) {
    const defaultFile = new File(name, uuid(), true);
    const collection = new Collection(uuid());
    const defaultEffect = new Effect(uuid());
    defaultFile.collections.push(collection);
    defaultFile.effects.push(defaultEffect);
    defaultFile.activeEffect = defaultEffect;
    const effectTab = new OpenTab(defaultEffect.id, defaultEffect.name);
    defaultFile.configuration.openTabs.push(effectTab);
    console.log(defaultFile);
    this.setEffectActive(defaultFile.activeEffect);
    this.add(defaultFile);
  }

  createFileFrom(effectData: any) {
    const newFile = new File(effectData.interface.name, uuid(), true);

    // newFile.grid.units = effectData.units;
    // newFile.mode = effectData.componentType.sub === 'time' ? 'servo' : 'default';
    // newFile.nodes = [ effectData.path ];
    // const effect = effectData;
    // if (newFile.mode === 'default') {
    //   effect.path = effectData.path.id;
    // } else {
    //   newFile.configuration.activeTimeEffect = effect;
    // }
    // newFile.effects.push(effect);
    this.add(newFile);
  }

  addCollection() {
    const selectedFile = this.files.filter(f => f.isActive)[0];
    if (selectedFile) {
      const collection = new Collection(uuid());
      selectedFile.collections.push(collection);
      this.store();
    }
  }

  deleteCollection(collectionID: string) {
    const selectedFile = this.files.filter(f => f.isActive)[0];
    if (selectedFile) {
      const collection = selectedFile.collections.filter(c => c.id === collectionID)[0];
      const selectIndex = selectedFile.collections.indexOf(collection);
      selectedFile.collections.splice(selectIndex, 1);
      this.store();
    }
  }

  addEffect(effect: Effect) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    if (activeFile) {
      activeFile.effects.push(effect);
      activeFile.activeEffect = effect;
      const tab = new OpenTab(effect.id, effect.name);
      const tabIndex = activeFile.configuration.openTabs.indexOf(tab);
      if (tabIndex === -1) {
        activeFile.configuration.openTabs.push(tab);
      }
      this.setEffectActive(effect);
    }
  }

  closeEffectTab(effectID: string) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    if (activeFile) {
      const tab = activeFile.configuration.openTabs.filter(e => e.id === effectID)[0];
      if (tab) {
        const tabIndex = activeFile.configuration.openTabs.indexOf(tab);
        activeFile.configuration.openTabs.splice(tabIndex, 1);
        this.store();
      }
    }
  }

  setEffectActive(effect: Effect) {

    const activeFile = this.files.filter(f => f.isActive)[0];

    if (activeFile) {
      activeFile.effects.filter(e => e.id === activeFile.activeEffect.id)[0] = JSON.parse(JSON.stringify(activeFile.activeEffect));
      activeFile.effects.filter(e => e.id === activeFile.activeEffect.id)[0].paths = this.nodeService.getAll();
      console.log(activeFile);

      for (const tab of activeFile.configuration.openTabs) {
        tab.isActive = tab.id === effect.id ? true : false;
      }
      activeFile.activeEffect = JSON.parse(JSON.stringify(effect));
      this.nodeService.loadFile(activeFile.activeEffect.paths);
      this.store();
    }
  }

  setAnyEffectActive() {
    const activeFile = this.files.filter(f => f.isActive)[0];
    if (activeFile) {
      if (activeFile.effects.length === 0) {
        const newEffect = new Effect(uuid());
        this.addEffect(newEffect);
      } else if (activeFile.configuration.openTabs.length > 0) {
        const activeTab = activeFile.configuration.openTabs.filter(t => t.isActive)[0];
        if (activeTab) {
          this.setEffectActive(activeFile.effects.filter(e => e.id === activeTab.id)[0]);
        } else {
          this.setEffectActive(activeFile.effects[0]);
        }
      }
    }
  }

  updateEffect(effect: Effect) {
   const selectedFile = this.files.filter(f => f.isActive)[0];
   if (selectedFile) {
      effect.paths = this.nodeService.getAll();
      selectedFile.effects.filter(e => e.id === effect.id)[0] = effect;
      this.store();
    }
  }

  add(file: File) {
    this.files.push(file);
    this.setActive(file);
    this.store();
  }

  getFileCount() {
    return this.files.length + 1;
  }

  updateActiveFile() {
    const activeFile = this.files.filter(f => f.isActive)[0];
    if (activeFile) {
      activeFile.nodes = this.nodeService.getAll();
      activeFile.date.changed = true;
      this.store();
    }
  }

  update(file: File, changes = true) {
    const originalFile = this.files.filter(f => f._id === file._id)[0];
    const index = this.files.indexOf(originalFile, 0);
    if (index > -1) {
      // file.nodes = this.nodeService.getAll();
      this.files[index] = file;
      this.files[index].date.changed = changes;
      this.store();
    }
  }

  get(id: string): File {
    return this.files.filter(f => f._id === id)[0];
  }

  store() {
    this.fileObservable.next(this.files);
    this.localSt.store('files', this.files);
    // console.log('store');
  }

  getActiveFile(): File {
    return this.files.filter(f => f.isActive)[0];
  }

  delete(file: File) {
    const index = this.files.indexOf(file, 0);
    if (index > -1) {
      this.files.splice(index, 1);
      if (this.files.length === 0) {
        this.createDefault('Untitled-1');
      }
    }
    if (file.isActive && this.files.length > 0) {
      this.files[this.files.length - 1].isActive = true;
    }
    this.store();
  }

  getAll() {
    return this.files;
  }

  getDefault() {
    return this.files[0];
  }



  getAllFileData(): File {
    const currentactiveFile = this.files.filter(f => f.isActive)[0];
    if (currentactiveFile) {
      currentactiveFile.nodes = this.nodeService.getAll();
    }
    this.store();
    return currentactiveFile;
  }

  getAllFileDataByID(id: string): File {
    const selectedFile = this.files.filter(f => f._id === id)[0];
    if (selectedFile) {
      if (selectedFile.isActive) {
        selectedFile.nodes = this.nodeService.getAll();
      }
      this.store();
      return selectedFile;
    }
  }

  setActive(file: File) {
    // deactive current active file
    const currentactiveFile = this.files.filter(f => f.isActive)[0];
    if (currentactiveFile) {
      currentactiveFile.isActive = false;
      currentactiveFile.activeEffect.paths = this.nodeService.getAll();
    }
    // activate new file
    const newactiveFile = this.files.filter(f => f._id === file._id)[0];
    newactiveFile.isActive = true;
    this.nodeService.loadFile(newactiveFile.activeEffect.paths);
    this.store();
  }

  setAnyActive() {
    const currentactiveFile = this.files.filter(f => f.isActive)[0];
    if (!currentactiveFile) {
      const newactiveFile = this.files[this.files.length - 1];
      newactiveFile.isActive = true;
      this.nodeService.loadFile(newactiveFile.activeEffect.paths);
      this.store();
    } else {
      this.nodeService.loadFile(currentactiveFile.activeEffect.paths);
    }
  }


  save(file: File, close = false) {
    // file.nodes = this.nodeService.getAll();
    this.store();
    if (file.path) {
      fetch(file.path).then((res) => {
        this.saveChangesToFile(file);
      }).catch((err) => {
        this.saveFileWithDialog(file, 'json');
      });
    } else {
      this.saveFileWithDialog(file, 'json');
    }

    if (close) {
      file.isActive = false;
      this.setAnyActive();
      this.delete(file);
    }

  }

  saveFileWithDialog(file: File, type: string) {
    const blob = new Blob([JSON.stringify(file)], { type: 'text/plain' });
    const currentFileName = file.name + '.json';
    this._FileSaverService.save(blob, currentFileName, 'text/plain');
    // this._FileSaverService.save(blob, file.name + '.json');
  }

  saveChangesToFile(file: File) {
    file.date.modified = new Date().getTime();
    file.date.changed = false;
    // if (file.isActive) {
    //   file.nodes = this.nodeService.getAll();
    // }
    this.store();
    // let blob = new Blob([JSON.stringify(file)], { type: "text/plain" });
    try {
      this.fs.writeFileSync(file.path, JSON.stringify(file), 'utf-8');
    } catch (e) {
      alert('Failed to save the file');
    }
  }

  parseFile(file: any) {
    return new Promise((resolve, reject) => {
      resolve(JSON.parse(file));
    });
  }

  deleteGuides(guides: Array<string>) {
    for (const guide of guides) {
      const gEl = this.files.filter(f => f.isActive)[0].grid.guides.filter(g => g.id === guide)[0];
      if (gEl) {
        const index = this.files.filter(f => f.isActive)[0].grid.guides.indexOf(gEl);
        if (index > -1) {
          this.files.filter(f => f.isActive)[0].grid.guides.splice(index, 1);
        }
      }
    }
    this.store();
  }

  getGuidesWithinBox(box: any, guides: Array<any>, shift: boolean, alt: boolean) {
    const selectedGuides = [];
    for (const guide of guides) {
      if (guide.axis === 'y') {
        if (guide.coords.x > box.x1 && guide.coords.x < box.x2) {
          selectedGuides.push(guide.id);
        }
      } else if (guide.axis === 'x') {
        if (guide.coords.y > box.y1 && guide.coords.y < box.y2) {
          selectedGuides.push(guide.id);
        }
      }
    }
    return selectedGuides;
  }

  copyGuides(guides: Array<string>) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    for (const guide of guides) {
      const gEl = activeFile.grid.guides.filter(g => g.id === guide)[0];
      if (gEl) {
        const copy = gEl;
        copy.id = uuid();
        activeFile.guides.push(copy);
      }
    }
    this.store();
  }

  updateStepDetail(id: string, forcePos: number) {
    this.files.filter(f => f.isActive)[0].stepDetails.filter(s => s.id === id)[0].forcePos = forcePos;
    this.store();
  }

  updatePathEffect(path: any) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    let effect = activeFile.effects.filter(e => e.path === path.id)[0];
    // if (effect === undefined) {
    //   const nrOfPathEffects = activeFile.effects.filter(e => e.slug === 5).length + 1;
    //   effect = new Effect(uuid(), 'effect-' + nrOfPathEffects, '../../src/assets/icons/effects/path.svg',
    //     5, activeFile.layers[activeFile.selectedLayer].colors, activeFile.grid.units);
    //   effect.path = path.id;
    //   effect.details.position = { start: path.box.left, end: path.box.right };
    //   effect.interface.layer = path.layer;
    //   this.files.filter(f => f.isActive)[0].effects.push(effect);
    // } else {
    //   effect.details.position = { start: path.box.left, end: path.box.right };
    // }
    this.store();
  }

  updateStepDetailDirection(id: string, direction: any, index: number, shift = false) {
    if (shift) {
      const selectedStep = this.files.filter(f => f.isActive)[0].stepDetails.filter(s => s.id === id)[0];
      for (const step of this.files.filter(f => f.isActive)[0].stepDetails.filter(s => s.layer === selectedStep.layer)) {
        step.direction[index] = direction[index];
      }
    } else {
      this.files.filter(f => f.isActive)[0].stepDetails.filter(s => s.id === id)[0].direction[index] = direction[index];
    }
    this.store();
  }

  updateDuration(duration: number) {
    this.files.filter(f => f.isActive)[0].duration = duration;
    this.store();
  }

  addModuleToLibrary(effect: any) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    if (activeFile.effects.indexOf(effect) === -1) {
      activeFile.effects.push(effect);
      this.nodeService.reset();
      this.store();
    }
  }

  addModule(module: any, xpos: number) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    let total = 0;
    if (activeFile.frames.length > 0) {
      for (const motion of activeFile.frames) {
        if (motion.position < xpos) {
          total += motion.duration;
        } else {
          motion.position += module.duration;
        }
      }
    }
    module.position = total;
    activeFile.frames.push(module);
    this.store();
    return activeFile.frames;
  }

  selectModuleFromLibrary(moduleId: string) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    const module = activeFile.effects.filter(m => m.id === moduleId)[0];
    if (module !== undefined) {
      this.nodeService.loadFile(module.nodes);
    }
    return module;
  }

  saveTimeEffectLibrary(module: any) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    let timeEffectsModule = activeFile.effects.filter(m => m.id === module.id)[0];
    if (timeEffectsModule && module) {
      timeEffectsModule = module;
      timeEffectsModule.nodes = this.nodeService.getAll();
      // this.nodeService.reset();
      this.store();
    }
  }

  removeEffectFromLibrary(effect: any) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    const index = activeFile.effects.indexOf(effect);
    activeFile.effects.splice(index, 1);
    this.store();
  }

  updateHapticEffect(effect: any, window = false) {
    const activeFile = this.files.filter(f => f.isActive)[0];
    const lbrEffect = activeFile.effects.filter(e => e.id === effect.id)[0];
    if (lbrEffect) {
      if (window) {
        effect.details.position.start = lbrEffect.details.position.start;
        effect.details.position.end = lbrEffect.details.position.end;
      }
      const indexOld = activeFile.effects.indexOf(lbrEffect);
      activeFile.effects.splice(indexOld, 1);
      activeFile.effects.splice(indexOld, 0, effect);
      this.store();
    }
  }


  updateUnits(oldUnits: any, newUnits: any, file: any) {
    file.nodes = this.nodeService.updateUnits(oldUnits.PR, newUnits.PR);
    file.effects = this.nodeService.updateUnitsEffects(oldUnits.PR, newUnits.PR, file.effects);
    this.nodeService.loadFile(file.activeEffect.paths);
    this.update(file);
  }

}
