import { Component, OnInit, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ElectronService } from 'ngx-electron';
// import { DataSet, Model } from 'src/app/models/tensorflow.model';
import { DataSetService } from 'src/app/services/dataset.service';
import { TensorFlowModelService } from 'src/app/services/tensorFlow-model.service';
import { Router } from '@angular/router';


@Component({
  selector: 'app-load-dataset',
  template: `
  <div class="window-title-bar" *ngIf="this.mode === 'data'">Load Data Sets</div>
  <div class="window-title-bar" *ngIf="this.mode === 'model'">Load Model</div>

  <div class="window-content">
      <form>
          <div class="form-row table-header" *ngIf="this.mode === 'data'">
            <input type="checkbox" class="checkbox_input" id="select_all" name="select_all" [(ngModel)]="this.allSelected" [checked]="this.allSelected" (change)="selectAllItems()">
            <div class="labelRow header">Data set</div>
          </div>
          <div class="inputfield">

              <div class="form-row list-item" *ngFor="let item of this.data" (click)="this.selectDataSet(item.id)">

                <input type="checkbox" class="checkbox_input" id="select_item_{{ item.id }}" [(ngModel)]="item.selected" name="select_item_{{ item.id }}" [checked]="item.selected">
                <div class="labelRow">{{ item.name }}</div>

              </div>
              <div class="form-row" *ngIf="this.data.length === 0">
                <div class="labelRow">No saved items</div>
              </div>
          </div>
          <div class="form-row buttons settings">
              <button (click)="close()">Cancel</button>
              <button (click)="delete()">Delete</button>
              <button id="submit" autofocus (click)="submit()">Load</button>
          </div>
      </form>
    </div>
  `,
  styles: [`

    .form-row {
      padding: 1px 0;
    }

    .list-item {
      width: 100%;
      border-bottom: 1px solid #eee;
    }

    .list-item:hover {
      background: #ddd;
    }

    .list-item:active {
      background: #efefef;
    }

    .table-header {
      background: #8a8a8a;
      margin-left: 1px;
      margin-bottom: -1px;
    }

    .labelRow {
      display: inline-block;
      width: auto;
      box-sizing: border-box;
      font-family: 'Open Sans', Arial, sans-serif;
      font-size: 11px;
      line-height: 16px;
      padding: 6px 10px;
      height: auto;
      color: #1c1c1c;
      user-select:none;
      vertical-align: top;
    }

    .labelRow.header {
      font-weight: 600;
      color: #fff;
    }

    .selected {
      background: #00aeef82;
    }

    .button {
      display: inline-block;
      vertical-align: top;
      padding: 1px 10px;
      float: right;
    }

    .button img {
      width: auto;
      height: 17px;
    }

    .inputfield {
      background: #fff;
      border: 1px solid #1c1c1c;
      padding-top: 1px;
      height: calc(100vh - 150px);
      overflow-y: auto;
      width: 100%;
    }

    button {
      min-width: 60px;
    }

        /* width */
    .inputfield::-webkit-scrollbar, #data_output_list::-webkit-scrollbar {
      width: 6px;
    }

    /* Track */
    .inputfield::-webkit-scrollbar-track, #data_output_list::-webkit-scrollbar-track {
      background: 'transparent';
    }

    /* Handle */
    .inputfield::-webkit-scrollbar-thumb, #data_output_list::-webkit-scrollbar-thumb {
      background: #1c1c1c;
    }

    /* Handle on hover */
    .inputfield::-webkit-scrollbar-thumb:hover, #data_output_list::-webkit-scrollbar-thumb:hover {
      background: #111;
    }

    .checkbox-container {
      pointer-events: none;
      user-select: none;
    }

    .checkmark.checkbox {
      background-color: #fff;
      border: 1px solid #1a1a1a;
      pointer-events: none;
      user-select: none;
    }

    .checkbox-container .checkmark:after {
      color: #222;
    }

    .window-content input[type='checkbox'] {
      margin: 0 7px -4px!important;
    }


  `]
})

export class LoadDataSetsComponent implements OnInit {

  mode = '';
  data: Array<any>;
  allSelected = false;

  // tslint:disable-next-line: variable-name
  constructor(@Inject(DOCUMENT) private document: Document, private electronService: ElectronService, private dataSetService: DataSetService,
             private tensorFlowModelService: TensorFlowModelService, private router: Router) {

              if (this.router.url === '/load-model') {
                this.mode = 'model';
                this.data = this.tensorFlowModelService.getAllModels();
              } else {
                this.mode = 'data';
                this.data = this.dataSetService.getAllDataSets();
              }
              if (this.data.length > 0) {
                this.data.sort((a,b) => (a.name > b.name) ? 1 : ((b.name > a.name) ? -1 : 0));
              }
            }

  public submit() {
    if (this.data.filter(d => d.selected).length > 0) {
      this.electronService.ipcRenderer.send((this.mode === 'data' ? 'load-datasets' : 'load-model'), this.data.filter(d => d.selected));
    }
    this.close();
  }


  public close() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  selectAllItems() {
    for (const item of this.data) {
      item.selected = this.allSelected;
      (this.document.getElementById('select_item_' + item.id) as HTMLInputElement).checked = item.selected;
    }
  }

  selectDataSet(id: String) {
    const dataSet = this.data.filter(d => d.id === id)[0];

    if (dataSet) {
      if (this.mode === 'model') {
        const selectedItem = this.data.filter(d => d.selected)[0];
        if (selectedItem) {
          selectedItem.selected = false;
          (this.document.getElementById('select_item_' + selectedItem.id) as HTMLInputElement).checked = false;
        }
      }
      dataSet.selected = !dataSet.selected;
      (this.document.getElementById('select_item_' + id) as HTMLInputElement).checked = dataSet.selected;
    }
  }


  delete() {
    for (const item of this.data.filter(d => d.selected)) {
      this.mode === 'data' ? this.dataSetService.deleteDataSet(item.id) : this.tensorFlowModelService.deleteModel(item.id);
    }
  }



  ngOnInit(): void {
    this.document.body.classList.add('disable-scroll-body');
  }

}

