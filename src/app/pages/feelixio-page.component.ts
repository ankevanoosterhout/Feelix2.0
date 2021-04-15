import { Component, OnInit } from '@angular/core';

@Component({
    selector: 'app-feelixio-page',
    template: `
      <div class="controls">
        <!-- <app-play [page]="page"></app-play> -->
        <app-render-info></app-render-info>
      </div>
      <div class="sidebar">
        <app-feelixio-parts></app-feelixio-parts>
      </div>
      <div id="feelixio-field">
        <app-file-list [list]="list"></app-file-list>
        <app-feelixio></app-feelixio>
      </div>
      <app-statusbar [page]="page"></app-statusbar>

    `,
    styleUrls: ['../components/feelixio/feelixio.component.css'],
})


export class FeelixioPageComponent implements OnInit {

    list = 'FeelixioFiles';
    page = 'Feelixio';

    constructor() { }

    ngOnInit(): void {}


}
