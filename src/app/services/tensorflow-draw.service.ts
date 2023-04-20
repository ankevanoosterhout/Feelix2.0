import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import * as d3 from 'd3';
import { MicroController } from '../models/hardware.model';
import { TensorFlowConfig } from '../models/tensorflow-config.model';
import { Model, DataSet, Bounds } from '../models/tensorflow.model';

@Injectable()
export class TensorFlowDrawService {

  public config: TensorFlowConfig;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.config = new TensorFlowConfig();
  }


  drawGraph() {
    d3.selectAll('#datagraph').remove();

    this.config.dataSVG = d3.select('#svg_graph')
        .append('svg')
          .attr('id', 'datagraph')
          .attr('width', this.config.width)
          .attr('height', this.config.height);

    this.setScale();
    this.drawTicks();
  }



  setScale() {

    this.config.scaleY = d3.scaleLinear()
      .domain([this.config.bounds.yMax, this.config.bounds.yMin])
      .range([this.config.margin, this.config.height - this.config.margin]);

    this.config.scaleX = d3.scaleLinear()
      .domain([this.config.bounds.xMin, this.config.bounds.xMax])
      .range([this.config.margin, this.config.width - this.config.margin]);
  }


  updateBounds(bounds: Bounds) {
    this.config.bounds.xMax = bounds.xMax;
    this.config.bounds.xMin = bounds.xMin;
    this.config.bounds.yMax = bounds.yMax;
    this.config.bounds.yMin = bounds.yMin;

    this.setScale();
  }


  drawTicks() {
    this.config.yAxis = this.config.dataSVG.append('g');

    const yAxis = d3
        .axisLeft(this.config.scaleY)
        .ticks(5)
        .tickSize(this.config.width - (2 * this.config.margin))
        .tickFormat((e: any) => {
          if (Math.floor(e) !== e) { return; }
          return e;
        });

    this.config.yAxis.append('g')
        .attr('transform', 'translate(' + (this.config.width - this.config.margin) + ', 0)')
        .attr('class', 'datagraphTicks')
        .call(yAxis)
          .selectAll('text')
          .attr('y', 0)
          .attr('x', -(this.config.width - (2 * this.config.margin)) - 10);

    const xAxis = d3
        .axisBottom(this.config.scaleX)
        .ticks(10)
        .tickSize(this.config.height - (2 * this.config.margin))
        .tickFormat((e: any) => {
          if (Math.floor(e) !== e) { return; }
          return e;
        });

    this.config.xAxis = this.config.dataSVG.append('g');


    this.config.xAxis.append('g')
        .attr('class', 'datagraphTicks')
        .attr('transform', 'translate(0,'+ this.config.margin + ')')
        .call(xAxis)
          .selectAll('text')
          .attr('y', this.config.height - (2 * this.config.margin) + 10)
          .attr('x', 0);
  }


  drawTensorFlowGraphData(data: DataSet, tensorflowModel: Model, trimLines: any) {
    // console.log(data);

    if (data && data.m.length > 0) {
      d3.selectAll('#dataGroup').remove();

      const dataGroup = this.config.dataSVG.append('g')
        .attr('id', 'dataGroup')
        .attr('transform', 'translate(0,0)');

      for (const m of data.m) {
        if (m.record && m.visible) {
          for (const input of tensorflowModel.inputs) {
            if (input.active && input.visible) {

              dataGroup.append('path')
                .datum(m.d)
                .attr('fill', 'none')
                .attr('stroke', input.color)
                .attr('stroke-width', 1.5)
                .attr('d', d3.line()
                  .x((d: { time: number; }) => {
                    return this.config.scaleX(d.time)
                  })
                  .y((d: { inputs: { value: any; name: string }[]; }) => {
                    const inputItem = d.inputs.filter(n => n.name === input.name)[0];
                    if (inputItem) {
                      return this.config.scaleY(inputItem.value);
                    }
                  }))
                  .append('svg:title')
                    .text(() => m.mcu.name + '-' + m.id);

            }
          }
        }
      }

      if (trimLines) {
        this.drawTrimLines(data.bounds, true, trimLines);
      }
    }
  }

  removeTrimlines() {
    d3.selectAll('#dataTrimLines').remove();
  }


  drawTrimLines(bounds: Bounds, visible: boolean, lines: any) {

    d3.selectAll('#dataTrimLines').remove();

    if (visible) {

      const trimLinesGroup = this.config.dataSVG.append('g')
        .attr('id', 'dataTrimLines')
        .attr('transform', 'translate(0,0)');

      const dragLine = d3
            .drag()
            .on('drag', (event: any, d: { id: number; value: number } ) => {
              d.value = this.config.scaleX.invert(event.x);
              d3.select('#trimLine_' + d.id).attr('x1', event.x);
              d3.select('#trimLine_' + d.id).attr('x2', event.x);
            });


      trimLinesGroup.selectAll('line.trim')
        .data(lines)
        .enter()
        .append('line')
        .attr('id', (d: { id: number }) => 'trimLine_' + d.id)
        .attr('x1', (d: { value: number; }) => this.config.scaleX(d.value))
        .attr('y1', this.config.scaleY(bounds.yMin * 1.05))
        .attr('x2', (d: { value: number; }) => this.config.scaleX(d.value))
        .attr('y2', this.config.scaleY(bounds.yMax * 1.05))
        .style('shape-rendering', 'crispEdges')
        .style('stroke', '#FF0000')
        .style('stroke-width', 1)
        .attr('cursor', 'e-resize')
        .call(dragLine);

    }
  }


}
