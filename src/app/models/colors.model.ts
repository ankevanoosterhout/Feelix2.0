export class Color {
  name: string = null;
  hash: string = null;
  sel: string = null;

  constructor(name: string, hash: string, sel: string) {
    this.name = name;
    this.hash = hash;
    this.sel = sel;
  }
}

export class Colors {
  list: Array<Color> = [];

  constructor() {
    const magenta = new Color('magenta', '#cc0066', '#ed1a75');
    const orange = new Color('orange', '#d94313', '#f2662d');
    const turquoise = new Color('turquoise', '#2e93c0', '#52b8d8');
    const purple = new Color('purple', '#781fbd', '#8b16ca');
    const darkBlue = new Color('dark blue', '#0f4d9d', '#0054b8');
    const blue = new Color('blue', '#91b1d8', '#9bbef5');
    const pink = new Color('pink', '#a958be', '#d078d8');
    const yellow = new Color('yellow', '#d79019', '#faaf40');
    const gray = new Color('gray', '#808184', '#929497');
    const black = new Color('black', '#222222', '#333333');

    this.list.push(magenta, orange, turquoise, purple, darkBlue, blue, pink, yellow, gray, black);
  }
}
