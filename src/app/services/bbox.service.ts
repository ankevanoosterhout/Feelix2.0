import { Injectable, Inject } from '@angular/core';
import { DrawingPlaneConfig } from '../models/drawing-plane-config.model';
import { NodeService } from './node.service';
import * as d3 from 'd3';
import { DrawingService } from './drawing.service';
import { BezierService } from './bezier.service';
import { DOCUMENT } from '@angular/common';
import { DataService } from './data.service';



@Injectable()
export class BBoxService {
  public config: DrawingPlaneConfig;

  constructor(@Inject(DOCUMENT) private document: Document, public dataService: DataService,
              public nodeService: NodeService, private bezierService: BezierService, public drawingService: DrawingService) {

                this.config = this.drawingService.config;
              }

  translateX = 0;
  translateY = 0;


  // public drawBoundingBox() {
  //   const allSelectedPaths = this.nodeService.getAllSelectedPaths();
  //   if (allSelectedPaths.length > 0) {
  //     this.drawingService.colorNodesSelectedPaths();

  //     const outerBox = { left: null, top: null, width: null, height: null };
  //     const dimensions = { xMin: allSelectedPaths[0].box.left, xMax: allSelectedPaths[0].box.right,
  //       yMin: allSelectedPaths[0].box.top, yMax: allSelectedPaths[0].box.bottom };

  //     for (const pathEl of allSelectedPaths) {
  //       console.log(pathEl.box);
  //       const path = this.getBBox(pathEl)
  //       console.log(path.box);

  //       dimensions.xMin = dimensions.xMin < path.box.left ? dimensions.xMin : path.box.left;
  //       dimensions.xMax = dimensions.xMax > path.box.right ? dimensions.xMax : path.box.right;
  //       dimensions.yMax = dimensions.yMax > path.box.top ? dimensions.yMax : path.box.top;
  //       dimensions.yMin = dimensions.yMin < path.box.bottom ? dimensions.yMin : path.box.bottom;
  //     }

  //     // console.log(dimensions);

  //     outerBox.left = this.nodeService.scale.scaleX(dimensions.xMin);
  //     outerBox.top = this.nodeService.scale.scaleY(dimensions.yMax);
  //     outerBox.width = this.nodeService.scale.scaleX(dimensions.xMax) - this.nodeService.scale.scaleX(dimensions.xMin);
  //     outerBox.height = this.nodeService.scale.scaleY(dimensions.yMin) - this.nodeService.scale.scaleY(dimensions.yMax);

  //     // console.log(outerBox);
  //     this.drawBox(outerBox);
  //   }
  // }

  public drawBoundingBox() {
    this.translateX = 0;
    this.translateY = 0;


    const allSelectedPaths = this.nodeService.getAllSelectedPaths();

    if (allSelectedPaths.length > 0) {

      this.drawingService.colorNodesSelectedPaths();

      const dragBBox = d3.drag()
        .on('start', () => {
          if (!this.config.zoomable) {


            this.config.containerBox = this.config.svg.select('.innerContainer').node().getBoundingClientRect();
            this.config.startPosBox = this.config.svg.select('#bbox').node().getBoundingClientRect();
            const dragStart = d3.mouse(this.config.svg.select('.drawAreaContainer').node());
            this.config.dragStartPoint = {x: dragStart[0], y: dragStart[1]};
            this.config.grabPos = {
                x: this.config.dragStartPoint.x - (this.config.startPosBox.left - this.config.margin.left),
                y: this.config.dragStartPoint.y - (this.config.startPosBox.top - this.config.margin.offsetTop - this.config.margin.top)
            };
            this.document.getElementById('field-inset').style.cursor = 'url(./assets/icons/tools/cursor-drag.png), none';
          }
        })
        .on('drag', () => {
          if (!this.config.zoomable) {
            const pt1 = d3.mouse(this.config.svg.select('.drawAreaContainer').node());
            const point1 = { x: pt1[0], y: pt1[1] };

            if (point1.y + 2 > this.config.grabPos.y &&
              point1.y - 2 < this.config.chartDy - (this.config.startPosBox.height - this.config.grabPos.y)) {

              const diff = {x: (point1.x - this.config.dragStartPoint.x), y: (point1.y - this.config.dragStartPoint.y) };
              if (d3.event.sourceEvent.shiftKey) {
                if (Math.abs(diff.x) > Math.abs(diff.y)) { diff.y = 0; } else if (Math.abs(diff.y) > Math.abs(diff.x)) { diff.x = 0; }
              }
              this.config.svg.select('#bbox')
                .attr('transform', 'translate(' + [ diff.x, this.config.margin.top + diff.y ] + ')');

              for (const path of this.nodeService.selectedPaths) {
                d3.selectAll('#pathSVG_' + path + '_angle,' + '#pathSVG_' + path + '_pos,' +
                             '#nodesSVG_' + path + ', ' + '#forceNodeSVG_' + path + ', ' + '#planeSVG_' + path)
                  .attr('transform', 'translate(' + [ diff.x, this.config.margin.top + diff.y ] + ')');
              }
            }
            const boxPosition = this.config.svg.select('#boxOutline').node().getBoundingClientRect();
            this.updateInputBoxesBBox(boxPosition);
            this.drawingService.drawCursorPosition(d3.event.x + this.config.margin.left, d3.event.y + this.config.margin.top);
          }
        })
        .on('end', () => {
          if (!this.config.zoomable) {
            this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor;

            const newPosBox = this.config.svg.select('#bbox').node().getBoundingClientRect();
            this.config.boxRef = {
              x: newPosBox.left ,
              y: newPosBox.top  ,
              width: newPosBox.width,
              height: newPosBox.height
            };

            const newTranslateX = newPosBox.left - this.config.startPosBox.left;
            const newTranslateY = newPosBox.top - this.config.startPosBox.top;
            this.translateX += newTranslateX;
            this.translateY += newTranslateY;
            const diff = { x: this.nodeService.scale.scaleX.invert(newPosBox.left ) -
                              this.nodeService.scale.scaleX.invert(this.config.startPosBox.left ),
                           y: this.nodeService.scale.scaleY.invert(newPosBox.top  ) -
                              this.nodeService.scale.scaleY.invert(this.config.startPosBox.top  ) };

            if (d3.event.sourceEvent.shiftKey) {
              if (Math.abs(diff.x) > Math.abs(diff.y)) { diff.y = 0; } else if (Math.abs(diff.y) > Math.abs(diff.x)) { diff.x = 0; }
            }

            for (const item of this.nodeService.selectedPaths) {
              this.nodeService.movePath(item, diff);
            }
            this.updateInputBoxesBBox(newPosBox);
            this.drawingService.saveEffect();
            // this.drawingService.drawFileData();
            // this.drawBox(newPosBox);
            this.drawBoundingBox();
          }

        });

      this.config.svg.selectAll('#bbox').remove();

      this.config.bbox = this.config.svg.append('g')
        .attr('id', 'bbox')
        .attr('class', 'bbox')
        .attr('transform', 'translate(' + [ 0, this.config.margin.top ] + ')')
        .call(dragBBox);


      for (const path of allSelectedPaths) {
        const pathBox = this.getBBox(path);

        let nodes = [];
        if (path.nodes) {
          for (const node of path.nodes) {
            nodes.push(node);

            if (node.type === 'node') {

              if (nodes.filter(n => n.type === 'node').length > 1) {
                const rectangle = this.bezierService.getBBoxSize(nodes);

                this.config.bbox.append('rect')
                  .attr('class', 'box')
                  .attr('x', rectangle.left)
                  .attr('y', rectangle.top)
                  .attr('width', rectangle.width)
                  .attr('height', rectangle.height)
                  .attr('fill', 'transparent');
              }

              const lastEl = nodes[nodes.length - 1];
              nodes = [ lastEl ];
            }
          }

        }
      }
      const box = this.config.svg.select('#bbox').node().getBoundingClientRect();
      this.updateInputBoxesBBox(box);
      this.drawBox(box);
    }
  }


  public drawBox(box: { left: number; top: number; width: number; height: number }) {

    this.config.bbox.append('rect')
        // .attr('clip-path', 'url(#clip)')
        .attr('id', 'boxOutline')
        .attr('x', box.left - this.config.margin.left + 1)
        .attr('y', box.top - this.config.margin.top - this.config.margin.offsetTop)
        .attr('width', box.width)
        .attr('height', box.height)
        .style('fill', 'transparent')
        .style('stroke', 'steelblue')
        .style('stroke-width', 0.5)
        .style('shape-rendering', 'crispEdges');

    this.drawHandles(box);

  }


  public drawHandles(box: { left: number; top: number; width: number; height: number }) {
    this.config.svg.selectAll('rect.handle, rect.centerBBox').remove();

    const dragResize = d3.drag()
      .on('start', () => {

          d3.selectAll('.nodesSVG').remove();
          this.config.boxRef = this.config.svg.selectAll('#boxOutline').node().getBBox();
      })
      .on('drag', (d) => this.dragHandleResize(d))
      .on('end', () => {
          d3.event.sourceEvent.preventDefault();
          d3.event.sourceEvent.stopPropagation();
          this.config.boxRef = this.config.svg.select('#boxOutline').node().getBoundingClientRect();
          this.nodeService.scalePath(this.nodeService.selectedPaths, this.config.aspectRatioX, this.config.aspectRatioY,
            this.nodeService.scale.scaleX.invert(this.config.offsetXnodes),
            this.nodeService.scale.scaleY.invert(this.config.offsetYnodes));

          this.getBBoxSelectedPaths();
          this.drawBoundingBox();

      });

    const handles = [
      { x: box.left,
        y: box.top, class: 'corner', id: 0},
      { x: box.left + (box.width / 2),
        y: box.top, class: 'horizontal', id: 1},
      { x: box.width + box.left,
        y: box.top, class: 'corner', id: 2},
      { x: box.width + box.left,
        y: box.top + (box.height / 2), class: 'vertical', id: 3},
      { x: box.width + box.left,
        y: box.height + box.top, class: 'corner', id: 4},
      { x: box.left + (box.width / 2),
        y: box.height + box.top, class: 'horizontal', id: 5},
      { x: box.left,
        y: box.height + box.top, class: 'corner', id: 6},
      { x: box.left,
        y: box.top + (box.height / 2), class: 'vertical', id: 7 }
    ];


    const center = {
      x: box.left + (box.width / 2),
      y: box.top + (box.height / 2)
    };

    this.config.bbox.selectAll('rect.handle')
        .data(handles)
        .enter()
        .append('rect')
        .attr('class', (d: { class: string; }) => 'handle ' + d.class)
        .attr('id', (d: { id: number; }) => 'handle_' + d.id )
        .attr('x', (d: { x: number; }) => (d.x - 2.5) - this.config.margin.left + 1)
        .attr('y', (d: { y: number; }) => (d.y - 2.5) - this.config.margin.top - this.config.margin.offsetTop)
        .attr('width', 5)
        .attr('height', 5)
        .style('fill', 'white')
        .style('stroke', 'steelblue')
        .style('stroke-width', 0.5)
        .style('shape-rendering', 'crispEdges')
        .call(dragResize);


    this.config.bbox.append('rect')
        .attr('class', 'centerBBox')
        .attr('x', center.x - 1 - this.config.margin.left)
        .attr('y', center.y - 2 - this.config.margin.top - this.config.margin.offsetTop)
        .attr('width', 4)
        .attr('height', 4)
        .attr('fill', 'steelblue');

  }


  private dragHandleResize(d: any) {

    const handleID = d.id;
    const dX = Math.max(0, Math.min(this.config.chartDx, d3.event.x - this.config.margin.left));
    const dY = Math.max(0, Math.min(this.config.chartDy, d3.event.y - this.config.margin.offsetTop - this.config.margin.top));

    this.config.aspectRatioX = 1;
    this.config.aspectRatioY = 1;
    this.config.offsetYnodes = 0;
    this.config.offsetXnodes = 0;
    let offsetX = 0;
    let offsetY = 0;
    const rotationY = 0;
    const rotationX = 0;

    let preserveAspectRatio = false;
    if (d3.event.sourceEvent.shiftKey) { preserveAspectRatio = true; }

    // vertical handles
    if (handleID === 2 || handleID === 3 || handleID === 4) {
      this.config.aspectRatioX = (dX - this.config.boxRef.x) / this.config.boxRef.width; // right
      offsetX = this.config.boxRef.x - (this.config.boxRef.x * this.config.aspectRatioX);
      this.config.offsetXnodes = this.config.boxRef.x + this.translateX;

    } else if (handleID === 0 || handleID === 7 || handleID === 6) {
      this.config.aspectRatioX = (this.config.boxRef.width - (dX - this.config.boxRef.x)) / this.config.boxRef.width; // left
      offsetX = (this.config.boxRef.x + this.config.boxRef.width) -
      ((this.config.boxRef.x + this.config.boxRef.width) * this.config.aspectRatioX);
      this.config.offsetXnodes = this.config.boxRef.x + this.config.boxRef.width + this.translateX;
    }

    // horizontal handles
    if (handleID === 0 || handleID === 1 || handleID === 2) {
      this.config.aspectRatioY = (this.config.boxRef.height - (dY - this.config.boxRef.y)) / this.config.boxRef.height; // top

      if (preserveAspectRatio && handleID !== 1) {
          this.config.aspectRatioY = this.config.aspectRatioX;
      }
      offsetY = (this.config.boxRef.y + this.config.boxRef.height) -
      ((this.config.boxRef.y + this.config.boxRef.height) * this.config.aspectRatioY);
      this.config.offsetYnodes = this.config.boxRef.y + this.config.boxRef.height + this.translateY;

    } else if (handleID === 4 || handleID === 5 || handleID === 6) {
        this.config.aspectRatioY = (dY - this.config.boxRef.y) / this.config.boxRef.height; // bottom

        if (preserveAspectRatio && handleID !== 5) {
            this.config.aspectRatioY = this.config.aspectRatioX;
        }
        offsetY = (this.config.boxRef.y) - ((this.config.boxRef.y) * this.config.aspectRatioY);
        this.config.offsetYnodes = this.config.boxRef.y + this.translateY;
    }

    if (preserveAspectRatio) {
        if (handleID === 3 || handleID === 7) {
            this.config.aspectRatioY = this.config.aspectRatioX;
            offsetY = (this.config.boxRef.y + this.config.boxRef.height / 2) -
            ((this.config.boxRef.y + this.config.boxRef.height / 2) * this.config.aspectRatioY);
            this.config.offsetYnodes = this.config.boxRef.y + this.config.boxRef.height / 2  + this.translateY;
        } else if (handleID === 1 || handleID === 5) {
            this.config.aspectRatioX = this.config.aspectRatioY;
            offsetX = (this.config.boxRef.x + this.config.boxRef.width / 2) -
            ((this.config.boxRef.x + this.config.boxRef.width / 2) * this.config.aspectRatioX);
            this.config.offsetXnodes = this.config.boxRef.x + this.config.boxRef.width / 2  + this.translateX;
        }
    }

    const matrix = [this.config.aspectRatioX, rotationX, rotationY, this.config.aspectRatioY, offsetX, offsetY];

    const matrixPath = [this.config.aspectRatioX, rotationX, rotationY, this.config.aspectRatioY, offsetX, offsetY + this.config.margin.top];

    d3.select('#boxOutline').attr('transform', 'matrix(' + matrix + ')');

    for (const path of this.nodeService.selectedPaths) {
      d3.select('#pathSVG_' + path + '_angle').attr('transform', 'matrix(' + matrixPath + ')');
      d3.select('#pathSVG_' + path + '_pos').attr('transform', 'matrix(' + matrixPath + ')');
      d3.select('#nodesSVG_' + path).attr('transform', 'matrix(' + matrixPath + ')');
      d3.select('#planeSVG_' + path).attr('transform', 'matrix(' + matrixPath + ')');
      d3.select('#forceNodeSVG_' + path).attr('transform', 'matrix(' + matrixPath + ')');
    }

    const updateBox = this.config.svg.select('#boxOutline').node().getBoundingClientRect();
    this.updateInputBoxesBBox(updateBox);
    this.drawHandles(updateBox);
    this.drawingService.drawCursorPosition(d3.event.x, d3.event.y);

  }



  align(direction: string) {
    this.config.svg.selectAll('#bbox').remove();
      const allSelectedPaths = this.nodeService.getAllSelectedPaths();
      if (allSelectedPaths.length > 1) {
      if (direction === 'left' || direction === 'center' || direction === 'right') {
        allSelectedPaths.sort((a, b) => a.box.left - b.box.left );
      }
      const numberOfPaths = allSelectedPaths.length;

      const dimensions = { xMin: allSelectedPaths[0].box.left, xMax: allSelectedPaths[0].box.right,
                        yMin: allSelectedPaths[0].box.top, yMax: allSelectedPaths[0].box.bottom };

      for (const path of allSelectedPaths) {
        dimensions.xMin = dimensions.xMin < path.box.left ? dimensions.xMin : path.box.left;
        dimensions.xMax = dimensions.xMax > path.box.right ? dimensions.xMax : path.box.right;
        dimensions.yMax = dimensions.yMax > path.box.top ? dimensions.yMax : path.box.top;
        dimensions.yMin = dimensions.yMin < path.box.bottom ? dimensions.yMin : path.box.bottom;
      }

      let reference: number;

      if (direction === 'left') {
        dimensions.xMax -= allSelectedPaths[allSelectedPaths.length - 1].box.width;
      } else if (direction === 'right') {
        dimensions.xMin += allSelectedPaths[0].box.width;
      } else if (direction === 'center') {
        dimensions.xMin += (allSelectedPaths[0].box.width / 2);
        dimensions.xMax -= (allSelectedPaths[allSelectedPaths.length - 1].box.width / 2);
      } else if (direction === 'top') {
        reference = dimensions.yMax;
      } else if (direction === 'bottom') { reference = dimensions.yMin;
      } else if (direction === 'middle') { reference = ((dimensions.yMax - dimensions.yMin) / 2) + dimensions.yMin; }

      const divisions = (dimensions.xMax - dimensions.xMin) / (numberOfPaths - 1);
      let n = 0;

      for (const path of allSelectedPaths) {

        const translate = {
          horizontal: 0,
          vertical: 0,
          width: 0,
          height: 0
        };

        if (direction === 'bottom') { translate.vertical = reference - path.box.bottom;
        } else if (direction === 'top') { translate.vertical = reference - path.box.top;
        } else if (direction === 'middle') { translate.vertical = reference - (path.box.bottom + (path.box.height / 2)); }

        if (n > 0 && n < allSelectedPaths.length - 1) {
          if (direction === 'left') { translate.horizontal = dimensions.xMin + (n * divisions) - path.box.left; }
          if (direction === 'right') { translate.horizontal = dimensions.xMin + (n * divisions) - path.box.right; }
          if (direction === 'center') {
            translate.horizontal = dimensions.xMin + (n * divisions) - (path.box.left + (path.box.width / 2)); }
        }
        if (translate.horizontal !== 0 || translate.vertical !== 0) {
          this.nodeService.translatePath(path.id, translate);
        }
        n++;
      }
      this.getBBoxSelectedPaths();
      this.drawBoundingBox();
    }

  }



  updateInputBoxesBBox(boxPosition: any) {
    const boxPos = {
      left: this.nodeService.scale.scaleX.invert(boxPosition.left - this.config.margin.left),
      top: this.nodeService.scale.scaleY.invert(boxPosition.top - this.config.margin.top - this.config.margin.offsetTop),
      width: this.nodeService.scale.scaleX.invert(boxPosition.left - this.config.margin.left + boxPosition.width) -
              this.nodeService.scale.scaleX.invert(boxPosition.left - this.config.margin.left),
      height: this.config.editBounds.yMax - this.nodeService.scale.scaleY.invert(boxPosition.height)
    };
    this.dataService.calculateInputBoxes(boxPos);
  }

  updateInputBoxes(start: number, end: number) {
    const boxPos = {
      left: start,
      top: null,
      width: end - start,
      height: null
    };
    this.dataService.calculateInputBoxes(boxPos);
  }


  getBBox(path: any) {
    if (path && path.nodes) {
      if (path.nodes.filter(n => n.type === 'node').length > 1) {
        const bboxSize = this.bezierService.getBBoxSizePath(path);
        return bboxSize;
      }
    }
    return null;
  }

  getBBoxSelectedPaths() {
    for (const path of this.nodeService.selectedPaths) {
      const pathEl = this.nodeService.getPath(path);
      this.getBBox(pathEl);
    }
    this.drawingService.saveEffect();
  }


  mirrorPath(direction: any) {
    for (const id of this.nodeService.selectedPaths) {
      let path = this.nodeService.getPath(id);
      const mirrorLine = {
        x: (path.box.width / 2) + path.box.left,
        y: (path.box.height / 2) + path.box.bottom,
      };
      path = this.nodeService.mirrorPath(path, mirrorLine, (direction === 'horizontal' ? true : false), (direction === 'vertical' ? true : false) );
    }
    this.drawingService.drawFileData();
  }

  checkIfOutsideBBox(coords: { x: number, y: number }) {
    for (const pathID of this.nodeService.selectedPaths) {
      const path = this.nodeService.getPath(pathID);
      if (path && path.box.left !== null) {
        if (coords.x >= path.box.left && coords.x <= path.box.right &&
            coords.y >= path.box.top && coords.y <= path.box.bottom) {
          return false;
        }
      }
    }
    this.drawingService.deselectAllElements();
  }
}
