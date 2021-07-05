import { Injectable, Inject } from '@angular/core';
import { DrawingPlaneConfig } from '../models/drawing-plane-config.model';
import { NodeService } from './node.service';
import * as d3 from 'd3';
import { File } from '../models/file.model';
import { DataService } from './data.service';
import { DOCUMENT } from '@angular/common';
import { Cursor } from '../models/tool.model';
import { Subject } from 'rxjs';
import { FileService } from './file.service';
import { EffectVisualizationService } from './effect-visualization.service';
import { Details, Effect } from '../models/effect.model';
import { Collection } from '../models/collection.model';



@Injectable()
export class DrawingService {

  public config: DrawingPlaneConfig;
  public file = new File(null, null, null);


  drawFile: Subject<any> = new Subject();
  showMessage: Subject<any> = new Subject();
  align: Subject<any> = new Subject();
  updateResizeMotorControlSection: Subject<any> = new Subject();
  drawEffectsInLibrary: Subject<any> = new Subject();

  constructor(@Inject(DOCUMENT) private document: Document, public nodeService: NodeService,
              private dataService: DataService, private fileService: FileService, private effectVisualizationService: EffectVisualizationService) {

    this.config = new DrawingPlaneConfig();

    this.effectVisualizationService.setActiveEffect.subscribe(res => {
      this.setActiveCollectionEffect(res);
    });

  }

  createPlane() {
    d3.select('#svgID').remove();

    this.config.svg = d3.select('#field-inset')
      .append('svg')
      .attr('id', 'svgID')
      .attr('width', this.config.svgDx)
      .attr('height', this.config.svgDy);

    if (this.file.activeEffect && this.file.activeEffect.scale !== null) {
      const t = d3.zoomIdentity.translate(this.file.activeEffect.scale.x, 0).scale(this.file.activeEffect.scale.k);
      this.config.svg.call(this.config.zoom.transform, t);
    }

    const field = this.config.svg.append('rect')
      .attr('width', this.config.svgDx - this.config.margin.left)
      .attr('height', this.config.chartDy)
      .attr('transform', 'translate(0, ' + this.config.margin.top + ')')
      .attr('class', 'drawAreaContainer')
      .attr('fill', '#858585');

    const clipPath = this.config.svg.append('clipPath')
      .attr('id', 'clip')
      .append('svg:rect')
      .attr('class', 'clipPath')
      .attr('width', this.config.chartDx)
      .attr('height', this.config.chartDy);

    const clipPathLarge = this.config.svg.append('clipPath')
      .attr('id', 'clipLarge')
      .append('svg:rect')
      .attr('class', 'clipPath')
      .attr('width', this.config.svgDx)
      .attr('height', this.config.svgDy);

    if (this.file.configuration.openTabs.length > 0) {

      const innerContainer = this.config.svg.append('rect')
        .attr('width', this.nodeService.scale.scaleX(this.config.editBounds.xMax) -
                      this.nodeService.scale.scaleX(this.config.editBounds.xMin))
        .attr('height', this.config.chartDy - 0.5)
        .attr('x', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
        .attr('y', 0.25)
        .attr('clip-path', 'url(#clip)')
        .attr('transform', 'translate(0, ' + this.config.margin.top + ')')
        .attr('class', 'innerContainer')
        // .attr('stroke-width', 0.5)
        // .attr('stroke', '#1c1c1c')
        .attr('shape-rendering', 'crispEdges')
        .attr('fill', '#fff')
        .on('click', () => {
          if (this.config.cursor.slug === 'zoom') {
            let direction = 1;
            if (d3.event.altKey) {
              direction = -1;
            } else {
              this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor;
            }
            this.clickToZoom(direction);
          }
        });

      if (this.file.activeEffect.type === 'torque') {
        const middleLine = this.config.svg.append('rect')
          .attr('width', this.nodeService.scale.scaleX(this.config.editBounds.xMax) -
                        this.nodeService.scale.scaleX(this.config.editBounds.xMin))
          .attr('height', 0.6)
          .attr('class', 'middleLine')
          .attr('x', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
          .attr('y', (this.config.chartDy / 2) - 0.3)
          .attr('transform', 'translate(0, ' + this.config.margin.top + ')')
          .style('fill', '#1c1c1c');
      }

      if (this.config.rulerVisible) {
        this.drawRulers();
      }
      this.drawSliderDrawplane();
    }
  }

  clickToZoom(direction: any) {
    const transform = d3.zoomTransform(this.config.svg.node());
    const scale = transform.k * (1 + (0.04 * direction));
    if (scale > 0.5) {
      const offset = ((transform.x - (transform.x * scale)) / 2) + transform.x;
      const t = d3.zoomIdentity.translate(offset, 0).scale(scale);
      this.config.svg.call(this.config.zoom.transform, t);
      this.scaleContent(t);
      this.updateSlider(t);
    }
  }

  clickToMove(direction: any) {
    this.config.sliderDrawplane.inner.min += (10 * direction);
    this.config.sliderDrawplane.inner.max += (10 * direction);

    if ((this.config.sliderDrawplane.inner.min >= this.config.sliderDrawplane.outer.min + 10 && direction === -1) ||
        (this.config.sliderDrawplane.inner.max <= this.config.sliderDrawplane.outer.max - 10 && direction === 1)) {

      this.config.sliderDrawplane.inner.min += (10 * direction);
      this.config.sliderDrawplane.inner.max += (10 * direction);

      d3.select('.innerRoundRectSlider').attr('x', this.config.sliderDrawplane.inner.min - 6);
      this.translateDrawplane();
    }
  }

  public resetVariables() {
    this.config.svgDx = window.innerWidth;
    this.config.svgDy = window.innerHeight * (100 - this.file.configuration.horizontalScreenDivision)/100 - 18;
    if (this.config.svgDy < 250) { this.config.svgDy = 250; }
    this.config.margin = {
      top: this.config.svgDy * 0.18 + 64, //45
      right: this.config.rulerWidth,
      bottom: this.config.svgDy * 0.18,
      left: this.config.toolbarOffset,
      offsetTop: window.innerHeight * this.file.configuration.horizontalScreenDivision/100 + 2
    };

    this.config.chartDx = this.config.svgDx - this.config.margin.left - this.config.margin.right;
    this.config.chartDy = this.config.svgDy - this.config.margin.bottom - this.config.margin.top;
    this.getSliderDrawplanePosition();
    // this.setZoom();

  }




  setScale() {

    this.config.yScale = d3
      .scaleLinear()
      .domain([this.config.editBounds.yMax, this.config.editBounds.yMin])
      .range([0, this.config.chartDy]);

    this.config.xScale = d3
      .scaleLinear()
      .domain([this.config.editBounds.xMin, this.config.editBounds.xMax])
      .range([0, this.config.chartDx]);

    if (this.file.activeEffect === null || this.file.activeEffect.scale === null) {
      this.nodeService.setScale(this.config.xScale, this.config.yScale);
    } else {
      const t = d3.zoomIdentity.translate(this.file.activeEffect.scale.x, 0).scale(this.file.activeEffect.scale.k);
      const newScaleX = t.rescaleX(this.config.xScale);
      this.nodeService.setScale(newScaleX, this.config.yScale);
    }
    this.setZoom();
  }

  // resetScale() {
  //   this.nodeService.setScale(null, null);
  // }

  setZoom() {
    this.config.zoom = d3
      .zoom()
      .scaleExtent([0.01, Infinity])
      .translateExtent([[this.config.chartDx * -0.5, 0], [(this.config.chartDx * 1.5), this.config.chartDy]]) // 1.2
      .on('zoom', () => {
        if (this.config.zoomable) {
          const transform = d3.event.transform;

          this.scaleContent(transform);
          this.updateSlider(transform);
        }
      });
  }

  setEditBounds() {

    if (this.file.activeEffect !== null) {
      const yMin = this.file.activeEffect.type === 'torque' ? -100 : 0;

      this.config.margin.top = this.config.svgDy * 0.4;
      this.config.editBounds = {
        xMin: this.file.activeEffect.range.start,
        xMax: this.file.activeEffect.range.end,
        yMin: yMin,
        yMax: 100
      };
    }
    this.resetVariables();
  }

  updateScaleBox(transform: number) {
    this.config.svg.select('.scalePercentage').text(() => {
      return Math.round(100 * transform) + '%';
    });
  }

  scaleContent(transform: any) {
    const newScale = transform.rescaleX(this.config.xScale);

    if (this.config.rulerVisible) {
      this.config.xAxisBottom.call(this.config.xAxis.scale(newScale));
      this.config.xAxisBottomSmallTicks.call(this.config.xAxisSmallTicks.scale(newScale));

      this.config.svg.selectAll('.axisBottom text')
        .attr('y', 2)
        .attr('x', 4)
        .style('text-anchor', 'start');
    }

    this.file.activeEffect.scale = transform;
    this.updateScaleBox(transform.k);

    this.nodeService.setScale(newScale, this.config.yScale);

    this.config.svg.select('.innerContainer')
      .attr('x', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
      .attr('width', this.nodeService.scale.scaleX(this.config.editBounds.xMax) -
                     this.nodeService.scale.scaleX(this.config.editBounds.xMin));

    this.config.svg.select('.middleLine')
      .attr('x', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
      .attr('width', this.nodeService.scale.scaleX(this.config.editBounds.xMax) -
                    this.nodeService.scale.scaleX(this.config.editBounds.xMin));

    this.drawFileData();
  }



  getSliderDrawplanePosition() {
    let offset: number;
    let scale = 1;
    let scaleOffset = 0;

    this.config.sliderDrawplane.outer.max = this.config.chartDx - 150;
    this.config.sliderDrawplane.outer.min = this.config.margin.left + 50;

    const width = this.config.sliderDrawplane.outer.max - this.config.sliderDrawplane.outer.min;

    if (this.file.activeEffect && this.file.activeEffect.scale !== null) {
      scale = this.file.activeEffect.scale.k;
      scaleOffset = this.file.activeEffect.scale.x;
    }
    const planeWidth = this.config.chartDx * 2 * scale;
    offset = ((scaleOffset - (this.config.chartDx * 0.5 * scale)) * -1) / planeWidth * width;
    let sliderWidth = (0.5 / scale) * width; // .72
    if (sliderWidth < 20) { sliderWidth = 20; }
    if (sliderWidth > this.config.chartDx - 220 + this.config.rulerWidth) { sliderWidth = this.config.chartDx - 220 + this.config.rulerWidth; offset = 0; }

    this.config.sliderDrawplane.inner.min = offset + this.config.sliderDrawplane.outer.min;
    if (this.config.sliderDrawplane.inner.min < this.config.sliderDrawplane.outer.min) {
      this.config.sliderDrawplane.inner.min = this.config.sliderDrawplane.outer.min; }
    this.config.sliderDrawplane.inner.max = this.config.sliderDrawplane.inner.min + sliderWidth;
  }



  updateSlider(transform: any) {
    let planeWidth = this.config.chartDx * 2 * transform.k;
    const width = this.config.sliderDrawplane.outer.max - this.config.sliderDrawplane.outer.min;

    let offset = ((transform.x - (this.config.chartDx * 0.5 * transform.k)) * -1) / planeWidth * width;

    let sliderWidth = (0.5 / transform.k) * width; // .72
    if (sliderWidth < 20) { sliderWidth = 20; }
    if (sliderWidth > this.config.chartDx - 220 + this.config.rulerWidth) { sliderWidth = this.config.chartDx - 220 + this.config.rulerWidth; offset = 0; }

    this.config.sliderDrawplane.ratio = sliderWidth / width;
    this.config.sliderDrawplane.inner.min = offset + this.config.sliderDrawplane.outer.min;
    this.config.sliderDrawplane.inner.max = this.config.sliderDrawplane.inner.min + sliderWidth;

    this.config.svg.select('.innerRoundRectSlider')
      .attr('x', this.config.sliderDrawplane.inner.min - 6)
      .attr('width', sliderWidth);
  }

  translateDrawplane() {
    const transform = d3.zoomTransform(this.config.svg.node());
    let offset =
        ((this.config.sliderDrawplane.outer.min - this.config.sliderDrawplane.inner.min) /
        (this.config.sliderDrawplane.outer.max - this.config.sliderDrawplane.outer.min)) *
        (this.config.chartDx * 2 * transform.k) + (this.config.chartDx * 0.5 * transform.k);

    const t = d3.zoomIdentity.translate(offset, 0).scale(transform.k);
    this.config.svg.call(this.config.zoom.transform, t);
    this.scaleContent(t);
  }

  drawSliderDrawplane() {

    let dragStartPos = null;

    const dragContent = d3
      .drag()
      .on('start', () => { dragStartPos = d3.event.x; })
      .on('drag', () => {
        if (this.config.sliderDrawplane.inner.min + (d3.event.x - dragStartPos) >= this.config.sliderDrawplane.outer.min &&
            this.config.sliderDrawplane.inner.max + (d3.event.x - dragStartPos) <= this.config.sliderDrawplane.outer.max) {
          this.config.sliderDrawplane.inner.min += (d3.event.x - dragStartPos);
          this.config.sliderDrawplane.inner.max += (d3.event.x - dragStartPos);
          d3.select('.innerRoundRectSlider').attr('x', this.config.sliderDrawplane.inner.min - 6);
          this.translateDrawplane();
          dragStartPos = d3.event.x;
        }
      })
      .on('end', () => {
        dragStartPos = null;
      });

    const sliderDrawplane = this.config.svg.append('rect')
      .attr('id', 'slider-drawplane')
      .attr('class', 'slider-el')
      .attr('x', 0)
      .attr('y', this.config.svgDy - 22)
      .attr('height', 22)
      .attr('width', this.config.svgDx - this.config.margin.left)
      .attr('cursor', 'default')
      .style('fill', '#3a3a3a');

    const innerRoundedRect = this.config.svg.append('rect')
      .attr('class', 'innerRoundRectSlider')
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('x', this.config.sliderDrawplane.inner.min - 6)
      .attr('y', this.config.svgDy - 17)
      .attr('width', this.config.sliderDrawplane.inner.max - this.config.sliderDrawplane.inner.min + 12)
      .attr('height', 10)
      .attr('cursor', 'default')
      .style('fill', '#999')
      .call(dragContent);

    const arrows = [
      { name: 'sider-arrow-left', direction: -1, x: 12, r: 270  },
      { name: 'sider-arrow-right', direction: 1, x: (this.config.chartDx - 48 + this.config.rulerWidth), r: 90 }
    ];

    const triangle = d3.symbol()
      .type(d3.symbolTriangle)
      .size(25);

    const sliderArrows = this.config.svg.selectAll('path.sliderArrow')
      .data(arrows)
      .enter()
      .append('path')
      .attr('class', 'sliderArrow')
      .attr('transform', (d: { x: number, r: number }) =>
       'translate(' + d.x + ',' + (this.config.svgDy - 12) + '), rotate(' + d.r + ')')
      .attr('d', triangle)
      .style('fill', '#999')
      .style('stroke', 'transparent')
      .style('stroke-width', 3)
      .attr('cursor', 'default')
      .on('mousedown', (d: { direction: number }) => this.clickToMove(d.direction));

    const scalePercentage = this.config.svg.append('text')
      .attr('class', 'scalePercentage')
      .attr('x', this.config.chartDx + this.config.rulerWidth - 8)
      .attr('y', this.config.svgDy - 8)
      .attr('text-anchor', 'end')
      .text(() => {
        if (this.file.activeEffect.scale === null) {
          const transform = d3.zoomTransform(this.config.svg.node());
          return Math.round(transform.k * 100) + '%';
        } else {
          return Math.round(this.file.activeEffect.scale.k * 100) + '%';
        }
      })
      .style('fill', '#ccc')
      .attr('cursor', 'default')
      .style('font-family', 'Open Sans, Arial, sans-serif')
      .style('font-size', '10px');
  }

  deselectAllElements() {
    this.dataService.deselectAll();
    this.deselectGuides();

    if ((this.nodeService.selectedNodes.length > 0) || (this.nodeService.selectedPaths.length > 0)) {
      this.nodeService.deselectAll();

      this.config.svg.selectAll('.cpSVG, .cursorConnection, .bbox').remove();

      this.config.svg.selectAll('.node')
        .style('fill', 'transparent')
        .style('stroke-width', 6)
        .style('stroke', 'transparent');

      this.config.svg.selectAll('.forceNode').style('fill', 'transparent');
    }
    if (this.file.activeCollectionEffect !== null && this.file.activeCollection) {
      const collection = this.file.collections.filter(c => c.id === this.file.activeCollection.id)[0];
      if (collection) {
        collection.config.svg.selectAll('#coll-effect-' + this.file.activeCollectionEffect.id).style('opacity', 0.3);
      }
      this.file.activeCollectionEffect = null;
      this.file.activeCollection = null;
    }
  }

  colorNodesSelectedPaths() {
    this.dataService.setBoxSelection(true);
    for (const item of this.nodeService.selectedPaths) {
      this.config.svg.selectAll('.n_' + item)
        .style('fill', this.file.activeEffect.colors[0].hash)
        .style('stroke', this.file.activeEffect.colors[0].hash)
        .style('stroke-width', 0.5);
    }
  }

  redraw() {
    this.effectVisualizationService.verticalDivision = 100 - this.file.configuration.verticalScreenDivision;
    this.setEditBounds();
    this.setScale();
    this.createPlane();
    this.drawFileData();
  }

  toggleLibraryWindow() {
    let division: number;
    if (this.file.configuration.verticalScreenDivision >= (100 / window.innerWidth) * (window.innerWidth - 18)) {
      division = 70;
      if (this.document.getElementById('toggleLibraryWindow').classList.contains('hidden')) {
        this.document.getElementById('toggleLibraryWindow').classList.remove('hidden');
      }
    } else {
      division = this.file.configuration.verticalScreenDivision = (100 / window.innerWidth) * (window.innerWidth - 18);
      if (!this.document.getElementById('toggleLibraryWindow').classList.contains('hidden')) {
        this.document.getElementById('toggleLibraryWindow').classList.add('hidden');
      }
    }
    this.updateResize(division, 'vertical');
    this.updateResizeMotorControlSection.next();
    // this.fileService.update(this.file);
  }

  toggleDrawPlane() {
    let division: number;
    if (this.file.configuration.horizontalScreenDivision >= (100 / window.innerHeight) * (window.innerHeight - 40)) {
      if (this.document.getElementById('toggleDrawPlane').classList.contains('hidden')) {
        this.document.getElementById('toggleDrawPlane').classList.remove('hidden');
      }
      division = 35;
    } else {
      if (!this.document.getElementById('toggleDrawPlane').classList.contains('hidden')) {
        this.document.getElementById('toggleDrawPlane').classList.add('hidden');
      }
      division = (100 / window.innerHeight) * (window.innerHeight - 38);
    }
    this.updateResize(division, 'horizontal');
    this.updateResizeMotorControlSection.next();
    // this.fileService.update(this.file);
  }

  setDivToScreenDivision() {
    this.document.getElementById('top-section').style.height = ((window.innerHeight * this.file.configuration.horizontalScreenDivision / 100) - 23) + 'px';
    this.document.getElementById('bottom-section').style.height = ((window.innerHeight * (100-this.file.configuration.horizontalScreenDivision) / 100) - 20) + 'px';
    this.document.getElementById('field-inset').style.height = ((window.innerHeight * (100-this.file.configuration.horizontalScreenDivision) / 100) - 20) + 'px';
    this.document.getElementById('motor-control').style.width = (window.innerWidth * this.file.configuration.verticalScreenDivision / 100) + 'px';
    this.document.getElementById('library').style.width = ((window.innerWidth * (100-this.file.configuration.verticalScreenDivision) / 100) - 1) + 'px';
    if (this.file.configuration.horizontalScreenDivision >= (100 / window.innerHeight) * (window.innerHeight - 40)) {
      this.document.getElementById('toggleDrawPlane').classList.add('hidden');
    }
    if (this.file.configuration.verticalScreenDivision >= (100 / window.innerWidth) * (window.innerWidth - 18)) {
      this.document.getElementById('toggleLibraryWindow').classList.add('hidden');
    }
  }

  updateResize(division: number, orientation: string) {
    if (orientation === 'horizontal') {
      this.document.getElementById('top-section').style.height = ((window.innerHeight * division / 100) - 23) + 'px';
      this.document.getElementById('bottom-section').style.height = ((window.innerHeight * (100-division) / 100) - 20) + 'px';
      this.document.getElementById('field-inset').style.height = ((window.innerHeight * (100-division) / 100) - 20) + 'px';
      this.file.configuration.horizontalScreenDivision = division;
      if (this.file.configuration.horizontalScreenDivision >= (100 / window.innerHeight) * (window.innerHeight - 40)) {
        if (!this.document.getElementById('toggleDrawPlane').classList.contains('hidden')) {
          this.document.getElementById('toggleDrawPlane').classList.add('hidden');
        }
      } else {
        if (this.document.getElementById('toggleDrawPlane').classList.contains('hidden')) {
          this.document.getElementById('toggleDrawPlane').classList.remove('hidden');
        }
      }
      this.config.svgDy = window.innerHeight * (100 - this.file.configuration.horizontalScreenDivision)/100 - 20;
      if (this.config.svgDy < 250) { this.config.svgDy = 250; }

    } else if (orientation === 'vertical') {
      this.document.getElementById('motor-control').style.width = (window.innerWidth * division / 100) + 'px';
      this.document.getElementById('library').style.width = ((window.innerWidth * (100-division) / 100) - 1) + 'px';
      this.file.configuration.verticalScreenDivision = division;
      if (this.file.configuration.verticalScreenDivision >= (100 / window.innerWidth) * (window.innerWidth - 18)) {
        if (!this.document.getElementById('toggleLibraryWindow').classList.contains('hidden')) {
          this.document.getElementById('toggleLibraryWindow').classList.add('hidden');
        }
      } else {
        if (this.document.getElementById('toggleLibraryWindow').classList.contains('hidden')) {
          this.document.getElementById('toggleLibraryWindow').classList.remove('hidden');
        }
      }
    }
  }


  saveEffect() {
    this.fileService.updateEffect(this.file.activeEffect);
  }

  setTmpEffect(effect: Effect) {
    this.config.tmpEffect = effect;
    this.deselectAllElements();
  }


  updateSelectedModule(xMin: number, xMax: number, yMin: number, yMax: number) {
    this.resetSelectedModule(xMin, xMax, yMin, yMax);
    this.redraw();
  }

  updateUnitsActiveEffect(value: any) {
    const newUnits = this.config.xAxisOptions.filter(o => o.name === value)[0];
    this.fileService.updateUnits(this.file.activeEffect.grid.xUnit, newUnits);
  }

  resetSelectedModule(xMin: number, xMax: number, yMin: number, yMax: number) {
    this.config.editBounds.xMin = xMin;
    this.config.editBounds.xMax = xMax;
    this.config.editBounds.yMin = yMin;
    this.config.editBounds.yMax = yMax;
  }

  changeCursor(details: Cursor) {
    if (this.config.cursor.slug !== 'pen' && details.slug === 'pen') {
      this.nodeService.selectedNodes = [];
    }
    this.config.cursor = details;

    this.config.svg.select('#selectionBox').remove();
    if (this.config.cursor.slug !== 'pen' && this.config.cursor.slug !== 'dsel' && this.config.cursor.slug !== 'scis' &&
        this.config.cursor.slug !== 'anchor' && this.config.cursor.slug !== 'thick' && this.config.cursor.slug !== 'drag') {
      this.deselectAllElements();
    }
    if (this.config.cursor.slug !== 'sel') {
      this.config.svg.selectAll('.bbox').remove();
    }
    if (!(this.config.cursor.slug === 'pen' || this.config.cursor.slug === 'dsel' || this.config.cursor.slug === 'anchor' ||
      this.config.cursor.slug === 'thick' || this.config.cursor.slug === 'drag')) {
      this.config.svg.select('.cpSVG').remove();
    }
    this.document.getElementById('field-inset').style.cursor = details.cursor;

  }

  public drawFileData() {
    this.drawFile.next();
  }

  public showMessageDialog( data: { msg: string, type: string, action: string, d: any }) {
    this.showMessage.next(data);
  }

  public alignSelectedItems(direction: string) {
    this.align.next(direction);
  }

  public drawEffects() {
    this.drawEffectsInLibrary.next();
  }


  saveFile(file: File) {
    // console.log(file);
    this.fileService.update(file);
  }


  resetPathData() {
    this.nodeService.reset();
  }



  compareDateModified(a, b) {
    if ( a.date.modified < b.date.modified ) { return -1; }
    if ( a.date.modified > b.date.modified ) { return 1; }
    return 0;
  }

  drawRulers() {
    this.config.rulerWidth = 13;

    this.config.svg.selectAll('.ruler, .axis, .axisBottom, .smallAxisX, .smallAxisY, .clipPathYAxis, #clipYaxis').remove();

    const clipPathYaxis = this.config.svg.append('clipPath')
      .attr('id', 'clipYaxis')
      .append('svg:rect')
      .attr('width', this.config.rulerWidth)
      .attr('height', this.config.svgDy);

    const clipPathXaxis = this.config.svg.append('clipPath')
      .attr('id', 'clipXaxis')
      .append('svg:rect')
      .attr('width', this.config.svgDx - this.config.margin.left - this.config.rulerWidth)
      .attr('height', this.config.rulerWidth);

    const containerAxisTop = this.config.svg.append('rect')
        .attr('width', this.config.svgDx - this.config.margin.left)
        .attr('height', this.config.rulerWidth)
        .attr('y', 64)
        .attr('x', 0)
        .attr('class', 'axis')
        .attr('fill', '#222')
        .on('mouseover', () => this.document.getElementById('field-inset').style.cursor = 'default')
        .on('mouseleave', () => this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor)
      .append('title')
        .text(() => 'position (' + this.file.activeEffect.grid.xUnit.name + ')');

    this.config.yAxisSVG = this.config.svg.append('g')
      .attr('class', 'clipPathYAxis')
      .attr('clip-path', 'url(#clipYaxis)')
      .attr('transform', 'translate('+ (this.config.svgDx - this.config.margin.left - this.config.rulerWidth) +', 0)');

    const containerAxisLeft = this.config.yAxisSVG.append('rect')
        .attr('width', this.config.rulerWidth)
        .attr('height', this.config.svgDy - this.config.rulerWidth - 64)
        .attr('y', 64 + this.config.rulerWidth)
        .attr('x', 0)
        .attr('class', 'axis')
        .attr('fill', '#222')
        .on('mouseover', () => this.document.getElementById('field-inset').style.cursor = 'default')
        .on('mouseleave', () => this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor)
      .append('title')
        .text(() => 'intensity (%)');

    const lineX = this.config.svg.append('rect')
        .attr('width',  this.config.svgDx - this.config.margin.left)
        .attr('height', 1)
        .attr('x', 0)
        .attr('y', 64 + this.config.rulerWidth)
        .attr('fill', '#999');

    const lineY = this.config.yAxisSVG.append('rect')
        .attr('width',  1)
        .attr('height', this.config.svgDy - 64)
        .attr('x', 0)
        .attr('y', 64)
        .attr('fill', '#999');

    const yAxis = d3
        .axisLeft(this.nodeService.scale.scaleY)
        .tickSize(this.config.rulerWidth)
        .ticks(5)
        .tickFormat((e: any) => {
          if (Math.floor(e) !== e) { return; }
          return e;
        });

    const yAxisSmall = d3
        .axisRight(this.nodeService.scale.scaleY)
        .ticks(30)
        .tickSize(3)
        .tickFormat((e: any) => e);

    const yAxisSmallTicks = this.config.yAxisSVG.append('g')
        .attr('transform', 'translate(' + [ 1, this.config.margin.top ] + ')')
        .attr('class', 'smallAxisY')
        .call(yAxisSmall);

    const yAxisTicks = this.config.yAxisSVG.append('g')
        .attr('transform', 'translate(' + [ this.config.rulerWidth, this.config.margin.top ] + ')')
        .attr('class', 'axis')
        .call(yAxis)
          .selectAll('text')
          .attr('y', 4)
          .attr('x', 4)
          .attr('transform', 'rotate(90)')
          .style('text-anchor', 'start');

    this.config.xAxis = d3
        .axisBottom(this.nodeService.scale.scaleX)
        .ticks(10)
        .tickSize(this.config.rulerWidth)
        .tickFormat((e: any) => {
          if (Math.floor(e) !== e) { return; }
          return e;
        });

    const xAxisSVG = this.config.svg.append('g')
        .attr('class', 'clipPathXAxis')
        .attr('clip-path', 'url(#clipXaxis)')
        .attr('transform', 'translate(0, 64)');

    this.config.xAxisSmallTicks = d3
        .axisTop(this.nodeService.scale.scaleX)
        .ticks(100)
        .tickSize(4)
        .tickFormat((e: any) => e);

    this.config.xAxisBottomSmallTicks = xAxisSVG.append('g')
        .attr('class', 'smallAxisX')
        .attr('transform', 'translate(0, ' + this.config.rulerWidth + ')')
        .call(this.config.xAxisSmallTicks);

    this.config.xAxisBottom = xAxisSVG.append('g')
        .attr('class', 'axisBottom largeTicks')
        // .attr('transform', 'translate(0, 0)')
        .call(this.config.xAxis);

    this.config.svg.selectAll('.axisBottom text')
        .attr('y', 2)
        .attr('x', 4)
        .style('text-anchor', 'start');

    this.config.svg.selectAll('.axis .tick:first-child').remove();

    this.drawAllGuides(this.file.activeEffect.grid.guides);
  }

  drawCursorPosition(x: number, y: number) {
    if (this.config.rulerVisible) {
      const yValue = y - (window.innerHeight * (this.file.configuration.horizontalScreenDivision / 100));

      if (!d3.select('.cursorPos').empty()) {
        this.config.svg.selectAll('.cursorPos').remove();
      }

      if (x > this.config.margin.left && yValue > 64 && y < window.innerHeight - 60) {

        const posXaxis = this.config.svg.append('rect')
            .attr('class', 'cursorPos')
            .attr('x', x - this.config.margin.left - 0.5)
            .attr('width', 1)
            .attr('y', 64)
            .attr('height', this.config.rulerWidth);

        const posYaxis = this.config.svg.append('rect')
            .attr('class', 'cursorPos')
            .attr('x', this.config.chartDx)
            .attr('width', this.config.rulerWidth)
            .attr('y', yValue - 0.5)
            .attr('height', 1);

        this.config.svg.selectAll('.cursorPos')
            .style('fill', '#00FFFF')
            .attr('pointer-events', 'none');
      }
    }
  }

  rulerFunctions(e: MouseEvent) {

    this.drawCursorPosition(e.clientX, e.clientY);

    if (this.config.mouseDown.y !== null && this.config.mouseDown.x !== null) {

      let yRef = { y1: this.config.margin.offsetTop + 65, y2: window.innerHeight - 40 };
      let yRef2 = { y1: this.config.margin.offsetTop + 65, y2: this.config.margin.offsetTop + 65 + this.config.rulerWidth };

      let xRef = { x1: this.config.margin.left, x2: window.innerWidth };
      let xRef2 = { x1: window.innerWidth - this.config.rulerWidth, x2: window.innerWidth };

      if (this.config.mouseDown.x > xRef2.x1 &&
          this.config.mouseDown.x < xRef2.x2 &&
          this.config.mouseDown.y > yRef.y1 &&
          this.config.mouseDown.y < yRef.y2) {

        this.config.drawRulerAxis = 'y';
        this.drawGuide(this.config.drawRulerAxis, e.clientX - this.config.margin.left, e.clientY - this.config.margin.offsetTop, 'guide');
        this.dataService.updatePoints(
          this.nodeService.scale.scaleX.invert(e.clientX - this.config.margin.left), null, null, null);

        this.config.newGuide = true;
      } else if (this.config.mouseDown.x > xRef.x1 &&
                 this.config.mouseDown.x < xRef.x2 &&
                 this.config.mouseDown.y > yRef2.y1 &&
                 this.config.mouseDown.y < yRef2.y2) {

          this.config.drawRulerAxis = 'x';
          this.drawGuide(this.config.drawRulerAxis, e.clientX - this.config.margin.left, e.clientY - this.config.margin.offsetTop, 'guide');
          this.dataService.updatePoints(null, this.nodeService.scale.scaleY.invert(e.clientY - this.config.margin.top), null, null);
          this.config.newGuide = true;
      }
    }

  }

  drawGuide(axis: string, x: number, y: number, cl: string) {
    this.config.svg.selectAll('.' + cl + '.new').remove();

    if (axis === 'x') {
      const rulerXaxis = this.config.svg.append('rect')
          .attr('class', cl + ' new')
          .attr('x', 0)
          .attr('width', this.config.svgDx - this.config.margin.left)
          .attr('y', y - 0.25)
          .attr('height', 0.5);

    } else if (axis === 'y') {
      const rulerYaxis = this.config.svg.append('rect')
          .attr('class', cl + ' new')
          .attr('x', x - 0.25)
          .attr('width', 0.5)
          .attr('y', 0)
          .attr('height', this.config.svgDy - 20);
    }

    this.config.svg.selectAll('.' + cl + '.new')
        .style('fill', '#999')
        .style('stroke', 'transparent')
        .style('stroke-width', 1);
        // .style('shape-rendering', 'crispEdges');
        // .attr('stroke-dasharray', '4, 3')
        // .attr('stroke-linecap', 'square')
        // .attr('stroke-width', 0.1);
  }

  drawAllGuides(guides: Array<object>) {

    if (guides) {
      this.config.svg.selectAll('.guidesSvg').remove();

      if (this.file.activeEffect.grid.guidesVisible && this.config.rulerVisible) {

        const guidesSvg = this.config.svg.append('g')
          .attr('id', 'guidesSvg')
          .attr('class', 'guidesSvg');

        // tslint:disable-next-line: variable-name
        const dragGuide = d3
          .drag()
          .on('start', (d: { id: string; axis: string; coords: { x: number; y: number; }; }) => {
              if (!this.file.activeEffect.grid.lockGuides && (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel')) {
                d3.select('#id_' + d.id).classed('selected', true);
                if (d.axis === 'x') {
                  this.dataService
                   .updatePoints(null, this.nodeService.scale.scaleY.invert(d3.event.y - this.config.margin.top), null, null);
                } else if (d.axis === 'y') {
                  this.dataService.updatePoints(
                    this.nodeService.scale.scaleX.invert(d3.event.x - this.config.rulerWidth), null, null, null);
                }
              }
          })
          .on('drag', (d: { id: string; axis: string; coords: { x: number; y: number; }; }) => {
              if (!this.file.activeEffect.grid.lockGuides && (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel')) {
                if (d.axis === 'x' && d3.event.y < this.config.svgDy - 22) {
                  d3.select('#id_' + d.id).attr('y', d3.event.y);
                  this.dataService.updatePoints(
                    null, this.nodeService.scale.scaleY.invert(d3.event.y - this.config.margin.top + this.config.rulerWidth), null, null);
                } else if (d.axis === 'y' && d3.event.x > this.config.margin.left && d3.event.x < this.config.svgDx - this.config.rulerWidth) {
                  d3.select('#id_' + d.id).attr('x', d3.event.x);
                  this.dataService.updatePoints(
                    this.nodeService.scale.scaleX.invert(d3.event.x - this.config.margin.left), null, null, null);
                }
              }
          })
          .on('end', (d: { id: string; axis: string; coords: { x: number; y: number; }; }) => {
            if (!this.file.activeEffect.grid.lockGuides && (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel')) {
              d3.select('#id_' + d.id).classed('selected', false);
              this.file.activeEffect.grid.guides.filter(g => g.id === d.id)[0].coords = {
                x: this.nodeService.scale.scaleX.invert(d3.event.x - this.config.margin.left),
                y: this.nodeService.scale.scaleY.invert(d3.event.y - this.config.margin.top)
              };
            }
          });

        guidesSvg.selectAll('rect.guide')
          .data(guides)
          .enter()
          .append('rect')
          .attr('id', (d: { id: string; }) => 'id_' + d.id)
          .attr('class', 'guide')
          .attr('x', (d: { axis: string; coords: { x: any; }; }) =>
            d.axis === 'x' ? 0 : this.nodeService.scale.scaleX(d.coords.x))
          .attr('width', (d: { axis: string; coords: { x: any; }; }) =>
            d.axis === 'x' ? this.config.chartDx : 1)
          .attr('y', (d: { axis: string; coords: { y: any; }; }) => {
            return d.axis === 'y' ? 64 + this.config.rulerWidth : this.nodeService.scale.scaleY(d.coords.y) + this.config.margin.top;
          })
          .attr('height', (d: { axis: string; coords: { y: any; }; }) => {
            return d.axis === 'y' ? this.config.svgDy - 86 - this.config.rulerWidth : 1;
          })
          .style('stroke', 'transparent')
          .style('stroke-width', 3)
          .style('shape-rendering', 'crispEdges')
          .on('click', (d: { id: string; axis: string; coords: { x: number; y: number; }; }) => {
            if (this.config.cursor.slug === 'pen') {
              d3.select('#id_' + d.id).attr('pointer-events', 'none');
            } else if (this.config.cursor.slug === 'sel' || this.config.cursor.slug === 'dsel') {
              d3.select('#id_' + d.id).attr('pointer-events', 'all');

              if (!this.file.activeEffect.grid.lockGuides && d3.select('#id_' + d.id).classed('selected') === false) {
                if (d3.event.shiftKey) {
                  this.dataService.addSelectedElement(d.id);
                } else if (d.axis === 'x') {
                  this.dataService
                    .selectElement(d.id, null, this.nodeService.scale.scaleY.invert(d3.event.y - this.config.margin.top), null, null);
                } else if (d.axis === 'y') {
                  this.dataService
                    .selectElement(d.id, this.nodeService.scale.scaleX.invert(d3.event.x - this.config.margin.left), null, null, null);
                }
                if (!d3.event.shiftKey) { d3.selectAll('.guide.selected').classed('selected', false); }
                d3.select('#id_' + d.id).classed('selected', true);
              }
            }
          })
          .call(dragGuide);
      }
    }
  }

  selectGuides(guides: Array<string>) {
    for (const guide of guides) {
      d3.select('#id_' + guide).classed('selected', true);
    }
  }

  deselectGuides() {
    d3.selectAll('.guide').classed('selected', false);
  }

  updateGuide(points: any, selection: any) {
    const guide = this.file.activeEffect.grid.guides.filter(g => g.id === selection[0])[0];
    if (guide) {
      if (guide.axis === 'x') {
        guide.coords.y = points.y;
        d3.select('#id_' + guide.id).attr('y', this.nodeService.scale.scaleY(guide.coords.y) + this.config.margin.top);
      } else if (guide.axis === 'y') {
        guide.coords.x = points.x;
        d3.select('#id_' + guide.id).attr('x', this.nodeService.scale.scaleX(guide.coords.x) + this.config.margin.left);
      }
    }
  }

  drawGrid(gridSettings: any) {

    if (this.file.activeEffect.grid.visible) {

      this.config.svg.selectAll('.gridSVG').remove();

      this.config.gridSVG = this.config.svg.append('g')
          .attr('id', 'gridSVG')
          .attr('class', 'gridSVG')
          .attr('clip-path', 'url(#clip)')
          .attr('transform', 'translate(0, ' + this.config.margin.top + ')');

      this.config.gridSVG.selectAll('line.verticalGrid').data(this.nodeService.scale.scaleX.ticks(20)).enter()
        .append('line')
        .attr('class', 'verticalGrid')
        .attr('x1', (d) => this.nodeService.scale.scaleX(d))
        .attr('x2', (d) => this.nodeService.scale.scaleX(d))
        .attr('y1', 0)
        .attr('y2', this.config.chartDy)
        .style('fill', 'transparent')
        .style('shape-rendering', 'crispEdges')
        .style('stroke', '#666')
        .style('stroke-width', 0.5);

      this.config.gridSVG.selectAll('line.horizontalGrid').data(this.nodeService.scale.scaleY.ticks(10)).enter()
        .append('line')
        .attr('class', 'horizontalGrid')
        .attr('y1', (d) => this.nodeService.scale.scaleY(d))
        .attr('y2', (d) => this.nodeService.scale.scaleY(d))
        .attr('x1', 0)
        .attr('x2', this.config.chartDx)
        .style('fill', 'transparent')
        .style('shape-rendering', 'crispEdges')
        .style('stroke', '#666')
        .style('stroke-width', 0.5);

    }

  }


  scaleActiveEffectFromTorqueToPosition(scaleFactor: number, offset: number) {
    this.nodeService.selectAll();
    this.nodeService.scalePath(this.nodeService.selectedPaths, 1, scaleFactor, 0, offset);
    this.nodeService.deselectAll();
  }

  setActiveCollectionEffect(details: { effect: Details, collection: Collection }) {
    this.file.activeCollectionEffect = details.effect;
    this.file.activeCollection = details.collection;
  }



  setInputFieldsActive(active: boolean) {
    this.nodeService.inputFieldsActive = active;
  }







}
