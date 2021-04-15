import { Configuration } from './configuration.model';
import { Collection } from './collection.model';
import { Effect } from './effect.model';

export class Dates {
  created = new Date().getTime();
  modified = null;
  changed = false;
}


export class File {
  // tslint:disable-next-line:variable-name
  _id: string;
  name = 'untitled';
  path = '';
  softwareVersion = '2.0.0';
  overwrite = true;
  isActive = false;
  date = new Dates();
  configuration = new Configuration();
  collections: Array<Collection> = [];
  effects: Array<Effect> = [];
  activeEffect: Effect = null;

  constructor(name: string, id: string, status: boolean) {
    this.name = name;
    this._id = id;
    this.isActive = status;
  }
}

