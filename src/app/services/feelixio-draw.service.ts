import { Injectable, Inject } from '@angular/core';
import { FeelixioConfig } from '../models/feelixio-config.model';
import * as d3 from 'd3';
import { Subject } from 'rxjs';
import { FeelixioFile } from '../models/feelixio-file.model';
import { DOCUMENT } from '@angular/common';

@Injectable()
export class FeelixioDrawService {

  public config = new FeelixioConfig();
  drawFile: Subject<any> = new Subject();

  public feelixioFile: FeelixioFile;

  constructor(@Inject(DOCUMENT) private document: Document) {}

  createPlane() {
    d3.selectAll('#svgFeelixio').remove();

    this.setVariables();

    this.config.svg = d3.select('#feelixio-field-inset')
      .append('svg')
      .attr('id', 'svgFeelixio')
      .attr('width', this.config.svgDx)
      .attr('height', this.config.svgDy)
      .attr('transform', 'translate(0, 0)')
      .call(this.config.zoom);

    const t = d3.zoomIdentity.translate(this.feelixioFile.config.field.offsetX, this.feelixioFile.config.field.offsetY).scale(1);
    this.config.svg.call(this.config.zoom.transform, t);

    const pattern = this.config.svg.append('defs')
      .attr('class', 'diagonalHatch')
      .append('pattern')
        .attr('id', 'diagonalHatch')
        .attr('patternUnits', 'userSpaceOnUse')
        .attr('width', 4)
        .attr('height', 4)
      .append('path')
        .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
        .attr('stroke', '#000000')
        .attr('stroke-width', 0.3);

    this.config.svg.append('rect')
      .attr('id', 'field')
      .attr('x', this.feelixioFile.config.field.offsetX)
      .attr('y', this.feelixioFile.config.field.offsetY)
      .attr('width', this.feelixioFile.config.field.width)
      .attr('height', this.feelixioFile.config.field.height)
      .attr('fill', () => this.feelixioFile.config.running ? 'url(#diagonalHatch)' : 'transparent');

    this.drawSliderDrawplane(this.feelixioFile.config.sliderHorizontal, 'horizontal');
    this.drawSliderDrawplane(this.feelixioFile.config.sliderVertical, 'vertical');
  }


  setRunningBackground(running: boolean) {
    this.config.svg.select('#field').attr('fill', () => running ? 'url(#diagonalHatch)' : 'transparent');
  }


  setVariables() {
    this.config.margin.left = 0;
    this.config.margin.top = 66;
    this.config.margin.bottom = 41;
    this.config.margin.right = 0;

    this.config.chartDx = this.config.svgDx - this.config.margin.right;
    this.config.chartDy = this.config.svgDy - this.config.margin.bottom;

    this.feelixioFile.config.sliderHorizontal.outer.max = this.config.chartDx - this.config.margin.right;
    this.feelixioFile.config.sliderHorizontal.outer.min = 0;

    this.feelixioFile.config.sliderVertical.outer.max = this.config.chartDy - this.config.margin.right;
    this.feelixioFile.config.sliderVertical.outer.min = 0;

    if (this.feelixioFile.config.field.width === null && this.feelixioFile.config.field.height === null) {
      this.feelixioFile.config.field.width = 4 * this.config.chartDx;
      this.feelixioFile.config.field.height = 0.7 * this.feelixioFile.config.field.width;
      this.feelixioFile.config.field.offsetX = (this.feelixioFile.config.field.width * -0.33);
      this.feelixioFile.config.field.offsetY = (this.feelixioFile.config.field.height * -0.33);
    }
    this.getSliderDrawplanePosition();
    this.setScale();
    this.setZoom();
  }


  drawSliderDrawplane(slider: any, orientation: string) {
    let dragStartPos = null;

    const dragContent = d3
      .drag()
      .on('start', () => {
        orientation === 'horizontal' ? dragStartPos = d3.event.x : dragStartPos = d3.event.y;
      })
      .on('drag', () => {
        let diff = orientation === 'horizontal' ? d3.event.x - dragStartPos : d3.event.y - dragStartPos;

        if (slider.inner.min + diff < 30) { diff = Math.abs(slider.inner.min - 30) * -1; }
        if (slider.inner.max + diff > slider.outer.max - 30) { diff = Math.abs(slider.inner.max - (slider.outer.max - 30)); }
        slider.inner.min += diff;
        slider.inner.max += diff;
        orientation === 'horizontal' ? d3.select('.innerRoundRectSlider-' + orientation).attr('x', slider.inner.min) :
          d3.select('.innerRoundRectSlider-' + orientation).attr('y', slider.inner.min);
        this.translateDrawplane();
        dragStartPos = orientation === 'horizontal' ? dragStartPos = d3.event.x : dragStartPos = d3.event.y;
      })
      .on('end', () => {
        dragStartPos = null;
      });

    const sliderDrawplane = this.config.svg.append('rect')
      .attr('id', 'slider-drawplane')
      .attr('class', 'slider-el')
      .attr('x', () => orientation === 'horizontal' ? 0 : this.config.chartDx)
      .attr('y', () => orientation === 'horizontal' ? this.config.chartDy : 0)
      .attr('height', () => orientation === 'horizontal' ? 22 : this.config.chartDy)
      .attr('width', () => orientation === 'horizontal' ? this.config.chartDx : 22)
      .style('fill', '#4a4a4a');

    const corner = this.config.svg.append('rect')
      .attr('x', () => this.config.chartDx)
      .attr('y', () => this.config.chartDy)
      .attr('height', () => 22)
      .attr('width', () => 22)
      .style('fill', '#3a3a3a');

    const innerRoundedRect = this.config.svg.append('rect')
      .attr('class', 'innerRoundRectSlider-' + orientation)
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('x', () => orientation === 'horizontal' ? slider.inner.min : this.config.chartDx + 6)
      .attr('y', () => orientation === 'horizontal' ? this.config.chartDy + 6 : slider.inner.min)
      .attr('width', () => orientation === 'horizontal' ? slider.inner.max - slider.inner.min + 12 : 10)
      .attr('height', () => orientation === 'horizontal' ? 10 : slider.inner.max - slider.inner.min + 12)
      .style('fill', '#999')
      .call(dragContent);

    const arrows = [
      { name: 'sider-arrow-left', direction: -1, },
      { name: 'sider-arrow-right', direction: 1 }
    ];

    const sliderArrows = this.config.svg.selectAll('path.sliderArrow-' + orientation)
      .data(arrows)
      .enter()
      .append('path')
      .attr('class', 'sliderArrow-' + orientation)
      .attr('d', (d: { direction: number }) => {
        if (orientation === 'horizontal') {
          return d.direction === -1 ?
            'M 10 ' + (this.config.chartDy + 11) + ' L 15 ' +
            (this.config.chartDy + 6) + ' L 15 ' + (this.config.chartDy + 16) + ' Z' :
            'M ' + (this.config.chartDx - 15) + ' ' + (this.config.chartDy + 11) + ' L ' + (this.config.chartDx - 20) + ' ' +
            (this.config.chartDy + 6) + ' L ' + (this.config.chartDx - 20) + ' ' + (this.config.chartDy + 16) + ' Z';
        } else {
          return d.direction === -1 ?
            'M ' + (this.config.chartDx + 11) + ' 10 L ' + (this.config.chartDx + 16) +
            ' 15 L ' + (this.config.chartDx + 6) + ' 15 Z' :
            'M ' + (this.config.chartDx + 11) + ' ' + (this.config.chartDy - 15) + ' L ' + (this.config.chartDx + 16) +
            ' ' + (this.config.chartDy - 20) + ' L ' + (this.config.chartDx + 6) + ' ' + (this.config.chartDy - 20) + ' Z';
        }
      })
      .style('fill', '#999')
      .style('stroke', 'transparent')
      .style('stroke-width', 3)
      .on('mousedown', (d: { direction: number }) => this.clickToMove(slider, d.direction, orientation));
  }


  getSliderDrawplanePosition() {
    const sliderWidth = {
      x: (this.feelixioFile.config.sliderHorizontal.outer.max - 60) /
          (this.feelixioFile.config.field.width / (this.feelixioFile.config.sliderHorizontal.outer.max - 60)),
      y: (this.feelixioFile.config.sliderVertical.outer.max - 60) /
          (this.feelixioFile.config.field.height / (this.feelixioFile.config.sliderVertical.outer.max - 60))
    };

    this.feelixioFile.config.sliderHorizontal.inner.min = 30 + (this.feelixioFile.config.field.offsetX *
    ((this.feelixioFile.config.sliderHorizontal.outer.max - 30) / this.feelixioFile.config.field.width) * -1);
    this.feelixioFile.config.sliderHorizontal.inner.max = this.feelixioFile.config.sliderHorizontal.inner.min + sliderWidth.x;

    this.feelixioFile.config.sliderVertical.inner.min = 30 + (this.feelixioFile.config.field.offsetY *
    ((this.feelixioFile.config.sliderVertical.outer.max - 30) / this.feelixioFile.config.field.height) * -1);
    this.feelixioFile.config.sliderVertical.inner.max = this.feelixioFile.config.sliderVertical.inner.min + sliderWidth.y;
  }


  clickToMove(slider: any, direction: any, orientation: string) {
    slider.inner.min += (10 * direction);
    slider.inner.max += (10 * direction);

    if ((direction === -1 && slider.inner.min >= slider.outer.min + 30) ||
        (direction === 1 && slider.inner.max <= slider.outer.max - 30)) {

      slider.inner.min += (10 * direction);
      slider.inner.max += (10 * direction);

      orientation === 'horizontal' ? d3.select('.innerRoundRectSlider-' + orientation).attr('x', slider.inner.min) :
        d3.select('.innerRoundRectSlider-' + orientation).attr('y', slider.inner.min);
      this.translateDrawplane();
    }
  }


  translateDrawplane() {
    this.feelixioFile.config.field.offsetX = ((this.feelixioFile.config.sliderHorizontal.inner.min - 30) /
    (this.feelixioFile.config.sliderHorizontal.outer.max - 30)) * -this.feelixioFile.config.field.width;

    this.feelixioFile.config.field.offsetY = ((this.feelixioFile.config.sliderVertical.inner.min - 30) /
    (this.feelixioFile.config.sliderVertical.outer.max - 30)) * -this.feelixioFile.config.field.height;

    const t = d3.zoomIdentity.translate(this.feelixioFile.config.field.offsetX, this.feelixioFile.config.field.offsetY).scale(1);
    this.scaleContent(t);
  }


  setScale() {
    this.feelixioFile.config.xScale = d3
      .scaleLinear()
      .domain([0, this.feelixioFile.config.field.width])
      .range([0, this.config.chartDx - this.config.margin.right]);

    this.feelixioFile.config.yScale = d3
      .scaleLinear()
      .domain([0, this.feelixioFile.config.field.height])
      .range([this.config.margin.top, this.config.chartDy - this.config.margin.bottom]);

    const t = d3.zoomIdentity.translate(this.feelixioFile.config.field.offsetX, this.feelixioFile.config.field.offsetY).scale(1);
    this.feelixioFile.config.scale.scaleX = t.rescaleX(this.feelixioFile.config.xScale);
    this.feelixioFile.config.scale.scaleY = t.rescaleY(this.feelixioFile.config.yScale);

  }

  updateSlider(transform: any) {
    this.feelixioFile.config.field.offsetX = transform.x;
    this.feelixioFile.config.field.offsetY = transform.y;

    this.getSliderDrawplanePosition();

    this.config.svg.select('.innerRoundRectSlider-horizontal')
      .attr('x', this.feelixioFile.config.sliderHorizontal.inner.min);
    this.config.svg.select('.innerRoundRectSlider-vertical')
      .attr('y', this.feelixioFile.config.sliderVertical.inner.min);
  }




  setZoom() {
    this.config.zoom = d3
      .zoom()
      .scaleExtent([1, 1])
      .translateExtent([[0, 0], [this.feelixioFile.config.field.width, this.feelixioFile.config.field.height]])
      .on('start', () => {
        this.document.getElementById('feelixio-field-inset').style.cursor = 'grabbing';
      })
      .on('zoom', () => {
        const transform = d3.event.transform;
        this.config.activeInput = false;
        this.config.activeComponent = null;
        this.config.activeLink = null;
        this.scaleContent(transform);
        this.updateSlider(transform);
      })
      .on('end', () => this.document.getElementById('feelixio-field-inset').style.cursor = 'default');
  }


  scaleContent(transform: any) {
    this.feelixioFile.config.scale.scaleX = transform.rescaleX(this.feelixioFile.config.xScale);
    this.feelixioFile.config.scale.scaleY = transform.rescaleY(this.feelixioFile.config.yScale);

    this.config.t = transform;

    this.drawFileData();
  }


  public drawFileData() {
    this.drawFile.next();
  }




}
