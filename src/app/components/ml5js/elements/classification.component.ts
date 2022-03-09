
import { Component, Inject } from '@angular/core';
import { ML5jsService } from 'src/app/services/ml5js.service';

@Component({
  selector: 'app-classification',
  templateUrl: 'classification.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../ml5js.component.css'],
})
export class ClassificationComponent {


  constructor(public ml5jsService: ML5jsService) { }


  updateResults(results: any) {
    console.log(results);
  }
}
