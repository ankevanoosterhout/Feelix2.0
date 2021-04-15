import { Injectable } from '@angular/core';
import { LibraryEffect } from '../models/effect.model';
import { v4 as uuid } from 'uuid';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable()
export class EffectLibraryService {

  public static readonly LIBRARY_LOCATION = 'ngx-webstorage|effectLibrary';

  effectLibrary: Array<LibraryEffect> = [];

  constructor(private localSt: LocalStorageService) {
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

  addEffect(effect: any, path: any, units: any, mode: string) {
    this.getEffectsFromLocalStorage();
    if (effect) {
      const libraryEffect = this.effectLibrary.filter(l => l.effect.id === effect.id)[0];
      if (libraryEffect) {
        const index = this.effectLibrary.indexOf(libraryEffect);
        this.effectLibrary[index].effect = effect;
        this.effectLibrary[index].paths = path;
      } else {
        const newLibraryEffect = new LibraryEffect(uuid(), effect, units);
        newLibraryEffect.paths = path;
        this.effectLibrary.unshift(newLibraryEffect);
      }

      this.store();
    }
  }

  addTimeEffect(effect: any, units: any, mode: string) {
    if (effect) {
      const libraryEffect = this.effectLibrary.filter(l => l.effect.id === effect.id)[0];
      if (libraryEffect) {
        const index = this.effectLibrary.indexOf(libraryEffect);
        this.effectLibrary[index].effect = effect;
        this.effectLibrary[index].effect.paths = effect.nodes[0];
      } else {
        const newLibraryEffect = new LibraryEffect(uuid(), effect, units);
        newLibraryEffect.paths = effect.nodes[0];
        this.effectLibrary.unshift(newLibraryEffect);
      }
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

  getEffectsFeelixio() {
    this.getEffectsFromLocalStorage();
    const newEffectList = [];
    for (const libEffect of this.effectLibrary) {
      const effect = libEffect.effect;
      effect.paths = libEffect.paths;
      newEffectList.push(effect);
    }
    return newEffectList;
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

  store() {
    this.localSt.store('effectLibrary', this.effectLibrary);
    // console.log(this.effectLibrary);
  }



}
