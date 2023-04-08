
import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { activation, ActivationLabelMapping, losses, LossesLabelMapping } from 'src/app/models/tensorflow.model';
import { TensorFlowMainService } from 'src/app/services/tensorflow-main.service';


@Component({
  selector: 'app-model',
  templateUrl: 'model.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../tensorFlowJS.component.css'],
})
export class ModelComponent {

  public ActivationLabelMapping = ActivationLabelMapping;
  public LossesLabelMapping = LossesLabelMapping;
  
  public activationOptions = Object.values(activation);
  public lossOptions = Object.values(losses);

  constructor(@Inject(DOCUMENT) private document: Document, public tensorFlowService: TensorFlowMainService) {  }



  initializeNN_Model() {
    if (!this.tensorFlowService.processing && this.tensorFlowService.dataSets.length > 0) {

      this.tensorFlowService.processing = true;
      this.tensorFlowService.updateProgess('initializing model', 20);

      let data = this.tensorFlowService.createJSONfromDataSet(this.tensorFlowService.dataSets, true);

      const inputLabels = [];
      const outputLabels = [];

      for (const input of this.tensorFlowService.selectedModel.inputs) {
        if (input.active) { inputLabels.push(input.name); }
      }

      for (const output of this.tensorFlowService.selectedModel.outputs) {
        for (const label of output.labels) {
          if (!outputLabels.includes(label.name)) { outputLabels.push(label.name); }
        }
      }

      this.tensorFlowService.selectedModel.options.inputs = inputLabels;
      this.tensorFlowService.selectedModel.options.outputs = outputLabels;

      this.tensorFlowService.NN_createData(data, this.tensorFlowService.selectedModel);
    } else {

        this.tensorFlowService.updateProgess(this.tensorFlowService.processing ? 'training in progress': 'no data', 0);

    }
  }




  selectClassifier(name: string) {
    for (const output of this.tensorFlowService.selectedModel.outputs) {
      output.active = output.name === name ? true : false;
    }
  }


  classifyAtRunTime() {
    if (this.tensorFlowService.selectedModel.model) {
      if (!this.tensorFlowService.classify) {
        this.tensorFlowService.processing = false;
        this.tensorFlowService.classify = true;
        this.tensorFlowService.updateProgess('deploy', 100);
        this.document.getElementById('record-button').click();
      } else {
        this.tensorFlowService.processing = false;
        this.tensorFlowService.classify = false;
        this.tensorFlowService.updateProgess('stopped', 0);
        this.tensorFlowService.resetFiltersMicrocontroller();
      }
    }
  }



}
