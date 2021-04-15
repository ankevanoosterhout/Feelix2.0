import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { DrawingPlaneConfig } from '../models/drawing-plane-config.model';
import { File } from '../models/file.model';
import * as d3 from 'd3';
import { FileService } from './file.service';
import { DrawElementsService } from './draw-elements.service';
import { Collection, Scale } from '../models/collection.model';

@Injectable()
export class MotorControlService {


  public config: DrawingPlaneConfig;
  public file = new File(null, null, null);

  public toolList = [
    { id: 0, name: 'new collection', slug: 'collection', disabled: false, icon: './assets/icons/tools/collections.svg' },
    { id: 1, name: 'microcontrollers', slug: 'connect microcontroller', disabled: false, icon: './assets/icons/tools/microcontroller.svg' },
    { id: 2, name: 'settings', slug: 'settings', disabled: false, icon: './assets/icons/tools/settings.svg' },
    { id: 3, name: 'display', slug: 'display', disabled: false,
      icon: this.file.configuration.collectionDisplay === 'small' ? './assets/icons/buttons/small-display.svg' : './assets/icons/buttons/large-display.svg' }
  ]

  width: number;
  height: number;

  constructor(@Inject(DOCUMENT) private document: Document, private drawElementsService: DrawElementsService, private fileService: FileService) {
    this.config = this.drawElementsService.config;
    this.width = (window.innerWidth * (this.file.configuration.verticalScreenDivision / 100)) - this.config.motorControlToolbarOffset - 18;
    this.updateHeight();
    this.toolList.filter(t => t.name === 'display')[0].icon =
      this.file.configuration.collectionDisplay === 'small' ? './assets/icons/buttons/large-display.svg' : './assets/icons/buttons/small-display.svg';

  }

  updateHeight() {
    if (this.file.configuration.collectionDisplay === 'large') {
      this.height = (window.innerHeight * this.file.configuration.horizontalScreenDivision / 100) - 85;
      if (this.height > 280) { this.height = 280;}
      else if (this.height < 180) { this.height = 180;}
    } else {
      this.height = 120;
    }
  }

  updateViewSettings(file: File = this.file) {
    this.toolList.filter(t => t.name === 'display')[0].icon =
      file.configuration.collectionDisplay === 'small' ? './assets/icons/buttons/large-display.svg' : './assets/icons/buttons/small-display.svg';
    file.configuration.collectionDisplay === 'small' ?
      this.document.getElementById('motor-list').classList.add('small') : this.document.getElementById('motor-list').classList.remove('small');
    this.updateHeight();
    setTimeout(() => {
      this.drawCollections(file.collections);
    }, 100);

  }



  addCollection() {
    this.fileService.addCollection();
  }

  deleteCollection(id: string) {
    this.fileService.deleteCollection(id);
  }

  changeViewSettings() {
    this.file.configuration.collectionDisplay = this.file.configuration.collectionDisplay === 'small' ? 'large' : 'small';
    this.updateViewSettings(this.file);
  }

  onResize() {
    this.width = (window.innerWidth * (this.file.configuration.verticalScreenDivision / 100)) - this.config.motorControlToolbarOffset - 18;
    this.document.getElementById('motor-control').style.width = (window.innerWidth * this.file.configuration.verticalScreenDivision / 100) + 'px';
    this.document.getElementById('library').style.width = ((window.innerWidth * (100 - this.file.configuration.verticalScreenDivision) / 100) - 1) + 'px';
    this.drawCollections(this.file.collections);
  }

  drawCollections(collections: Array<Collection>) {
    d3.selectAll('.collection').remove();
    this.width = (window.innerWidth * (this.file.configuration.verticalScreenDivision / 100)) - this.config.motorControlToolbarOffset - 18;

    for (const collection of collections) {

      if (this.file.configuration.collectionDisplay === 'small') {
        collection.scale = new Scale('100%', 100);
      }
      if (!d3.select('#collection-' + collection.id).empty()) {

        const svg = d3.select('#collection-' + collection.id)
          .append('svg')
          .attr('id', 'collectionID-' + collection.id)
          .attr('class', 'collection')
          .attr('width', this.width)
          .attr('height', () => this.file.configuration.collectionDisplay === 'small' ? this.height - 35 : this.height);

        const container = svg.append('rect')
          .attr('width', this.width - 10)
          .attr('height', this.height - 39)
          .attr('x', 5)
          .attr('y', () => this.file.configuration.collectionDisplay === 'small' ? 0 : 26)
          .attr('fill', '#1c1c1c');

        if (this.file.configuration.collectionDisplay !== 'small') {
          this.drawRuler(svg);
          this.drawSlider(svg);
        }
      }
    }
  }


  drawRuler(svg: any) {
    const line = svg.append('rect')
      .attr('width', this.width - 10)
      .attr('height', 1)
      .attr('x', 5)
      .attr('y', 0)
      .attr('fill', '#000');

    const axisSVG = svg.append('g')
      .attr('class', 'xAxisMotorControl')
      .attr('transform', 'translate(0, 0)');

    const xScale = d3
      .scaleLinear()
      .domain([0, 360])
      .range([5, this.width - 10]);

    const axis = d3
      .axisTop(xScale)
      .ticks(10)
      .tickSize(5)
      .tickFormat((e: any) => {
        if (Math.floor(e) !== e) { return; }
        return e;
      });

    const axisSmall = d3
      .axisTop(xScale)
      .ticks(100)
      .tickSize(3)
      .tickFormat((e: any) => e);

    const smallThicks = axisSVG.append('g')
      .attr('class', 'axisMotorSmall')
      .attr('transform', 'translate(0, 18)')
      .call(axisSmall);

    const axisTop = axisSVG.append('g')
      .attr('class', 'axisMotor')
      .attr('transform', 'translate(0, 18)')
      .call(axis);

  }


  drawSlider(svg: any) {
    const slider = svg.append('rect')
      .attr('width', this.width - 10)
      .attr('height', 2)
      .attr('x', 5)
      .attr('y', this.height - 5)
      .attr('fill', '#1c1c1c');

    const handle = svg.append('rect')
      .attr('width', ((this.width - 10) / 2) - ((this.width - 10) / 8)) /* change to scale later */
      .attr('height', 2)
      .attr('x', (this.width / 4) + 5)
      .attr('y', this.height - 5)
      .attr('fill', '#999');
  }


  updateScale(id: string) {
    const collection = this.file.collections.filter(c => c.id === id)[0];
    if (collection) {
      // const svg = d3.select('#collection-' + collection.id);
      // d3.zoomTransform(svg.node());
      // const scale = transform.k * (1 + (0.04 * direction));
      // if (scale > 0.5) {
      //   const offset = ((transform.x - (transform.x * scale)) / 2) + transform.x;
      //   const t = d3.zoomIdentity.translate(offset, 0).scale(scale);
      //   svg.call(this.config.zoom.transform, t);
      //   this.scaleContent(t);
      //   this.updateSlider(t);
      // }
    }
  }

}
