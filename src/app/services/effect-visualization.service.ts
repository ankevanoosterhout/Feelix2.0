import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Subject } from 'rxjs';
import { Collection, Layer } from '../models/collection.model';
import { effectTypeColor } from '../models/configuration.model';
import { Details, Effect, Size } from '../models/effect.model';
import { Path } from '../models/node.model';
import { NodeService } from './node.service';



@Injectable()
export class EffectVisualizationService {

  public verticalDivision = 30;

  setActiveEffect: Subject<any> = new Subject();
  updateCollection: Subject<any> = new Subject();

  constructor(private nodeService: NodeService) { }

  public setActiveCollectionEffect(data: { effect: Details, collection: Collection }) {
    this.setActiveEffect.next(data);
  }

  public updateCollectionData(collection: Collection) {
    this.updateCollection.next(collection);
  }


  drawEffect(effect: Effect, colors: Array<effectTypeColor>, viewSettings = 'large-thumbnails') {

    const height = 55;
    let windowDivisionWidth = (window.innerWidth * this.verticalDivision / 100);
    if (windowDivisionWidth < 300) { windowDivisionWidth = 300; }
    const width = viewSettings !== 'small-thumbnails' ? windowDivisionWidth - 86 : (windowDivisionWidth / 2) - 70;

    d3.select('#svgID-' + effect.id).remove();

    const svg = d3.select('#effectSVG-' + effect.id)
      .append('svg')
      .attr('id', 'svgID-' + effect.id)
      .attr('width', width)
      .attr('height', height);

    const container = svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', '#1c1c1c')
      .attr('stroke', '#2c2c2c')
      .attr('stroke-width', 0.5);

    if (effect.type === 'torque') {
      const middleLine = svg.append('rect')
      .attr('width', width)
      .attr('height', 1)
      .attr('x', 0)
      .attr('y', height / 2 - 0.5)
      .attr('fill', '#3a3a3a');
    }

    if (effect.paths && effect.paths.length > 0) {

      const nodes = svg.append('g')
        .attr('class', 'nodes effect' + effect.id)
        .attr('transform', 'translate(14, 2)');

      this.drawEffectData(nodes, effect, height - 4, colors, width - 28);
    }

  }


  drawCollectionEffect(svg: any, collection: Collection, collEffect: Details, effect: Effect, height: number, offset: number, activeCollEffect: Details, colors: Array<effectTypeColor>, tmp = false) {

    d3.selectAll('.coll-effect-' + collEffect.id).remove();

    const multiply = (collection.rotation.units.PR / effect.grid.xUnit.PR);

    const width = collection.config.newXscale(collEffect.position.x + collEffect.position.width) -
      collection.config.newXscale(collEffect.position.x);

    const heightEffect = collection.config.newYscale(collEffect.position.bottom * (collEffect.scale.y / 100)) - collection.config.newYscale(collEffect.position.top * (collEffect.scale.y / 100));
      // effect.type === 'torque' ?
      //       (this.height - 39) * (((100-collectionEffect.scale.y)/100) / 2) - ((this.height - 39) * (collectionEffect.position.y / 100) / 2) :
      //       (this.height - 39) * ((100-collectionEffect.scale.y)/100) - ((this.height - 39) * (collectionEffect.position.y / 100))
    const xPos = collection.config.newXscale(collEffect.position.x);

    if (effect.paths && effect.paths.length > 0) {

      const dragCollectionEffect = d3.drag()
      .on('start', () => {
        if (activeCollEffect) {
          d3.select('#coll-effect-' + collection.id + '-' + activeCollEffect.id).style('opacity', 0.3);
        }
        this.setActiveCollectionEffect({ effect: collEffect, collection: collection });
        activeCollEffect = collEffect;
        d3.select('#coll-effect-' + collection.id + '-' + collEffect.id).style('opacity', 0.6);
      })
      .on('drag', () => {
        collEffect.position.x += (collection.config.newXscale.invert(d3.event.x) - collection.config.newXscale.invert(d3.event.x - d3.event.dx));
        this.drawCollectionEffect(svg, collection, collEffect, effect, height, offset, activeCollEffect, colors);
      })
      .on('end', () => {
        this.updateCollectionData(collection);
      });



      const rect = svg.append('rect')
        .attr('id', 'coll-effect-' + collection.id + '-' + collEffect.id)
        .attr('class', 'coll-effect-' + collEffect.id)
        .attr('x', xPos)
        .attr('y', collection.config.newYscale(collEffect.position.top * (collEffect.scale.y / 100)))
        .attr('width', width)
        .attr('height', heightEffect)
        .style('fill', colors.filter(c => c.type === effect.type)[0].hash)
        .style('opacity', activeCollEffect !== null && activeCollEffect.id === collEffect.id ? 0.6 : 0.3)
        .style('shape-rendering', 'crispEdges')
        .attr('pointer-events', tmp || this.checkIfLayersIsLocked(collEffect.direction, collection.layers) ? 'none': 'auto')
        .attr('cursor', this.checkIfLayersIsLocked(collEffect.direction, collection.layers) ? 'not-allowed': 'default')
        .call(dragCollectionEffect);

      const clipPath = svg.append('clipPath')
        .attr('id', 'clip-' + collEffect.id + '-' + effect.id)
        .attr('class', 'coll-effect-' + collEffect.id)
        .append('svg:rect')
        .attr('width', width)
        .attr('height', height);

      const nodes = svg.append('g')
        .attr('class', 'nodes coll-effect-' + collEffect.id)
        .attr('id', 'coll-effect-group-' + collEffect.id + '-' + effect.id)
        .attr('clip-path', 'url(#clip-' + collEffect.id + '-' + effect.id +')')
        .attr('transform', 'translate('+ [xPos, offset] + ')');

      this.drawEffectData(nodes, effect, height, colors, width, collEffect.flip, multiply);
    }

  }

  checkIfLayersIsLocked(effectDirection: string, layers: Layer[]) {
    if (effectDirection === 'any' && (layers[0].locked || layers[1].locked)) {
      return true;
    } else if (effectDirection === 'CW' && layers[0].locked) {
      return true;
    } else if (effectDirection === 'CCW' && layers[1].locked) {
      return true;
    }
    return false;
  }


  drawEffectData(nodes: any, effect: any, height: number, colors: Array<effectTypeColor>, width = (window.innerWidth * this.verticalDivision / 100) - 120, reflect = { x: false, y: false }, multiply = 1) {

    if (effect.size) {
      const xScale = d3.scaleLinear()
          .domain([ effect.size.x * multiply, (effect.size.x + effect.size.width) * multiply ])
          .range([0, width]);

      const domain = effect.type === 'torque' ? [100, -100] : [100, 0];

      const yScale = d3.scaleLinear()
        .domain(domain)
        .range([0, height]);


      for (const path of effect.paths) {
        if (path.nodes.length > 1) {

          const effectPath = this.mirrorPath(JSON.parse(JSON.stringify(path)), effect.size, reflect);

          const paths = this.returnPathAsString(effectPath, xScale, yScale, 'pos', multiply);

          if (effect.type === 'position') {
            const planes = this.returnPlaneAsString(effectPath, xScale, yScale, multiply);

            if (planes) {
              nodes.selectAll('path.plane_' + path.id)
                .data(planes)
                .enter()
                .append('path')
                .attr('d', (d: { svgPath: string }) => d.svgPath)
                .attr('fill', colors.filter(c => c.type === effect.type)[0].hash)
                .attr('class', 'plane_' + path.id)
                .style('opacity', 0.3)
                .attr('pointer-events', 'none');
            }
          }

          if (paths) {
            nodes.selectAll('path.path_' + path.id)
              .data(paths)
              .enter()
              .append('path')
              .attr('d', (d: { svgPath: string }) => d.svgPath)
              .attr('stroke', () => colors.filter(c => c.type === effect.type)[0].hash)
              .attr('stroke-width', () => 1.4)
              .attr('class', 'path_' + path.id)
              .attr('fill', 'transparent')
              .attr('pointer-events', 'none');
          }
        }
      }
    }
  }


  mirrorPath(path: Path, size: Size, reflect = { x: false, y: false }) {

    let newPath = path;

    if (reflect.x || reflect.y) {

      const mirrorLine = {
        x: (size.width / 2) + size.x,
        y: (size.height / 2) + (size.y - size.height),
      };

      newPath = this.nodeService.mirrorPath(path, mirrorLine, reflect.x, reflect.y);
    }

    return newPath;
  }




  updateCursor(effectID: string, units: any, position: number, xScale: any, width: number) {
    let cursorPos = units.name === 'degrees' ? xScale(position * (360 / 4096)) : xScale(position);
    if (cursorPos < 15) { cursorPos = 15; }
    if (cursorPos > width - 15) { cursorPos = width - 15; }
    d3.select('#cursor_' + effectID).attr('x', cursorPos);
  }



  returnPathAsString(path: any, scaleX: any, scaleY: any, type = 'pos', multiply = 1): Array<object> {
    const nodes = path.nodes;
    const numberOfNodes = path.nodes.filter(n => n.type === 'node');


    if (numberOfNodes.length > 1) {
      const pathStrArray = [];
      let pathStr = 'M';
      let n = 0;
      let idStr = '';

      nodes.forEach((node, index) => {

        if (node.type === 'node') {
          if (type === 'pos') {
            pathStr += ' ' + scaleX(node.pos.x * multiply);
            pathStr += ' ' + scaleY(node.pos.y);
          } else {
            pathStr += ' ' + scaleX(node.angle.x * multiply);
            pathStr += ' ' + scaleY(node.angle.y);
          }
          idStr += node.id + '&&';
          if (n > 0) {
            pathStrArray.push( { id: idStr, svgPath: pathStr, parent: path.id } );
            if (type === 'pos') {
              pathStr = 'M ' + scaleX(node.pos.x * multiply) + ' ' + scaleY(node.pos.y);
            } else {
              pathStr = 'M ' + scaleX(node.angle.x * multiply) + ' ' + scaleY(node.angle.y);
            }
            idStr = node.id + '&&';
          }
          n++;
        } else if (node.type === 'cp' && index < nodes.length - 1 && index > 0) {

          if (type === 'pos') {
            if (nodes[index + 1].type === 'cp') {
              pathStr += ' C ' + scaleX(node.pos.x * multiply) + ' ' + scaleY(node.pos.y);
            } else if (nodes[index - 1].type === 'node' && nodes[index + 1].type === 'node') {
              pathStr += ' Q ' + scaleX(node.pos.x * multiply) + ' ' + scaleY(node.pos.y);
            } else {
              pathStr += ' ' + scaleX(node.pos.x * multiply) + ' ' + scaleY(node.pos.y);
            }
          } else {
            if (nodes[index + 1].type === 'cp') {
              pathStr += ' C ' + scaleX(node.angle.x * multiply) + ' ' + scaleY(node.angle.y);
            } else if (nodes[index - 1].type === 'node' && nodes[index + 1].type === 'node') {
              pathStr += ' Q ' + scaleX(node.angle.x * multiply) + ' ' + scaleY(node.angle.y);
            } else {
              pathStr += ' ' + scaleX(node.angle.x * multiply) + ' ' + scaleY(node.angle.y);
            }
          }
        }
      });
      return pathStrArray;
    }
  }

  returnPlaneAsString(path: any, scaleX: any, scaleY: any, multiply = 1): Array<object> {
    const nodes = path.nodes;
    const numberOfNodes = path.nodes.filter(n => n.type === 'node');

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

        pathStr += scaleX(el[0].pos.x * multiply) + ' ' + scaleY(el[0].pos.y);

        if (el.length === 3) { pathStr += ' Q'; } else if (el.length === 4) { pathStr += ' C'; }

        for (let i = 1; i < el.length; i++) {
          pathStr += ' ' + scaleX(el[i].pos.x * multiply) + ' ' + scaleY(el[i].pos.y);
        }
        pathStr += ' L ' + scaleX(el[el.length - 1].angle.x * multiply) + ' ' + scaleY(el[el.length - 1].angle.y);

        if (el.length === 3) { pathStr += ' Q'; } else if (el.length === 4) { pathStr += ' C'; }

        for (let i = el.length - 2; i >= 0; i--) {
          pathStr += ' ' + scaleX(el[i].angle.x * multiply) + ' ' + scaleY(el[i].angle.y);
        }
        pathStr += ' Z';

        planeStrArray.push( { id: el[0].id + '&&' + el[el.length - 1].id, svgPath: pathStr, parent: path.id } );
        pathStr = 'M ';
      }
      return planeStrArray;
    }
  }


  drawNodePath(module: any) {

    const SVG = d3.select('#nodePath-module-' + module.id)
      .append('svg')
      .attr('id', 'svgID-' + module.id)
      .attr('width', 58)
      .attr('height', 50);

    const pathModuleSVG = SVG.append('g')
      .attr('id', 'pathModuleSVG_' + module.id)
      .attr('class', 'pathModuleSVG');

    this.drawNodePathModule(pathModuleSVG, module, 58, 50);
  }


  drawNodePathModule(pathModuleSVG: any, module: any, w: number, h: number, feelixio = false) {
    const scaledData = this.scalePathCopy({ width: w, height: h }, module, 'module');

    let i = 0;
    for (const scaledPath of scaledData.paths) {
      const nodePath = pathModuleSVG.selectAll('path.nodePath_' + module.id + '_' + i)
        .data(scaledPath)
        .enter()
        .append('path')
        .attr('d', (d: { svgPath: string }) => d.svgPath)
        .attr('id', (d: { id: string; }) => 'nodePath_' + d.id)
        .attr('class', 'nodePath_' + module.id + '_' + i)
        .attr('stroke', () => 'rgba(255,255,255,0.6)')
        .attr('stroke-width', () => module.type === 'ease' ? 1.4 : 2.4)
        .attr('fill', 'transparent');
      i++;
    }

    if (feelixio) {
      pathModuleSVG.append('rect')
        .attr('id', 'cursor_' + module.id)
        .attr('x', 0)
        .attr('y', -3)
        .attr('width', 1.5)
        .attr('height', h + 6)
        .style('fill', '#FF0036');

      return scaledData.xScale;
    }
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

    return { paths: strArray, xScale: scaleX };
  }


  returnCopyPathAsString(path: any): Array<object> {
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


  drawBlock(group: any, id: string, cl: string, x: number, y: number, w: number, h: number, color: string) {

    const block = group.append('rect')
      .attr('class', 'obj-' + cl)
      .attr('id', id)
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h)
      .style('fill', color);
  }

}
