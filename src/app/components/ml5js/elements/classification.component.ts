
import { Component, Inject } from '@angular/core';
import { FilterService } from 'src/app/services/filter.service';
import { ML5jsService } from 'src/app/services/ml5js.service';

@Component({
  selector: 'app-classification',
  templateUrl: 'classification.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../ml5js.component.css'],
})
export class ClassificationComponent {


  constructor(public ml5jsService: ML5jsService, public filterService: FilterService) {

    this.filterService.addFilterToModel.subscribe(data => {
      if (data) {
        this.ml5jsService.selectedModel.filters.push(data);
      }
    });

  }


  updateResults(results: any) {
    console.log(results);
  }
}
