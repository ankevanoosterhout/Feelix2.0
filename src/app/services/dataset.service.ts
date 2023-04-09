import { Injectable } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { LocalStorageService } from 'ngx-webstorage';
import { Subject } from 'rxjs';
import { CloneService } from './clone.service';
import { DataSet } from '../models/tensorflow.model';

@Injectable()
export class DataSetService {

  public static readonly LIBRARY_LOCATION = 'ngx-webstorage|dataSets';

  dataSetLibrary: Array<DataSet> = [];


  constructor(private localSt: LocalStorageService, private cloneService: CloneService) {


    window.addEventListener('storage', event => {
      if (event.storageArea === localStorage) {
        if (event.key === DataSetService.LIBRARY_LOCATION) {
          const dataSetLib: Array<DataSet> = JSON.parse(localStorage.getItem(DataSetService.LIBRARY_LOCATION));
          this.dataSetLibrary = dataSetLib;
        }
      }
    },
    true
    );

  }


  getDataFromLocalStorage() {
    const dataSets = this.localSt.retrieve('dataSetLibrary');
    if (dataSets) {
      this.dataSetLibrary = dataSets;
    }
  }


  getAllDataSets() {
    this.getDataFromLocalStorage();
    return this.dataSetLibrary;
  }


  loadDataSet(id: string) {
    this.getDataFromLocalStorage();
    const dataSet = this.dataSetLibrary.filter(d => d.id === id)[0];

    return dataSet;
  }

  deleteDataSet(id: String) {
    this.getDataFromLocalStorage();
    const set = this.dataSetLibrary.filter(d => d.id === id)[0];
    if (set) {
      const index = this.dataSetLibrary.indexOf(set);
      this.dataSetLibrary.splice(index, 1);
      this.store();
    }
  }


  saveDataSet(dataSet: DataSet) {
    if (dataSet) {
      this.getDataFromLocalStorage();
      let dataSetLib = this.dataSetLibrary.filter(d => d.id === dataSet.id)[0];
      if (dataSetLib) {
        dataSetLib = this.cloneService.deepClone(dataSet);
      } else {
        dataSet.id = uuid();
        this.dataSetLibrary.push(dataSet);
      }

      this.store();
    }
  }

  copyDataSet(dataSet: DataSet) {
    if (dataSet) {
      const copy = this.cloneService.deepClone(dataSet);
      copy.id = uuid();
      copy.selected = false;
      return copy;
    }
  }


  clear() {
    this.dataSetLibrary = [];
    this.store();
  }


  store() {
    this.localSt.store('dataSetLibrary', this.dataSetLibrary);
    // console.log(this.dataSetLibrary);
  }









}
