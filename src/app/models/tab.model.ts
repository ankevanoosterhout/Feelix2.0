export class Tab {
  el: string = null;
  name = 'untitled';
  selected = false;
  id: any;

  constructor(el: any, name: string) {
    this.el = el;
    this.name = name;
  }
}
