import { Injectable } from '@angular/core';
import { LocalStorageService } from 'ngx-webstorage';
import { Model } from '../models/ml5js.model';
import { CloneService } from './clone.service';
import { v4 as uuid } from 'uuid';


@Injectable()
export class ML5ModelService {

  public static readonly LIBRARY_LOCATION = 'ngx-webstorage|models';

  models: Array<Model> = [];


  constructor(private localSt: LocalStorageService, private cloneService: CloneService) {

    window.addEventListener('storage', event => {
      if (event.storageArea === localStorage) {
        if (event.key === ML5ModelService.LIBRARY_LOCATION) {
          const dataSetLib: Array<Model> = JSON.parse(localStorage.getItem(ML5ModelService.LIBRARY_LOCATION));
          this.models = dataSetLib;
        }
      }
    },
    true
    );

  }


  getDataFromLocalStorage() {
    const savedModels = this.localSt.retrieve('models');
    if (savedModels) {
      this.models = savedModels;
    }
  }

  getAllModels(): Array<Model> {
    this.getDataFromLocalStorage();
    return this.models;
  }

  saveModel(model: Model) {
    this.getDataFromLocalStorage();
    let modelItem = this.models.filter(m => m.id === model.id)[0];
    if (modelItem) {
      const model_str =  JSON.stringify(model);
      modelItem = JSON.parse(model_str);
      return model.id;
    } else {
      model.id = uuid();
      this.models.push(model);
      this.store();
      return model.id;
    }
  }

  getModel(id: String) {
    this.getDataFromLocalStorage();
    let model = this.models.filter(m => m.id === id)[0];
    return model;

  }

  deleteModel(id: String) {
    this.getDataFromLocalStorage();
    let model = this.models.filter(m => m.id === id)[0];
    if (model) {
      let index = this.models.indexOf(model);
      if (index > -1) {
        this.models.splice(index, 1);
        this.store();
      }
    }
  }


  clear() {
    this.models = [];
    this.store();
  }


  store() {
    this.localSt.store('models', this.models);
    // console.log(this.models);
  }





}
