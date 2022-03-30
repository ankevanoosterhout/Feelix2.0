
import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { ML5jsService } from 'src/app/services/ml5js.service';


@Component({
  selector: 'app-model',
  templateUrl: 'model.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../ml5js.component.css'],
})
export class ModelComponent {




  constructor(@Inject(DOCUMENT) private document: Document, public ml5jsService: ML5jsService, private electronService: ElectronService) {



  }



  initializeNN_Model() {
    if (!this.ml5jsService.processing) {

      this.ml5jsService.processing = true;
      this.ml5jsService.updateProgess('initializing model', 20);

      if (this.ml5jsService.dataSets.length === 0) {
        this.ml5jsService.processing = false;
        this.ml5jsService.updateProgess('no data', 0);
        return false;
      }

      let data = this.ml5jsService.createJSONfromDataSet(this.ml5jsService.dataSets, true);

      const inputLabels = [];
      const outputLabels = [];

      for (const input of this.ml5jsService.selectedModel.inputs) {
        if (input.active) { inputLabels.push(input.name); }
      }

      for (const output of this.ml5jsService.selectedModel.outputs) {
        for (const label of output.labels) {
          if (!outputLabels.includes(label.name)) { outputLabels.push(label.name); }
        }
      }

      this.ml5jsService.selectedModel.options.inputs = inputLabels;
      this.ml5jsService.selectedModel.options.outputs = outputLabels;

      this.ml5jsService.NN_createData(data, this.ml5jsService.selectedModel);
    }
  }






  classifyAtRunTime() {
    if (this.ml5jsService.selectedModel.model) {
      if (!this.ml5jsService.classify) {
        this.ml5jsService.processing = false;
        this.ml5jsService.classify = true;
        this.ml5jsService.updateProgess('deploy', 100);
        this.document.getElementById('record-button').click();
      } else {
        this.ml5jsService.processing = false;
        this.ml5jsService.classify = false;
        this.ml5jsService.updateProgess('stopped', 0);
        this.ml5jsService.resetFiltersMicrocontroller();
      }
    }
  }



}
