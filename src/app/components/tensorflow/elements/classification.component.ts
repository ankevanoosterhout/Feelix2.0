
import { Component, Inject } from '@angular/core';
import { FilterService } from 'src/app/services/filter.service';
import { TensorFlowMainService } from 'src/app/services/tensorflow-main.service';

@Component({
  selector: 'app-classification',
  templateUrl: 'classification.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../tensorFlowJS.component.css'],
})
export class ClassificationComponent {


  constructor(public tensorflowService: TensorFlowMainService, public filterService: FilterService) {

    this.filterService.addFilterToModel.subscribe(data => {
      if (data) {
        this.tensorflowService.d.selectedModel.filters.push(data);
      }
    });

  }


  updateResults(results: any) {
    console.log(results);
  }
}
