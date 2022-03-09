
export class Input {
  id: String;
  name: String;
  active = true;

  constructor(id: String, name: String) {
    this.id = id;
    this.name = name;
  }
}


export class Model {
  type: string;
  inputs: Array<any> = [];
  outputs: Array<any> = [];
  options: any;

  constructor(type: string, options: any) {
    this.type = type;
    this.options = options;
    this.inputs = [
      { name: 'angle', active: true },
      { name: 'velocity', active: true },
      { name: 'direction', active: true },
      { name: 'time', active: false },
    ]
  }
}



export class Category {
  name: String;
  confidence: number;

  constructor(name: String) {
    this.name = name;
  }
}


export class Classifier  {
  name: String;
  categories: Array<Category> = [];
  open = false;

  constructor(name: String) {
    this.name = name;
  }
}



export class Data  {
  inputs: Array<any> = [];
  outputs: Array<any> = [];

  constructor() {}
}


export class DataSet {
  id: String;
  name: String;
  d = new Data();
  open = true;

  constructor(id: String, name: String) {
    this.id = id;
    this.name = name;
  }
}
