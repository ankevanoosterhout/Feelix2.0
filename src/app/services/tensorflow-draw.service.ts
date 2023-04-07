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


  drawTensorFlowGraphData(data: DataSet, tensorflowModel: Model, mcus: Array<MicroController>) {

    if (data && data.d.inputs.length > 0) {
      d3.selectAll('#dataGroup').remove();

      const dataGroup = this.config.dataSVG.append('g')
        .attr('id', 'dataGroup')
        .attr('transform', 'translate(20,0)');

      let i = 0;
      let m = 0;
      for (const mcu of mcus) {
        for (const motor of mcu.motors) {
          if (motor.record) {
            if (motor.visible) {
              for (const input of tensorflowModel.inputs) {
                if (input.active && input.visible && input.name !== 'time') {

                  dataGroup.append('path')
                    .datum(data.d.inputs)
                    .attr('fill', 'none')
                    .attr('stroke', input.color)
                    .attr('stroke-width', 1.5)
                    .attr('d', d3.line()
                      .x((d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
                      .y((d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[m][i].data.value) }))
                      .append('svg:title')
                        .text(() => mcu.name + '-' + motor.id);


                  }
                i++;
              }
            }
            m++;
          }
        }
      }
    }
  }


}
