import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { Subject } from 'rxjs';
import { Collection, Layer } from '../models/collection.model';
import { EffectType, EffectTypeColor } from '../models/configuration.model';
import { Details, Direction, Effect, RepeatInstance, Size } from '../models/effect.model';
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


  drawEffect(effect: Effect, colors: Array<EffectTypeColor>, viewSettings = 'large-thumbnails', storedIn: string) {

    const height = storedIn === 'file' ? 86 : 55;
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

    const zeroline = svg.append('line')
      .attr('x2', width)
      .attr('y1', height - (height / (effect.range_y.end - effect.range_y.start)) * (effect.range_y.start * -1))
      .attr('x1', 0)
      .attr('y2', height - (height / (effect.range_y.end - effect.range_y.start)) * (effect.range_y.start * -1))
      .style('stroke', '#3a3a3a')
      .style('stroke-width', 1)
      .style('shape-rendering', 'crispEdges');


    if (effect.paths && effect.paths.length > 0) {

      const nodes = svg.append('g')
        .attr('class', 'nodes effect' + effect.id)
        .attr('transform', 'translate(14, 2)');

      this.drawEffectData(nodes, effect, height - 4, colors, width - 28, [effect.range_y.end, effect.range_y.start]);
    }
  }


  drawCollectionEffect(svg: any, collection: Collection, collEffect: Details, effect: Effect, pixHeight: number, activeCollEffect: Details, colors: Array<EffectTypeColor>, tmp = false) {

    d3.selectAll('.coll-effect-' + collEffect.id).remove();

    if (effect.paths && effect.paths.length > 0) {

      const multiply = (collection.rotation.units.PR / effect.grid.xUnit.PR);

      const width = effect.paths.length === 0 ? 30 : collection.config.newXscale(collEffect.position.x + collEffect.position.width) - collection.config.newXscale(collEffect.position.x);
      const domainSize = effect.range_y.end - effect.range_y.start;

      const heightEffect = (collection.config.newYscale(collEffect.position.bottom) - collection.config.newYscale(collEffect.position.top)) * (collEffect.scale.y / 100);

      const yPos = collection.config.newYscale(collEffect.position.top * (collEffect.scale.y / 100)) - (pixHeight * (collEffect.position.y / domainSize));

      const offset = effect.range_y.start === 0 ? pixHeight * ((100-collEffect.scale.y)/100) - (pixHeight * (collEffect.position.y / 100)) :
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
        .on('drag', (event, d) => {
          if (!layerLocked) {
            if (collEffect.repeat.repeatInstances.filter(r => r.id === d.id)[0]) {
              collEffect.repeat.repeatInstances.filter(r => r.id === d.id)[0].x += (collection.config.newXscale.invert(event.x) - collection.config.newXscale.invert(event.x - event.dx));
            } else {
              collEffect.position.x += (collection.config.newXscale.invert(event.x) - collection.config.newXscale.invert(event.x - event.dx));
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
        .attr('y', this.checkIfEffectTypeEqualsVisualizationType(effect, collection) ? yPos : 0)
        .attr('width', width === 0 ? 10 : width)
        .attr('height', this.checkIfEffectTypeEqualsVisualizationType(effect, collection) ? heightEffect : pixHeight)
        .style('fill', colors.filter(c => c.type === effect.type)[0].hash[0])
        .style('opacity', activeCollEffect !== null && activeCollEffect.id === collEffect.id ? 0.6 : 0.2)
        .style('shape-rendering', 'crispEdges')
        .attr('pointer-events', tmp ? 'none': 'auto')
        .attr('cursor', layerLocked ? 'not-allowed': 'default')
        .call(dragCollectionEffect);

      if (this.checkIfEffectTypeEqualsVisualizationType(effect, collection)) {

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

        this.drawEffectData(nodes, effect, height, colors, width, [collection.rotation.end_y, collection.rotation.start_y], collEffect.flip, multiply);

        for(const instance of collEffect.repeat.repeatInstances) {
          const nodes = svg.append('g')
          .attr('class', 'nodes coll-effect-' + collEffect.id)
          .attr('id', 'coll-effect-group-' + collEffect.id + '-' + effect.id + '-' + instance.id)
          .attr('transform', 'translate('+ [collection.config.newXscale(instance.x), offset] + ')');

          this.drawEffectData(nodes, effect, height, colors, width, [collection.rotation.end_y, collection.rotation.start_y], collEffect.flip, multiply);
        }
      }

      const text = svg.selectAll('text.coll-effect-' + collEffect.id)
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'coll-effect-' + collEffect.id)
        .attr('x', (d) => collection.config.newXscale(d.x) + width - 5)
        .attr('y', () => this.checkIfEffectTypeEqualsVisualizationType(effect, collection) ? yPos + 12 : 12)
        .attr('text-anchor', 'end')
        .text((d, i) => i > 0 ? effect.name + ' n' + (i+ 1) : effect.name)
        .style('fill', '#fff')
        .attr('cursor', 'default')
        .style('opacity', activeCollEffect !== null && activeCollEffect.id === collEffect.id ? 0.6 : 0.3)
        .style('font-family', 'Open Sans, Arial, sans-serif')
        .style('font-size', '9px');
    }
  }

  checkIfEffectTypeEqualsVisualizationType(effect: Effect, collection: Collection) {
    if (effect.paths.length > 0) {
      if (effect.type !== EffectType.velocity && effect.type === collection.visualizationType) { return true; }
      if (effect.type === EffectType.velocity && effect.grid.yUnit.name === collection.rotation.units_y.name) { return true; }
    }
    return false;
  }


  checkIfLayersIsLocked(effectDirection: Direction, layers: Layer[]) {
    if (effectDirection.cw && layers[0].locked) {
      return true;
    } else if (effectDirection.ccw && layers[1].locked) {
      return true;
    }
    return false;
  }


  drawEffectData(nodes: any, effect: any, height: number, colors: Array<EffectTypeColor>, width = (window.innerWidth * this.verticalDivision / 100) - 120, domain: any, reflect = { x: false, y: false }, multiply = 1) {

    if (effect.size) {
      const xScale = d3.scaleLinear()
          .domain([ effect.size.x * multiply, (effect.size.x + effect.size.width) * multiply ])
          .range([0, width]);

      const yScale = d3.scaleLinear()
        .domain(domain)
        .range([0, height]);


      for (const path of effect.paths) {
        if (path.nodes.length > 1) {

          const effectPath = this.nodeService.mirrorPathEffect(this.cloneService.deepClone(path), effect.size, reflect);

          const paths = this.returnPathAsString(effectPath, xScale, yScale, 'pos', multiply);

          if (effect.type === EffectType.position) {
            const planes = this.returnPlaneAsString(effectPath, xScale, yScale, multiply);

            if (planes) {
              nodes.selectAll('path.plane_' + path.id)
                .data(planes)
                .enter()
                .append('path')
                .attr('d', (d: { svgPath: string }) => d.svgPath)
                .attr('fill', colors.filter(c => c.type === effect.type)[0].hash[0])
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
              .attr('stroke', () => colors.filter(c => c.type === effect.type)[0].hash[0])
              .attr('stroke-width', () => effect.rotation === 'dependent' ? 2.0 : 4.0)
              .attr('stroke-linecap', effect.rotation === 'dependent' ? 'butt' : 'round')
              .attr('class', 'path_' + path.id)
              .attr('fill', 'transparent')
              .attr('pointer-events', 'none');
          }
        }
      }
    }
  }


  drawCollectionFeedback(collection: Collection, width: number, height: number, view: any) {

    d3.select('#svgFeedback-' + collection.id).remove();

    const feedbackData = collection.config.svg.append('g')
      .attr('id', 'svgFeedback-' + collection.id)
      .attr('width', width)
      .attr('height', height - 39)
      .attr('transform', (view === 'small' ? 'translate(0, 0)' : 'translate(0, 26)'));

    feedbackData.selectAll('circle.feedback_' + collection.id)
      .data(collection.feedbackData)
      .enter()
      .append('circle')
      .attr('class', 'feedback_' + collection.id)
      .attr('r', 1)
      .attr('cx', (d: { time: number }) => { return collection.config.newXscale(collection.rotation.units.name === 'sec' ? d.time / 1000 : d.time) })
      .attr('cy', (d: { value: number }) => { return collection.config.newYscale(d.value) })
      .style('fill', '#E18257');

    feedbackData.append('path')
      .datum(collection.feedbackData)
      .attr('fill', 'none')
      .attr('stroke', '#E18257')
      .attr('stroke-width', 1.5)
      .attr('d', d3.line()
        .x((d: { time: number }) => { return collection.config.newXscale(collection.rotation.units.name === 'sec' ? d.time / 1000 : d.time) })
        .y((d: { value: number }) => { return collection.config.newYscale(d.value) }));

  }


  checkIfXisWithinOverlap(x: number, overlappingEffects: Array<any>) {

    for (const el of overlappingEffects) {
      if (el && el.position) {
        if (x >= el.position.start - 0.75 && x <= el.position.end + 0.75) {
          return true;
        }
      }
    }
    return false;
  }

  mirrorData(renderedData: any, position: any) {

    const middleLine = ((position.top - position.bottom) / 2 + position.bottom) / 100;

    for (const el of renderedData) {
      let tmp_y = el.y;
      el.y = middleLine + (middleLine - tmp_y);
    }
    return renderedData;
  }


  drawRenderedCollectionData(svg: any, collection: Collection, collEffect: Details, renderedData: any, pixHeight: number, color: string) {

    d3.selectAll('#grp-render-' + collection.id + '-' + collEffect.id).remove();

    // interface Data {
    //   x: number,
    //   y: number
    // }
    let multiply_x = 1;
    if (collection.rotation.units.name === 'rad') { multiply_x = (Math.PI / 180); }
    if (collection.rotation.units.name === 'sec') { multiply_x = 0.001; }

    // const multiply = { x: multiply_x, y: collection.rotation.units_y.name === 'deg' ? collection.rotation.end_y - collection.rotation.start_y : 100 };
    const multiply = { x: multiply_x, y: 100 };

    const offset = renderedData && renderedData.type === EffectType.position ? pixHeight * ((100-collEffect.scale.y)/100) - (pixHeight * (collEffect.position.y / 100)) :
                                                      pixHeight * (((100-collEffect.scale.y)/100) / 2) - (pixHeight * (collEffect.position.y / 100) / 2);


    let renderedDataCopy = this.cloneService.deepClone(renderedData.data);

    if (collEffect.flip.x) {
      renderedDataCopy.reverse();
      let i = 0;
      for (const el of renderedDataCopy) {
        el.x = i * collEffect.quality;
        i++;
        if (el.d) {
          el.o = el.x - (el.d * (180 / Math.PI));
        }
      }
    }
    if (collEffect.flip.y) {
      renderedDataCopy = this.mirrorData(renderedDataCopy, collEffect.position);
    }

    const grp = svg.append('g')
      .attr('id', 'grp-render-' + collection.id + '-' + collEffect.id);

    if (renderedData && renderedData.type === collection.visualizationType && (collection.rotation.units_y.name === renderedData.yUnit)) {
      this.drawRenderedData(grp, renderedDataCopy, renderedData.type, collection, collEffect, collEffect.position.x, multiply, offset, color);

      for (const repeat of collEffect.repeat.repeatInstances) {
        this.drawRenderedData(grp, renderedDataCopy, renderedData.type, collection, collEffect, repeat.x, multiply, offset, color);
      }
    }
  }


  drawRenderedData(grp: any, dataCopy: any, type: EffectType, collection: Collection, collEffect: any, x: number, multiply: any, offset: any, color: string, render = true) {

    // const min_radius = (0.4 * multiply.x);

    if (type === EffectType.position) {
      grp.selectAll('line.offset-' + collection.id + '-' + collEffect.id + '-' + Math.round(x * 1000))
        .data(dataCopy)
        .enter()
        .append('line')
        .attr('class', 'offset-' + collection.id + '-' + collEffect.id + '-' + Math.round(x * 1000))
        .attr('x1', (d) => collection.config.newXscale((d.x * (collEffect.scale.x / 100) * multiply.x) + x))
        .attr('x2', (d) => render ? collection.config.newXscale((d.o * (collEffect.scale.x / 100) * multiply.x) + x) : collection.config.newXscale(((d.x + d.d) * multiply.x) + x))
        .attr('y1', (d) => collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset)
        .attr('y2', (d) => collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset)
        .attr('stroke', 'rgba(255,255,255,0.4)')
        .attr('stroke-width', 1)
        .style('opacity', (d) => render && this.checkIfXisWithinOverlap(d.x * (collEffect.scale.x / 100) + (x/multiply.x), collection.renderedData) ? 0 : 0.4);

      grp.selectAll('circle.offset-' + collection.id + '-' + collEffect.id + '-' + Math.round(x * 1000))
        .data(dataCopy)
        .enter()
        .append('circle')
        .attr('class', 'offset-' + collection.id + '-' + collEffect.id + '-' + Math.round(x * 1000))
        .attr('cx', (d) => render ? collection.config.newXscale((d.o * (collEffect.scale.x / 100) * multiply.x) + x) : collection.config.newXscale(((d.x + d.d) * multiply.x) + x))
        .attr('cy', (d) => collection.config.newYscale((d.y * multiply.y)) * (collEffect.scale.y / 100) + offset)
        .attr('r', (d) => 1)
        .style('fill', 'rgba(255,255,255,0.4)')
        .style('opacity', (d, i) => render && this.checkIfXisWithinOverlap(d.x * (collEffect.scale.x / 100) + (x/multiply.x), collection.renderedData) ? 0 : 0.4);
    }

    grp.selectAll('line.render-' + collection.id + '-' + collEffect.id + '-' + Math.round(x * 1000))
      .data(dataCopy)
      .enter()
      .append('line')
      .attr('class', 'render-' + collection.id + '-' + collEffect.id + '-' + Math.round(x * 1000))
      .attr('x1', (d, i) => i < dataCopy.length - 1 ? collection.config.newXscale((d.x * (collEffect.scale.x / 100) * multiply.x) + x) : 0)
      .attr('x2', (d, i) => i < dataCopy.length - 1 ? collection.config.newXscale((dataCopy[i + 1].x * (collEffect.scale.x / 100) * multiply.x) + x) : 0)
      .attr('y1', (d, i) => i < dataCopy.length - 1 ? collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset : 0)
      .attr('y2', (d, i) => i < dataCopy.length - 1 ? collection.config.newYscale((dataCopy[i + 1].y * multiply.y )) * (collEffect.scale.y / 100) + offset : 0)
      .style('stroke', 'rgba(255,255,255, 0.4)')
      .style('stroke-width', (d, i) => i < dataCopy.length - 1 ? 1.2 : 0);

    grp.selectAll('circle.render-' + collection.id + '-' + collEffect.id + '-' + Math.round(x * 1000))
      .data(dataCopy)
      .enter()
      .append('circle')
      .attr('class', 'render-' + collection.id + '-' + collEffect.id + '-' + Math.round(x * 1000))
      .attr('cx', (d, i) => collection.config.newXscale((d.x * (collEffect.scale.x / 100) * multiply.x) + x))
      .attr('cy', (d) => collection.config.newYscale((d.y * multiply.y )) * (collEffect.scale.y / 100) + offset)
      .attr('r', (d) =>  1.3)
      .style('fill', color)
      .style('opacity', (d, i) => render && this.checkIfXisWithinOverlap(d.x * (collEffect.scale.x / 100) + (x/multiply.x), collection.renderedData) ? 0 : 1);

  }


  drawOverlappingData(svg: any, collection: Collection, color: string) {
    d3.selectAll('#grp-render-overlap-' + collection.id).remove();

    let multiply_x = 1;
    if (collection.rotation.units.name === 'rad') { multiply_x = (Math.PI / 180); }

    const multiply = { x: multiply_x, y: 100 };

    const grp = svg.append('g').attr('id', 'grp-render-overlap-' + collection.id);
    let i = 0;

    for (const overlap of collection.renderedData) {
      if (overlap.position) {
        if (overlap.type === EffectType.velocity || (collection.layers.filter(l => l.name === 'CW')[0].visible && overlap.direction.cw) || (collection.layers.filter(l => l.name === 'CCW')[0].visible && overlap.direction.ccw)) {
          this.drawRenderedData(grp, overlap.data, overlap.type, collection, { scale: { x: 100, y: 100 }, id: i }, overlap.position.start * multiply.x, multiply, 0, color, false);
        }
      }
      i++;
    }
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
