import { Injectable } from '@angular/core';
import { LibraryEffect } from '../models/effect.model';
import { v4 as uuid } from 'uuid';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { CloneService } from './clone.service';

@Injectable()
export class EffectLibraryService {

  public static readonly LIBRARY_LOCATION = 'ngx-webstorage|effectLibrary';

  effectLibrary: Array<LibraryEffect> = [];
  showLibraryTab: Subject<any> = new Subject();

  constructor(private localSt: LocalStorageService, private cloneService: CloneService) {
    // retrieve files stored in local storage
    this.getEffectsFromLocalStorage();

    window.addEventListener('storage', event => {
        if (event.storageArea === localStorage) {
          if (event.key === EffectLibraryService.LIBRARY_LOCATION) {
            const effectLib: LibraryEffect[] = JSON.parse(localStorage.getItem(EffectLibraryService.LIBRARY_LOCATION));
            this.effectLibrary = effectLib;
          }
        }
      },
      true
    );
  }

  getEffectsFromLocalStorage() {
    const storedEffects = this.localSt.retrieve('effectLibrary');
    if (storedEffects) {
      this.effectLibrary = storedEffects;
    }
  }

  addEffect(effect: any) {
    this.getEffectsFromLocalStorage();
    if (effect) {
      const libraryEffect = this.effectLibrary.filter(l => l.effect.id === effect.id)[0];
      if (libraryEffect) {
        const index = this.effectLibrary.indexOf(libraryEffect);
        effect.date.modified = new Date().getTime();
        effect.storedIn = 'library';
        this.effectLibrary[index].effect = this.cloneService.deepClone(effect);
      } else {
        effect.date.created = effect.date.created ? effect.date.created : new Date().getTime();
        effect.date.modified = new Date().getTime();
        effect.id = uuid();
        effect.name += '-lib';
        effect.storedIn = 'library';
        const newLibraryEffect = new LibraryEffect(uuid(), effect);
        this.effectLibrary.unshift(newLibraryEffect);
      }
      this.showLibraryEffects();
      this.store();
    }
  }

  deleteEffect(id: string) {
    const libEffect = this.effectLibrary.filter(l => l.effect.id === id || l.id === id)[0];
    if (libEffect) {
      const index = this.effectLibrary.indexOf(libEffect);
      this.effectLibrary.splice(index, 1);
      this.store();
    }
  }

  getEffects() {
    this.getEffectsFromLocalStorage();
    return this.effectLibrary;
  }


  getEffect(id: string) {
    this.getEffectsFromLocalStorage();
    return this.effectLibrary.filter(l => l.effect.id === id || l.id === id)[0];
  }

  inLibrary(id: string) {
    const effect = this.effectLibrary.filter(l => l.effect.id === id)[0];
    return effect ? true : false;
  }

  clear() {
    this.effectLibrary = [];
    this.store();
  }

  showLibraryEffects() {
    this.showLibraryTab.next();
  }

  sortLibraryEffectsBy(sortType: string, sortDirection: string) {
    if (sortType === 'name') {
      this.effectLibrary.sort((a,b) => (a.effect.name > b.effect.name) ? 1 : ((b.effect.name > a.effect.name) ? -1 : 0));
    } else if (sortType === 'type') {
      this.effectLibrary.sort((a,b) => (a.effect.type > b.effect.type) ? 1 : ((b.effect.type > a.effect.type) ? -1 : 0));
    } else if (sortType === 'date-created') {
      this.effectLibrary.sort((a,b) => (a.effect.date.created > b.effect.date.created) ? 1 : ((b.effect.date.created > a.effect.date.created) ? -1 : 0));
    } else if (sortType === 'date-modified') {
      this.effectLibrary.sort((a,b) => (a.effect.date.modified > b.effect.date.modified) ? 1 : ((b.effect.date.modified > a.effect.date.modified) ? -1 : 0));
    }
    if (sortDirection === 'last-first') {
      this.effectLibrary.reverse();
    }
    this.store();
  }

  store() {
    this.localSt.store('effectLibrary', this.effectLibrary);
    // console.log(this.effectLibrary);
  }



}
