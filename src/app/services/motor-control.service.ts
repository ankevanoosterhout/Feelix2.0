import { DOCUMENT } from '@angular/common';
import { Injectable, Inject } from '@angular/core';
import { DrawingPlaneConfig } from '../models/drawing-plane-config.model';
import { File } from '../models/file.model';
import * as d3 from 'd3';
import { FileService } from './file.service';
import { Collection, Layer, Scale } from '../models/collection.model';
import { DrawingService } from './drawing.service';
import { Details, Direction, Effect, Unit } from '../models/effect.model';
import { EffectVisualizationService } from './effect-visualization.service';

@Injectable()
export class MotorControlService {


  public config: DrawingPlaneConfig;
  public file = new File(null, null, null);

  public toolList = [
    { id: 0, name: 'new collection', slug: 'collection', disabled: false, icon: './assets/icons/tools/collections.svg' },
    { id: 1, name: 'microcontroller and motor settings', slug: 'settings', disabled: false, icon: './assets/icons/buttons/config.svg' },
    { id: 2, name: 'display', slug: 'display', disabled: false,
      icon: this.file.configuration.collectionDisplay === 'small' ? './assets/icons/buttons/small-display.svg' : './assets/icons/buttons/large-display.svg' }
  ]

  width: number;
  height: number;



  constructor(@Inject(DOCUMENT) private document: Document, private drawingService: DrawingService, private fileService: FileService,
              private effectVisualizationService: EffectVisualizationService) {
    this.config = this.drawingService.config;
    this.resetWidth();
    this.updateHeight();
    this.toolList.filter(t => t.name === 'display')[0].icon =
      this.file.configuration.collectionDisplay === 'small' ? './assets/icons/buttons/large-display.svg' : './assets/icons/buttons/small-display.svg';


    this.effectVisualizationService.updateCollectionEffect.subscribe(res => {
      this.updateCollectionEffect(res.collection, res.collEffect);
    });

    this.drawingService.updateResizeMotorControlSection.subscribe(res => {
      this.onResize();
    });


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
      this.document.getElementById('motor-list').classList.add('small-') : this.document.getElementById('motor-list').classList.remove('small');
    this.updateHeight();

    setTimeout(() => {
      this.drawCollections();

      if (file.configuration.collectionDisplay !== 'small' ) {
        for (const collection of file.collections) {
          this.updateScale(collection);
        }
      }
    }, 50);
  }

  changeViewSettings() {
    this.file.configuration.collectionDisplay = this.file.configuration.collectionDisplay === 'small' ? 'large' : 'small';
    this.updateViewSettings(this.file);
  }

  addCollection() {
    this.fileService.addCollection();
  }

  deleteCollection(collection: Collection) {
    this.fileService.deleteCollection(collection.id);
  }

  saveCollection(collection: Collection) {
    this.fileService.updateCollection(collection);
  }


  onResize() {
    this.resetWidth();
    this.document.getElementById('motor-control').style.width = (window.innerWidth * this.file.configuration.verticalScreenDivision / 100) + 'px';
    this.document.getElementById('library').style.width = ((window.innerWidth * (100 - this.file.configuration.verticalScreenDivision) / 100) - 1) + 'px';

    // for (const collection of this.file.collections) {
    //   this.getSliderPosition(collection);
    // }
    this.drawCollections();
  }

  resetWidth() {
    this.width = (window.innerWidth * (this.file.configuration.verticalScreenDivision / 100)) - this.config.motorControlToolbarOffset - 28;
  }

  updateCollection(collection: Collection) {
    this.fileService.updateCollection(collection);
  }

  updateCollectionEffect(collection: Collection, collEffect: Details) {
    this.fileService.updateCollectionEffect(collection, collEffect);
  }



  drawCollection(collection: Collection) {

    d3.select('#cID-' + collection.id).remove();

    collection.config.svg = d3.select('#col-' + collection.id)
      .append('svg')
      .attr('id', 'cID-' + collection.id)
      .attr('class', 'collection')
      .attr('width', this.width)
      .attr('height', () => this.file.configuration.collectionDisplay === 'small' ? this.height - 35 : this.height);

    if (this.file.configuration.collectionDisplay === 'small') {
      collection.config.scale.graphD3 = d3.zoomIdentity.translate((this.width * 0.125), 0).scale((collection.config.scale.value/100));
    } else if (collection.config.scale.graphD3 && collection.config.scale.graphD3.k) {
      collection.config.scale.graphD3 = d3.zoomIdentity.translate(collection.config.scale.graphD3.x, 0).scale((collection.config.scale.value/100));
    } else {
      collection.config.scale.graphD3 = d3.zoomIdentity.translate(0, 0).scale(1);
    }

    this.setScale(collection);

    const clipPath = collection.config.svg.append('clipPath')
      .attr('id', 'clipCollection')
      .append('svg:rect')
      .attr('class', 'clipCollection')
      .attr('width', this.width)
      .attr('height', this.height - 39);

    const container = collection.config.svg.append('rect')
      .attr('id', 'colE' + collection.id)
      .attr('class', 'collection')
      .attr('width', this.width)
      .attr('height', this.height - 39)
      .attr('clip-path', 'url(#clipCollection)')
      .attr('x', 0)
      .attr('y', 0)
      .attr('transform', () => this.file.configuration.collectionDisplay === 'small' ? 'translate(0, 0)' : 'translate(0, 26)')
      .attr('fill', () => collection.rotation.loop ? '#1c1c1c' : '#2c2c2c');

    if (!collection.rotation.loop) {

      const innerContainer = collection.config.svg.append('rect')
        .attr('id', 'colE' + collection.id)
        .attr('class', 'inner-container collection')
        .attr('width', collection.config.newXscale(collection.rotation.end) - collection.config.newXscale(collection.rotation.start))
        .attr('height', this.height - 39)
        .attr('clip-path', 'url(#clipCollection)')
        .attr('x', collection.config.newXscale(collection.rotation.start))
        .attr('y', 0)
        .attr('transform', () => this.file.configuration.collectionDisplay === 'small' ? 'translate(0, 0)' : 'translate(0, 26)')
        .attr('fill', '#1c1c1c');

    } else {
      const lineData = [collection.rotation.start, collection.rotation.end];

      const lines = collection.config.svg.selectAll('line.range-line')
        .data(lineData)
        .enter()
        .append('line')
        .attr('class', (d, i) =>'range-line rline-' + i)
        .attr('x1', (d) => collection.config.newXscale(d))
        .attr('x2', (d) => collection.config.newXscale(d))
        .attr('y1', 0)
        .attr('y2', this.height - 39)
        .attr('transform', () => this.file.configuration.collectionDisplay === 'small' ? 'translate(0, 0)' : 'translate(0, 26)')
        .attr('shape-rendering', 'crispEdges')
        .attr('stroke', '#999')
        .attr('stroke-width', 0.5)
        .attr('fill', 'none');
    }

    const frame_height = (this.height - 39) / 2;

    const middleline = collection.config.svg.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', () => collection.config.newYscale(0))
      .attr('y2', () => collection.config.newYscale(0))
      .attr('stroke', '#4a4a4a')
      .attr('stroke-width', 1)
      .attr('fill', 'none')
      .attr('shape-rendering', 'crispEdges')
      .attr('pointer-events', 'none')
      .attr('transform', () => this.file.configuration.collectionDisplay === 'small' ? 'translate(0, 0)' : 'translate(0, 26)');

    if (collection.effectDataList.length > 0 && collection.visualizationType === 'torque' && collection.microcontroller && collection.motorID) {
      if (collection.microcontroller.motors[collection.motorID.index].config.voltageLimit) {
        const voltageLine = (100 / collection.microcontroller.motors[collection.motorID.index].config.supplyVoltage) * collection.microcontroller.motors[collection.motorID.index].config.voltageLimit;
        const voltageLimitData = [ voltageLine, -voltageLine ];

        const voltageLimitLines = collection.config.svg.selectAll('line.voltagelimit')
          .data(voltageLimitData)
          .enter()
          .append('line')
          .attr('class', (d, i) =>'voltagelimit-' + i)
          .attr('x1', 0)
          .attr('x2', this.width)
          .attr('y1', (d) => collection.config.newYscale(d))
          .attr('y2', (d) => collection.config.newYscale(d))
          .attr('transform', () => this.file.configuration.collectionDisplay === 'small' ? 'translate(0, 0)' : 'translate(0, 26)')
          .attr('shape-rendering', 'crispEdges')
          .attr('stroke', '#FF0000')
          .attr('opacity', 0.6)
          .attr('stroke-width', 0.5)
          .attr('fill', 'none');
      }
    }

    if (this.file.configuration.collectionDisplay !== 'small') {
      this.drawRuler(collection);
      this.drawSlider(collection);
    }

    this.updateOffset(collection);

    this.drawCollectionEffects(collection);

    if (collection.microcontroller) {
      if (collection.microcontroller.connected) {
        this.drawCursor(collection);
      }
      // if (this.file.configuration.collectionDisplay !== 'small') {
      //   this.drawStartPosition(collection);
      // }
    }




  }


  drawCollections(collections: Array<Collection> = this.file.collections) {
    this.resetWidth();

    for (const collection of collections) {
      this.drawCollection(collection);
    }
  }


  drawRuler(collection: Collection) {
    const line = collection.config.svg.append('line')
      .attr('x1', 0)
      .attr('x2', this.width)
      .attr('y1', 1)
      .attr('y2', 1)
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .attr('fill', 'none')
      .attr('shape-rendering', 'crispEdges');

    const axisSVG = collection.config.svg.append('g')
      .attr('class', 'xAxisMotorControl')
      .attr('transform', 'translate(0, 18)');

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
      .call(collection.config.xAxisSmall);

    collection.config.xAxisThicks = axisSVG.append('g')
      .attr('class', 'axisMotor')
      .call(collection.config.xAxis);
  }



  drawCollectionEffects(collection: Collection) {

    d3.select('#coll-effect-svg-' + collection.id).remove();

    const offset = this.file.configuration.collectionDisplay === 'small' ? 0 : 26;

    if (collection.config.svg._parents[0] instanceof HTMLElement) {
      const effectSVG = collection.config.svg.append('g')
        .attr('id', 'coll-effect-svg-' + collection.id)
        .attr('clip-path', 'url(#clipCollection)')
        .attr('transform', 'translate('+ [0, offset] + ')');

      for (const collectionEffect of collection.effects) {
        if (this.checkVisibility(collectionEffect.direction, collection.layers)) {

          const effect = this.file.effects.filter(e => e.id === collectionEffect.effectID)[0];
          if (effect && effect.paths.length > 0) {

            this.effectVisualizationService.drawCollectionEffect(effectSVG, collection, collectionEffect, effect, (this.height - 39),
              this.file.activeCollectionEffect, this.file.configuration.colors);
          } else {
            this.removeCollectionsEffect(collection, collectionEffect);
          }

          if (collection.effectDataList.length > 0) {
            const effectData = collection.effectDataList.filter(e => e.id === effect.id)[0];
            // console.log(effectData);
            this.effectVisualizationService.drawRenderedCollectionData(effectSVG, collection, collectionEffect, effectData, (this.height - 39), 'rgba(255,255,255,1)');
          }

        }
      }

      if (collection.renderedData.length > 0 && collection.effectDataList.length > 0) {
        this.effectVisualizationService.drawOverlappingData(effectSVG, collection, 'rgba(255,255,255,1)');
      }
    }
  }


  removeCollectionsEffect(collection: Collection, collectionEffect: Details) {
    const index = collection.effects.indexOf(collectionEffect);
    if (index > -1) {
      collection.effects.splice(index, 1);
      this.drawCollection(collection);
      this.updateCollection(collection);
    }
  }


  checkIfLayersIsLocked(effectDirection: Direction, layers: Layer[]) {
    if (effectDirection.cw && layers[0].locked) {
      return true;
    } else if (effectDirection.ccw && layers[1].locked) {
      return true;
    }
    return false;
  }



  checkVisibility(effectDirection: Direction, layers: Layer[]) {
    if (effectDirection.cw && layers[0].visible) {
      return true;
    } else if (effectDirection.ccw && layers[1].visible) {
      return true;
    }
    return false;
  }



  translateCollection(collection: Collection) {
    if (!collection.config.scale.graphD3) {
      collection.config.scale.graphD3 = d3.zoomTransform(collection.config.svg.node());
    }
    const scale = collection.config.scale.graphD3.k;
    let offset =
        (((-collection.config.slider.inner.min) / collection.config.slider.outer.max) *
        (collection.config.slider.outer.max * scale)) + (collection.config.slider.outer.max * 0.25);

    collection.config.scale.graphD3 = d3.zoomIdentity.translate(offset, 0).scale(scale);
    collection.config.svg.call(collection.config.zoom.transform, collection.config.scale.graphD3);
    this.scaleContent(collection);
  }


  drawSlider(collection: Collection) {
    if (!collection.config.slider.inner.min || (collection.config.slider.outer.max !== this.width)) {
      this.getSliderPosition(collection);
    }

    const dragContent = d3
      .drag()
      .on('drag', () => {
        collection.config.slider.inner.min += d3.event.dx;
        collection.config.slider.inner.max += d3.event.dx;

        if (collection.config.slider.inner.min < 0) {
          collection.config.slider.inner.max += (-collection.config.slider.inner.min);
          collection.config.slider.inner.min += (-collection.config.slider.inner.min);
        } else if (collection.config.slider.inner.max > this.width) {
          collection.config.slider.inner.min -= (collection.config.slider.inner.max - this.width);
          collection.config.slider.inner.max -= (collection.config.slider.inner.max - this.width);
        }

        d3.select('.sliderHandle-' + collection.id).attr('x', collection.config.slider.inner.min);
        this.translateCollection(collection);
      });


    const slider = collection.config.svg.append('rect')
      .attr('width', this.width)
      .attr('height', 2)
      .attr('x', 0)
      .attr('y', this.height - 5)
      .attr('fill', '#1c1c1c');

    const handle = collection.config.svg.append('rect')
      .attr('class', 'sliderHandle-' + collection.id)
      .attr('width', collection.config.slider.inner.max - collection.config.slider.inner.min)
      .attr('height', 2)
      .attr('x', collection.config.slider.inner.min)
      .attr('y', this.height - 5)
      .attr('stroke-width', 5)
      .attr('stroke', 'transparent')
      .attr('fill', '#aaa')
      .call(dragContent);
  }


  drawCursor(collection: Collection) {
    if (collection.config.svg) {
      collection.config.svg.selectAll('.cursorIndicator-' + collection.id).remove();

      let position = 0;

      if (collection.rotation.units.name === 'ms') {
        position = collection.config.newXscale(collection.time);
      } else {
        position = collection.microcontroller.motors.filter(m => m.id === collection.motorID.name)[0].state.position.current ?
        collection.config.newXscale(collection.microcontroller.motors.filter(m => m.id === collection.motorID.name)[0].state.position.current) : 0;
      }

      this.drawCursorAtPosition(position, collection);
    }
  }


  drawCursorAtPosition(position: number, collection: Collection) {
    if (position < 0) { position = -2; }
    else if (position > this.width - 15) { position = this.width - 17 }

    const cursor = collection.config.svg.append('line')
      .attr('class', 'cursorIndicator-' + collection.id)
      .attr('x1', position)
      .attr('x2', position)
      .attr('y1', 0)
      .attr('y2', this.height - 39)
      .attr('transform', () => this.file.configuration.collectionDisplay === 'small' ? 'translate(5, 0)' : 'translate(5, 26)')
      .attr('shape-rendering', 'crisp-edges')
      .style('stroke', () => position === -2 || position === this.width - 17 ? 'rgba(255, 145, 0, 0.2)' : '#FF9100')
      .style('stroke-width', () => position === -2 || position === this.width - 17 ? 4 : 1);
  }


  updateScale(collection: Collection) {
    const scale = this.file.configuration.collectionDisplay === 'small' ? 0.75 : collection.config.scale.value / 100;
    const oldSlideWidth = collection.config.slider.inner.max - collection.config.slider.inner.min;
    let sliderWidth = collection.config.slider.outer.max / scale * 0.5;
    const sliderWidthDifferenceMeasuredFromCenter = (oldSlideWidth - sliderWidth) / 2;
    collection.config.slider.inner.min += sliderWidthDifferenceMeasuredFromCenter;
    collection.config.slider.inner.max -= sliderWidthDifferenceMeasuredFromCenter;
    if (collection.config.slider.inner.min < 0) {
      collection.config.slider.inner.max -= collection.config.slider.inner.min;
      collection.config.slider.inner.min = 0;
    }
    if (collection.config.slider.inner.max > collection.config.slider.outer.max) {
      collection.config.slider.inner.min -= (collection.config.slider.inner.max - collection.config.slider.outer.max);
      collection.config.slider.inner.max = collection.config.slider.outer.max;
    }
    this.updateOffset(collection);
    this.scaleContent(collection);

    d3.select('.sliderHandle-' + collection.id)
      .attr('x', collection.config.slider.inner.min)
      .attr('width', collection.config.slider.inner.max - collection.config.slider.inner.min);
  }

  // drawStartPosition(collection: Collection) {

  //   if (collection.microcontroller.motors[collection.motorID - 1].state.position.start !== null) {
  //     collection.config.svg.selectAll('.startPositionIndicator-' + collection.id).remove();
  //     const triangle = d3.symbol()
  //         .type(d3.symbolTriangle)
  //         .size(34);

  //     collection.config.svg.append('path')
  //       .attr('class', 'startPositionIndicator-' + collection.id)
  //       .attr('d', triangle)
  //       .attr('fill', '#00AEEF')
  //       .attr('transform', 'translate(' + (collection.config.newXscale(collection.microcontroller.motors[collection.motorID - 1].state.position.start)) + ', 4), rotate(180)')
  //       .attr('shape-rendering', 'geometricPrecision');
  //   }

  // }


  setScale(collection: Collection) {

    let scale = collection.config.scale.graphD3 ? collection.config.scale.graphD3.k : collection.config.scale.value / 100;
    if (this.file.configuration.collectionDisplay === 'small') {
      scale = 0.75;
    }

    collection.config.yScale = d3
      .scaleLinear()
      .domain([collection.rotation.end_y, collection.rotation.start_y])
      .range([0, this.height - 39]);

    collection.config.xScale = d3
      .scaleLinear()
      .domain([collection.rotation.start, collection.rotation.end])
      .range([0, this.width - 1]);

    if (collection.config.scale.graphD3 && collection.config.scale.graphD3.x) {
      collection.config.scale.graphD3 = d3.zoomIdentity.translate(collection.config.scale.graphD3.x, 0).scale(scale);
      collection.config.newXscale = collection.config.scale.graphD3.rescaleX(collection.config.xScale);
      collection.config.newYscale = collection.config.yScale;
    } else {
      collection.config.newXscale = collection.config.xScale;
      collection.config.newYscale = collection.config.yScale;
    }
    this.setZoomCollection(collection);

  }




  scaleContent(collection: Collection) {
    collection.config.newXscale = collection.config.scale.graphD3.rescaleX(collection.config.xScale);
    if (this.file.configuration.collectionDisplay === 'large') {
      collection.config.xAxisThicks.call(collection.config.xAxis.scale(collection.config.newXscale));
      collection.config.xAxisSmallThicks.call(collection.config.xAxisSmall.scale(collection.config.newXscale));
    }

    if (collection.rotation.loop) {
      collection.config.svg.selectAll('.range-line').attr('x1', (d) => collection.config.newXscale(d)).attr('x2', (d) => collection.config.newXscale(d));
    } else {
      collection.config.svg.selectAll('.inner-container')
        .attr('x', collection.config.newXscale(collection.rotation.start))
        .attr('width', collection.config.newXscale(collection.rotation.end) - collection.config.newXscale(collection.rotation.start));
    }

    this.drawCollectionEffects(collection);
  }


  setZoomCollection(collection: Collection) {
    collection.config.zoom = d3
      .zoom()
      .scaleExtent([0.01, Infinity])
      .translateExtent([[0, (this.file.configuration.collectionDisplay === 'small' ? 0 : 26)], [this.width, this.height - 39]]);
  }


  getSliderPosition(collection: Collection) {

    if (this.file.configuration.collectionDisplay !== 'small') {
      let scale = collection.config.scale.value / 100;

      collection.config.slider.outer.max = this.width;
      collection.config.slider.outer.min = 0;

      const planeWidth = collection.config.slider.outer.max * scale * 2;
      let scaleOffset = 0;

      if (collection.config.scale.graphD3 && collection.config.scale.graphD3.x) {
        scaleOffset = collection.config.scale.graphD3.x;
      }

      let sliderWidth = (0.5 / scale) * collection.config.slider.outer.max; // .72

      collection.config.slider.inner.min = ((scaleOffset - (this.width * 0.5 * scale)) * -1) / planeWidth * this.width;

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

  }


  updateOffset(collection: Collection) {
    const scale = this.file.configuration.collectionDisplay === 'small' ? 0.75 :(collection.config.scale.value / 100);
    let offset =
        (((-collection.config.slider.inner.min) / collection.config.slider.outer.max) *
        (collection.config.slider.outer.max * scale)) +
        (collection.config.slider.outer.max * 0.25);

    collection.config.scale.graphD3 = d3.zoomIdentity.translate(offset, 0).scale(scale);

    if (collection.config.zoom) {
      collection.config.svg.call(collection.config.zoom.transform, collection.config.scale.graphD3);
    }
  }



  getTmpEffect() {
    return this.drawingService.config.tmpEffect;
  }

  drawTmpEffect(effectDetails: Details, collection: Collection, tmpEffect: Effect) {

    d3.select('#tmp-effect-svg').remove();

    const offset = this.file.configuration.collectionDisplay === 'small' ? 0 : 26;

    const tmpEffectSVG = collection.config.svg.append('g')
      .attr('id', 'tmp-effect-svg')
      .attr('clip-path', 'url(#clipCollection)')
      .attr('transform', 'translate('+ [0, offset] + ')');

      if (tmpEffect && tmpEffect.paths.length > 0) {

        this.effectVisualizationService.drawCollectionEffect(tmpEffectSVG, collection, effectDetails, tmpEffect, (this.height - 39),
        effectDetails, this.file.configuration.colors, true);
      }
  }

  deleteTmpEffect() {
    d3.select('#tmp-effect-svg').remove();
  }

  deleteCollectionEffect(id: string) {
    for (const collection of this.file.collections) {
      const effect = collection.effects.filter(e => e.id === id)[0];
      if (effect) {
        const effectIndex = collection.effects.indexOf(effect);
        if (effectIndex > -1) {
          collection.effects.splice(effectIndex, 1);
          this.fileService.updateCollection(collection);
          return;
        }
      }
    }
  }

  deselectElements() {
    this.drawingService.deselectAllElements();
  }

  deselectCollectionEffects() {
    this.drawingService.deselectCollectionEffects();
    this.drawCollections();
  }
}
