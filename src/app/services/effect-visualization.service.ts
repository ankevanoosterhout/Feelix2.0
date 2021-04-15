import { Injectable } from '@angular/core';
import * as d3 from 'd3';
import { ElectronService } from 'ngx-electron';



@Injectable()
export class EffectVisualizationService {

  public verticalDivision = 30;

  constructor(private electronService: ElectronService) { }



  drawLinearScaleModel(effect: any) {
    d3.selectAll('.SVG').remove();

    if (effect && (effect.slug === 1 || effect.slug === 3)) {

      const width = 100;
      const height = 60;
      const margin = 25;

      const svg = d3.select('#linearSVG')
        .append('svg')
        .attr('id', 'SVG-' + effect.id)
        .attr('class', 'SVG')
        .attr('width', width + (2 * margin))
        .attr('height', height + (2 * margin));

      const container = svg.append('rect')
        .attr('width', width + (2 * margin))
        .attr('height', height + (2 * margin))
        .attr('x', 0)
        .attr('y', 0)
        .attr('fill', '#3a3a3a');

      const graph = svg.append('g')
        .attr('class', 'graph')
        .attr('transform', 'translate(' + [ margin, margin ] + ')');

      for (let i = 0; i < 3; i++) {
        this.drawBlock(graph, 'horizontal-' + i, effect.id, 0, (i * (height / 2)), width, 0.5, '#999');
        this.drawBlock(graph, 'vertical-' + i, effect.id, (i * (width / 2)), 0, 0.5, height, '#999');
      }


      const line = graph.append('line')
          .attr('class', 'obj-' + effect.id)
          .attr('id', 'line-' + effect.id)
          .attr('x1', 0)
          .attr('y1', (100 - effect.details.parameter.value.start2) * 0.6)
          .attr('x2', width)
          .attr('y2', (100 - effect.details.parameter.value.end2) * 0.6)
          .style('stroke', '#fff')
          .style('stroke-width', 2)
          .style('stroke-linecap', 'round');

      for (let p = 0; p < 2; p++) {

        const changePosition = d3
          .drag()
          .on('drag', () => {
            let pos = d3.event.y;

            if (pos < 0) { pos = 0; } else if (pos > height) { pos = height; }

            if (p === 0) { effect.details.parameter.value.start2 = Math.round((height - pos) / 0.6);
            } else { effect.details.parameter.value.end2 = Math.round((height - pos) / 0.6); }

            d3.select('#value-' + effect.id + '-' + p)
              .text(() => p === 0 ? effect.details.parameter.value.start2 : effect.details.parameter.value.end2);

            d3.select('#speedCircle-' + effect.id + '-' + p)
              .attr('cy', pos);

            if (p === 0) {
              d3.select('#line-' + effect.id)
                .attr('y1', pos);
            } else {
              d3.select('#line-' + effect.id)
                .attr('y2', pos);
            }
          })
          .on('end', () => {
            this.electronService.ipcRenderer.send('updateHapticEffect', effect);
          });

        const speedCircle = graph.append('circle')
          .attr('class', 'obj-' + effect.id)
          .attr('id', 'speedCircle-' + effect.id + '-' + p)
          .attr('r', 3.5)
          .attr('cx', () => p === 0 ? 0 : width)
          .attr('cy', () => p === 0 ?
            (100 - effect.details.parameter.value.start2) * 0.6 : (100 - effect.details.parameter.value.end2) * 0.6)
          .style('stroke', '#1c1c1c')
          .style('fill', '#f2662d')
          .style('stroke-width', .75)
          .call(changePosition);

        const label = svg.append('text')
          .attr('id', 'label-' + effect.id + '-' + p)
          .text(() => p === 0 ? effect.details.parameter.value.unitOptions2[0].name : effect.details.parameter.value.unitOptions[0].name )
          .attr('x', () => p === 0 ? (height / 2 + margin) * -1 : width / 2 + margin)
          .attr('y', () => p === 0 ? 10 : height + margin + 15)
          .attr('text-anchor', 'middle')
          .style('fill', '#ccc')
          .style('font-weight', 'bold')
          .style('font-family', 'Open Sans, Arial, sans-serif')
          .style('font-size', '10px')
          .attr('transform', () => p === 0 ? 'rotate(-90)' : 'rotate(0)');

        const value = svg.append('text')
          .attr('id', 'value-' + effect.id + '-' + p)
          .text(() => p === 0 ? effect.details.parameter.value.start2 : effect.details.parameter.value.end2 )
          .attr('x', () => p === 0 ? margin : width + margin)
          .attr('y', 15)
          .attr('text-anchor', 'middle')
          .style('fill', '#ccc')
          .style('font-weight', 'bold')
          .style('font-family', 'Open Sans, Arial, sans-serif')
          .style('font-size', '10px');
      }
    }
  }



  drawEffect(libEffect: any, type = 'position') {

    const height = 55;

    d3.select('#svgID-' + libEffect.id).remove();

    const svg = d3.select('#effectSVG-' + libEffect.id)
      .append('svg')
      .attr('id', 'svgID-' + libEffect.id)
      .attr('width', (window.innerWidth * this.verticalDivision / 100) - 90 + 1.6)
      .attr('height', height);

    const container = svg.append('rect')
      .attr('width', (window.innerWidth * this.verticalDivision / 100) - 90)
      .attr('height', height)
      .attr('x', 0)
      .attr('y', 0)
      .attr('fill', '#2c2c2c')
      .attr('stroke', '#111')
      .attr('stroke-width', 0.5);

    const nodes = svg.append('g')
      .attr('class', 'nodes effect' + libEffect.id)
      .attr('transform', 'translate(0, 3)');

    this.drawEffectData(nodes, libEffect, height, type);

  }

  drawEffectData(nodes: any, libEffect: any, height: number, type = 'position',
                 colors = ['#f2662d', '#9bbef5', '#ed1a75'], feelixio = false) {

    let width = (window.innerWidth * this.verticalDivision / 100) - 120;

    if (libEffect && libEffect.paths.length > 0 && libEffect.paths[0].nodes.length > 0) {

      const xScale = d3.scaleLinear()
        .domain([ libEffect.paths[0].box.left - (libEffect.paths[0].box.width * 0.15),
          libEffect.paths[0].box.right + (libEffect.paths[0].box.width * 0.15) ])
        .range([3, width - 3]);

      const domain = type === 'torque' ? [100, -100] : [libEffect.range.max, libEffect.range.min];
      const yScale = d3.scaleLinear()
        .domain(domain)
        .range([6, height - 6]);

      const paths = this.returnPathAsString(libEffect.paths[0], xScale, yScale, 'pos');

      if (type === 'position') {
        const planes = this.returnPlaneAsString(libEffect.paths[0], xScale, yScale);

        nodes.selectAll('path.plane_' + libEffect.id)
          .data(planes)
          .enter()
          .append('path')
          .attr('d', (d: { svgPath: string }) => d.svgPath)
          .attr('fill', colors[2])
          .style('opacity', 0.3);
      }

      nodes.selectAll('path.path_' + libEffect.id)
        .data(paths)
        .enter()
        .append('path')
        .attr('d', (d: { svgPath: string }) => d.svgPath)
        .attr('stroke', () => type === 'position' ? colors[0] : colors[1])
        .attr('stroke-width', () => 1.4)
        .attr('fill', 'transparent');

      if (feelixio) {
        nodes.append('rect')
          .attr('id', 'cursor_' + libEffect.id)
          .attr('x', 15)
          .attr('y', 0)
          .attr('width', 1.5)
          .attr('height', height)
          .style('fill', '#FF0036');

        return xScale;
      }
    }
  }


  updateCursor(effectID: string, units: any, position: number, xScale: any, width: number) {
    let cursorPos = units.name === 'degrees' ? xScale(position * (360 / 4096)) : xScale(position);
    if (cursorPos < 15) { cursorPos = 15; }
    if (cursorPos > width - 15) { cursorPos = width - 15; }
    d3.select('#cursor_' + effectID).attr('x', cursorPos);
  }



  returnPathAsString(path: any, scaleX: any, scaleY: any, type = 'pos'): Array<object> {
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
            pathStr += ' ' + scaleX(node.pos.x);
            pathStr += ' ' + scaleY(node.pos.y);
          } else {
            pathStr += ' ' + scaleX(node.angle.x);
            pathStr += ' ' + scaleY(node.angle.y);
          }
          idStr += node.id + '&&';
          if (n > 0) {
            pathStrArray.push( { id: idStr, svgPath: pathStr, parent: path.id } );
            if (type === 'pos') {
              pathStr = 'M ' + scaleX(node.pos.x) + ' ' + scaleY(node.pos.y);
            } else {
              pathStr = 'M ' + scaleX(node.angle.x) + ' ' + scaleY(node.angle.y);
            }
            idStr = node.id + '&&';
          }
          n++;
        } else if (node.type === 'cp' && index < nodes.length - 1 && index > 0) {

          if (type === 'pos') {
            if (nodes[index + 1].type === 'cp') {
              pathStr += ' C ' + scaleX(node.pos.x) + ' ' + scaleY(node.pos.y);
            } else if (nodes[index - 1].type === 'node' && nodes[index + 1].type === 'node') {
              pathStr += ' Q ' + scaleX(node.pos.x) + ' ' + scaleY(node.pos.y);
            } else {
              pathStr += ' ' + scaleX(node.pos.x) + ' ' + scaleY(node.pos.y);
            }
          } else {
            if (nodes[index + 1].type === 'cp') {
              pathStr += ' C ' + scaleX(node.angle.x) + ' ' + scaleY(node.angle.y);
            } else if (nodes[index - 1].type === 'node' && nodes[index + 1].type === 'node') {
              pathStr += ' Q ' + scaleX(node.angle.x) + ' ' + scaleY(node.angle.y);
            } else {
              pathStr += ' ' + scaleX(node.angle.x) + ' ' + scaleY(node.angle.y);
            }
          }
        }
      });
      return pathStrArray;
    }
  }

  returnPlaneAsString(path: any, scaleX: any, scaleY: any): Array<object> {
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

        pathStr += scaleX(el[0].pos.x) + ' ' + scaleY(el[0].pos.y);

        if (el.length === 3) { pathStr += ' Q'; } else if (el.length === 4) { pathStr += ' C'; }

        for (let i = 1; i < el.length; i++) {
          pathStr += ' ' + scaleX(el[i].pos.x) + ' ' + scaleY(el[i].pos.y);
        }
        pathStr += ' L ' + scaleX(el[el.length - 1].angle.x) + ' ' + scaleY(el[el.length - 1].angle.y);

        if (el.length === 3) { pathStr += ' Q'; } else if (el.length === 4) { pathStr += ' C'; }

        for (let i = el.length - 2; i >= 0; i--) {
          pathStr += ' ' + scaleX(el[i].angle.x) + ' ' + scaleY(el[i].angle.y);
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
