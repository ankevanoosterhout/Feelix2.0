
import { Component, Inject } from '@angular/core';
import { ML5jsService } from 'src/app/services/ml5js.service';

@Component({
  selector: 'app-model',
  templateUrl: 'model.component.html',
  styleUrls: ['../../windows/effects/effects.component.css', './../ml5js.component.css'],
})
export class ModelComponent {


  constructor(public ml5jsService: ML5jsService) {
  }



  initializeNN_Model() {

    let data = [];

    this.ml5jsService.dataSets.forEach(set => {
      let outputs = [];

      for (const output of set.d.outputs) {
        outputs.push('"' + output.classifier + '":"' + output.value + '"');
      }

      const outputstr = outputs.join(',');
      const outputObject = JSON.parse('{' + outputstr + '}');

      set.d.inputs.forEach(input => {
        let inputs = [];
        for (const motor of input.motors) {
          for (let m = 0; m < motor.length; m++) {
            inputs.push('"' + motor[m].data.name + '-' + motor[m].motor + '":"' + motor[m].data.value + '"');
          }
        }
        inputs.push('"' + input.inputdata.name + '":"' + input.inputdata.value + '"' );

        const inputstr = inputs.join(',');
        let inputObject = JSON.parse('{' + inputstr + '}');

        data.push({ inputs: inputObject, outputs: outputObject });
      });
    });

    console.log(data);
    this.ml5jsService.NN_createData(data, { task: this.ml5jsService.selectedModel.options.NN_task, debug: this.ml5jsService.selectedModel.options.debug }, 32, 12);
  }



  classifyAtRunTime() {
    this.ml5jsService.classify = true;
  }
}
