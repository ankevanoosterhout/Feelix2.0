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
    for (const collection of this.file.collections) {
      this.getSliderPosition(collection);
    }
    this.document.getElementById('motor-control').style.width = (window.innerWidth * this.file.configuration.verticalScreenDivision / 100) + 'px';
    this.document.getElementById('library').style.width = ((window.innerWidth * (100 - this.file.configuration.verticalScreenDivision) / 100) - 1) + 'px';
    this.drawCollections(this.file.collections);
  }

  updateCollection(collection: Collection) {
    this.fileService.updateCollection(collection);
  }

  drawCollection(collection: Collection) {

    if (this.file.configuration.collectionDisplay === 'small') {
      collection.config.scale = new Scale('100%', 100);
    }

    d3.select('#collectionID-' + collection.id).remove();

    collection.config.svg = d3.select('#collection-' + collection.id)
      .append('svg')
      .attr('id', 'collectionID-' + collection.id)
      .attr('class', 'collection')
      .attr('width', this.width)
      .attr('height', () => this.file.configuration.collectionDisplay === 'small' ? this.height - 35 : this.height);

    this.setScale(collection);

    const clipPath = collection.config.svg.append('clipPath')
      .attr('id', 'clipCollection')
      .append('svg:rect')
      .attr('class', 'clipCollection')
      .attr('width', this.width - 10)
      .attr('height', this.height - 39);

    const container = collection.config.svg.append('rect')
      .attr('class', 'innerContainter-' + collection.id)
      .attr('width', this.width - 10)
      .attr('height', this.height - 39)
      .attr('clip-path', 'url(#clipCollection)')
      .attr('x', 0)
      .attr('y', 0)
      .attr('transform', () => this.file.configuration.collectionDisplay === 'small' ? 'translate(5, 0)' : 'translate(5, 26)')
      .attr('fill', '#1c1c1c');


    if (this.file.configuration.collectionDisplay !== 'small') {
      this.drawRuler(collection);
      this.drawSlider(collection);
    }
    if (collection.microcontroller.connected) {
      this.drawCursor(collection);
    }
  }

  drawCollections(collections: Array<Collection>) {
    this.width = (window.innerWidth * (this.file.configuration.verticalScreenDivision / 100)) - this.config.motorControlToolbarOffset - 18;

    for (const collection of collections) {
      this.drawCollection(collection);
    }
  }


  drawRuler(collection: Collection) {
    const line = collection.config.svg.append('rect')
      .attr('width', this.width - 10)
      .attr('height', 1)
      .attr('x', 5)
      .attr('y', 0)
      .attr('fill', '#000');

    const axisSVG = collection.config.svg.append('g')
      .attr('class', 'xAxisMotorControl')
      .attr('transform', 'translate(0, 0)');



    collection.config.xAxis = d3
      .axisTop(collection.config.newXscale)
      .ticks(10)
      .tickSize(5)
      .tickFormat((e: any) => {
        if (Math.floor(e) !== e) { return; }
        return e;
      });

    collection.config.xAxisSmall = d3
      .axisTop(collection.config.newXscale)
      .ticks(100)
      .tickSize(3)
      .tickFormat((e: any) => e);

    collection.config.xAxisSmallThicks = axisSVG.append('g')
      .attr('class', 'axisMotorSmall')
      .attr('transform', 'translate(0, 18)')
      .call(collection.config.xAxisSmall);

    collection.config.xAxisThicks = axisSVG.append('g')
      .attr('class', 'axisMotor')
      .attr('transform', 'translate(0, 18)')
      .call(collection.config.xAxis);

  }

  translateCollection(collection: Collection) {
    const transform = d3.zoomTransform(collection.config.svg.node());
    let offset =
        ((-collection.config.slider.inner.min) / collection.config.slider.outer.max) *
        (collection.config.slider.outer.max * transform.k);

    collection.config.scale.graphD3 = d3.zoomIdentity.translate(offset, 0).scale(transform.k);
    collection.config.svg.call(collection.config.zoom.transform, collection.config.scale.graphD3);
    this.scaleContent(collection);
  }


  drawSlider(collection: Collection) {
    let dragStartPos = null;

    const dragContent = d3
      .drag()
      .on('start', () => { dragStartPos = d3.event.x; })
      .on('drag', () => {
        collection.config.slider.inner.min += (d3.event.x - dragStartPos);
        collection.config.slider.inner.max += (d3.event.x - dragStartPos);

        if (collection.config.slider.inner.min < 0) {
          collection.config.slider.inner.max += (-collection.config.slider.inner.min);
          collection.config.slider.inner.min += (-collection.config.slider.inner.min);
        } else if (collection.config.slider.inner.max > collection.config.slider.outer.max) {
          collection.config.slider.inner.min -= (collection.config.slider.inner.max - collection.config.slider.outer.max);
          collection.config.slider.inner.max -= (collection.config.slider.inner.max - collection.config.slider.outer.max);
        }

        d3.select('.sliderHandle-' + collection.id).attr('x', collection.config.slider.inner.min + 5);
        this.translateCollection(collection);
        dragStartPos = d3.event.x;
      })
      .on('end', () => {
        dragStartPos = null;
      });

    const slider = collection.config.svg.append('rect')
      .attr('width', this.width - 10)
      .attr('height', 2)
      .attr('x', 5)
      .attr('y', this.height - 5)
      .attr('fill', '#1c1c1c');

    const handle = collection.config.svg.append('rect')
      .attr('class', 'sliderHandle-' + collection.id)
      .attr('width', collection.config.slider.inner.max - collection.config.slider.inner.min)
      .attr('height', 2)
      .attr('x', collection.config.slider.inner.min + 5)
      .attr('y', this.height - 5)
      .attr('stroke-width', 3)
      .attr('stroke', 'transparent')
      .attr('fill', '#aaa')
      .call(dragContent);
  }


  drawCursor(collection: Collection) {

    const cursor = collection.config.svg.append('rect')
      .attr('x', collection.config.newXscale(collection.microcontroller.motor.position))
      .attr('width', 1)
      .attr('y', 0)
      .attr('height', this.height - 39)
      .attr('transform', () => this.file.configuration.collectionDisplay === 'small' ? 'translate(5, 0)' : 'translate(5, 26)')
  }


  updateScale(collection: Collection) {
    collection.config.scale.graphD3 = d3.zoomTransform(collection.config.svg.node());
    const prevScale = collection.config.scale.graphD3 === null ? 1 : collection.config.scale.graphD3.k;
    const scale = collection.config.scale.value / 100;
    if (scale >= 1) {
      const x = collection.config.scale.graphD3 === null ? 0 : collection.config.scale.graphD3.x;
      const offset = (x / prevScale) * scale;
      collection.config.scale.graphD3 = d3.zoomIdentity.translate(offset, 0).scale(scale);
      collection.config.svg.call(collection.config.zoom.transform, collection.config.scale.graphD3);
      this.updateSlider(collection);
      this.scaleContent(collection);
    }
  }


  setScale(collection: Collection) {

    collection.config.yScale = d3
      .scaleLinear()
      .domain([100, 0])
      .range([26, this.height - 39]);

    collection.config.xScale = d3
      .scaleLinear()
      .domain([collection.rotation.start, collection.rotation.end])
      .range([5, this.width - 10]);

    if (collection.config.scale.graphD3 === null) {
      collection.config.newXscale = collection.config.xScale;
      collection.config.newYscale = collection.config.yScale;
    } else {
      collection.config.scale.graphD3 = d3.zoomIdentity.translate(collection.config.scale.graphD3.x, 0).scale(collection.config.scale.graphD3.k);
      collection.config.newXscale = collection.config.scale.graphD3.rescaleX(collection.config.xScale);
    }
    this.getSliderPosition(collection);
    this.setZoomCollection(collection);
  }




  scaleContent(collection: Collection) {
    collection.config.newXscale = collection.config.scale.graphD3.rescaleX(collection.config.xScale);
    collection.config.xAxisThicks.call(collection.config.xAxis.scale(collection.config.newXscale));
    collection.config.xAxisSmallThicks.call(collection.config.xAxisSmall.scale(collection.config.newXscale));

    // collection.config.svg.select('.innerContainter-' + collection.id)
    //   .attr('x', collection.config.newXscale(collection.rotation.start))
    //   .attr('width', collection.config.newXscale(collection.rotation.end) -
    //                  collection.config.newXscale(collection.rotation.start));

    // this.config.svg.select('.middleLine')
    //   .attr('x', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
    //   .attr('width', this.nodeService.scale.scaleX(this.config.editBounds.xMax) -
    //                 this.nodeService.scale.scaleX(this.config.editBounds.xMin));

    // this.drawFileData();
  }


  setZoomCollection(collection: Collection) {
    collection.config.zoom = d3
      .zoom()
      .scaleExtent([0.01, Infinity])
      .translateExtent([[0, (this.file.configuration.collectionDisplay === 'small' ? 0 : 26)], [this.width - 10, this.height - 39]]);
  }

  getSliderPosition(collection: Collection) {
    let scale = collection.config.scale.value / 100;

    collection.config.slider.outer.max = this.width - 10;
    collection.config.slider.outer.min = 0;

    const planeWidth = collection.config.slider.outer.max * scale;
    let scaleOffset = ((planeWidth/2) / planeWidth) * collection.config.slider.outer.max * -1;

    if (collection.config.scale.graphD3 !== null) {
      // scale = collection.config.scale.graphD3.k;
      scaleOffset = collection.config.scale.graphD3.x;
    }

    collection.config.slider.inner.min = ((scaleOffset * -1) / planeWidth) * collection.config.slider.outer.max;
    let sliderWidth = collection.config.slider.outer.max / scale;

    if (sliderWidth < 20) { sliderWidth = 20; }
    if (sliderWidth >= collection.config.slider.outer.max) { sliderWidth = collection.config.slider.outer.max; collection.config.slider.inner.min = 0; }

    collection.config.slider.inner.max = collection.config.slider.inner.min + sliderWidth;

    if (collection.config.slider.inner.max > collection.config.slider.outer.max) {
      collection.config.slider.inner.min -= (collection.config.slider.inner.max - collection.config.slider.outer.max);
      collection.config.slider.inner.max = collection.config.slider.outer.max;
      this.updateOffset(collection);
    }
    if (collection.config.slider.inner.min < 0) {
      collection.config.slider.inner.max += collection.config.slider.inner.min;
      collection.config.slider.inner.min = 0;
      this.updateOffset(collection);
    }
  }

  updateOffset(collection: Collection) {
    let offset =
        ((-collection.config.slider.inner.min) / collection.config.slider.outer.max) *
        (collection.config.slider.outer.max * (collection.config.scale.value / 100));
    collection.config.scale.graphD3 = d3.zoomIdentity.translate(offset, 0).scale(collection.config.scale.value / 100);
    collection.config.svg.call(collection.config.zoom.transform, collection.config.scale.graphD3);

  }

  updateSlider(collection: Collection) {
    this.getSliderPosition(collection);

    d3.select('.sliderHandle-' + collection.id)
      .attr('x', collection.config.slider.inner.min + 5)
      .attr('width', collection.config.slider.inner.max - collection.config.slider.inner.min);
  }


}
