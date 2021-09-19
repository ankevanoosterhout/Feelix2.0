import { Injectable } from '@angular/core';
import { Node } from '../models/node.model';
import { NodeService } from '../services/node.service';
import { v4 as uuid } from 'uuid';
import { CloneService } from './clone.service';


@Injectable()
export class BezierService {


  constructor(private nodeService: NodeService, private cloneService: CloneService) {}


  evalLBez(nodes: Array<Node>, t: number, axis: string, type: string) {
    if (type === 'force') {
      if (axis === 'x') {
        return ((1 - t) * nodes[0].pos.x) + (t * nodes[1].pos.x);
      } else {
        return ((1 - t) * nodes[0].pos.y) + (t * nodes[1].pos.y);
      }
    } else if (type === 'angle') {
      if (axis === 'x') {
        return ((1 - t) * nodes[0].angle.x) + (t * nodes[1].angle.x);
      } else {
        return ((1 - t) * nodes[0].angle.y) + (t * nodes[1].angle.y);
      }
    }
  }

  evalQBez(nodes: Array<Node>, t: number, axis: string, type: string) {
    if (type === 'force') {
      if (axis === 'x') {
        return (Math.pow((1 - t), 2) * nodes[0].pos.x) +
          (2 * (1 - t) * t * nodes[1].pos.x) +
          (Math.pow(t, 2) * nodes[2].pos.x);
      } else {
        return (Math.pow((1 - t), 2) * nodes[0].pos.y) +
          (2 * (1 - t) * t * nodes[1].pos.y) +
          (Math.pow(t, 2) * nodes[2].pos.y);
      }
    } else if (type === 'angle') {
      if (axis === 'x') {
        return (Math.pow((1 - t), 2) * nodes[0].angle.x) +
          (2 * (1 - t) * t * nodes[1].angle.x) +
          (Math.pow(t, 2) * nodes[2].angle.x);
      } else {
        return (Math.pow((1 - t), 2) * nodes[0].angle.y) +
          (2 * (1 - t) * t * nodes[1].angle.y) +
          (Math.pow(t, 2) * nodes[2].angle.y);
      }
    }
  }

  evalCBez(nodes: Array<Node>, t: number, axis: string, type: string) {
    if (type === 'force') {
      if (axis === 'x') {
        return (Math.pow((1 - t), 3) * nodes[0].pos.x) +
          (3 * Math.pow((1 - t), 2) * t * nodes[1].pos.x) +
          (3 * (1 - t) * Math.pow(t, 2) * nodes[2].pos.x) +
          ((Math.pow(t, 3) * nodes[3].pos.x));
      } else {
        return (Math.pow((1 - t), 3) * nodes[0].pos.y) +
          (3 * Math.pow((1 - t), 2) * t * nodes[1].pos.y) +
          (3 * (1 - t) * Math.pow(t, 2) * nodes[2].pos.y) +
          ((Math.pow(t, 3) * nodes[3].pos.y));
      }
    } else if (type === 'angle') {
      if (axis === 'x') {
        return (Math.pow((1 - t), 3) * nodes[0].angle.x) +
          (3 * Math.pow((1 - t), 2) * t * nodes[1].angle.x) +
          (3 * (1 - t) * Math.pow(t, 2) * nodes[2].angle.x) +
          ((Math.pow(t, 3) * nodes[3].angle.x));
      } else {
        return (Math.pow((1 - t), 3) * nodes[0].angle.y) +
          (3 * Math.pow((1 - t), 2) * t * nodes[1].angle.y) +
          (3 * (1 - t) * Math.pow(t, 2) * nodes[2].angle.y) +
          ((Math.pow(t, 3) * nodes[3].angle.y));
      }
    }
  }


  // derivatives

  d_evalQBez(nodes: Array<Node>, t: number, axis: string) {

    if (axis === 'x') {
      return (2 * (1 - t) * ( nodes[1].pos.x - nodes[0].pos.x)) +
             (2 * t * (nodes[2].pos.x - nodes[1].pos.x));
    } else if (axis === 'y') {
      return (2 * (1 - t) * ( nodes[1].pos.y - nodes[0].pos.y)) +
             (2 * t * (nodes[2].pos.y - nodes[1].pos.y));
    }
  }

  d_evalCBez(nodes: Array<Node>, t: number, axis: string) {

    if (axis === 'x') {
      return (Math.pow((3 * (1 - t)), 2) * (nodes[1].pos.x - nodes[0].pos.x)) +
           (6 * (1 - t) * t * (nodes[2].pos.x - nodes[1].pos.x)) +
           (Math.pow((3 * t), 2) * (nodes[3].pos.x - nodes[2].pos.x));

    } else if (axis === 'y') {
      return (Math.pow((3 * (1 - t)), 2) * (nodes[1].pos.y - nodes[0].pos.y)) +
           (6 * (1 - t) * t * (nodes[2].pos.y - nodes[1].pos.y)) +
           (Math.pow((3 * t), 2) * (nodes[3].pos.y - nodes[2].pos.y));
    }
  }


  getCurveLength(nodes: any) {
    const chord = [ Math.sqrt(Math.pow((nodes[0].pos.x - nodes[nodes.length - 1].pos.x), 2) +
                    Math.pow((nodes[0].pos.y - nodes[nodes.length - 1].pos.y), 2)),
                    Math.sqrt(Math.pow((nodes[0].angle.x - nodes[nodes.length - 1].angle.x), 2) +
                    Math.pow((nodes[0].angle.y - nodes[nodes.length - 1].angle.y), 2))];

    const controlLines = [0, 0];
    for (let i = 0; i < nodes.length - 1; i++) {
        controlLines[0] += Math.sqrt(Math.pow((nodes[i + 1].pos.x - nodes[i].pos.x), 2) + Math.pow((nodes[i + 1].pos.y - nodes[i].pos.y), 2));
        controlLines[1] += Math.sqrt(Math.pow((nodes[i + 1].angle.x - nodes[i].angle.x), 2) + Math.pow((nodes[i + 1].angle.y - nodes[i].angle.y), 2));
    }
    if (nodes.length === 2) {
        return [chord[0], chord[1]];
    } else {
        return [(chord[0] + controlLines[0]) / 2, (chord[1] + controlLines[1]) / 2];
    }
  }

  // find boundingBox Cubic bezier

  findBBoxCubicBezier(nodes: Array<Node>) {
    let tYb = 0;
    let tYt = 0;
    let a = 3 * nodes[3].pos.x - 9 * nodes[2].pos.x + 9 * nodes[1].pos.x - 3 * nodes[0].pos.x;
    let b = 6 * nodes[0].pos.x - 12 * nodes[1].pos.x + 6 * nodes[2].pos.x;
    let c = 3 * nodes[1].pos.x - 3 * nodes[0].pos.x;

    let disc = b * b - 4 * a * c;
    let xleft = nodes[0].pos.x;
    let xright = nodes[0].pos.x;

    if (nodes[3].pos.x < xleft) { xleft = nodes[3].pos.x; }
    if (nodes[3].pos.x > xright) { xright = nodes[3].pos.x; }

    if (disc >= 0) {
      const t1 = (-b + Math.sqrt(disc)) / (2 * a);
      if (t1 > 0 && t1 < 1) {
          const xPoint1 = this.evalCBez(nodes, t1, 'x', 'force');
          if (xPoint1 < xleft) { xleft = xPoint1; }
          if (xPoint1 > xright) { xright = xPoint1; }
      }

      const t2 = (-b - Math.sqrt(disc)) / (2 * a);
      if (t2 > 0 && t2 < 1) {
          const xValueAndCategory = this.evalCBez(nodes, t2, 'x', 'force');
          if (xValueAndCategory < xleft) { xleft = xValueAndCategory; }
          if (xValueAndCategory > xright) { xright = xValueAndCategory; }
      }
    }

    a = 3 * nodes[3].pos.y - 9 * nodes[2].pos.y + 9 * nodes[1].pos.y - 3 * nodes[0].pos.y;
    b = 6 * nodes[0].pos.y - 12 * nodes[1].pos.y + 6 * nodes[2].pos.y;
    c = 3 * nodes[1].pos.y - 3 * nodes[0].pos.y;

    disc = b * b - 4 * a * c;
    let ybottom = nodes[0].pos.y;
    let ytop = nodes[0].pos.y;

    if (nodes[3].pos.y < ybottom) { ybottom = nodes[3].pos.y; }
    if (nodes[3].pos.y > ytop) { ytop = nodes[3].pos.y; }

    if (disc >= 0) {

      const t1 = (-b + Math.sqrt(disc)) / (2 * a);

      if (t1 > 0 && t1 < 1) {
        const yPoint1 = this.evalCBez(nodes, t1, 'y', 'force');
        if (yPoint1 < ybottom) {
            ybottom = yPoint1;
            tYb = t1;
        }
        if (yPoint1 > ytop) {
            ytop = yPoint1;
            tYt = t1;
        }
      }

      const t2 = (-b - Math.sqrt(disc)) / (2 * a);

      if (t2 > 0 && t2 < 1) {
        const yValueAndCategory = this.evalCBez(nodes, t2, 'y', 'force');
        if (yValueAndCategory < ybottom) {
            ybottom = yValueAndCategory;
            tYb = t2;
        }
        if (yValueAndCategory > ytop) {
            ytop = yValueAndCategory;
            tYt = t2;
        }
      }
    }
    return {
      left: xleft,
      top: ytop,
      right: xright,
      bottom: ybottom,
      Yb: tYb,
      Yt: tYt
    };
  }



  findBBoxQuadraticBezier(nodes: Array<Node>) {
    let tYb = 0;
    let tYt = 0;
    const tX = (nodes[0].pos.x - nodes[1].pos.x) / (nodes[0].pos.x - 2 * nodes[1].pos.x + nodes[2].pos.x);
    const tY = (nodes[0].pos.y - nodes[1].pos.y) / (nodes[0].pos.y - 2 * nodes[1].pos.y + nodes[2].pos.y);

    let xleft = nodes[0].pos.x;
    let xright = nodes[0].pos.x;

    if (nodes[2].pos.x < xleft) { xleft = nodes[2].pos.x; }
    if (nodes[2].pos.x > xright) { xright = nodes[2].pos.x; }

    if (tX > 0 && tX < 1) {
      const x = this.evalQBez(nodes, tX, 'x', 'force');
      if (x < xleft) { xleft = x; }
      if (x > xright) { xright = x; }
    }

    let ybottom = nodes[0].pos.y;
    let ytop = nodes[0].pos.y;
    if (nodes[2].pos.y < ybottom) { ybottom = nodes[2].pos.y; }
    if (nodes[2].pos.y > ytop) { ytop = nodes[2].pos.y; }

    if (tY > 0 && tY < 1) {
      const y = this.evalQBez(nodes, tY, 'y', 'force');
      if (y < ybottom) {
          tYb = tY;
          ybottom = y;
      }
      if (y > ytop) {
          tYt = tY;
          ytop = y;
      }
    }

    return {
      left: xleft,
      top: ytop,
      right: xright,
      bottom: ybottom,
      Yb: tYb,
      Yt: tYt
    };
  }



  getBBoxSizePath(Path: any) {
    let nodes = [];
    let boxSize = { id: '', left: null, top: null, right: null, bottom: null, width: null, height: null };
    const boxes = [];

    for (const node of Path.nodes) {
      nodes.push(node);
      if (node.type === 'node') {
        if (nodes.filter(n => n.type === 'node').length > 1) {
          const rectangle = this.getBBoxSize(nodes);
          rectangle.id = Path.id;
          boxes.push(rectangle);
        }
        const lastEl = nodes[nodes.length - 1];
        nodes = [ lastEl ];
      }
    }
    if (boxes.length > 0) {
      boxSize = { id: Path.id, left: boxes[0].left, top: boxes[0].top, right: boxes[0].right, bottom: boxes[0].bottom, width: boxes[0].width, height: boxes[0].height };
      for (const el of boxes) {
        if (el.left < boxSize.left) { boxSize.left = el.left; }
        if (el.top < boxSize.top) { boxSize.top = el.top; }
        if (el.right > boxSize.right) { boxSize.right = el.right; }
        if (el.bottom > boxSize.bottom) { boxSize.bottom = el.bottom; }
      }
      boxSize.height = boxSize.bottom - boxSize.top;
      boxSize.width = boxSize.right - boxSize.left;

      return { box: boxSize, allBoxes: boxes, path: this.nodeService.updateBoxSizePath(boxSize, Path) };
    }
  }


  getBBoxSize(nodes: Array<Node>): any {
    let rectangle = { id: null, left: 0, top: 0, bottom: 0, right: 0, width: 0, height: 0, tYb: null, tYt: null };

    if (nodes.length === 2 && nodes[0].type === 'node') {
      rectangle.width = Math.abs(this.nodeService.scale.scaleX(nodes[1].pos.x) - this.nodeService.scale.scaleX(nodes[0].pos.x));
      rectangle.height = Math.abs(this.nodeService.scale.scaleY(nodes[1].pos.y) - this.nodeService.scale.scaleY(nodes[0].pos.y));


      if (rectangle.height < 1) { rectangle.height = 2; }
      if (rectangle.width < 1) { rectangle.width = 2; }
      rectangle.left = this.nodeService.scale.scaleX(nodes[0].pos.x);
      rectangle.top = this.nodeService.scale.scaleY(nodes[0].pos.y);

      if (rectangle.left > this.nodeService.scale.scaleX(nodes[1].pos.x)) {
        rectangle.left = this.nodeService.scale.scaleX(nodes[1].pos.x);
      }
      if (rectangle.top > this.nodeService.scale.scaleY(nodes[1].pos.y)) {
        rectangle.top = this.nodeService.scale.scaleY(nodes[1].pos.y);
      }
      rectangle.bottom = rectangle.top + rectangle.height;
      rectangle.right = rectangle.left + rectangle.width;

    } else if (nodes.length === 3) {

      const details = this.findBBoxQuadraticBezier(nodes);

      rectangle = {
        left: this.nodeService.scale.scaleX(details.left),
        top: this.nodeService.scale.scaleY(details.top),
        width: this.nodeService.scale.scaleX(details.right) - this.nodeService.scale.scaleX(details.left),
        height: this.nodeService.scale.scaleY(details.bottom) - this.nodeService.scale.scaleY(details.top),
        bottom: this.nodeService.scale.scaleY(details.bottom),
        right: this.nodeService.scale.scaleX(details.right),
        id: null,
        tYb: details.Yb,
        tYt: details.Yt
      };

    } else if (nodes.length === 4) {

      const details = this.findBBoxCubicBezier(nodes);

      rectangle = {
        left: this.nodeService.scale.scaleX(details.left),
        top: this.nodeService.scale.scaleY(details.top),
        width: this.nodeService.scale.scaleX(details.right) - this.nodeService.scale.scaleX(details.left),
        height: this.nodeService.scale.scaleY(details.bottom) - this.nodeService.scale.scaleY(details.top),
        bottom: this.nodeService.scale.scaleY(details.bottom),
        right: this.nodeService.scale.scaleX(details.right),
        id: null,
        tYb: details.Yb,
        tYt: details.Yt
      };
    }

    return rectangle;
  }



  findClosestPointOnPath(mouse: { x: number, y: number}, nodes: Array<Node>, pathID: string) {

    const nodeID = pathID.split('&&');
    const startX = nodes.filter(n => n.type === 'node' && n.id === nodeID[0])[0].pos.x;
    const endX = nodes.filter(n => n.type === 'node' && n.id === nodeID[1])[0].pos.x;

    // tslint:disable-next-line:variable-name
    const time = ((mouse.x - startX) / (endX - startX));
    let coords: { x: any; y: any; t: number; };

    if ( time > 0 && time < 1) {

        if (nodes.length === 2) {
            coords = {
                x: this.nodeService.scale.scaleX(this.evalLBez(nodes, time, 'x', 'force')),
                y: this.nodeService.scale.scaleY(this.evalLBez(nodes, time, 'y', 'force')),
                t: time
            };
        } else if (nodes.length === 3) {
            coords = {
                x: this.nodeService.scale.scaleX(this.evalQBez(nodes, time, 'x', 'force')),
                y: this.nodeService.scale.scaleY(this.evalQBez(nodes, time, 'y', 'force')),
                t: time
            };
        } else if (nodes.length === 4) {
            coords = {
                x: this.nodeService.scale.scaleX(this.evalCBez(nodes, time, 'x', 'force')),
                y: this.nodeService.scale.scaleY(this.evalCBez(nodes, time, 'y', 'force')),
                t: time
            };
        }

        return coords;
    }
    return null;
  }


  splitPath(nodes: Array<Node>, path: string, mouse: { x: number, y: number }) {
    const pathRange = this.getCurveLength(nodes);
    const t = 1 / pathRange[0];
    const newNodes: Array<Node> = [];
    let tClosest: number;
    const newCP = [];
    const newNodeID = uuid();
    const newNode = new Node(newNodeID, path, null, 'node', mouse, mouse);

    for (const n of nodes) {
      newNodes.push(n);
    }

    if (nodes.length === 4) {

        newNodes.splice(2, 0, newNode);

        const coordinateArray = this.getAllCoordinatesCubicBezier(pathRange[0], t, nodes);
        tClosest = this.closestIndex(mouse.x, coordinateArray) * t;

        const paths = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            const tPath = {
              pos: {
                x: this.evalLBez([nodes[i], nodes[i + 1]], tClosest, 'x', 'force'),
                y: this.evalLBez([nodes[i], nodes[i + 1]], tClosest, 'y', 'force')
              }
            };
            paths.push(tPath);
        }

        for (let i = 0; i < 2; i++) {
            const newNodeCP = {
              pos: {
                x: this.evalLBez([ paths[i], paths[i + 1]], tClosest, 'x', 'force'),
                y: this.evalLBez([ paths[i], paths[i + 1]], tClosest, 'y', 'force')
              }
            };
            newCP.push(newNodeCP);
        }

        newNodes[1].pos = paths[0].pos;
        newNodes[3].pos = paths[2].pos;
        newNodes[1].angle = paths[0].pos;
        newNodes[3].angle = paths[2].pos;

        const newCP1 = new Node(newNodeID, path, uuid(), 'cp', newCP[0].pos, newCP[0].pos);
        newNodes.splice(2, 0, newCP1);
        const newCP2 = new Node(newNodeID, path, uuid(), 'cp', newCP[1].pos, newCP[1].pos);
        newNodes.splice(4, 0, newCP2);

    } else if (nodes.length === 3) {

        const coordinateArray = this.getAllCoordinatesQuadraticBezier(pathRange[0], t, nodes);
        tClosest = this.closestIndex(mouse.x, coordinateArray) * t;

        const paths = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            const tPath = {
              pos: {
                x: this.evalLBez([nodes[i], nodes[i + 1]], tClosest, 'x', 'force'),
                y: this.evalLBez([nodes[i], nodes[i + 1]], tClosest, 'y', 'force')
              }
            };
            paths.push(tPath);
        }

        if (nodes[0].id === nodes[1].id) {
          newNodes.splice(2, 0, newNode);

          const newCP2 = new Node(newNodeID, path, uuid(), 'cp', paths[1].pos, paths[1].pos);
          newNodes.splice(3, 0, newCP2);
          // change quadratic curve to cubic curve
          const QP = [
              { x: newNodes[0].pos.x, y: newNodes[0].pos.y },
              { x: paths[0].pos.x, y: paths[0].pos.y },
              { x: mouse.x, y: mouse.y }
          ];
          newNodes[1].pos.x = QP[0].x + (2 / 3) * (QP[1].x - QP[0].x);
          newNodes[1].pos.y = QP[0].y + (2 / 3) * (QP[1].y - QP[0].y);
          newNodes[1].angle.x = QP[0].x + (2 / 3) * (QP[1].x - QP[0].x);
          newNodes[1].angle.y = QP[0].y + (2 / 3) * (QP[1].y - QP[0].y);

          // const newCP1Points = {
          //   pos: { x: QP[2].x + (2 / 3) * (QP[1].x - QP[2].x),
          //          y: QP[2].y + (2 / 3) * (QP[1].y - QP[2].y) }
          // };
          // const newCP1 = new Node(newNodeID, path, uuid(), 'cp', newCP1Points.pos, newCP1Points.pos);
          // newNodes.splice(2, 0, newCP1);


      } else if (nodes[1].id === nodes[2].id) {
          newNodes.splice(1, 0, newNode);

          const newCP1 = new Node(newNodeID, path, uuid(), 'cp', paths[0].pos, paths[0].pos);
          newNodes.splice(1, 0, newCP1);

          const QP = [
              { x: mouse.x, y: mouse.y },
              { x: paths[1].pos.x, y: paths[1].pos.y },
              { x: newNodes[newNodes.length - 1].pos.x, y: newNodes[newNodes.length - 1].pos.y }
          ];

          // const newCP2Points = {
          //   pos: { x: QP[0].x + (2 / 3) * (QP[1].x - QP[0].x),
          //          y: QP[0].y + (2 / 3) * (QP[1].y - QP[0].y) }
          // };

          // const newCP2 = new Node(newNodeID, path, uuid(), 'cp', newCP2Points.pos, newCP2Points.pos);
          // newNodes.splice(1, 0, newCP2);

          newNodes[newNodes.length - 2].pos.x = QP[2].x + (2 / 3) * (QP[1].x - QP[2].x);
          newNodes[newNodes.length - 2].pos.y = QP[2].y + (2 / 3) * (QP[1].y - QP[2].y);
          newNodes[newNodes.length - 2].angle.x = QP[2].x + (2 / 3) * (QP[1].x - QP[2].x);
          newNodes[newNodes.length - 2].angle.y = QP[2].y + (2 / 3) * (QP[1].y - QP[2].y);
      }
    } else if (nodes.length === 2) {
      newNodes.splice(1, 0, newNode);
    }
    return { nodes: newNodes, _newNode: newNode };
  }


  getAllCoordinatesQuadraticBezier(range: number, tValue: number, p: any) {
    const values = [];
    for (let i = 0; i < range; i++) {
        const t = i * tValue;
        const coordinates = {
            x: (1 - t) * (1 - t) * p[0].pos.x + 2 * (1 - t) * t * p[1].pos.x + t * t * p[2].pos.x,
            y: (1 - t) * (1 - t) * p[0].pos.y + 2 * (1 - t) * t * p[1].pos.y + t * t * p[2].pos.y,
        };
        values.push( coordinates );
    }
    return values;
  }


  getAllCoordinatesCubicBezier(range: number, tValue: number, p: any) {
    const values = [];
    for (let i = 0; i < range; i++) {
        const t = i * tValue;
        const coordinates = {
            x: (1 - t) * (1 - t) * (1 - t) * p[0].pos.x + 3 * (1 - t) * (1 - t) *
                t * p[1].pos.x + 3 * (1 - t) * t * t * p[2].pos.x + t * t * t * p[3].pos.x,
            y: (1 - t) * (1 - t) * (1 - t) * p[0].pos.y + 3 * (1 - t) * (1 - t) *
                t * p[1].pos.y + 3 * (1 - t) * t * t * p[2].pos.y + t * t * t * p[3].pos.y
        };
        values.push( coordinates );
    }
    return values;
  }


  closestIndex(num: number, arr: any) {
    let current = arr[0].x;
    let index = 0;
    let diff = Math.abs(num - current);
    for (let val = 1; val < arr.length; val++) {
        const newDiff = Math.abs(num - arr[val].x);
        if (newDiff < diff) {
            diff = newDiff;
            current = arr[val].x;
            index = val;
        }
    }
    return index;
  }


  getForceControlPointValues(id: string, pathId: string) {

    const pathSegments = this.getPathSegments(id, pathId);
    const cpPoints = [];
    if (pathSegments) {
      for (const el of pathSegments) {
        if (el.nodes.filter(n => n.type === 'cp').length > 0) {
          const normal = this.normal(0.5, el.nodes);
          // console.log(normal);
          const copy = this.cloneService.deepClone(el.nodes);
          const points = this.splitPath(copy, pathId, { x: normal.cX, y: normal.cY });
          // console.log(points.nodes);
          const newPoints = points.nodes.filter(n => n.id === id && n.type === 'cp')[0];
          cpPoints.push(newPoints);
        }
      }
    }
    return cpPoints;
  }


  normal(t: number, nodes: any) {
    const dXn = (nodes.length === 3) ? this.d_evalQBez(nodes, t, 'x') : this.d_evalCBez(nodes, t, 'x');
    const cXn = (nodes.length === 3) ? this.evalQBez(nodes, t, 'x', 'force') : this.evalCBez(nodes, t, 'x', 'force');
    const dYn = (nodes.length === 3) ? this.d_evalQBez(nodes, t, 'y') : this.d_evalCBez(nodes, t, 'y');
    const cYn = (nodes.length === 3) ? this.evalQBez(nodes, t, 'y', 'force') : this.evalCBez(nodes, t, 'y', 'force');
    const q = Math.sqrt(dXn * dXn + dYn * dYn);
    return { x: -dYn / q, y: dXn / q, cX: cXn, cY: cYn };
  }


  getPathSegments(id: string, pathId: string) {
    const nodeType = this.nodeService.getNodes(pathId, 'node');
    const node = nodeType.filter(n => n.id === id)[0];
    const index = nodeType.indexOf(node, 0);
    const pathSegments = [];
    const parent = { prev: null, next: null };

    if (index > 0) {
      const prevNodeID = nodeType[index - 1].id;
      parent.prev = prevNodeID + '&&' + id;
      pathSegments.push({ nodes: this.nodeService.getNodesOfPathSegment(parent.prev, pathId) });
    }
    if (index < nodeType.length - 1) {
      const nextNodeID = nodeType[index + 1].id;
      parent.next = id + '&&' + nextNodeID;
      pathSegments.push({ nodes: this.nodeService.getNodesOfPathSegment(parent.next, pathId) });
    }
    return pathSegments;
  }


  updateForceAngleNodesPath(id: string, pathId: string) {
    const pathSegments = this.getPathSegments(id, pathId);

    if (pathSegments) {
      const boundsPathSegments = [];
      const newNodes = [];

      for (const el of pathSegments) {
        const bboxSize = this.getBBoxSize(el.nodes);
        boundsPathSegments.push(bboxSize);
      }

      let i = 0;
      for (const segment of boundsPathSegments) {
        if (segment.tYb > 0) {

          let nodeCoords: { x: number; y: number; nodes: any; box: number; };
          if (pathSegments[i].nodes.length === 4) {
            nodeCoords = {
              x: this.evalCBez(pathSegments[i].nodes, segment.tYb, 'x', 'force'),
              y: this.evalCBez(pathSegments[i].nodes, segment.tYb, 'y', 'force'),
              nodes: pathSegments[i].nodes,
              box: i,
            };
          } else if (pathSegments[i].nodes.length === 3) {
            nodeCoords = {
              x: this.evalQBez(pathSegments[i].nodes, segment.tYb, 'x', 'force'),
              y: this.evalQBez(pathSegments[i].nodes, segment.tYb, 'y', 'force'),
              nodes: pathSegments[i].nodes,
              box: i,
            };
          }
          newNodes.push(nodeCoords);
        }

        if (segment.tYt > 0) {
          let nodeCoords: { x: number; y: number; nodes: any; box: number; };

          if (pathSegments[i].nodes.length === 4) {
            nodeCoords = {
              x: this.evalCBez(pathSegments[i].nodes, boundsPathSegments[i].tYt, 'x', 'force'),
              y: this.evalCBez(pathSegments[i].nodes, boundsPathSegments[i].tYt, 'y', 'force'),
              nodes: pathSegments[i].nodes,
              box: i
            };
          } else if (pathSegments[i].nodes.length === 3) {
            nodeCoords = {
              x: this.evalQBez(pathSegments[i].nodes, boundsPathSegments[i].tYt, 'x', 'force'),
              y: this.evalQBez(pathSegments[i].nodes, boundsPathSegments[i].tYt, 'y', 'force'),
              nodes: pathSegments[i].nodes,
              box: i
            };
          }
          newNodes.push(nodeCoords);
        }
        i++;
      }
      for (const newN of newNodes) {
        const newNodesOnPath = this.splitPath(newN.nodes, pathId, { x: newN.x, y: newN.y });
        this.nodeService.insertPathSegment(newNodesOnPath.nodes, pathId);
      }
    }
  }


  getAllCoordinates(range: number, tValue: number, n: any, multiply: number, type: string) {
    const values = [];
    for (let i = 0; i < range; i++) {
        const t = i * (tValue);
        let coordinates: { x: number; y: number; };
        if (n.length === 4) {
            coordinates = {
                x: this.evalCBez(n, t, 'x', type) * multiply,
                y: this.evalCBez(n, t, 'y', type)
            };
        } else if (n.length === 3) {
            coordinates = {
                x: this.evalQBez(n, t, 'x', type) * multiply,
                y: this.evalQBez(n, t, 'y', type)
            };
        } else if (n.length === 2) {
            coordinates = {
                x: this.evalLBez(n, t, 'x', type) * multiply,
                y: this.evalLBez(n, t, 'y', type)
            };
        }
        values.push( coordinates );
    }
    return values;
  }


  closest(num: number, arr: any) {
    let current = arr[0].pos.x;
    let index = 0;
    let diff = num - current < 0 ? current - num : num - current;
    for (let val = 1; val < arr.length; val++) {
        const newDiff = num - arr[val].pos.x < 0 ? arr[val].pos.x - num : num - arr[val].pos.x;
        if (newDiff < diff) {
            diff = newDiff;
            current = arr[val].pos.x;
            index = val;
        }
    }
    return  arr[index].pos.y;
  }


  closestY(num: number, arr: any) {
    let current = Math.round(arr[0].x);
    let index = 0;
    let diff = num - current < 0 ? current - num : num - current;

    for (let val = 1; val < arr.length; val++) {
        const newDiff = num - arr[val].x < 0 ? Math.round(arr[val].x) - num : num - Math.round(arr[val].x);
        if (newDiff < diff) {
            diff = newDiff;
            current = Math.round(arr[val].x);
            index = val;
        }
    }
    return  arr[index].y;
  }


  closestForce(num: number, arr: any) {
    let current = arr[0].y;
    let index = 0;
    let diff = num - current < 0 ? current - num : num - current;
    for (let val = 1; val < arr.length; val++) {
        const newDiff = num - arr[val].y < 0 ? arr[val].y - num : num - arr[val].y;
        if (newDiff < diff) {
            diff = newDiff;
            current = arr[val].y;
            index = val;
        }
    }
    return  arr[index].x;
  }


  trimPath(paths: any, range: any) {

    if (paths.length > 0) {
      const offset = { x: 0, y: 0 };
      const boxSizes = [];
      let totalPathDuration: number;

      for (const path of paths) {
        const boxSize = this.getBBoxSizePath(path);
        if (boxSize) { boxSizes.push(boxSize.box); }
      }
      if (boxSizes.length > 0) {
        const concatBoxes = boxSizes[0];
        if (boxSizes.length > 1) {
          for (const boxEl of boxSizes) {
            if (boxEl.left < concatBoxes.left) { concatBoxes.left = boxEl.left; }
            if (boxEl.right > concatBoxes.right) { concatBoxes.right = boxEl.right; }
          }
        }
        totalPathDuration = this.nodeService.scale.scaleX.invert(concatBoxes.right) -
          this.nodeService.scale.scaleX.invert(concatBoxes.left);
        offset.x = this.nodeService.scale.scaleX.invert(concatBoxes.left);
        offset.y = range.min;

        const scaleX = 1 / totalPathDuration;
        const scaleY = 1 / (range.max - range.min);

        const copyOfPaths = JSON.stringify(paths);
        const newPaths = JSON.parse(copyOfPaths);

        for (const path of newPaths) {
          for (const n of path.nodes) {
            const old = { x: n.pos.x, y: n.pos.y, ax: n.angle.x, ay: n.angle.y };
            n.pos.x = ((old.x - offset.x) * scaleX);
            n.pos.y = ((old.y - offset.y) * scaleY);
          }
        }
        return newPaths;
      }
    }
    return null;
  }

  translateElement(translate: any, referencePoint: any) {
    if (this.nodeService.selectedNodes.length > 0) {
      this.nodeService.moveAllSelectedNodes({ x: translate.horizontal, y: translate.vertical });
      for (const path of this.nodeService.selectedPaths) {
        const pathObj = this.nodeService.getPath(path);
        if (pathObj.nodes.filter(n => n.type === 'node').length > 1) {
          this.getBBoxSizePath(this.nodeService.getPath(path));
        }
      }
    } else if (this.nodeService.selectedPaths.length > 0) {
      for (const pathID of this.nodeService.selectedPaths) {
        const path = this.nodeService.getPath(pathID);
        const box = this.cloneService.deepClone(path.box);
        if (box.left) {
          if (translate.width !== 1.0 || translate.height !== 1.0) {

            this.nodeService.scalePath([pathID], translate.width, translate.height, translate.offsetX, translate.offsetY);

            const bboxAfter = this.getBBoxSizePath(path);
            if (referencePoint.id >= 0 && referencePoint.id <= 2) {
              translate.vertical = box.top - bboxAfter.path.box.top;
            } else if (referencePoint.id >= 6 && referencePoint.id <= 8) {
              translate.vertical = box.bottom - bboxAfter.path.box.bottom;
            }

            if (referencePoint.id % 3 === 0) {
              translate.horizontal = box.left - bboxAfter.path.box.left;
            } else if ((referencePoint.id + 1) % 3 === 0) {
              translate.horizontal = box.right - bboxAfter.path.box.right;
            }

            if (referencePoint.id % 2 !== 0 || referencePoint.id === 4) {
              if (referencePoint.id >= 3 && referencePoint.id <= 5) {
                translate.vertical = (box.bottom + (box.height / 2)) - (bboxAfter.path.box.bottom + (bboxAfter.path.box.height / 2));
              }
              if ((referencePoint.id - 1) % 3 === 0) {
                translate.horizontal = (box.left + (box.width / 2)) - (bboxAfter.path.box.left + (bboxAfter.path.box.width / 2));
              }
            }

            this.nodeService.translatePath(pathID, translate);
          } else {
            this.nodeService.translatePath(pathID, translate);
          }
        }
      }
    }
  }







}
