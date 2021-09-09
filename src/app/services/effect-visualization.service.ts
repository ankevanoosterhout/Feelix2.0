import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Subject } from 'rxjs';
import { Collection, Layer } from '../models/collection.model';
import { effectTypeColor } from '../models/configuration.model';
import { Details, Effect, RepeatInstance, Size } from '../models/effect.model';
import { CloneService } from './clone.service';
import { DataService } from './data.service';
import { NodeService } from './node.service';



@Injectable()
export class EffectVisualizationService {

  public verticalDivision = 30;

  setActiveEffect: Subject<any> = new Subject();
  updateCollectionEffect: Subject<any> = new Subject();

  constructor(private nodeService: NodeService, private cloneService: CloneService, private dataService: DataService) { }

  public setActiveCollectionEffect(data: { effect: Details, collection: Collection }) {
    this.setActiveEffect.next(data);
  }

  public updateCollectionData(collectionData: any) {
    this.updateCollectionEffect.next(collectionData);
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

    if (effect.type !== 'position') {
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


  drawCollectionEffect(svg: any, collection: Collection, collEffect: Details, effect: Effect, pixHeight: number, activeCollEffect: Details, colors: Array<effectTypeColor>, tmp = false) {

    d3.selectAll('.coll-effect-' + collEffect.id).remove();

    if (effect.paths && effect.paths.length > 0) {

      const multiply = (collection.rotation.units.PR / effect.grid.xUnit.PR);

      const width = effect.paths.length === 0 ? 30 : collection.config.newXscale(collEffect.position.x + collEffect.position.width) - collection.config.newXscale(collEffect.position.x);
      const domainSize = effect.type === 'position' ? 100 : 200;

      const heightEffect = (collection.config.newYscale(collEffect.position.bottom) - collection.config.newYscale(collEffect.position.top)) * (collEffect.scale.y / 100);
      const yPos = collection.config.newYscale(collEffect.position.top * (collEffect.scale.y / 100)) - (pixHeight * (collEffect.position.y / domainSize));

      const offset = effect.type === 'position' ? pixHeight * ((100-collEffect.scale.y)/100) - (pixHeight * (collEffect.position.y / 100)) :
                                                  pixHeight * (((100-collEffect.scale.y)/100) / 2) - (pixHeight * (collEffect.position.y / 100) / 2);

      const height = pixHeight * (collEffect.scale.y/100);
      const layerLocked = collection.effectDataList.length > 0 ? true : this.checkIfLayersIsLocked(collEffect.direction, collection.layers);

      const effectData = [ new RepeatInstance(collEffect.id, collEffect.position.x) ];
      const data = effectData.concat(collEffect.repeat.repeatInstances);

      const dragCollectionEffect = d3.drag()
        .on('start', () => {
          d3.selectAll('#coll-effect-' + collection.id).style('opacity', 0.3);

          this.nodeService.deselectAll();
          this.dataService.deselectAll();
          this.setActiveCollectionEffect({ effect: collEffect, collection: collection });
          activeCollEffect = collEffect;
          d3.selectAll('#coll-effect-' + collection.id + '-' + collEffect.id).style('opacity', 0.6);
        })
        .on('drag', (d, i) => {
          if (!layerLocked) {
            if (i === 0) {
              collEffect.position.x += (collection.config.newXscale.invert(d3.event.x) - collection.config.newXscale.invert(d3.event.x - d3.event.dx));
            } else {
              collEffect.repeat.repeatInstances[i - 1].x += (collection.config.newXscale.invert(d3.event.x) - collection.config.newXscale.invert(d3.event.x - d3.event.dx));
            }
            this.drawCollectionEffect(svg, collection, collEffect, effect, pixHeight, activeCollEffect, colors);
          }
        })
        .on('end', () => {
          // if (!layerLocked) {
          this.updateCollectionData({ collection: collection, collEffect: collEffect });
          // }
        });

      const rect = svg.selectAll('rect.coll-effect-' + collEffect.id)
        .data(data)
        .enter()
        .append('rect')
        .attr('id', (d) => 'coll-effect-' + collection.id + '-' + d.id)
        .attr('class', 'coll-effect-' + collEffect.id)
        .attr('x', (d) => collection.config.newXscale(d.x))
        .attr('y', () => effect.type === collection.visualizationType ? yPos : 0)
        .attr('width', width === 0 ? 10 : width)
        .attr('height', effect.type === collection.visualizationType && effect.paths.length > 0 ? heightEffect : pixHeight)
        .style('fill', colors.filter(c => c.type === effect.type)[0].hash)
        .style('opacity', activeCollEffect !== null && activeCollEffect.id === collEffect.id ? 0.6 : 0.2)
        .style('shape-rendering', 'crispEdges')
        .attr('pointer-events', tmp ? 'none': 'auto')
        .attr('cursor', layerLocked ? 'not-allowed': 'default')
        .call(dragCollectionEffect);

      if (effect.type === collection.visualizationType) {

        const clipPath = svg.append('clipPath')
          .attr('id', 'clip-' + collEffect.id + '-' + effect.id)
          .attr('class', 'coll-effect-' + collEffect.id)
          .append('svg:rect')
          .attr('width', width)
          .attr('height', height);

        const nodes = svg.append('g')
          .attr('class', 'nodes coll-effect-' + collEffect.id)
          .attr('id', 'coll-effect-group-' + collEffect.id + '-' + effect.id)
          // .attr('clip-path', 'url(#clip-' + collEffect.id + '-' + effect.id +')')
          .attr('transform', 'translate('+ [collection.config.newXscale(collEffect.position.x), offset] + ')');

        // if (collection.effectDataList.length === 0) {
        this.drawEffectData(nodes, effect, height, colors, width, collEffect.flip, multiply);
        // }

        for(const instance of collEffect.repeat.repeatInstances) {
          const nodes = svg.append('g')
          .attr('class', 'nodes coll-effect-' + collEffect.id)
          .attr('id', 'coll-effect-group-' + collEffect.id + '-' + effect.id + '-' + instance.id)
          .attr('transform', 'translate('+ [collection.config.newXscale(instance.x), offset] + ')');

          // if (collection.effectDataList.length === 0) {
          this.drawEffectData(nodes, effect, height, colors, width, collEffect.flip, multiply);
          // }
        }
      }

      const text = svg.selectAll('text.coll-effect-' + collEffect.id)
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'coll-effect-' + collEffect.id)
        .attr('x', (d) => collection.config.newXscale(d.x) + width - 5)
        .attr('y', () => effect.type === collection.visualizationType ? yPos + 12 : 12)
        .attr('text-anchor', 'end')
        .text((d, i) => i > 0 ? effect.name + ' n' + (i+ 1) : effect.name)
        .style('fill', '#fff')
        .attr('cursor', 'default')
        .style('opacity', activeCollEffect !== null && activeCollEffect.id === collEffect.id ? 0.6 : 0.3)
        .style('font-family', 'Open Sans, Arial, sans-serif')
        .style('font-size', '9px');
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

      const domain = effect.type === 'position' ? [100, 0] : [100, -100];

      const yScale = d3.scaleLinear()
        .domain(domain)
        .range([0, height]);


      for (const path of effect.paths) {
        if (path.nodes.length > 1) {

          const effectPath = this.nodeService.mirrorPathEffect(this.cloneService.deepClone(path), effect.size, reflect);

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
              .attr('stroke-width', () => effect.rotation === 'dependent' ? 2.2 : 1)
              .attr('class', 'path_' + path.id)
              .attr('fill', 'transparent')
              .attr('pointer-events', 'none');
          }
        }
      }
    }
  }


  checkIfXisWithinOverlap(x: number, overlappingEffects: Array<any>) {
    for (const el of overlappingEffects) {
      if (x >= el.position.start - 0.5 && x <= el.position.end + 0.75) {
        return true;
      }
    }
    return false;
  }



  drawRenderedCollectionData(svg: any, collection: Collection, collEffect: Details, renderedData: any, pixHeight: number, color: string) {

    d3.selectAll('#grp-render-' + collection.id + '-' + collEffect.id).remove();

    interface Data {
      x: number,
      y: number
    }

    const multiply = { x: collection.rotation.units.name === 'radians' ? (Math.PI / 180) : 1, y: collEffect.flip.y ? -100 : 100 };


    const offset = renderedData.type === 'position' ? pixHeight * ((100-collEffect.scale.y)/100) - (pixHeight * (collEffect.position.y / 100)) :
                                                      pixHeight * (((100-collEffect.scale.y)/100) / 2) - (pixHeight * (collEffect.position.y / 100) / 2);

    const renderedDataCopy = this.cloneService.deepClone(renderedData.data);
    const data = collEffect.flip.x ? renderedDataCopy.reverse() : renderedDataCopy;

    const grp = svg.append('g')
      .attr('id', 'grp-render-' + collection.id + '-' + collEffect.id);

    // const line = d3.line<Data>()
    //     .x((d: Data, i) => { return collection.config.newXscale(i * (collEffect.scale.x / 100) + (collEffect.position.x * multiply.x)); })
    //     .y((d: Data) => { return renderedData.type === 'position' && collEffect.flip.y ?
    //     (collection.config.newYscale(d.y * multiply.y - (100 - renderedData.size.top) + renderedData.size.bottom + 100)  * (collEffect.scale.y / 100) + offset) :
    //     collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset; })
    //     .curve(d3.curveMonotoneX);

    // grp.append('path')
    //   .attr('class', 'data-' + collection.id + '-' + collEffect.id)
    //   .datum(data)
    //   .attr('fill', 'none')
    //   .attr('stroke', color)
    //   .attr('stroke-width', 1.5)
    //   .attr('d', line);


    if (renderedData.type === 'position') {
      grp.selectAll('line.offset-' + collection.id + '-' + collEffect.id)
      .data(data)
      .enter()
      .append('line')
      .attr('class', 'offset-' + collection.id + '-' + collEffect.id)
      .attr('x1', (d, i) => collection.config.newXscale(i * (collEffect.scale.x / 100) + (collEffect.position.x * multiply.x)))
      .attr('x2', (d, i) => collection.config.newXscale(d.o * (collEffect.scale.x / 100) + (collEffect.position.x * multiply.x)))
      .attr('y1', (d) => collEffect.flip.y ?
      (collection.config.newYscale(d.y * multiply.y - (100 - renderedData.size.top) + renderedData.size.bottom + 100)  * (collEffect.scale.y / 100) + offset) :
      collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset)
      .attr('y2', (d) => collEffect.flip.y ?
      (collection.config.newYscale(d.y * multiply.y - (100 - renderedData.size.top) + renderedData.size.bottom + 100)  * (collEffect.scale.y / 100) + offset) :
      collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset)
      .attr('stroke', 'rgba(255,255,255,0.4)')
      .attr('stroke-width', 1);

      grp.selectAll('circle.offset-' + collection.id + '-' + collEffect.id)
        .data(data)
        .enter()
        .append('circle')
        .attr('class', 'offset-' + collection.id + '-' + collEffect.id)
        .attr('cx', (d) => collection.config.newXscale(d.o * (collEffect.scale.x / 100) + (collEffect.position.x * multiply.x)))
        .attr('cy', (d) => renderedData.type === 'position' && collEffect.flip.y ?
            (collection.config.newYscale(d.y * multiply.y - (100 - renderedData.size.top) + renderedData.size.bottom + 100)  * (collEffect.scale.y / 100) + offset) :
            collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset)
        .attr('r', (d) => collection.config.newXscale((d.x * multiply.x) + 0.2) - collection.config.newXscale((d.x * multiply.x) - 0.2) < 2 ?
                          collection.config.newXscale((d.x * multiply.x) + 0.2) - collection.config.newXscale((d.x * multiply.x) - 0.2) : 2)
        .style('fill', 'rgba(255,255,255,0.4)');
    }

    grp.selectAll('circle.render-' + collection.id + '-' + collEffect.id)
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'render-' + collection.id + '-' + collEffect.id)
      .attr('cx', (d, i) => collection.config.newXscale(i * (collEffect.scale.x / 100) + (collEffect.position.x * multiply.x)))
      .attr('cy', (d) => renderedData.type === 'position' && collEffect.flip.y ?
          (collection.config.newYscale(d.y * multiply.y - (100 - renderedData.size.top) + renderedData.size.bottom + 100)  * (collEffect.scale.y / 100) + offset) :
          collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset)
      .attr('r', (d) => collection.config.newXscale((d.x * multiply.x) + 0.2) - collection.config.newXscale((d.x * multiply.x) - 0.2) < 2 ?
                        collection.config.newXscale((d.x * multiply.x) + 0.2) - collection.config.newXscale((d.x * multiply.x) - 0.2) : 2)
      .style('fill', color)
      .style('opacity', (d, i) => this.checkIfXisWithinOverlap(i * (collEffect.scale.x / 100) + (collEffect.position.x * multiply.x), collection.renderedData) ? 0 : 1);


  }

  drawOverlappingData(svg: any, collection: Collection, color: string) {
    d3.selectAll('#grp-render-overlap-' + collection.id).remove();

    const grp = svg.append('g').attr('id', 'grp-render-overlap-' + collection.id);
    let i = 0;
    for (const overlap of collection.renderedData) {

      if ((collection.layers.filter(l => l.name === 'CW')[0].visible && overlap.direction.cw) || (collection.layers.filter(l => l.name === 'CCW')[0].visible && overlap.direction.ccw)) {
        grp.selectAll('circle.overlap-' + collection.id + '-' + i)
          .data(overlap.data)
          .enter()
          .append('circle')
          .attr('class', 'overlap-' + collection.id + '-' + i)
          .attr('cx', (d) => collection.config.newXscale(d.x + overlap.position.start))
          .attr('cy', (d) => collection.config.newYscale(d.y * 100))
          .attr('r', (d) => collection.config.newXscale(d.x + 0.2) - collection.config.newXscale(d.x - 0.2) < 2 ?
                            collection.config.newXscale(d.x + 0.2) - collection.config.newXscale(d.x - 0.2) : 2)
          .style('fill', color);
      }
      i++;
    }
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
