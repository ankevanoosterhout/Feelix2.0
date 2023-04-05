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
    console.log(data);

    if (data && data.d && data.d.inputs[0]) {
      d3.selectAll('#dataGroup').remove();

      const dataGroup = this.config.dataSVG.append('g')
        .attr('id', 'dataGroup')
        .attr('transform', 'translate(20,0)');

      let i = 0;
      let m = 0;

      for (const input of tensorflowModel.inputs) {
        if (input.active && input.visible && input.name !== 'time') {

          // for (const mcu of mcus) {
          //   for (const motor of mcu.motors) {
          //     if (motor.visible) {

                // dataGroup.selectAll('circle.data-' + i + '_' + m)
                //   .data(data.d.inputs)
                //   .enter()
                //   .append('circle')
                //   .attr('class', 'angle-' + i)
                //   .attr('r', 1)
                //   .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
                //   .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][i].data.value) })
                //   .style('fill', '#BA77E0');

                dataGroup.append('path')
                  .datum(data.d.inputs)
                  .attr('fill', 'none')
                  .attr('stroke', input.color)
                  .attr('stroke-width', 1.5)
                  .attr('d', d3.line()
                    .x((d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
                    .y((d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][i].data.value) }));

          //     }
          //     m++;
          //   }
          // }
        }
        i++;
      }
    }
  }



  // drawGraphData(data: any) {
  //   // console.log(data);

  //   if (data && data.d && data.d.inputs[0]) {
  //     d3.selectAll('#dataGroup').remove();

  //     const dataGroup = this.config.dataSVG.append('g')
  //       .attr('id', 'dataGroup')
  //       .attr('transform', 'translate(20,0)');


  //     for (let i = 0; i < data.d.inputs[0].motors.length; i ++) {


  //     //     svg.append("path")
  //     // .datum(data)
  //     // .attr("fill", "none")
  //     // .attr("stroke", "#69b3a2")
  //     // .attr("stroke-width", 1.5)
  //     // .attr("d", d3.line()
  //     //   .x(function(d) { return x(d.date) })
  //     //   .y(function(d) { return y(d.value) })
  //     //   )


  //       dataGroup.selectAll('circle.angle-' + i)
  //         .data(data.d.inputs)
  //         .enter()
  //         .append('circle')
  //         .attr('class', 'angle-' + i)
  //         .attr('r', 1)
  //         .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
  //         .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][0].data.value) })
  //         .style('fill', '#BA77E0');

  //       dataGroup.selectAll('circle.velocity-' + i)
  //         .data(data.d.inputs)
  //         .enter()
  //         .append('circle')
  //         .attr('class', 'velocity-' + i)
  //         .attr('r', 1)
  //         .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
  //         .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][1].data.value) })
  //         .style('fill', '#43E6D5');

  //       dataGroup.selectAll('circle.direction-' + i)
  //         .data(data.d.inputs)
  //         .enter()
  //         .append('circle')
  //         .attr('class', 'direction-' + i)
  //         .attr('r', 1)
  //         .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
  //         .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][2].data.value) })
  //         .style('fill', '#E18257');


  //       dataGroup.selectAll('path.direction-' + i)
  //         .append('path')
  //         .datum(data.d.inputs)
  //         .attr('fill', 'none')
  //         .attr('stroke', '#E18257')
  //         .attr('stroke-width', 1.5)
  //         .attr('d', d3.line()
  //           .x((d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
  //           .y((d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][2].data.value) }));

  //     }
  //   }
  // }

}
