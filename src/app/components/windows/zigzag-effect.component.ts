import { Component, OnInit } from '@angular/core';
import { ElectronService } from 'ngx-electron';

@Component({
  selector: 'app-zigzag',
  template: `
    <div class="window-body"></div>
    <div class="window-title-bar">Zig Zag</div>
    <div class="window-content">
      <div class="inputfield">

          <div class="inputfield-inset">
              <div class="inputfield-inset-title">Options</div>
              <div class="form-row">
                  <label>Size</label>
                  <!--<div class="input-slider">-->
                      <!--<div class="slider-bar"></div>-->
                      <!--<div class="slider-cursor"></div>-->
                  <!--</div>-->
                  <input type="number" name="size" [(ngModel)]="parameters.options.size">
              </div>
              <div class="form-row">
                  <label>Ridges per segment</label>
                  <!--<div class="input-slider">-->
                      <!--<div class="slider-bar"></div>-->
                      <!--<div class="slider-cursor"></div>-->
                  <!--</div>-->
                  <input type="number" name="ridges" [(ngModel)]="parameters.options.ridges">
              </div>
          </div>

          <div class="inputfield-inset">
              <div class="inputfield-inset-title">Points</div>
              <div class="form-row">
                  <label class="radio-container">Smooth
                      <input type="checkbox" class="type" name="parameters-smooth"
                      [(ngModel)]="parameters.smooth" [checked]="parameters?.smooth">
                      <span class="checkmark radio"></span>
                  </label>

                  <label class="radio-container">Corner
                      <input type="checkbox" class="type" name="parameters-smooth"
                      [(ngModel)]="parameters.smooth" [checked]="!parameters?.smooth">
                      <span class="checkmark radio"></span>
                  </label>

              </div>

          </div>

          <label class="checkbox-container preview">Preview
              <input type="checkbox" id="preview" name="preview"
              (change)="preview();" [checked]="parameters?.preview">
              <span class="checkmark checkbox"></span>
          </label>
          <div class="form-row buttons side">
              <button (click)="submit();">Ok</button>
              <button (click)="close();">Cancel</button>
          </div>
      </div>
    </div>`,
  styles: [``]
})
export class ZigZagComponent implements OnInit {

  parameters = {
    options: {
      size: 10,
      ridges: 1
    },
    smooth: true,
    preview: false
  };

  // tslint:disable-next-line: variable-name
  constructor(private electronService: ElectronService) { }

  submit() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('zigzagEffect', this.parameters);
    }
  }

  preview() {
    if (this.parameters.preview) {
      if (this.electronService.isElectronApp) {
        this.electronService.ipcRenderer.send('zigzagEffectPreview', this.parameters);
      }
    }
  }

  close() {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('closeTmpWindow');
    }
  }

  ngOnInit(): void { }
}
