import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import * as d3 from 'd3';
import { TensorFlowConfig } from '../models/tensorflow-config.model';

@Injectable()
export class TensorFlowDrawService {

  public config: TensorFlowConfig;

  constructor(@Inject(DOCUMENT) private document: Document) {
    this.config = new TensorFlowConfig();
  }


  drawGraph() {

    console.log(this.config.width, this.config.height);
    d3.selectAll('#datagraph').remove();

    this.config.dataSVG = d3.select('#svg_graph')
        .append('svg')
          .attr('id', 'datagraph')
          .attr('width', this.config.width)
          .attr('height', this.config.height);



    const allGroup = ['angle', 'velocity', 'direction'];

    const myColor = d3.scaleOrdinal()
      .domain(allGroup)
      .range(d3.schemeSet2);

    this.setScale();
    this.drawRulers();
  }



  setScale() {

    this.config.scaleY = d3.scaleLinear()
      .domain([this.config.yMax, this.config.yMin])
      .range([0, this.config.height]);

    this.config.scaleX = d3.scaleLinear()
      .domain([this.config.xMin, this.config.xMax])
      .range([0, this.config.width]);
  }




  drawRulers() {
    // this.config.dataSVG.selectAll('.ruler, .axis, .axisBottom, .smallAxisX, .smallAxisY').remove();

    // const clipPathYaxis = this.config.dataSVG.append('clipPath')
    //   .attr('id', 'clipYaxis')
    //   .append('svg:rect')
    //   .attr('width', this.config.rulerWidth)
    //   .attr('height', this.config.height);

    // const clipPathXaxis = this.config.dataSVG.append('clipPath')
    //   .attr('id', 'clipXaxis')
    //   .append('svg:rect')
    //   .attr('width', this.config.width - this.config.margin - this.config.rulerWidth)
    //   .attr('height', this.config.rulerWidth);

    // const containerAxisTop = this.config.dataSVG.append('rect')
    //     .attr('width', this.config.width - this.config.margin)
    //     .attr('height', this.config.rulerWidth)
    //     .attr('y', 0)
    //     .attr('x', 0)
    //     .attr('class', 'axis')
    //     .attr('fill', '#222');

    this.config.yAxis = this.config.dataSVG.append('g')
      // .attr('class', 'clipPathYAxis')
      .attr('transform', 'translate(0, 0)');


    const yAxis = d3
        .axisLeft(this.config.scaleY)
        .ticks(5)
        .tickSize(this.config.width)
        .tickFormat((e: any) => {
          if (Math.floor(e) !== e) { return; }
          return e;
        });

    const yAxisTicks = this.config.yAxis.append('g')
        .attr('transform', 'translate(' + this.config.width + ', ' + this.config.margin + ')')
        .attr('class', 'datagraphTicks')
        .call(yAxis);
          // .selectAll('text')
          // .attr('y', 4)
          // .attr('x', 4)
          // .style('text-anchor', 'start');

    const xAxis = d3
        .axisBottom(this.config.scaleX)
        .ticks(10)
        .tickSize(this.config.height)
        .tickFormat((e: any) => {
          if (Math.floor(e) !== e) { return; }
          return e;
        });

    this.config.xAxis = this.config.dataSVG.append('g')
        // .attr('class', 'clipPathXAxis')
        .attr('transform', 'translate(0, 0)');


    const xAxisTicks = this.config.xAxis.append('g')
        .attr('class', 'datagraphTicks')
        // .attr('transform', 'translate(0, 0)')
        .call(xAxis);

    // this.config.dataSVG.selectAll('.axisBottom text')
    //     .attr('y', 2)
    //     .attr('x', 4)
    //     .style('text-anchor', 'start');

    // this.config.dataSVG.selectAll('.axis .tick:first-child').remove();
  }



  drawGraphData(data: any) {
    // console.log(data);

    if (data.d && data.d.inputs[0]) {
      d3.selectAll('#dataGroup').remove();

      const dataGroup = this.config.dataSVG.append('g')
        .attr('id', 'dataGroup')
        .attr('transform', 'translate(20,0)');
      let i = 0;

      for (const motor of data.d.inputs[0].motors) {


      //     svg.append("path")
      // .datum(data)
      // .attr("fill", "none")
      // .attr("stroke", "#69b3a2")
      // .attr("stroke-width", 1.5)
      // .attr("d", d3.line()
      //   .x(function(d) { return x(d.date) })
      //   .y(function(d) { return y(d.value) })
      //   )


        dataGroup.selectAll('circle.angle-' + i)
          .data(data.d.inputs)
          .enter()
          .append('circle')
          .attr('class', 'angle-' + i)
          .attr('r', 1)
          .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
          .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][0].data.value) })
          .style('fill', '#AD74CE');

        dataGroup.selectAll('circle.velocity-' + i)
          .data(data.d.inputs)
          .enter()
          .append('circle')
          .attr('class', 'velocity-' + i)
          .attr('r', 1)
          .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
          .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][1].data.value) })
          .style('fill', '#FFFF83');

        dataGroup.selectAll('circle.direction-' + i)
          .data(data.d.inputs)
          .enter()
          .append('circle')
          .attr('class', 'direction-' + i)
          .attr('r', 1)
          .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.config.scaleX(d.inputdata.value) })
          .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.config.scaleY(d.motors[0][2].data.value) })
          .style('fill', '#C6E2FF');

        i++;
      }

    }
  }

}
