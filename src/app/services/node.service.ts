import { Injectable } from '@angular/core';
import { Coords } from '../models/node.model';
import { Node } from '../models/node.model';
import { Path } from '../models/node.model';
import { Scale } from '../models/node.model';
import { v4 as uuid } from 'uuid';
import { Subject } from 'rxjs';


@Injectable()
export class NodeService {

  paths: Array<Path> = [];

  public nodeObservable = new Subject<Path[]>();

  public selectedPaths: Array<string> = [];
  public selectedNodes: Array<string> = [];

  public clipboard = {
    copy: [],
    selectedNodes: [],
    selectedPaths: []
  };
  public scale = new Scale();
  public grid: any;
  public inputFieldsActive = false;


  addNode(id: string, path: string, type: string, pos: Coords, angle: Coords) {
    const node = new Node(id, path, null, type, pos, angle);
    let selectedNodeIndex = -1;
    if (this.selectedNodes.length > 0) { selectedNodeIndex = this.getNodeIndexByID(this.selectedNodes[0]); }
    if (this.paths.filter(p => p.id === path)[0].nodes.filter(n => n.type === 'node').length > 1 && selectedNodeIndex === 0) {
      this.paths.filter(p => p.id === path)[0].nodes.unshift(node);
    } else {
      this.paths.filter(p => p.id === path)[0].nodes.push(node);
    }
    this.selectedNodes = [id];
  }

  newNode(type: string, pos: Coords, angle: Coords): Node {
    // create new path
    if (this.selectedNodes.length === 0) {
      const nodePath = new Path(uuid());
      this.paths.push(nodePath);
      this.selectedPaths = [ nodePath.id ];
    } else if (this.selectedNodes.length === 1) {
      const path = this.getPath(this.selectedPaths[0]);
      if (path.box) {
        if (pos.x > path.box.left && pos.x < path.box.right) {
          return null;
        }
      }
    }
    const id = uuid();
    let snapCoords = this.calculateSnapPoint(pos);
    let snapCoordsAngle = this.calculateSnapPoint(angle);

    snapCoords = this.calculateGuideSnapPoint(snapCoords, this.grid.guides);
    snapCoordsAngle = this.calculateGuideSnapPoint(snapCoordsAngle, this.grid.guides);

    this.addNode(id, this.selectedPaths[0], type, snapCoords, snapCoordsAngle);
    const newNode = this.getNode(this.selectedPaths[0], id);
    return newNode;
  }

  updateNode(node: Node) {
    this.paths.filter(p => p.id === node.path)[0].nodes.filter(n => n.id === node.id && n.type === node.type && n.cp === node.cp)[0] = node;
  }

  deleteNode(id: string, path: string) {
    const pathEl = this.paths.filter(p => p.id === path)[0];
    const node = pathEl.nodes.filter(n => n.id === id);
    for (const n of node) {
      const index = pathEl.nodes.indexOf(n);
      pathEl.nodes.splice(index, 1);
    }
    const indexSelectedNodes = this.selectedNodes.indexOf(path);
    if (indexSelectedNodes > -1) {
      this.selectedNodes.splice(indexSelectedNodes, 1);
    }
  }

  deletePath(path: string) {
    const pathEl = this.paths.filter(p => p.id === path)[0];
    if (pathEl) {
      const index = this.paths.indexOf(pathEl);
      this.paths.splice(index, 1);
    }
    const indexSelectedPaths = this.selectedPaths.indexOf(path);
    if (indexSelectedPaths > -1) {
      this.selectedPaths.splice(indexSelectedPaths, 1);
    }
  }

  updateCP(cp: Node) {
    if (cp) {
      this.paths.filter(p => p.id === cp.path)[0].nodes.filter(n => n.cp === cp.cp && n.type === 'cp')[0] = cp;
    }
  }

  removeCP(node: Node, last = false) {
    const path = this.paths.filter(p => p.id === node.path)[0];
    const cp = path.nodes.filter(n => n.id === node.id && n.type === 'cp');
    if (last) {
      if (cp.length > 0) {
        const lastCP = cp[cp.length - 1];
        const index = path.nodes.indexOf(lastCP);
        path.nodes.splice(index, 1);
      }
    } else {
      if (cp) {
        for (const p of cp) {
          const index = path.nodes.indexOf(p);
          path.nodes.splice(index, 1);
        }
      }
    }
  }

  getNode(path: string, id: string): Node {
    const nodeArray = this.paths.filter(p => p.id === path)[0];
    if (nodeArray) {
      return nodeArray.nodes.filter(n => n.id === id)[0];
    }
  }

  getNodes(path: string, type: string): Array<Node> {
    return this.paths.filter(p => p.id === path)[0].nodes.filter(n => n.type === type);
  }

  getAllNodesWithID(id: string, path: string): Array<Node> {
    return this.paths.filter(p => p.id === path)[0].nodes.filter(n => n.id === id);
  }


  getNodeByID(id: string): Node {
    for (const path of this.paths) {
      const node = path.nodes.filter(n => n.id === id && n.type === 'node')[0];
      if (node) { return node; }
    }
  }


  getNodeByIndex(index: number, pathId: string): Node {
    const node = this.paths.filter(p => p.id === pathId)[0].nodes[index];
    if (node) { return node; }
  }


  getNumberOfNodes(path: string): number {
    return this.paths.filter(p => p.id === path)[0].nodes.filter(n => n.type === 'node').length;
  }


  getNodeIndexByID(id: string): number {
    for (const path of this.paths) {
      const node = path.nodes.filter(n => n.id === id && n.type === 'node')[0];
      if (node !== null) {
        return path.nodes.indexOf(node, 0);
      }
    }
  }


  getNodeIndex(path: string, id: string) {
    const nodePath = this.getPath(path);
    if (nodePath) {
      const node = nodePath.nodes.filter(n => n.id === id && n.type === 'node')[0];
      return nodePath.nodes.indexOf(node, 0);
    }
  }


  getNodeIndexNodes(node: Node) {
    const nodePath = this.getPath(node.path);
    return nodePath.nodes.filter(n => n.type === 'node').indexOf(node, 0);
  }


  getPath(id: string) {
    return this.paths.filter(p => p.id === id)[0];
  }


  selectPath(id: string, shift = false) {
    if (shift) {
      if (this.selectedPaths.indexOf(id) < 0) {
        this.selectedPaths.push(id);
      }
    } else {
      this.selectedPaths = [id];
    }
  }


  selectNode(id: string, shift: boolean) {
    if (shift) {
      if (this.selectedNodes.indexOf(id) < 0) {
        this.selectedNodes.push(id);
      }
    } else {
      this.selectedNodes = [id];
    }
  }


  selectAll() {
    this.deselectAll();
    for (const path of this.paths) {
      this.selectedPaths.push(path.id);
    }
  }


  copySelected() {
    this.clipboard.copy = [];
    this.clipboard.selectedNodes = [];
    this.clipboard.selectedPaths = [];

    for (const id of this.selectedPaths) {
      const path = this.getPath(id);
      const copyOfPath = this.copyPathEl(path);
      this.clipboard.selectedPaths.push(copyOfPath);
      for (const node of path.nodes.filter(n => n.type === 'node')) {
        if (this.selectedNodes.indexOf(node.id) > -1) {
          this.clipboard.selectedNodes.push(node);
        }
      }
    }
    // console.log('clipboard: ', this.clipboard);

    if (this.clipboard.selectedPaths.length === 0 && this.clipboard.selectedNodes.length === 0) {
      return true; // clipboard is empty
    }
    return false;
  }


  createCopyOfClipboard(distanceX: number, distanceY: number) {

    if (this.clipboard.selectedNodes.length > 0) {
      const nodeArray = [];
      const allIndexes = [];
      for (const path of this.clipboard.selectedPaths) {
        const indexes = [];
        for (const node of this.clipboard.selectedNodes) {
          const nodes = path.nodes.filter(n => n.id === node.id);
          if (nodes.length > 0) {
            for (const n of nodes) {
              const index = path.nodes.indexOf(n);
              const copy = new Node(uuid(), n.path, n.cp, n.type,
                { x: n.pos.x + distanceX, y: n.pos.y + distanceY },
                { x: n.angle.x + distanceX, y: n.angle.y + distanceY });
              nodeArray.push(copy);
              indexes.push({ c: copy, i: index });
            }
          }
        }
        allIndexes.push(indexes);
      }
      for (const list of allIndexes) {
        list.sort((a: { i: number; }, b: { i: number; }) => (a.i > b.i) ? 1 : -1);
        let nodes = [];
        let i = 0;
        for (const l of list) {
          if (i > 0 && l.i > list[i - 1].i + 1) {
            this.addPathToClipboardCopy(nodes);
            nodes = [];
          }
          nodes.push(l.c);
          i++;
        }
        if (nodes.length > 0) {
          this.addPathToClipboardCopy(nodes);
        }
      }
    } else if (this.clipboard.selectedPaths.length > 0 && this.clipboard.selectedNodes.length === 0) {
      for (const path of this.clipboard.selectedPaths) {
        const copyPath = new Path(uuid());
        for (const n of path.nodes) {
          const copy = new Node(n.id, copyPath.id, n.cp, n.type,
            { x: n.pos.x + distanceX, y: n.pos.y + distanceY },
            { x: n.angle.x + distanceX, y: n.angle.y + distanceY });
          copyPath.nodes.push(copy);
        }
        copyPath.box = path.box;
        copyPath.box.left += distanceX;
        copyPath.box.right += distanceX;
        this.clipboard.copy.push(copyPath);
      }
    }
  }

  addPathToClipboardCopy(nodes: Array<Node>) {
    const newPath = new Path(uuid());
    newPath.nodes = nodes;
    this.clipboard.copy.push(newPath);
  }


  pasteSelected(cursor: string, distance: { x: number, y: number}, shift = false) {

    if (this.clipboard.selectedPaths.length > 0 || this.clipboard.selectedNodes.length > 0) {
      this.deselectAll();
      if (shift) {
        this.createCopyOfClipboard(distance.x, distance.y);
      } else {
        this.createCopyOfClipboard(distance.x + 10, distance.y);
      }

      for (const clip of this.clipboard.copy) {
        this.selectedPaths.push(clip.id);
        if (cursor === 'dsel') {
          for (const node of clip.nodes.filter((n: { type: string; }) => n.type === 'node')) {
            this.selectedNodes.push(node.id);
          }
        }
        this.paths.push(clip);
      }
      // this.clipboard.copy = [];
    }
  }


  emptyClipboard() {
    this.clipboard = {
      copy: [],
      selectedNodes: [],
      selectedPaths: []
    };
  }


  deselectAll() {
    this.selectedNodes = [];
    this.selectedPaths = [];
  }


  addSelectedPath(id: string) {
    if (this.selectedPaths.indexOf(id) === -1) {
      this.selectedPaths.push(id);
    }
  }


  removeSelectedPath(id: string) {
    const index = this.selectedPaths.indexOf(id);
    if (index > -1) {
      this.selectedPaths.splice(index, 1);
    }
  }


  addSelectedNode(id: string) {
    if (this.selectedNodes.indexOf(id) === -1) {
      this.selectedNodes.push(id);
    }
  }


  removeSelectedNode(id: string) {
    const index = this.selectedNodes.indexOf(id);
    if (index > -1) {
      this.selectedNodes.splice(index, 1);
    }
  }


  setScale(x: any, y: any) {
    this.scale.scaleX = x;
    this.scale.scaleY = y;
  }


  setGridLayer(grid: any) {
    this.grid = grid;
  }


  loadFile(paths: Array<any>) {
    this.reset();
    this.paths = paths;
    this.selectedNodes = [];
    this.selectedPaths = [];
  }


  loadFileEaseFunction(effect: any) {
    // rescale path
    const str = JSON.stringify(effect.nodes);
    const effectNodes = JSON.parse(str);
    const yScale = effect.range.max - effect.range.min;
    const xScale = effect.duration;
    const offsetX = effect.time.start;
    const offsetY = effect.range.min;

    for (const path of effectNodes) {
      for (const n of path.nodes) {
        const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
        n.pos.x = old.x * xScale + offsetX;
        n.pos.y = old.y * yScale + offsetY;
        n.angle.x = old.ax * xScale + offsetX;
        n.angle.y = old.ay * yScale + offsetY;
      }
    }
    this.loadFile(effectNodes);
  }


  reverseLoadEaseFunction(effect: any) {

    const str = JSON.stringify(this.paths);
    const effectNodes = JSON.parse(str);
    const yScale = effect.range.max - effect.range.min;
    const xScale = effect.duration;
    const offsetX = effect.time.start;
    const offsetY = effect.range.min;

    for (const path of effectNodes) {
      for (const n of path.nodes) {
        const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
        n.pos.x = (old.x - offsetX) / xScale;
        n.pos.y = (old.y - offsetY) / yScale;
        n.angle.x = (old.ax - offsetX) / xScale;
        n.angle.y = (old.ay - offsetY) / yScale;
      }
    }
    return effectNodes;
  }




  scalePathCopy(box: any, module: any, type: string) {
    const paths = module.nodes;
    const strArray = [];
    const copyOfPaths = JSON.stringify(paths);
    const newPath = JSON.parse(copyOfPaths);

    let scaleX = box.width / module.details.duration;
    let scaleY = box.height / (module.details.range.max - module.details.range.min);

    let maxY = module.details.range.max;

    if (type === 'keyframe' || module.type === 'ease') {
      scaleX = box.width;
      scaleY = box.height;
      maxY = 1;
    }

    for (const path of newPath) {
      for (const n of path.nodes) {
        const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
        n.pos.x = old.x * scaleX;
        n.pos.y = (maxY - old.y) * scaleY;
      }
      if (path.nodes.filter(n => n.type === 'node').length > 1) {
        const str = this.returnCopyPathAsString(path);
        strArray.push(str);
      }
    }

    return strArray;
  }


  reset() {
    this.paths = [];
    // setScale(x: any, y: any);
  }


  getAll(): Array<Path> {
    return this.paths;
  }


  getAllSelectedPaths(): Array<Path> {
    const selected: Array<Path> = [];

    for (const pathID of this.selectedPaths) {
      const path = this.getPath(pathID);
      selected.push(path);
    }
    return selected;
  }


  deleteSelected() {
    if (!this.inputFieldsActive) {
      if (this.selectedNodes.length === 0 && this.selectedPaths.length > 0)  {
        for (const path of this.selectedPaths) {
          const p = this.getPath(path);
          const index = this.paths.indexOf(p);
          this.paths.splice(index, 1);
        }
        this.deselectAll();
      } else if (this.selectedNodes.length > 0 && this.selectedPaths.length > 0) {
        for (const path of this.selectedPaths) {
          this.deleteNodesFromPath(path, this.selectedNodes);
        }
      }
    }
  }


  deleteNodesFromPath(pathId: string, nodes: Array<string>) {
    let path = this.getPath(pathId);
    const copyPath = Object.assign(path);
    const nodeElements = [];

    for (const node of nodes) {
      const el = copyPath.nodes.filter(n => n.id === node && n.type === 'node');
      if (el) {
        for (const element of el) {
          nodeElements.push({ i: copyPath.nodes.indexOf(element), n: element });
        }
      }
    }
    const copyNodeArray = path.nodes.filter(n => n.type === 'node');
    if (copyNodeArray.length === nodeElements.length) {
      this.deletePath(pathId);
      return false;
    } else if (nodeElements.length > 0) {

      nodeElements.sort( (a, b) => {
        return b.i - a.i;
      });

      for (const nodeEl of nodeElements) {
        path = this.getPath(pathId);
        if (nodeEl.n === copyNodeArray[0] || nodeEl.n === copyNodeArray[copyNodeArray.length - 1]) {
          this.deleteNode(nodeEl.n.id, nodeEl.n.path);
        } else {
          this.splitPathAtNode(nodeEl.n, path);
        }
      }
    }
  }


  splitPathAtNode(node: Node, path: Path) {
    const index = path.nodes.indexOf(node);
    if (index > -1) {
      const copyPath = JSON.parse(JSON.stringify(path));
      const array = [
        copyPath.nodes.slice(0, index).filter(n => n.id !== node.id),
        copyPath.nodes.slice(index, path.nodes.length).filter(n => n.id !== node.id)
      ];
      this.deletePath(path.id);
      let i = 0;
      for (const a of array) {
        if (a.length > 0) {
          let newID = path.id;
          if (i > 0) { newID = uuid(); }
          for (const el of a) { el.path = newID; }
          const nodePath = new Path(newID);
          nodePath.nodes = a;
          this.paths.push(nodePath);
          this.selectedPaths.push(nodePath.id);
        }
        i++;
      }
    }
  }


  splitPathInTwo(id: string, pathId: string) {
    const path = this.getPath(pathId);
    const node = path.nodes.filter(n => n.id === id && n.type === 'node')[0];
    const nodeIndex = path.nodes.indexOf(node);
    const index = { first: nodeIndex, last: nodeIndex };
    if (path.nodes[nodeIndex + 1].id === node.id) { index.last += 1; }
    if (path.nodes[nodeIndex - 1].id === node.id) { index.first -= 1; }
    const array = [
      path.nodes.slice(0, index.last + 1),
      path.nodes.slice(index.first, path.nodes.length)
    ];
    const pathIndex = this.paths.indexOf(path);
    this.paths.splice(pathIndex, 1);
    this.selectedNodes = [];
    const newPaths = [];
    let i = 0;
    for (const arr of array) {
      if (arr.length > 0) {
        const newNodeID = uuid();
        const newID = uuid();
        for (const el of arr) {
          el.path = newID;
          if (i > 0) {
            if (array[0].filter(n => n.id === el.id).length > 0) {
              el.id = newNodeID;
            }
          }
        }
        const nodePath = new Path(newID);
        nodePath.nodes = JSON.parse(JSON.stringify(arr));
        newPaths.push(nodePath);
        this.paths.push(nodePath);
        this.selectedPaths.push(nodePath.id);
      }
      i++;
    }
    return newPaths;
  }

  createNewID(path: any, newID: string, oldNodeID = null, newNodeID = null) {
    for (const el of path) {
      el.path = newID;
      if (oldNodeID !== null && newNodeID !== null) {
        if (el.id === oldNodeID) {
          el.id = newNodeID;
        }
      }
    }
    return path;
  }

  createNewPathID(path: Array<Node>, newID: string, oldNodeID: string, newNodeID: string) {
    let newPath = new Path(newID);
    if (path.length > 0) {
      newPath = this.createNewID(path, newID, oldNodeID, newNodeID);
      const copyPath = JSON.stringify(path);
      newPath.nodes = JSON.parse(copyPath);
      this.paths.push(newPath);
      this.selectedPaths.push(newID);
    }
    return newPath;
  }

  addCP(node: Node, mouse: { x: number; y: number }) {
    const index = this.getNodeIndex(node.path, node.id);
    const cp1 = new Node(node.id, node.path, uuid(), 'cp',
                        { x: node.pos.x - (mouse.x - node.pos.x), y: node.pos.y - (mouse.y - node.pos.y) },
                        { x: node.pos.x - (mouse.x - node.pos.x), y: node.pos.y - (mouse.y - node.pos.y) });
    const cp2 = new Node(node.id, node.path, uuid(), 'cp', mouse, mouse);
    this.paths.filter(p => p.id === node.path)[0].nodes.splice(index + 1, 0, cp2);
    this.paths.filter(p => p.id === node.path)[0].nodes.splice(index, 0, cp1);
  }


  returnPathAsString(id: string, type = 'pos'): Array<object> {
    const nodes = this.paths.filter(p => p.id === id)[0].nodes;
    if (nodes) {
      const numberOfNodes = this.paths.filter(p => p.id === id)[0].nodes.filter(n => n.type === 'node');

      if (numberOfNodes.length > 1) {
        const pathStrArray = [];
        let pathStr = 'M';
        let n = 0;
        let idStr = '';

        nodes.forEach((node, index) => {

          if (node.type === 'node') {
            if (type === 'pos') {
              pathStr += ' ' + this.scale.scaleX(node.pos.x);
              pathStr += ' ' + this.scale.scaleY(node.pos.y);
            } else {
              pathStr += ' ' + this.scale.scaleX(node.angle.x);
              pathStr += ' ' + this.scale.scaleY(node.angle.y);
            }
            idStr += node.id + '&&';
            if (n > 0) {
              pathStrArray.push( { id: idStr, svgPath: pathStr, parent: id } );
              if (type === 'pos') {
                pathStr = 'M ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y);
              } else {
                pathStr = 'M ' + this.scale.scaleX(node.angle.x) + ' ' + this.scale.scaleY(node.angle.y);
              }
              idStr = node.id + '&&';
            }
            n++;
          } else if (node.type === 'cp' && index < nodes.length - 1 && index > 0) {

            if (type === 'pos') {
              if (nodes[index + 1].type === 'cp') {
                pathStr += ' C ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y);
              } else if (nodes[index - 1].type === 'node' && nodes[index + 1].type === 'node') {
                pathStr += ' Q ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y);
              } else {
                pathStr += ' ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y);
              }
            } else {
              if (nodes[index + 1].type === 'cp') {
                pathStr += ' C ' + this.scale.scaleX(node.angle.x) + ' ' + this.scale.scaleY(node.angle.y);
              } else if (nodes[index - 1].type === 'node' && nodes[index + 1].type === 'node') {
                pathStr += ' Q ' + this.scale.scaleX(node.angle.x) + ' ' + this.scale.scaleY(node.angle.y);
              } else {
                pathStr += ' ' + this.scale.scaleX(node.angle.x) + ' ' + this.scale.scaleY(node.angle.y);
              }
            }
          }
        });
        return pathStrArray;
      }
    }
  }


  returnCopyPathAsString(path: Path): Array<object> {
    const nodes = path.nodes;
    const numberOfNodes = path.nodes.filter(n => n.type === 'node');

    if (numberOfNodes.length > 1) {
      const pathStrArray = [];
      let pathStr = 'M';
      let n = 0;
      let idStr = '';

      nodes.forEach((node, index) => {

        if (node.type === 'node') {
          pathStr += ' ' + node.pos.x;
          pathStr += ' ' + node.pos.y;
          idStr += node.id + '&&';
          if (n > 0) {
            pathStrArray.push( { id: idStr, svgPath: pathStr, parent: path.id } );
            pathStr = 'M ' + node.pos.x + ' ' + node.pos.y;
            idStr = node.id + '&&';
          }
          n++;
        } else if (node.type === 'cp' && index < nodes.length - 1 && index > 0) {

          if (nodes[index + 1].type === 'cp') {
            pathStr += ' C ' + node.pos.x + ' ' + node.pos.y;
          } else if (nodes[index - 1].type === 'node' && nodes[index + 1].type === 'node') {
            pathStr += ' Q ' + node.pos.x + ' ' + node.pos.y;
          } else {
            pathStr += ' ' + node.pos.x + ' ' + node.pos.y;
          }
        }
      });
      return pathStrArray;
    }
  }


  returnPlaneAsString(id: string): Array<object> {
    const nodes = this.paths.filter(p => p.id === id)[0].nodes;
    const numberOfNodes = this.paths.filter(p => p.id === id)[0].nodes.filter(n => n.type === 'node');

    if (numberOfNodes.length > 1) {
      const planeStrArray = [];
      let pathStr = 'M ';
      const pathSegments = [];
      let tmpArray = [];

      for (const node of nodes) {
        if (node.type === 'node') {
          tmpArray.push(node);
          if (tmpArray.length > 1) {
            pathSegments.push(tmpArray);
            tmpArray = [ node ];
          }
        } else if (node.type === 'cp') {
          if (tmpArray.length > 0) {
            tmpArray.push(node);
          }
        }
      }

      for (const el of pathSegments) {

        pathStr += this.scale.scaleX(el[0].pos.x) + ' ' + this.scale.scaleY(el[0].pos.y);

        if (el.length === 3) { pathStr += ' Q'; } else if (el.length === 4) { pathStr += ' C'; }

        for (let i = 1; i < el.length; i++) {
          pathStr += ' ' + this.scale.scaleX(el[i].pos.x) + ' ' + this.scale.scaleY(el[i].pos.y);
        }
        pathStr += ' L ' + this.scale.scaleX(el[el.length - 1].angle.x) + ' ' + this.scale.scaleY(el[el.length - 1].angle.y);

        if (el.length === 3) { pathStr += ' Q'; } else if (el.length === 4) { pathStr += ' C'; }

        for (let i = el.length - 2; i >= 0; i--) {
          pathStr += ' ' + this.scale.scaleX(el[i].angle.x) + ' ' + this.scale.scaleY(el[i].angle.y);
        }
        pathStr += ' Z';

        planeStrArray.push( { id: el[0].id + '&&' + el[el.length - 1].id, svgPath: pathStr, parent: id } );
        pathStr = 'M ';
      }
      return planeStrArray;
    }
  }


  returnPenConnection(mouse: {x: number; y: number }): string {
    if (this.selectedNodes.length === 1 && this.selectedPaths.length === 1) {
      let path = '';
      const pathEl = this.paths.filter(p => p.id === this.selectedPaths[0])[0];
      if (pathEl) {
        const nodes = pathEl.nodes.filter(n => n.id === this.selectedNodes[0]);
        const node = nodes.filter(n => n.type === 'node')[0];
        if (nodes.length < 3) {
          path = 'M ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y) + ' ' + mouse.x + ' ' + mouse.y;
        } else {
          const index = this.getNodeIndexNodes(node);
          const typeNodes = pathEl.nodes.filter(n => n.type === 'node');
          const cp = nodes.filter(n => n.type === 'cp');

          if (index === typeNodes.length - 1) {
            path = 'M ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y) + ' Q ' +
                    this.scale.scaleX(cp[cp.length - 1].pos.x) + ' ' +
                    this.scale.scaleY(cp[cp.length - 1].pos.y) + ' ' + mouse.x + ' ' + mouse.y;
          } else if (index === 0 && typeNodes.length > 1) {
            path = 'M ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y) + ' Q ' +
                    this.scale.scaleX(cp[0].pos.x) + ' ' +
                    this.scale.scaleY(cp[0].pos.y) + ' ' + mouse.x + ' ' + mouse.y;
          }
        }
        return path;
      }
    }
  }


  returnPenConnectionClose(nodeEl: any): string {

    if (this.selectedNodes.length === 1 && this.selectedPaths.length === 1) {

      let path = '';
      const pathEl = this.paths.filter(p => p.id === this.selectedPaths[0])[0];
      const pathElConn = this.paths.filter(p => p.id === nodeEl.path)[0];
      if (pathEl) {
        const nodes = pathEl.nodes.filter(n => n.id === this.selectedNodes[0]);
        const nodesConn = pathElConn.nodes.filter(n => n.id === nodeEl.id && n.type === 'cp');
        let lastNode = null;
        if (nodesConn) {
          for (const n of nodesConn) {
            if (pathElConn.nodes.indexOf(n) === 0 || pathElConn.nodes.indexOf(n) === pathElConn.nodes.length - 1) {
              lastNode = n;
            }
          }
        }
        if (nodes.length === 1 && lastNode === null) {
          path = 'M ' + this.scale.scaleX(nodes[0].pos.x) + ' ' + this.scale.scaleY(nodes[0].pos.y) +
                 ' ' + this.scale.scaleX(nodeEl.pos.x) + ' ' + this.scale.scaleY(nodeEl.pos.y);
        } else if (nodes.length > 1 && nodesConn.length === 1) {
          const node = nodes.filter(n => n.type === 'node')[0];
          const index = this.getNodeIndexNodes(node);
          const cp = nodes.filter(n => n.type === 'cp');

          const typeNodes = pathEl.nodes.filter(n => n.type === 'node');

          if (index === typeNodes.length - 1) {
            path = 'M ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y) + ' Q ' +
                    this.scale.scaleX(cp[cp.length - 1].pos.x) + ' ' +
                    this.scale.scaleY(cp[cp.length - 1].pos.y) + ' ' +
                    this.scale.scaleX(nodeEl.pos.x) + ' ' + this.scale.scaleY(nodeEl.pos.y);
          } else if (index === 0 && typeNodes.length > 1) {
            path = 'M ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y) + ' Q ' +
                    this.scale.scaleX(cp[0].pos.x) + ' ' +
                    this.scale.scaleY(cp[0].pos.y) + ' ' +
                    this.scale.scaleX(nodeEl.pos.x) + ' ' + this.scale.scaleY(nodeEl.pos.y);
          }
        } else if (nodes.length > 1 && lastNode !== null) {
          const node = nodes.filter(n => n.type === 'node')[0];
          const index = this.getNodeIndexNodes(node);
          const cp = nodes.filter(n => n.type === 'cp');

          const typeNodes = pathEl.nodes.filter(n => n.type === 'node');

          if (index === typeNodes.length - 1) {
            path = 'M ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y) + ' C ' +
                    this.scale.scaleX(cp[cp.length - 1].pos.x) + ' ' +
                    this.scale.scaleY(cp[cp.length - 1].pos.y) + ' ' +
                    this.scale.scaleX(lastNode.pos.x) + ' ' +
                    this.scale.scaleY(lastNode.pos.y) + ' ' +
                    this.scale.scaleX(nodeEl.pos.x) + ' ' +
                    this.scale.scaleY(nodeEl.pos.y);
          } else if (index === 0 && typeNodes.length > 1) {
            path = 'M ' + this.scale.scaleX(node.pos.x) + ' ' + this.scale.scaleY(node.pos.y) + ' C ' +
                    this.scale.scaleX(cp[0].pos.x) + ' ' +
                    this.scale.scaleY(cp[0].pos.y) + ' ' +
                    this.scale.scaleX(lastNode.pos.x) + ' ' +
                    this.scale.scaleY(lastNode.pos.y) + ' ' +
                    this.scale.scaleX(nodeEl.pos.x) + ' ' +
                    this.scale.scaleY(nodeEl.pos.y);
          }
        }
        return path;
      }
    }
  }


  calculateCP(node: Node, mouse: { x: number; y: number}): Array<object> {

    const cpArray: Array<object> = [];
    const path = this.paths.filter(p => p.id === node.path)[0];
    if (path) {
      const occurrences = this.paths.filter(p => p.id === node.path)[0].nodes.filter(n => n.id === node.id);
      if (this.grid.snap) {
        mouse = this.calculateSnapPoint(mouse);
      }

      if (occurrences.length === 1) { this.addCP(node, mouse); }

      const nodes = this.paths.filter(p => p.id === node.path)[0].nodes;
      const index = nodes.indexOf(node);

      const bounds = { min: index - 2, max: index + 2 };
      if (bounds.min < 0) { bounds.min = 0; }
      if (bounds.max > nodes.length) { bounds.max = nodes.length; }

      for (let i = bounds.min; i < bounds.max; i++) {
        if (i !== index) {
          const el = this.paths.filter(p => p.id === node.path)[0].nodes[i];
          if (el.type === 'cp') {
            const nodeEl = this.paths.filter(p => p.id === node.path)[0].nodes.filter(n => n.type === 'node' && n.id === el.id)[0];
            if (el.id === node.id && i < index) {
              el.pos = { x: node.pos.x - (mouse.x - node.pos.x), y: node.pos.y - (mouse.y - node.pos.y) };
              el.angle = { x: node.pos.x - (mouse.x - node.pos.x), y: node.pos.y - (mouse.y - node.pos.y) };
            } else if (el.id === node.id  && i > index) {
              el.pos = { x: mouse.x, y: mouse.y };
              el.angle = { x: mouse.x, y: mouse.y };
            }
            cpArray.push( { cp: el, node: nodeEl });
            this.updateCP(el);
          }
        }
      }
    }
    return cpArray;
  }


  getUpdatedCP(node: Node, diff: { x: number; y: number }, single: boolean, type = 'pos'): Node {

    const mainNode = this.paths.filter(p => p.id === node.path)[0].nodes.filter(n => n.type === 'node' && n.id === node.id)[0];
    const oppositeCP = this.paths.filter(p => p.id === node.path)[0]
      .nodes.filter(n => n.type === 'cp' && n.id === node.id && n.cp !== node.cp)[0];

    const old = { x: node.pos.x, y: node.pos.y, ax: node.angle.x, ay: node.angle.y };

    if (type === 'pos') {
      node.pos = { x: old.x + diff.x, y: old.y + diff.y };
    }
    node.angle = { x: old.ax + diff.x, y: old.ay + diff.y };



    if (oppositeCP) {
      const angle = Math.atan(Math.abs(mainNode.pos.x - old.x) / Math.abs(mainNode.pos.y - old.y));
      const angleOpposite = Math.atan(Math.abs(oppositeCP.pos.x - mainNode.pos.x) / Math.abs(oppositeCP.pos.y - mainNode.pos.y));
      const distanceCP2 = Math.sqrt(Math.pow((oppositeCP.pos.y - mainNode.pos.y), 2) + Math.pow((oppositeCP.pos.x - mainNode.pos.x), 2));
      if (Math.round(angle * 1000) !== Math.round(angleOpposite * 1000)) {  single = true; }

      let newX: number;
      let newY: number;
      if (type === 'pos') {

        if (!single) {
          const angleNew = Math.atan(Math.abs(mainNode.pos.x - node.pos.x) / Math.abs(mainNode.pos.y - node.pos.y));
          newY = Math.cos(angleNew) * distanceCP2;
          newX = Math.sin(angleNew) * distanceCP2;

          if (mainNode.pos.x < node.pos.x) { newX *= -1; }
          if (mainNode.pos.y < node.pos.y) { newY *= -1; }
          oppositeCP.pos.x = mainNode.pos.x + newX;
          oppositeCP.pos.y = mainNode.pos.y + newY;

          oppositeCP.angle.x = mainNode.angle.x + newX;
          oppositeCP.angle.y = mainNode.angle.y + newY;
        }
        return oppositeCP;
      }
    }
  }


  getCP(node: Node): Array<object> {

    const cpArray: Array<object> = [];
    const nodes = this.paths.filter(p => p.id === node.path)[0].nodes;
    if (nodes.length > 0) {
      const index = nodes.indexOf(node);

      const bounds = { min: index - 2, max: index + 2 };
      if (bounds.min < 0) { bounds.min = 0; }
      if (bounds.max > nodes.length) { bounds.max = nodes.length; }

      for (let i = bounds.min; i < bounds.max; i++) {
        if (i !== index) {
          const el = this.paths.filter(p => p.id === node.path)[0].nodes[i];
          if (el.type === 'cp') {
            const nodeEl = this.paths.filter(p => p.id === node.path)[0].nodes.filter(n => n.type === 'node' && n.id === el.id)[0];
            cpArray.push( { cp: el, node: nodeEl });
          }
        }
      }
      return cpArray;
    }
  }


  moveNode(node: Node, diff: { x: number; y: number }, shift = false) {
    const nodes = this.paths.filter(p => p.id === node.path)[0].nodes.filter(n => n.id === node.id);
    if (shift) {
      if (Math.abs(diff.x) > Math.abs(diff.y)) { diff.y = 0; } else if (Math.abs(diff.y) > Math.abs(diff.x)) { diff.x = 0; }
    }
    for (const n of nodes) {
      const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
      n.pos.x = old.x + diff.x;
      n.pos.y = old.y + diff.y;
      n.angle.x = old.ax + diff.x;
      n.angle.y = old.ay + diff.y;
    }
  }


  moveAllSelectedNodes(diff: { x: number; y: number }, shift = false) {
    for (const n of this.selectedNodes) {
      const node = this.getNodeByID(n);
      this.moveNode(node, diff, shift);
    }
  }


  moveNodeAngle(node: Node, diff: { x: number }) {
    const nodes = this.paths.filter(p => p.id === node.path)[0].nodes.filter(n => n.id === node.id);
    for (const n of nodes) {
      const old = { ax: n.angle.x };
      n.angle.x = old.ax + diff.x;
    }
  }


  movePath(path: string, diff: { x: number; y: number }, shift = false) {
    const nodes = this.paths.filter(p => p.id === path)[0].nodes;
    if (shift) {
      if (Math.abs(diff.x) > Math.abs(diff.y)) { diff.y = 0; } else if (Math.abs(diff.y) > Math.abs(diff.x)) { diff.x = 0; }
    }
    for (const n of nodes) {
      const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
      n.pos.x = old.x + diff.x;
      n.pos.y = old.y + diff.y;
      n.angle.x = old.ax + diff.x;
      n.angle.y = old.ay + diff.y;
    }
    this.paths.filter(p => p.id === path)[0].box.left += diff.x;
    this.paths.filter(p => p.id === path)[0].box.right += diff.x;
    this.paths.filter(p => p.id === path)[0].box.top += diff.y;
    this.paths.filter(p => p.id === path)[0].box.bottom += diff.y;
  }


  scalePath(paths: Array<string>, scaleX: number, scaleY: number, offsetX: number, offsetY: number) {
    for (const path of paths) {
      const pathEl = this.paths.filter(p => p.id === path)[0];
      if (pathEl) {
        const nodes = pathEl.nodes;
        for (const n of nodes) {
          const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
          n.pos.x = ((old.x - offsetX) * scaleX) + offsetX;
          n.pos.y = ((old.y - offsetY) * scaleY) + offsetY;
          n.angle.x = ((old.ax - offsetX) * scaleX) + offsetX;
          n.angle.y = ((old.ay - offsetY) * scaleY) + offsetY;
        }
        // if (updateBox) {
          const oldBox = { left: pathEl.box.left, right: pathEl.box.right, top: pathEl.box.top, bottom: pathEl.box.bottom };
          pathEl.box.left = ((oldBox.left - offsetX) * scaleX) + offsetX;
          pathEl.box.right = ((oldBox.right - offsetX) * scaleX) + offsetX;
          pathEl.box.top = ((oldBox.top - offsetY) * scaleY) + offsetY;
          pathEl.box.bottom = ((oldBox.right - offsetY) * scaleY) + offsetY;
          pathEl.box.width = pathEl.box.right - pathEl.box.left;
          pathEl.box.height = pathEl.box.bottom - pathEl.box.top;
        // }
      }
    }
  }

  copyPath(path: Path, newID = null) {
    const newPath = this.copyPathEl(path, newID);
    this.paths.push(newPath);
    return newPath;
  }


  copyPathEl(path: Path, newID = null) {
    if (newID === null) { newID = uuid(); }
    const copy = JSON.stringify(path.nodes);
    const copyBox = JSON.stringify(path.box);
    const newPath = new Path(newID);
    newPath.nodes = JSON.parse(copy);
    for (const node of newPath.nodes) {
      node.path = newID;
    }
    for (const node of newPath.nodes.filter(n => n.type === 'node')) {
      const relatedNodes = newPath.nodes.filter(n => n.id === node.id);
      const newNodeID = uuid();
      for (const relatedNode of relatedNodes) {
        relatedNode.id = newNodeID;
      }
    }
    newPath.box = JSON.parse(copyBox);
    return newPath;
  }





  translatePath(id: string, translate: any) {
    const path = this.getPath(id);
    this.translate(path, translate);
  }

  translate(path: any, translate: any, updateBox = true) {
    for (const n of path.nodes) {
      const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
      n.pos.x = old.x + translate.horizontal;
      n.pos.y = old.y + translate.vertical;
      n.angle.x = old.ax + translate.horizontal;
      n.angle.y = old.ay + translate.vertical;
    }
    if (updateBox) {
      const oldBox = { left: path.box.left, right: path.box.right, top: path.box.top, bottom: path.box.bottom };
      path.box.left = oldBox.left + translate.horizontal;
      path.box.right = oldBox.right + translate.horizontal;
      path.box.top = oldBox.top + translate.vertical;
      path.box.bottom = oldBox.bottom + translate.vertical;
    }
  }

  translateSelectedPaths(translate: any) {
    const copies = [];
    if (translate.type === 'copy') {
      for (const id of this.selectedPaths) {
        const path = this.getPath(id);
        const copy = this.copyPath(path);
        copies.push(copy.id);
      }
      this.selectedPaths = copies;
      if (translate.preview) {
        translate.horizontal *= -1;
        translate.vertical *= -1;
      }
    } else if (!translate.preview && translate.type === 'preview') {
      translate.horizontal *= -1;
      translate.vertical *= -1;
    }
    for (const path of this.selectedPaths) {
      console.log(translate);
      this.translatePath(path, translate);
    }
  }

  translateElement(translate: any, shift = false) {
    if (this.selectedNodes.length > 0) {
      for (const id of this.selectedNodes) {
        const node = this.getNodeByID(id);
        this.moveNode(node, { x: translate.horizontal, y: translate.vertical }, shift);
      }
    } else if (this.selectedPaths.length > 0) {
      for (const path of this.selectedPaths) {
        if (translate.width !== 1 || translate.height !== 1) {
          this.scalePath([path], translate.width, translate.height, translate.offsetX, translate.offsetY);
        } else {
          this.translatePath(path, translate);
        }
      }
    }
  }


  mirrorPath(path: Path, mirrorLine: any, reflectX: boolean, reflectY: boolean) {
    // console.log(path, direction);
    for (const node of path.nodes) {
      const old = { x: node.pos.x, y: node.pos.y, ax: node.angle.x, ay: node.angle.y };
      if (reflectY) {
        const diff = {
          pos: mirrorLine.y - old.y,
          angle: mirrorLine.y - old.ay
        };
        node.pos.y = mirrorLine.y + diff.pos;
        node.angle.y = mirrorLine.y + diff.angle;
      }
      if (reflectX) {
        const diff = {
          pos: mirrorLine.x - old.x,
          angle: mirrorLine.x - old.ax
        };
        node.pos.x = mirrorLine.x + diff.pos;
        node.angle.x = mirrorLine.x + diff.angle;
      }
    }
    if (reflectX) {
      path.nodes.reverse();
    }
    // console.log(path);
    return JSON.parse(JSON.stringify(path));
  }



  checkIfNodeIsAtTheEndOfArrayFromID(nodeID: string) {
    const node = this.getNodeByID(nodeID);
    if (node && node.path === this.selectedPaths[0]) {
      return this.checkIfNodeIsAtTheEndOfArray(node) === -1 ? false : true;
    }
  }


  checkIfNodeIsAtTheEndOfArray(node: Node) {
    const nodes = this.paths.filter(p => p.id === node.path)[0].nodes.filter(n => n.type === 'node');
    if (nodes) {
      const index = nodes.indexOf(node);
      const arrayLength = nodes.length;

      if (index === 0 || index === arrayLength - 1) {
        return index;
      } else {
        return -1;
      }
    }
  }


  reverseNodes(path: string) {
    this.paths.filter(p => p.id === path)[0].nodes.reverse();
  }


  getSelectedElementsInBox(box: any, cursor: string, shift = false, alt = false) {
    if (!shift) {
      this.deselectAll();
    }
    for (const path of this.paths.filter(p => !p.lock)) {
      nodeLoop:
      for (const n of path.nodes) {
        if (n.pos.x >= box.x1 && n.pos.x <= box.x2 && n.pos.y >= box.y1 && n.pos.y <= box.y2) {
          if (cursor === 'dsel') {
            if (!alt) {
              this.addSelectedNode(n.id);
              this.addSelectedPath(path.id);
            } else {
              this.removeSelectedNode(n.id);
              this.removeSelectedPath(path.id);
            }
          } else if (cursor === 'sel') {
            if (!alt) {
              this.addSelectedPath(path.id);
            } else {
              this.removeSelectedPath(path.id);
            }
            break nodeLoop;
          }
        }
      }
    }
  }


  calculateSnapPoint(coords: { x: number, y: number }) {
    if (this.grid.snap && this.grid.visible) {
      const precision = {
        x: this.grid.settings.spacingX / (this.grid.settings.subDivisionsX),
        y: this.grid.settings.spacingY / (this.grid.settings.subDivisionsY)
      };
      const newCoords = { x: null,  y: null };
      const divisionX = coords.x / precision.x;
      const modX = coords.x - (Math.floor(divisionX) * precision.x);
      newCoords.x = modX > precision.x / 2 ? coords.x + (precision.x - modX) : coords.x - modX;

      const divisionY = coords.y / precision.y;
      const modY = coords.y - (Math.floor(divisionY) * precision.y);
      newCoords.y = modY > precision.y / 2 ? coords.y + (precision.y - modY) : newCoords.y = coords.y - modY;

      return newCoords;
    }
    return coords;
  }


  calculateStepSnapPoint(coords: { x: number, y: number }, stepSize: number, precision = 2) {
    const newCoords = { x: coords.x,  y: coords.y };
    const divisionX = Math.floor(coords.x / stepSize);
    let modX = coords.x - (divisionX * stepSize);
    if (modX > stepSize / 2) { modX -= stepSize; }
    if ((modX > precision * -1 && modX < precision)) {
      newCoords.x = coords.x - modX;
    }
    return newCoords;
  }


  calculateGuideSnapPoint(coords: { x: number, y: number }, guides: any) {
    if (this.grid.guides.length > 0 && this.grid.guidesVisible) {
      const newCoords = { x: coords.x,  y: coords.y };
      for (const guide of guides) {
        if (guide.axis === 'y') {
          if (Math.abs(coords.x - guide.coords.x) < 2) {
            newCoords.x = guide.coords.x;
          }
        } else if (guide.axis === 'x') {
          if (Math.abs(coords.y - guide.coords.y) < 2) {
            newCoords.y = guide.coords.y;
          }
        }
      }
      return newCoords;
    }
    return coords;
  }


  getNodesOfPathSegment(pathID: string, parent: string) {
    const nodesPathSegment = [];
    const nodeID = pathID.split('&&');
    const path = this.paths.filter(p => p.id === parent)[0];

    if (path) {
      const nodes = [ path.nodes.filter(n => n.id === nodeID[0] && n.type === 'node')[0],
                      path.nodes.filter(n => n.id === nodeID[1] && n.type === 'node')[0]];
      const index = [ path.nodes.indexOf(nodes[0]), path.nodes.indexOf(nodes[1]) ];

      if (index[0] > index[1]) {
        const tmp = index[0];
        index[0] = index[1];
        index[1] = tmp;
      }

      for (let i = index[0]; i <= index[1]; i++) {
        const node = path.nodes[i];
        nodesPathSegment.push(node);
      }
      return nodesPathSegment;
    }
  }


  getNodesOfPath(pathID: string, path: Path) {
    const nodesPathSegment = [];
    const nodeID = pathID.split('&&');

    const nodes = [ path.nodes.filter(n => n.id === nodeID[0] && n.type === 'node')[0],
                    path.nodes.filter(n => n.id === nodeID[1] && n.type === 'node')[0]];
    const index = [ path.nodes.indexOf(nodes[0]), path.nodes.indexOf(nodes[1]) ];

    if (index[0] > index[1]) {
      const tmp = index[0];
      index[0] = index[1];
      index[1] = tmp;
    }

    for (let i = index[0]; i <= index[1]; i++) {
      const node = path.nodes[i];
      nodesPathSegment.push(node);
    }
    return nodesPathSegment;

  }


  insertPathSegment(nodes: Array<Node>, path: string) {
    const pathEl = this.paths.filter(p => p.id === path)[0];
    const index = {
      first: pathEl.nodes.indexOf(nodes[0]),
      last: pathEl.nodes.indexOf(nodes[nodes.length - 1]),
    };
    if (index.last < index.first) {
      const tmp = index.first;
      index.first = index.last;
      index.last = tmp;
    }

    const array = [
      pathEl.nodes.slice(0, index.first),
      pathEl.nodes.slice(index.last + 1, pathEl.nodes.length)
    ];

    const concatNodeArray = array[0].concat(nodes, array[1]);
    pathEl.nodes = concatNodeArray;
  }


  changeNodeID(oldID: string, newID: string, pathID: string) {
    const nodes = this.paths.filter(p => p.id === pathID)[0].nodes.filter(n => n.id === oldID && n.path === pathID);
    if (nodes) {
      for (const n of nodes) {
        n.id = newID;
      }
    }
  }


  changeAllNodeID(path: string) {
    const nodes = this.paths.filter(p => p.id === path)[0].nodes.filter(n => n.type === 'node');
    for (const n of nodes) {
      this.changeNodeID(n.id, uuid(), path);
    }
  }


  updateForceAngle(id: string, path: string, distance: number, newX: number, cp: any) {
    const pathEl = this.paths.filter(p => p.id === path)[0];
    const node = pathEl.nodes.filter(n => n.id === id && n.type === 'node')[0];
    const old = { x: node.angle.x, y: node.angle.y };
    node.angle = {
      x: newX,
      y: old.y
    };

    this.updateNode(node);

    if (cp.length > 0) {

      let decr = [ 0.85, 0.85 ];
      const nodesOfPath = pathEl.nodes.filter(n => n.type === 'node');
      const index = nodesOfPath.indexOf(node);

      decr = index > 0 && nodesOfPath[index - 1].pos.x !== nodesOfPath[index - 1].angle.x ? [ 0.85, 1 ] : [ 0.6, 0.85 ] ;
      // if (index > 0) {
      //   if (nodesOfPath[index - 1].pos.x !== nodesOfPath[index - 1].angle.x ) {
      //     decr[1] = 1;
      //   }
      // } else {
      //   decr[0] = 0.6;
      // }
      // if (index < nodesOfPath.length - 1) {
      decr[0] = nodesOfPath.length - 1 && nodesOfPath[index + 1].pos.x !== nodesOfPath[index + 1].angle.x ? 1 : 0.6;
      //   if (nodesOfPath[index + 1].pos.x !== nodesOfPath[index + 1].angle.x ) {
      //     decr[0] = 1;
      //   }
      // } else {
      //   decr[0] = 0.6;
      // }

      let i = 0;
      for (const c of cp) {
        const nodeCP = pathEl.nodes.filter(n => n.id === id && n.cp === c.cp && n.type === 'cp')[0];
        if (nodeCP) {
          const oldVal = { x: nodeCP.pos.x, y: nodeCP.pos.x, xa: nodeCP.angle.x, ya: nodeCP.angle.y };
          nodeCP.angle = {
            x: c.angle.x + (distance * decr[i]),
            y: oldVal.ya
          };
          // console.log(decr[i]);
          this.updateCP(c);
        }
        i++;
      }
    }
  }


  mergePaths(first: string, second: string) {
    const firstPath = this.getPath(first);
    const secondPath = this.getPath(second);
    const indexSecondPath = this.paths.indexOf(secondPath);
    const mergedNodes = firstPath.nodes.concat(secondPath.nodes);
    for (const node of mergedNodes) {
      node.path = firstPath.id;
    }
    firstPath.nodes = mergedNodes;
    this.paths.splice(indexSecondPath, 1);
  }


  mergeKeyframePaths(list: Array<any>) {

    let totalDuration = 0;
    list.sort((a, b) => {
      return a.details.time.start - b.details.time.start;
    });

    const effectList = [];
    let effect = {
      path: null,
      nodes: [],
      rangeX: { start: list[0].details.time.start, end: list[0].details.time.start + totalDuration },
      rangeY: { min: list[0].details.range.min, max: list[0].details.range.max },
      position: { start: list[0].details.position.start, end: list[list.length - 1].details.position.end },
      bbox: list[0].nodes[0].box
    };
    let i = 0;

    for (const item of list) {
      if (item.type !== 'time') {

        totalDuration += item.details.duration;
        effect.rangeX.end = effect.rangeX.start + totalDuration;
        const copyPath = JSON.parse(JSON.stringify(item.nodes[0]));

        effect.rangeY.min = item.details.range.min < effect.rangeY.min ? item.details.range.min : effect.rangeY.min;
        effect.rangeY.max = item.details.range.max > effect.rangeY.max ? item.details.range.max : effect.rangeY.max;
        effect.bbox.left = item.details.time.start < effect.bbox.left ? item.details.time.start : effect.bbox.left;
        effect.bbox.right = item.details.time.end > effect.bbox.right ? item.details.time.end : effect.bbox.right;
        effect.bbox.top = item.details.range.max > effect.bbox.top ? item.details.range.max : effect.bbox.top;
        effect.bbox.bottom = item.details.range.min < effect.bbox.bottom ? item.details.range.min : effect.bbox.bottom;

        if (i < list.length && copyPath.nodes.length > 0) {
          this.scalePathNodes([copyPath], item.details.duration, item.details.range.max - item.details.range.min,
            copyPath.nodes.filter(n => n.type === 'node')[0].pos.x, 0, false);

          this.translate(copyPath, { vertical: item.details.range.min, horizontal: item.details.time.start });

          const nodeElements = copyPath.nodes.filter(n => n.type === 'node');
          const lastNode = nodeElements[nodeElements.length - 1].id;
          if (i < list.length - 1 && list[i + 1].type !== 'time') {
            for (const node of copyPath.nodes.filter(n => n.id === lastNode)) {
              const nodeIndex = copyPath.nodes.indexOf(node);
              copyPath.nodes.splice(nodeIndex, 1);
            }
          }
        }
        effect.nodes.push(copyPath.nodes);
      }
      if (item.type === 'time' || i === list.length - 1) {
        if (effect.nodes.length > 0) {
          effectList.push(effect);
        }
        totalDuration = 0;
        if (i < list.length - 1) {
          effect = {
            path: null,
            nodes: [],
            rangeX: list[i + 1].type !== 'time' ?
              { start: list[i + 1].details.time.start, end: list[i + 1].details.time.start + totalDuration } : null,
            rangeY: list[i + 1].type !== 'time' ? { min: list[i + 1].details.range.min, max: list[i + 1].details.range.max } : null,
            position: list[i + 1].type !== 'time' ?
              { start: list[i + 1].details.position.start, end: list[list.length - 1].details.position.end } : null,
            bbox: list[i + 1].type !== 'time' ? list[i + 1].nodes[0].box : null
          };
        }
      }
      i++;
    }

    for (const item of effectList) {
      let mergedNodeArray = [];
      let tmpNodeArray = item.nodes[0];
      let index = 0;
      if (item.nodes.length > 1) {
        for (const el of item.nodes) {
          if (index > 0) {
            mergedNodeArray = tmpNodeArray.concat(el);
            tmpNodeArray = mergedNodeArray;
          }
          index++;
        }
      } else {
        mergedNodeArray = tmpNodeArray;
      }
      const newID = uuid();
      item.path = new Path(newID);
      item.path.nodes = mergedNodeArray;
      item.path.box = item.bbox;
      for (const el of item.path.nodes) { el.path = newID; }
    }

    return effectList;
  }


  scalePathNodes(paths: Array<any>, scaleX: number, scaleY: number, offsetX: number, offsetY: number, inverse = false, angle = false) {
    for (const path of paths) {
      for (const n of path.nodes) {
        const old = !angle ? { x: n.pos.x, y: n.pos.y } : { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
        n.pos.x = ((old.x - offsetX) * scaleX) + offsetX;
        if (angle) { n.angle.x = ((old.ax - offsetX) * scaleX) + offsetX; }
        if (inverse) {
          n.pos.y = (((1 - old.y) - offsetY) * scaleY) + offsetY;
          if (angle) { n.angle.y = ((old.ay - offsetY) * scaleY) + offsetY; }
        } else {
          n.pos.y = ((old.y - offsetY) * scaleY) + offsetY;
          if (angle) { n.angle.y = (((1 - old.ay) - offsetY) * scaleY) + offsetY; }
        }
      }
    }
  }

  // scalePath(paths: Array<string>, scaleX: number, scaleY: number, offsetX: number, offsetY: number) {
  //   for (const path of paths) {
  //     const nodes = this.paths.filter(p => p.id === path)[0].nodes;
  //     for (const n of nodes) {
  //       const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
  //       n.pos.x = ((old.x - offsetX) * scaleX) + offsetX;
  //       n.pos.y = ((old.y - offsetY) * scaleY) + offsetY;
  //       n.angle.x = ((old.ax - offsetX) * scaleX) + offsetX;
  //       n.angle.y = ((old.ay - offsetY) * scaleY) + offsetY;
  //     }
  //   }
  // }


  getEndNodes(module: any, scale = true) {
    const position = { start: null, end: null };
    if (module.nodes !== null && module.nodes.length > 0) {
      const typeNode = module.nodes[0].nodes.filter(n => n.type === 'node');
      if (typeNode.length > 0) {
        position.start = typeNode[0].pos;
        position.end = typeNode[typeNode.length - 1].pos;

        for (const path of module.nodes) {
          const pathTypeNode = path.nodes.filter(n => n.type === 'node');
          for (const n of pathTypeNode) {
            if (n.pos.x < position.start.x) {
              position.start = n.pos;
            } else if (n.angle.x > position.end.x) {
              position.end = n.pos;
            }
          }
        }
        if (scale) {
          const scaleY = module.details.range.max - module.details.range.min;
          return {
            start: position.start.y * scaleY + module.details.range.min,
            end: position.end.y * scaleY + module.details.range.min
          };
        } else {
          return {
            start: position.start.y,
            end: position.end.y
          };
        }
      }
    }
    return {
      start: null,
      end: null
    };
  }




  updateUnits(oldUnits: number, newUnits: number) {
    if (oldUnits !== newUnits) {
      for (const path of this.paths) {
        this.scalePath([path.id], (newUnits / oldUnits), 1, 0, 0);
      }
    }
    return this.paths;
  }

  updateUnitsEffects(oldUnits: number, newUnits: number, effects: any) {
    const scale = (newUnits / oldUnits);
    for (const effect of effects) {
      const oldPosition = { start: effect.details.position.start, end: effect.details.position.end };
      effect.details.position.start = oldPosition.start * scale;
      effect.details.position.end = oldPosition.end * scale;
      if (effect.slug === 5) {
        const path = this.getPath(effect.path);
        path.box.left = effect.details.position.start;
        path.box.right = effect.details.position.end;
        path.box.width = path.box.right - path.box.left;
      }
    }
    return effects;
  }


  updateBoxSizePath(size: any, path: Path) {
    path.box = {
      left: this.scale.scaleX.invert(size.left),
      width: this.scale.scaleX.invert(size.right) - this.scale.scaleX.invert(size.left),
      top: this.scale.scaleY.invert(size.top),
      height: this.scale.scaleY.invert(size.top) - this.scale.scaleY.invert(size.bottom),
      right: this.scale.scaleX.invert(size.left) + (this.scale.scaleX.invert(size.right) - this.scale.scaleX.invert(size.left)),
      bottom: this.scale.scaleY.invert(size.bottom)
    };
    return path;
  }

  updatePathOnChangeEffectSize(pathID: string, left: number, right: number) {
    const path = this.getPath(pathID);
    if (path) {
      const offsetX = path.box.left;
      const scaleX = (right - left) / path.box.width;
      this.scalePath([pathID], scaleX, 1, offsetX, 0);
      if (left - path.box.left !== 0) {
        this.translatePath(pathID, { horizontal: (left - path.box.left), vertical: 0});
      }
      path.box.left = left;
      path.box.right = right;
      path.box.width = right - left;
    }
  }


  checkLineIntersection(line1StartX: number, line1StartY: number, line1EndX: number, line1EndY: number,
                        line2StartX: number, line2StartY: number, line2EndX: number, line2EndY: number) {

    let denominator: number;
    let a: number;
    let b: number;
    let numerator1: number;
    let numerator2: number;
    const result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator === 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in any, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
  }


  smoothenPath() {
    const path = this.getPath(this.selectedPaths[0]);
    if (path !== null) {
      const newPath = this.simplifyPath(path.nodes, 2.5);
      path.nodes = this.smoothenSimplifiedPath(newPath);
    }
  }


  simplifyPath_r(path: Array<Node>, first: number, last: number, eps: number) {
      if (first >= last - 1) { return [path[first]]; }

      const px = path[first].pos.x;
      const py = path[first].pos.y;

      const dx = path[last].pos.x - px;
      const dy = path[last].pos.y - py;

      const nn = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / nn;
      const ny = dx / nn;

      let ii = first;
      let max = -1;

      for (let i = first + 1; i < last; i++) {

          const qx = path[i].pos.x - px;
          const qy = path[i].pos.y - py;

          const d = Math.abs(qx * nx + qy * ny);
          if (d > max) {
              max = d;
              ii = i;
          }
      }

      if (max < eps) { return [path[first]]; }

      const p1 = this.simplifyPath_r(path, first, ii, eps);
      const p2 = this.simplifyPath_r(path, ii, last, eps);

      return p1.concat(p2);
  }

  simplifyPath(nodes: Array<Node>, eps: number) {
      const p = this.simplifyPath_r(nodes, 0, nodes.length - 1, eps);
      return p.concat([nodes[nodes.length - 1]]);
  }

  smoothenSimplifiedPath(nodes: Array<Node>) {
    const length = nodes.length;
    const xes = [];
    const yes = [];
    const newNodes = [];

    // Collect anchor coordinates
    for (let i = 0; i < length; i++) {
        const node = nodes[i];
        xes.push(node.pos.x);
        yes.push(node.pos.y);
    }

    // Compute control points p1 and p2 for x and y directions
    const pxes = this.computeControlPoints(xes);
    const pyes = this.computeControlPoints(yes);

    for (let i = 0; i < length - 1; i++) {
      const node = nodes[i];
      newNodes.push(node);

      const cp1 = new Node(node.id, node.path, uuid(), 'cp',
        { x: pxes.p1[i], y: pyes.p1[i] }, { x: pxes.p1[i], y: pyes.p1[i] });

      const cp2 = new Node(nodes[i + 1].id, node.path, uuid(), 'cp',
        { x: pxes.p2[i], y: pyes.p2[i] }, { x: pxes.p2[i], y: pyes.p2[i] });

      newNodes.push(cp1);
      newNodes.push(cp2);
    }
    newNodes.push(nodes[nodes.length - 1]);

    return newNodes;
  }


  computeControlPoints(K: any) {
    const p1 = [];
    const p2 = [];
    let m;
    const n = K.length - 1;

    const a = [];
    const b = [];
    const c = [];
    const r = [];

    a[0] = 0;
    b[0] = 2;
    c[0] = 1;
    r[0] = K[0] + 2 * K[1];

    for (let i = 1; i < n - 1; i++)  {
        a[i] = 1;
        b[i] = 4;
        c[i] = 1;
        r[i] = 4 * K[i] + 2 * K[i + 1];
    }

    a[n - 1] = 2;
    b[n - 1] = 7;
    c[n - 1] = 0;
    r[n - 1] = 8 * K[n - 1] + K[n];

    for (let i = 1; i < n; i++) {
      m = a[i] / b[i - 1];
      b[i] = b[i] - m * c[i - 1];
      r[i] = r[i] - m * r[i - 1];
    }

    p1[n - 1] = r[n - 1] / b[n - 1];
    for (let i = n - 2; i >= 0; i--) {
        p1[i] = (r[i] - c[i] * p1[i + 1]) / b[i];
    }

    for (let i = 0; i < n - 1; i++) {
        p2[i] = 2 * K[i + 1] - p1[i + 1];
    }

    p2[n - 1] = 0.5 * (K[n] + p1[n - 1]);

    return { p1: p1, p2: p2 };
  }



}


