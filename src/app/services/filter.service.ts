import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { Subject } from 'rxjs';
import { Filter, FilterType } from '../models/filter.model';
import { v4 as uuid } from 'uuid';


@Injectable()
export class FilterService {

  public filterTypes = [
    new FilterType('amplify', 'A', 'increase or decrease global motor output'),
    new FilterType('constrain', 'C', 'constrain global motor output'),
    new FilterType('noise', 'N', 'add noise to global motor output')
  ];

  public controlVariableOptions = [
    'voltage', 'angle', 'velocity'
  ]

  public selectedFilter = this.filterTypes[0];

  constructor(@Inject(DOCUMENT) private document: Document) {}


  addFilterToModel: Subject<any> = new Subject();

  applyFilter(type: string) {

  }

  addFilter() {
    const filter = new Filter(uuid(), this.selectedFilter);
    this.addFilterToModel.next(filter);

  }

  getAllFilters() {

  }


  ngOnInit(): void {

  }

}
