
import { Component, Inject } from '@angular/core';
import { FilterService } from 'src/app/services/filter.service';
import { TensorFlowMainService } from 'src/app/services/tensorflow-main.service';

@Component({
  selector: 'app-classification',
  templateUrl: 'classification.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../tensorFlowJS.component.css'],
})
export class ClassificationComponent {


  constructor(public tensorFlowService: TensorFlowMainService, public filterService: FilterService) {

    this.filterService.addFilterToModel.subscribe(data => {
      if (data) {
        this.tensorFlowService.selectedModel.filters.push(data);
      }
    });

  }


  updateResults(results: any) {
    console.log(results);
  }
}
