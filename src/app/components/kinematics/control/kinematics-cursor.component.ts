import { DOCUMENT } from '@angular/common';
import { Component, Inject, AfterViewInit } from '@angular/core';
import { KinematicsDrawingService } from 'src/app/services/kinematics-drawing.service';


@Component({
    selector: 'app-kinematics-cursor',
    template: `
        <div class="cursors">
          <ul>
            <li *ngFor="let cursor of this.cursors">
              <div class="cursor" id="cursor-{{ cursor.id }}" (click)="selectCursor(cursor.name)">
                <img src="./assets/icons/buttons/{{ cursor.icon }}" title="{{ cursor.shortkey }}">
              </div>
            </li>
            <li *ngFor="let camera of this.cameras">
              <div class="cursor" id="camera-{{ camera.id }}" (click)="selectCamera(camera.name)" *ngIf="camera.visible">
                <img src="./assets/icons/buttons/{{ camera.icon }}" title="{{ camera.shortkey }}">
              </div>
            </li>
          </ul>
        </div>
        `,
    styles: [`

      .cursors {
        display: inline-flex;
        width: auto;
        position: absolute;
        left: 50%;
        bottom: 80px;
        justify-content: center;
      }

      ul {
        list-style-type: none;
        margin: 0;
        padding: 0;
        display:inline-flex;
        flex-direction: row;

      }

      ul li {
        display:inline;
        margin-left: -1px;
        cursor: pointer;
        background: #fff;
      }

      .cursor {
        background: #eee;
        width:32px;
        height: 32px;
        padding: 5px;
        margin: 1px;
        border: 1px solid transparent;
      }

      .cursor.active {
        border: 1px solid #00AEEF;
      }

    `],
})
export class KinematicsCursorComponent implements AfterViewInit {

  cursors = [
    { id: 0, name: 'translate', icon: 'controls_translate.svg', selected: false, shortkey: 'translate (T)' },
    { id: 1, name: 'rotate', icon: 'controls_orbit.svg', selected: false, shortkey: 'rotate (R)' },
    { id: 2, name: 'rotateAxis', icon: 'controls_rotate.svg', selected: false, shortkey: '' }
  ];

  cameras = [
    { id: 0, name: 'cameraPerspective', icon: 'camera-1.svg', visible: true, shortkey: 'change camera (C)' },
    { id: 1, name: 'cameraOrhto', icon: 'camera-2.svg', visible: false, shortkey: 'change camera (C)' }
  ];

  constructor(@Inject(DOCUMENT) private document: Document, private kinematicDrawingService: KinematicsDrawingService) {

    this.kinematicDrawingService.selectControl.subscribe(res => {
      this.selectCursor(res);
    });

    this.kinematicDrawingService.selectCameraView.subscribe(res => {
      this.selectCamera();
    });
  }

  ngAfterViewInit(): void {
    this.selectCursor('translate');
  }


  selectCursor(name: string) {

    for (let cursor of this.cursors) {
      cursor.selected = cursor.name === name ? true : false;
      if (cursor.selected) {
        this.document.getElementById('cursor-' + cursor.id).classList.add('active');
        this.kinematicDrawingService.updateControlMode(cursor.name);

      } else if (!cursor.selected) {
        this.document.getElementById('cursor-' + cursor.id).classList.remove('active');
      }
    }
  }


  selectCamera() {
    for (let camera of this.cameras) {
      camera.visible = !camera.visible;
    }
    this.kinematicDrawingService.updateCamera();
  }

}
