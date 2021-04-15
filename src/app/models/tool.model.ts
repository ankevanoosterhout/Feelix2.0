export class Subcursor {
  name: string = null;
  cursor: string = null;
}

export class Cursor {
  id = 0;
  name = 'Pen Tool';
  slug = 'pen';
  disabled = false;
  icon = './assets/icons/tools/pen-icon.svg';
  acceleration = 'p';
  cursor = 'url(./assets/icons/tools/cursor-zoom.png), none';
  subcursor: Array<Subcursor> = [];
  selectedSubcursor: string = null;

  constructor(id: number, name: string, slug: string, disabled: boolean, icon: string, acceleration: string,
              cursor: string, subcursor: Array<Subcursor> = []) {
    this.id = id;
    this.name = name;
    this.slug = slug;
    this.disabled = disabled;
    this.icon = icon;
    this.acceleration = acceleration;
    this.cursor = cursor;
    this.subcursor = subcursor;
  }
}
