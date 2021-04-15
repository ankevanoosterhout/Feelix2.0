export class TreeNode {
  data: any = null;
  linkId: string = null;
  children: Array<number> = [];
  parent: number = null;
  id: number = null;
  level: number = null;

  constructor(id: number, linkId: string, level: number, parent: number, children: Array<number>, data: any) {
    this.id = id;
    this.linkId = linkId;
    this.level = level;
    this.parent = parent;
    this.children = children;
    this.data = data;
  }
}

export class Tree {
  list: Array<TreeNode> = [];

  constructor() {}
}
