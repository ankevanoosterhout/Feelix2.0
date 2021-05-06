import { Injectable, Inject } from '@angular/core';
import { DrawingPlaneConfig } from '../models/drawing-plane-config.model';
import { NodeService } from './node.service';
import * as d3 from 'd3';
import { DOCUMENT } from '@angular/common';
import { File } from '../models/file.model';
import { BBoxService } from './bbox.service';
import { DataService } from './data.service';
import { BezierService } from './bezier.service';
import { HistoryService } from './history.service';


@Injectable()
export class DrawElementsService {

  public file = new File(null, null, null);
  public config: DrawingPlaneConfig;

  constructor(@Inject(DOCUMENT) private document: Document, private bezierService: BezierService,
              public nodeService: NodeService, private bboxService: BBoxService, private dataService: DataService,
              public historyService: HistoryService) {
              this.config = this.bboxService.config;
  }


  drawPath(path: string, type = 'pos') {
    const paths = this.nodeService.returnPathAsString(path, type);

    let dragStart = { x: null, y: null };
    let dragUpdate = { x: null, y: null };

    if (paths) {

      this.drawForcePlane(path);


      this.config.svg.selectAll('#pathSVG_' + path + '_' + type).remove();

      this.config.pathSVG = this.config.svg.append('g')
        .attr('id', 'pathSVG_' + path + '_' + type)
        .attr('class', 'pathSVG')
        .attr('clip-path', 'url(#clip)')
        .attr('transform', 'translate(0, ' + this.config.margin.top + ')');

      const dragPath = d3
        .drag()
        .on('start', (d: any) => {
          this.historyService.addToHistory();
          if (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel' || this.config.cursor.slug === 'anchor' ||
              (!d3.event.sourceEvent.shiftKey && this.config.cursor.slug === 'thick')) {

            this.nodeService.selectPath(d.parent, d3.event.sourceEvent.shiftKey);

            if (this.config.cursor.slug === 'dsel') {
              this.config.svg.selectAll('.cpSVG, .bbox').remove();
              dragStart = { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY - this.config.margin.top };
              dragUpdate = { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY - this.config.margin.top };
            }

            if (this.config.cursor.slug === 'sel') {
              this.config.svg.selectAll('.cpSVG, .bbox').remove();
              this.nodeService.selectedNodes = [];
              this.bboxService.drawBoundingBox();
            }
          } else if ((this.config.cursor.slug === 'pen' && d3.event.sourceEvent.shiftKey) ||
                    (d3.event.sourceEvent.shiftKey && this.config.cursor.slug === 'thick') ||
                    this.config.cursor.slug === 'scis') {
            // add node on path
            const nodes = this.nodeService.getNodesOfPathSegment(d.id, d.parent);
            const mouse = {
              x: this.nodeService.scale.scaleX.invert(this.config.closestCoords.x),
              y: this.nodeService.scale.scaleY.invert(this.config.closestCoords.y)
            };
            const newNodesOnPath = this.bezierService.splitPath(nodes, d.parent, mouse);
            this.nodeService.insertPathSegment(newNodesOnPath.nodes, d.parent);

            if (this.config.cursor.slug === 'scis') {
              const newPaths = this.nodeService.splitPathInTwo(newNodesOnPath._newNode.id, d.parent);
              for (const newPath of newPaths) {
                this.bboxService.getBBox(newPath);
              }
            } else if (this.config.cursor.slug === 'pen') {
              this.nodeService.selectedNodes = [ newNodesOnPath._newNode.id ];
              this.nodeService.selectedPaths = [ d.parent ];
              const cpPoints = this.nodeService.getCP(newNodesOnPath._newNode);
              this.drawControlPoints(cpPoints);
            }
            this.redrawElements();
          }
        })
        .on('drag', (d: any) => {
          if (this.config.cursor.slug === 'dsel') {
            const coords = { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY - this.config.margin.top };

            if (this.nodeService.selectedNodes.length === 0) {

              d3.selectAll('#pathSVG_' + d.parent + '_angle,' +
                        '#pathSVG_' + d.parent + '_pos,' +
                        '#planeSVG_' + d.parent + ',' +
                        '#nodesSVG_' + d.parent).attr('transform', () => {
                return 'translate(' + [ this.config.margin.left + (coords.x - dragStart.x),
                                        this.config.margin.top + (coords.y - dragStart.y) ] + ')'; });
            } else {
              const translate = {
                x: this.nodeService.scale.scaleX.invert(coords.x) - this.nodeService.scale.scaleX.invert(dragUpdate.x),
                y: this.nodeService.scale.scaleY.invert(coords.y) - this.nodeService.scale.scaleY.invert(dragUpdate.y)
              };
              this.nodeService.moveAllSelectedNodes(translate, d3.event.sourceEvent.shiftKey);
              this.redrawElements();
              dragUpdate = coords;
            }
          }
        })
        .on('end', (d: any) => {

          if (this.config.cursor.slug === 'dsel') {
            if (this.nodeService.selectedNodes.length === 0) {
              const coords = { x: d3.event.sourceEvent.pageX, y: d3.event.sourceEvent.pageY - this.config.margin.top };

              const translate = {
                x: this.nodeService.scale.scaleX.invert(coords.x) - this.nodeService.scale.scaleX.invert(dragStart.x),
                y: this.nodeService.scale.scaleY.invert(coords.y) - this.nodeService.scale.scaleY.invert(dragStart.y)
              };
              this.nodeService.moveAllSelectedNodes(translate, d3.event.sourceEvent.shiftKey);
              // this.redrawElements();
            }
            this.bboxService.getBBoxSelectedPaths();
          }
        });

      this.config.pathSVG.selectAll('path.cl_' + path + '_' + type)
        .data(paths)
        .enter()
        .append('path')
        .attr('d', (d: { svgPath: string }) => d.svgPath)
        .attr('id', (d: { id: string; parent: string }) => 'id_' + d.id + '_' + d.parent)
        .attr('class', (d: { parent: string; }) => 'path_' + d.parent + '_' + type)
        .attr('stroke', () =>  type === 'pos' ? this.file.activeEffect.colors[0].hash : this.file.activeEffect.colors[1].hash)
        .attr('stroke-width', () => {
          if (type === 'angle') { return 0.3; }
          else if (this.file.activeEffect.rotation === 'dependent') { return 2.5; }
          else { return 0.8; }
        })
        .attr('fill', 'transparent')
        .attr('pointer-events', (d: any) =>
          !this.config.zoomable && !this.nodeService.getPath(d.parent).lock ? 'auto' : 'none')
        .on('mouseenter', (d: any) => {
          if (this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'dsel' || this.config.cursor.slug === 'pen' ||
              this.config.cursor.slug === 'anchor' || this.config.cursor.slug === 'scis' ) {
            if (this.nodeService.selectedNodes.length === 0) {
              this.config.nodesSVG.selectAll('.n_' + d.parent)
                .style('fill', 'white')
                .style('stroke', this.file.activeEffect.colors[0].hash)
                .style('stroke-width', 0.5);
            }
          }
        })
        .on('mousemove', (d: any) => {
          if ((this.config.cursor.slug === 'pen' && d3.event.shiftKey) || this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'scis') {

            const mouse = {
              x: this.nodeService.scale.scaleX.invert(d3.event.x - this.config.margin.left),
              y: this.nodeService.scale.scaleY.invert(d3.event.y - this.config.margin.top)
            };
            if (d3.select('.cursorConnection').empty()) {
              this.updatePointPath(mouse, d.parent, d.id);
            }

            if (this.config.cursor.slug === 'pen' && d3.event.shiftKey) {
              this.config.cursor.selectedSubcursor = 'add';
              this.document.getElementById('field-inset').style.cursor =
                this.config.cursor.subcursor.filter(c => c.name === 'add')[0].cursor;
            }
          }
        })
        .on('mouseout', (d: any) => {
          if (this.config.cursor.selectedSubcursor === 'add' && this.config.cursor.slug === 'pen') {
            this.config.cursor.selectedSubcursor = null;
            this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor;
          } else if (this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'anchor' ||
                      this.config.cursor.slug === 'scis' || this.config.cursor.slug === 'dsel') {
            if (this.nodeService.selectedPaths.indexOf(d.parent) === -1) {
              this.config.nodesSVG.selectAll('.n_' + d.parent)
                .style('fill', 'transparent')
                .style('stroke', 'transparent')
                .style('stroke-width', 3);
            }
          }
          this.config.svg.selectAll('.closestPoint').remove();
        })
        .call(dragPath);
    }

  }


  updatePointPath(mouse: { x: number, y: number }, parent: string, path: string) {
    const nodes = this.nodeService.getNodesOfPathSegment(path, parent);
    this.config.closestCoords = this.bezierService.findClosestPointOnPath(mouse, nodes, path);
    if (this.config.closestCoords !== null) {
      this.drawClosestPointOnPath(this.config.closestCoords);
    }
  }


  drawClosestPointOnPath(coords: { x: number, y: number }) {
    this.config.svg.selectAll('.closestPoint').remove();

    if (coords.x !== null && coords.y !== null) {
      for (let i = -1; i < 2; i += 2) {
        const closestPointOnPath = this.config.pathSVG.append('line')
            .attr('x1', coords.x - 3)
            .attr('y1', coords.y - 3 * i)
            .attr('x2', coords.x + 3)
            .attr('y2', coords.y + 3 * i)
            .attr('class', 'closestPoint')
            .attr('stroke', '#00ff05')
            .attr('stroke-width', 1.2);
      }
    }
  }


  drawNodes(path: string) {

    this.config.svg.selectAll('#nodesSVG_' + path).remove();
    this.config.nodesSVG = this.config.svg.append('g')
      .attr('id', 'nodesSVG_' + path)
      .attr('class', 'nodesSVG')
      .attr('clip-path', 'url(#clip)')
      .attr('transform', 'translate(0, ' + this.config.margin.top + ')');

    const nodes = this.nodeService.getNodes(path, 'node');
    let endNode = -1;

    const dragNode = d3
      .drag()
      .on('start', (d: any) => {

        this.historyService.addToHistory();

        if ((this.config.cursor.slug === 'dsel') || (this.config.cursor.slug === 'anchor' && !d3.event.sourceEvent.altKey)) {

          if (!d3.event.sourceEvent.shiftKey) {
            const cpPoints = this.nodeService.getCP(d);
            this.drawControlPoints(cpPoints);
          } else {
            this.config.svg.select('.cpSVG').remove();
          }

          this.nodeService.selectPath(d.path, d3.event.sourceEvent.shiftKey);
          this.nodeService.selectNode(d.id, d3.event.sourceEvent.shiftKey);

          this.config.nodesSVG.selectAll('.fn_' + d.path).style('fill', this.file.activeEffect.colors[1].hash);
          this.dataService.selectElement(d.id, d.pos.x, d.pos.y, null, null);

        } else if (this.config.cursor.slug === 'pen' || this.config.cursor.slug === 'anchor') {

          if (this.nodeService.selectedNodes.length <= 1 && this.config.cursor.selectedSubcursor === 'start' &&
              this.config.cursor.slug === 'pen') {
            if (endNode === 0) { this.nodeService.reverseNodes(d.path); }
            this.nodeService.selectNode(d.id,  false);
            this.nodeService.selectPath(d.path, false);

          } else if (this.config.cursor.selectedSubcursor === 'remove' && this.config.cursor.slug === 'pen') {
            this.nodeService.deleteNode(d.id, d.path);
            this.config.svg.select('.cpSVG').remove();
            this.config.cursor.selectedSubcursor = null;

          } else if (this.config.cursor.selectedSubcursor === 'remove-cp' && this.config.cursor.slug === 'pen') {
            if (this.nodeService.selectedNodes.includes(d.id)) {
              this.nodeService.removeCP(d, true);
            }
          } else if (this.config.cursor.selectedSubcursor === 'close' && this.config.cursor.slug === 'pen') {
            if (endNode !== 0) { this.nodeService.reverseNodes(d.path); }
            this.nodeService.mergePaths(this.nodeService.selectedPaths[0], d.path);
            const bbox = this.bboxService.getBBox(this.nodeService.getPath(this.nodeService.selectedPaths[0]));
            this.nodeService.deselectAll();
            this.config.svg.select('.cursorConnectionClose').remove();

          } else if (this.config.cursor.slug === 'anchor') {
            this.nodeService.removeCP(d);
            this.nodeService.selectNode(d.id,  false);
            this.nodeService.selectPath(d.path, false);
            this.config.svg.select('.cpSVG').remove();
          }
          if (this.nodeService.selectedNodes.length === 1 && this.nodeService.selectedPaths.indexOf(d.path) > -1 &&
              this.config.cursor.slug === 'pen' && this.config.cursor.selectedSubcursor !== 'start' &&
              this.config.cursor.selectedSubcursor !== 'remove') {
            const cpPoints = this.nodeService.getCP(d);
            this.drawControlPoints(cpPoints);
          }
          this.redrawElements();

        } else if (this.config.cursor.slug === 'sel') {

          this.nodeService.selectedNodes = [];
          this.nodeService.selectPath(d.path, d3.event.shiftKey);
          this.bboxService.drawBoundingBox();

        } else if (this.config.cursor.slug === 'scis') {
          const newPaths = this.nodeService.splitPathInTwo(d.id, d.path);

          for (const newPath of newPaths) {
            this.bboxService.getBBox(newPath); }
          this.redrawElements();

        } else if (this.config.cursor.slug === 'thick') {
          this.nodeService.selectPath(d.path, false);
          this.nodeService.selectNode(d.id, false);

          if (d.pos.x === d.angle.x) {
            this.bezierService.updateForceAngleNodesPath(d.id, d.path);
            this.config.newControlPoints = this.bezierService.getForceControlPointValues(d.id, d.path);
            this.redrawElements();
          } else {
            this.config.newControlPoints = [];
          }
        }

      })
      .on('drag', (d: any) => {

        if ( this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'dsel' || this.config.cursor.slug === 'anchor' ) {
          const coords = {
            x: d3.event.sourceEvent.pageX - this.config.margin.left,
            y: d3.event.sourceEvent.pageY - this.config.margin.top - this.config.margin.offsetTop };

          if (coords.y < 0) { coords.y = 0; }
          if (coords.y > this.config.chartDy) { coords.y = this.config.chartDy; }

          let invertedCoords = {
            x: this.nodeService.scale.scaleX.invert(coords.x),
            y: this.nodeService.scale.scaleY.invert(coords.y)
          };

          if (this.config.cursor.slug !== 'thick') {
            invertedCoords = this.nodeService.calculateSnapPoint(invertedCoords);

            if (invertedCoords.x < this.config.editBounds.xMin) { invertedCoords.x = this.config.editBounds.xMin; }
            if (invertedCoords.x > this.config.editBounds.xMax) { invertedCoords.x = this.config.editBounds.xMax; }
          }

          const diff = { x: invertedCoords.x - d.pos.x, y: invertedCoords.y - d.pos.y };

          if (this.config.cursor.slug === 'dsel' || this.config.cursor.slug  === 'anchor') {

            this.nodeService.moveAllSelectedNodes(diff, d3.event.sourceEvent.shiftKey);
            this.dataService.selectElement(d.id, d.pos.x, d.pos.y, null, null);
            this.redrawElements();
            if (this.nodeService.selectedNodes.length === 1) {
              this.drawControlPoints(this.nodeService.getCP(d));
            }

          } else if (this.config.cursor.slug === 'thick') {
            if (this.nodeService.selectedNodes.length === 1) {
              this.drawControlPoints(this.nodeService.getCP(d), 'angle');
            }
            this.nodeService.updateForceAngle(d.id, d.path, diff.x, (d.pos.x + diff.x), this.config.newControlPoints);
            this.redrawElements();
          }
          this.drawForcePlane(d.path);
          this.drawPath(d.path, 'angle');

          this.drawPath(d.path, 'pos');
          d3.selectAll('.cpSVG, .nodesSVG').raise();
        }

      })
      .on('end', (d: any) => {
        if (this.config.cursor.slug === 'dsel') {
          d3.select('#id_' + d.id + '_' + d.path)
            .style('fill', () => this.nodeService.selectedNodes.indexOf(d.id) > -1 ? this.file.activeEffect.colors[0].hash : 'white');

          this.bboxService.getBBoxSelectedPaths();

        } else if (this.config.cursor.slug === 'thick') {
          for (const cp of this.config.newControlPoints) {
            this.nodeService.updateCP(cp);
          }
          this.config.newControlPoints = [];
        }


      });




    const dragForceNode = d3.drag()
      .on('start', (d: any) => {
        this.historyService.addToHistory();
      })
      .on('drag', (d: any) => {
        if (this.config.cursor.slug === 'thick') {
          const invertX = this.nodeService.scale.scaleX.invert(d3.event.sourceEvent.pageX - this.config.margin.left);

          const diffX = { x: invertX - d.angle.x };
          this.nodeService.moveNodeAngle(d, diffX);
          this.redrawElements();
          d.angle.x = invertX;
          this.drawControlPoints(this.nodeService.getCP(d), 'angle');

        }
      })
      .on('end', (d: any) => {
        const box = this.bboxService.getBBox(this.nodeService.getPath(d.path));
      });


    this.config.nodesSVG.selectAll('circle.fn_' + path)
      .data(nodes)
      .enter()
      .append('circle')
      .attr('id', (d: { id: string; path: string }) => 'id_nf_' + d.id + '_' + d.path)
      .attr('class', 'fn_' + path + ' forceNode')
      .attr('r', (d: any) => d.pos.x !== d.angle.x ? 2 : 0)
      .attr('cx', (d: { angle: { x: number; y: number; }; }) => this.nodeService.scale.scaleX(d.angle.x))
      .attr('cy', (d: { angle: { x: number; y: number; }; }) => this.nodeService.scale.scaleY(d.angle.y))
      .attr('stroke', 'transparent')
      .attr('stroke-width', 2)
      .attr('pointer-events', (d: any) =>
        !this.config.zoomable && !this.nodeService.getPath(d.path).lock ? 'auto' : 'none')
      .style('fill', (d: { id: string; path: string; }) => {
        if (this.nodeService.selectedNodes.indexOf(d.id) > -1) {
          return this.file.activeEffect.colors[1].hash;
        }
        return 'transparent';
      })
      .on('mouseover', (d: { id: string, path: string }) => {
        d3.select('#id_nf_' + d.id + '_' + d.path).style('fill', this.file.activeEffect.colors[1].hash);
      })
      .on('mousedown', (d: any) => {
        this.nodeService.addSelectedNode(d.id);
        this.nodeService.addSelectedPath(d.path);
        this.drawControlPoints(this.nodeService.getCP(d), 'angle');
      })
      .on('mouseleave', (d: { id: string, path: string }) => {
        if (this.nodeService.selectedPaths.indexOf(d.path) < 0) {
          d3.select('#id_nf_' + d.id + '_' + d.path).style('fill', 'transparent');
        }
      })
      .call(dragForceNode);



    this.config.nodesSVG.selectAll('rect.n_' + path)
      .data(nodes)
      .enter()
      .append('rect')
      .attr('id', (d: { id: string; path: string }) => 'id_' + d.id + '_' + d.path)
      .attr('class', 'n_' + path + ' node')
      .attr('width', 3.5)
      .attr('height', 3.5)
      .attr('x', (d: { pos: { x: number; y: number; }; }) => this.nodeService.scale.scaleX(d.pos.x) - 1.75)
      .attr('y', (d: { pos: { x: number; y: number; }; }) => this.nodeService.scale.scaleY(d.pos.y) - 1.75)
      .attr('pointer-events', (d: any) =>
          !this.config.zoomable && !this.nodeService.getPath(d.path).lock ? 'auto' : 'none')
      .style('fill', (d: { id: string; path: string; }) => {
        if (this.nodeService.selectedNodes.indexOf(d.id) > -1) {
          return this.file.activeEffect.colors[0].hash;
        }
        return this.nodeService.selectedPaths.indexOf(d.path) > -1 ? 'white' : 'transparent';
      })
      .style('stroke', (d: { id: string; path: string; }) =>
        this.nodeService.selectedPaths.indexOf(d.path) > -1 ? this.file.activeEffect.colors[0].hash : 'transparent')
      .style('stroke-width', (d: { id: string; path: string; }) => this.nodeService.selectedPaths.indexOf(d.path) > -1 ? 0.5 : 6)
      .style('shape-rendering', 'crispEdges')
      .on('mouseenter', (d: any) => {
        if (this.config.cursor.slug === 'pen' && this.nodeService.selectedNodes.indexOf(d.id) < 0) {
          endNode = this.nodeService.checkIfNodeIsAtTheEndOfArray(d);
          if (endNode > -1) {
            if (!d3.select('.cursorConnection').empty()) {
              this.config.cursor.selectedSubcursor = 'close';
              this.drawActiveCursorConnClose(d);
            } else if (d3.select('.cursorConnection').empty()) {
              this.config.cursor.selectedSubcursor = 'start';
            }
          } else if (endNode === -1 && d3.select('.cursorConnection').empty()) {
            this.config.cursor.selectedSubcursor = 'remove';
          }
          if (this.config.cursor.selectedSubcursor !== null) {
            this.document.getElementById('field-inset').style.cursor =
                this.config.cursor.subcursor.filter(c => c.name === this.config.cursor.selectedSubcursor)[0].cursor;
          }
        }

        if (this.config.cursor.slug === 'dsel' || this.config.cursor.slug === 'pen' ||
            this.config.cursor.slug === 'scis' || this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'anchor') {

          this.config.svg.selectAll('.closestPoint').remove();

          this.config.nodesSVG.selectAll('.n_' + d.path)
            .style('fill', 'white')
            .style('stroke', this.file.activeEffect.colors[0].hash)
            .style('stroke-width', 0.5);

          d3.select('#id_' + d.id + '_' + d.path)
            .attr('width', 7).attr('height', 7)
            .attr('x', this.nodeService.scale.scaleX(d.pos.x) - 3.5)
            .attr('y', this.nodeService.scale.scaleY(d.pos.y) - 3.5)
            .style('stroke', this.file.activeEffect.colors[0].hash)
            .style('stroke-width', 0.5)
            .style('fill', () => this.nodeService.selectedNodes.indexOf(d.id) < 0 ? 'white' : this.file.activeEffect.colors[0].hash);

          this.config.nodesSVG.selectAll('#id_nf_' + d.id + '_' + d.path).style('fill', this.file.activeEffect.colors[1].hash);
        }
      })
      .on('mouseleave', (d: { id: string; path: string; pos: { x: number; y: number; };  }) => {

        if (this.config.cursor.slug === 'pen' && !d3.event.altKey) {
          this.config.cursor.selectedSubcursor = null;
          this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor;
          this.config.svg.select('.cursorConnectionClose').remove();
        }
        if (this.config.cursor.slug === 'dsel' || this.config.cursor.slug === 'pen' ||
            this.config.cursor.slug === 'scis' || this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'anchor') {

          d3.select('#id_' + d.id + '_' + d.path)
            .attr('width', 3.5).attr('height', 3.5)
            .attr('x', this.nodeService.scale.scaleX(d.pos.x) - 1.75)
            .attr('y', this.nodeService.scale.scaleY(d.pos.y) - 1.75)
            .style('fill', this.file.activeEffect.colors[0].hash)
            .style('stroke', this.file.activeEffect.colors[0].hash)
            .style('stroke-width', 0.5);

          if (this.nodeService.selectedPaths.indexOf(d.path) > -1 && this.nodeService.selectedNodes.indexOf(d.id) < 0) {
            d3.select('#id_' + d.id + '_' + d.path)
              .style('fill', 'white')
              .style('stroke', this.file.activeEffect.colors[0].hash);
          } else if (this.nodeService.selectedPaths.indexOf(d.path) < 0) {
            d3.select('#id_' + d.id  + '_' + d.path)
              .style('fill', 'transparent').style('stroke', 'transparent').style('stroke-width', 0.5);

            this.config.nodesSVG.selectAll('.fn_' + d.path).style('fill', 'transparent');
          }
        }
      })
      .call(dragNode);
  }


  drawControlPoints(points: Array<any>, type = 'pos') {

    this.config.svg.select('.cpSVG').remove();

    this.config.cpSVG = this.config.svg.append('g')
      .attr('id', 'cpSVG')
      .attr('class', 'cpSVG')
      .attr('clip-path', 'url(#clipLarge)')
      .attr('transform', 'translate(0, 0)');


    const dragCP = d3
      .drag()
      .on('start', (d: any) => { if (!this.config.zoomable)  { this.historyService.addToHistory(); } })
      .on('drag', (d: any) => {

        if ((this.config.cursor.slug === 'dsel' && type === 'pos') || (this.config.cursor.slug === 'thick' && type === 'angle') ||
             this.config.cursor.slug === 'anchor') {
          let coords = {
            x: this.nodeService.scale.scaleX.invert(d3.event.x),
            y: this.nodeService.scale.scaleY.invert(d3.event.sourceEvent.pageY - this.config.margin.top - this.config.margin.offsetTop)
          };
          if (this.file.activeEffect.grid.snap && this.file.activeEffect.grid.visible && this.config.cursor.slug !== 'thick') {
            coords = this.nodeService.calculateSnapPoint(coords);
          }
          let diff = { x: coords.x - d.cp.pos.x, y: coords.y - d.cp.pos.y };
          diff = type === 'pos' ? diff : { x: coords.x - d.cp.angle.x, y: coords.y - d.cp.angle.y };

          const single = (this.config.cursor.slug === 'anchor' || this.config.cursor.slug === 'thick') ? true : false;
          const updatedCP = this.nodeService.getUpdatedCP(d.cp, diff, single, type);

          d3.select('#cp_' + d.cp.cp + '_' + type)
            .attr('cx', this.nodeService.scale.scaleX(coords.x))
            .attr('cy', this.nodeService.scale.scaleY(coords.y));
          d3.select('#cc_' + d.cp.cp + '_' + type)
            .attr('x2', this.nodeService.scale.scaleX(coords.x))
            .attr('y2', this.nodeService.scale.scaleY(coords.y));

          if (updatedCP) {
            d3.select('#cp_' + updatedCP.cp + '_' + type)
              .attr('cx', this.nodeService.scale.scaleX(updatedCP.pos.x))
              .attr('cy', this.nodeService.scale.scaleY(updatedCP.pos.y));
            d3.select('#cc_' + updatedCP.cp + '_' + type)
              .attr('x2', this.nodeService.scale.scaleX(updatedCP.pos.x))
              .attr('y2', this.nodeService.scale.scaleY(updatedCP.pos.y));
          }

          this.drawPath(d.node.path, 'angle');

          this.drawPath(d.node.path, 'pos');
          d3.selectAll('.cpSVG, .nodesSVG').raise();
        }
      })
      .on('end', (d: any) => {
        const box = this.bboxService.getBBox(this.nodeService.getPath(d.cp.path));
      });


    if (this.config.cursor.slug !== 'pen') {
      let i = 0;
      for (const point of points) {
        const pathEl = this.nodeService.getPath(point.cp.path);
        if (pathEl.nodes.indexOf(point.cp) === 0 || pathEl.nodes.indexOf(point.cp) === pathEl.nodes.length - 1) {
          points.splice(i, 1);
        }
        i++;
      }
    }


    if (points) {
      this.config.cpSVG.selectAll('line.cp')
        .data(points)
        .enter()
        .append('line')
        .attr('class', (d: { cp: { cp: string; }}) => 'cc_' + d.cp.cp + ' cp')
        .attr('id', (d: { cp: { cp: string; }}) => 'cc_' + d.cp.cp + '_' + type)
        .attr('x1', (d: any) => type === 'pos' ? this.nodeService.scale.scaleX(d.node.pos.x) : this.nodeService.scale.scaleX(d.node.angle.x))
        .attr('y1', (d: any) => type === 'pos' ? this.nodeService.scale.scaleY(d.node.pos.y) : this.nodeService.scale.scaleY(d.node.angle.y))
        .attr('x2', (d: any) => type === 'pos' ? this.nodeService.scale.scaleX(d.cp.pos.x) : this.nodeService.scale.scaleX(d.cp.angle.x))
        .attr('y2', (d: any) => type === 'pos' ? this.nodeService.scale.scaleY(d.cp.pos.y) : this.nodeService.scale.scaleY(d.cp.angle.y))
        .attr('transform', 'translate(0, ' + this.config.margin.top + ')')
        .style('stroke', () => type === 'pos' ? this.file.activeEffect.colors[0].hash : this.file.activeEffect.colors[1].hash)
        .style('stroke-width', 0.5);

      this.config.cpSVG.selectAll('circle.cp')
        .data(points)
        .enter()
        .append('circle')
        .attr('class', (d: { cp: { cp: string; }}) => 'cp_' + d.cp.cp + ' cp')
        .attr('id', (d: { cp: { cp: string; }}) => 'cp_' + d.cp.cp + '_' + type)
        .attr('r', 2.5)
        .attr('cx', (d: any) => type === 'pos' ? this.nodeService.scale.scaleX(d.cp.pos.x) : this.nodeService.scale.scaleX(d.cp.angle.x))
        .attr('cy', (d: any) => type === 'pos' ? this.nodeService.scale.scaleY(d.cp.pos.y) : this.nodeService.scale.scaleY(d.cp.angle.y))
        .attr('transform', 'translate(0, ' + this.config.margin.top + ')')
        .style('fill', () => type === 'pos' ? this.file.activeEffect.colors[0].hash : this.file.activeEffect.colors[1].hash)
        .style('stroke', 'transparent')
        .style('stroke-width', 5)
        .attr('pointer-events', (d: any) => !this.config.zoomable &&
          !this.nodeService.getPath(d.cp.path).lock ? 'auto' : 'none')
        .call(dragCP);
      }


  }


  drawForcePlane(path: string) {

    const planes = this.nodeService.returnPlaneAsString(path);

    if (planes) {

      this.config.svg.selectAll('#planeSVG_' + path).remove();

      this.config.planeSVG = this.config.svg.append('g')
        .attr('id', 'planeSVG_' + path)
        .attr('class', 'planeSVG')
        .attr('clip-path', 'url(#clip)')
        .attr('transform', 'translate(0, ' + this.config.margin.top + ')');

      this.config.planeSVG.selectAll('path.cl_' + path)
        .data(planes)
        .enter()
        .append('path')
        .attr('d', (d: { svgPath: string }) => d.svgPath)
        .attr('id', (d: { id: string; parent: string }) => 'id_' + d.id + '_' + d.parent)
        .attr('class', (d: { parent: string; }) => 'path_' + d.parent)
        .attr('stroke-width', 1.2)
        .attr('stroke', this.file.activeEffect.colors[1].hash)
        .attr('fill', this.file.activeEffect.colors[1].hash)
        .style('opacity', 0.3);

    }
  }


  drawActiveCursorConn(mouse: {x: number; y: number }) {
    this.config.svg.select('.cursorConnection').remove();

    if (this.config.cursor.selectedSubcursor === null) {

      const pathConn = this.nodeService.returnPenConnection(mouse);
      if (pathConn) {
        const cursorConn = this.config.svg.append('path')
          .attr('d', pathConn)
          .attr('class', 'cursorConnection')
          .attr('stroke', this.file.activeEffect.colors[0].hash)
          .attr('transform', 'translate(0, ' + this.config.margin.top + ')')
          .attr('stroke-width', 0.2)
          .attr('fill', 'none');
      }
    }
    d3.selectAll('.cpSVG, .nodesSVG').raise();
  }


  drawActiveCursorConnClose(node: Node) {
    this.config.svg.select('.cursorConnectionClose').remove();

    const pathConn = this.nodeService.returnPenConnectionClose(node);
    if (pathConn) {
      const cursorConn = this.config.svg.append('path')
        .attr('d', pathConn)
        .attr('class', 'cursorConnectionClose')
        .attr('stroke', this.file.activeEffect.colors[0].hash)
        .attr('transform', 'translate(0, ' + this.config.margin.top + ')')
        .attr('stroke-width', 0.4)
        .attr('fill', 'none');
    }
    d3.selectAll('.nodesSVG').raise();
  }


  drawSelectionBox(coords: { x: number; y: number }) {
    if (this.config.selectionStartPoint !== null && this.config.activeSelection) {
      this.config.svg.selectAll('#selectionBox, .cpSVG').remove();

      let xStart = this.config.selectionStartPoint.x;
      let yStart = this.config.selectionStartPoint.y;
      const selectionWidth = coords.x - this.config.selectionStartPoint.x;
      const selectionHeight = coords.y - this.config.selectionStartPoint.y;

      if (selectionWidth < 0) {
          xStart = coords.x;
      }
      if (selectionHeight < 0) {
          yStart = coords.y;
      }
      const selectionBox = this.config.svg.append('rect')
          .attr('id', 'selectionBox')
          .attr('x', xStart)
          .attr('y', yStart)
          .attr('width', Math.abs(selectionWidth))
          .attr('height', Math.abs(selectionHeight))
          .attr('stroke', '#444')
          .attr('stroke-dasharray', '4, 4')
          .attr('stroke-width', 0.3)
          // .attr('stroke-linecap', 'square')
          .attr('fill', 'transparent')
          .attr('shape-rendering', 'crispEdges');
     }
  }


  redrawElements() {
    this.config.svg.selectAll('.nodesSVG, .pathSVG, .planeSVG, .cpSVG').remove();
    this.redraw();

  }

  redraw() {
    const allPaths = this.nodeService.getAll();
    for (const p of allPaths) {
      this.drawPath(p.id, 'angle');
      this.drawPath(p.id, 'pos');
      this.drawNodes(p.id);
    }

    if (this.nodeService.selectedNodes.length === 1) {
      const node = this.nodeService.getNodeByID(this.nodeService.selectedNodes[0]);
      if (node !== undefined) {
        const cpPoints = this.nodeService.getCP(node);
        if (this.config.cursor.slug === 'thick') {
          this.drawControlPoints(cpPoints, 'angle');
        } else if (this.config.cursor.slug !== 'sel' && this.config.cursor.slug !== 'brush') {
          this.drawControlPoints(cpPoints);
        }
      } else {
        this.nodeService.deselectAll();
      }
    }
    d3.selectAll('.cpSVG').raise();
    d3.selectAll('.nodesSVG').raise();
  }
}
