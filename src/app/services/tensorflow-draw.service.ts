import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import * as d3 from 'd3';

@Injectable()
export class TensorFlowDrawService {

  dataSVG: any = null;
  scaleY: any;
  scaleX: any;


  constructor(@Inject(DOCUMENT) private document: Document) {}


  drawGraph(width: number, height: number) {
    d3.selectAll('#datagraph').remove();

    this.dataSVG = d3.select('#svg_graph')
        .append('svg')
          .attr('id', 'datagraph')
          .attr('width', width * 0.65)
          .attr('height', height * 0.4);


    const allGroup = ['angle', 'velocity', 'direction'];

    const myColor = d3.scaleOrdinal()
      .domain(allGroup)
      .range(d3.schemeSet2);

    this.scaleX = d3.scaleLinear()
      .domain([0, 10000])
      .range([ 0, width * 0.65 ]);
    this.dataSVG.append('g')
      .attr('transform', 'translate(' + 20 + ',' + height * 0.35 + ')')
      .call(d3.axisBottom(this.scaleX));

    this.scaleY = d3.scaleLinear()
      .domain( [-4, 4])
      .range([ height * 0.35, 0]);
    this.dataSVG.append('g')
      .attr('transform', 'translate(' + 20 + ',0)')
      .call(d3.axisLeft(this.scaleY));

  }




  drawGraphData(data: any) {
    // console.log(data);

    if (data.d && data.d.inputs[0]) {
      d3.selectAll('#dataGroup').remove();

      const dataGroup = this.dataSVG.append('g')
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
          .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.scaleX(d.inputdata.value) })
          .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.scaleY(d.motors[0][0].data.value) })
          .style('fill', '#AD74CE');

        dataGroup.selectAll('circle.velocity-' + i)
          .data(data.d.inputs)
          .enter()
          .append('circle')
          .attr('class', 'velocity-' + i)
          .attr('r', 1)
          .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.scaleX(d.inputdata.value) })
          .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.scaleY(d.motors[0][1].data.value) })
          .style('fill', '#FFFF83');

        dataGroup.selectAll('circle.direction-' + i)
          .data(data.d.inputs)
          .enter()
          .append('circle')
          .attr('class', 'direction-' + i)
          .attr('r', 1)
          .attr('cx', (d: { inputdata: { value: any; }; }) => { return this.scaleX(d.inputdata.value) })
          .attr('cy', (d: { motors: { data: { value: any; }; }[][]; }) => { return this.scaleY(d.motors[0][2].data.value) })
          .style('fill', '#C6E2FF');

        i++;
      }

    }
  }

}
