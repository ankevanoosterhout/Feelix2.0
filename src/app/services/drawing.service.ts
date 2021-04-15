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



@Injectable()
export class DrawingService {

  public config: DrawingPlaneConfig;
  public file = new File(null, null, null);


  drawFile: Subject<any> = new Subject();
  showMessage: Subject<any> = new Subject();
  align: Subject<any> = new Subject();


  constructor(@Inject(DOCUMENT) private document: Document, public nodeService: NodeService,
              private dataService: DataService, private fileService: FileService, private effectVisualizationService: EffectVisualizationService) {

    this.config = new DrawingPlaneConfig();
  }

  createPlane() {
    d3.select('#svgID').remove();

    this.config.svg = d3.select('#field-inset')
      .append('svg')
      .attr('id', 'svgID')
      .attr('width', this.config.svgDx)
      .attr('height', this.config.svgDy);

    if (this.file.activeEffect.scale !== null) {
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

    const innerContainer = this.config.svg.append('rect')
      .attr('width', this.nodeService.scale.scaleX(this.config.editBounds.xMax) -
                     this.nodeService.scale.scaleX(this.config.editBounds.xMin))
      .attr('height', this.config.chartDy - 0.5)
      .attr('x', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
      .attr('y', 0.25)
      .attr('clip-path', 'url(#clip)')
      .attr('transform', 'translate(0, ' + this.config.margin.top + ')')
      .attr('class', 'innerContainer')
      .attr('stroke-width', 0.5)
      .attr('stroke', '#1c1c1c')
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
        .attr('fill', '#1c1c1c')
        .attr('transform', 'translate(0, ' + this.config.margin.top + ')');
    }

    if (this.config.rulerVisible) {
      this.drawRulers();
    }
    this.drawSliderDrawplane();
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
    this.setZoom();
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

    if (this.file.activeEffect.scale === null) {
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
    let offsetLeft = this.config.chartDx * -0.5;
    this.config.zoom = d3
      .zoom()
      .scaleExtent([0.01, Infinity])
      .translateExtent([[offsetLeft, 0], [(this.config.chartDx * 1.5), this.config.chartDy]]) // 1.2
      .on('zoom', () => {
        if (this.config.zoomable) {
          const transform = d3.event.transform;

          this.scaleContent(transform);
          this.updateSlider(transform);
        }
      });
  }

  setEditBounds() {

    const yMin = this.file.activeEffect.type === 'torque' ? -100 : 0;

    this.config.margin.top = this.config.svgDy * 0.4;
    this.config.editBounds = {
      xMin: this.file.activeEffect.range.start,
      xMax: this.file.activeEffect.range.end,
      yMin: yMin,
      yMax: 100
    };
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

    if (this.file.activeEffect.scale !== null) {
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
      .style('fill', '#3a3a3a')
      .on('mouseover', this.document.getElementById('field-inset').style.cursor = 'default')
      .on('mouseleave', this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor);

    const innerRoundedRect = this.config.svg.append('rect')
      .attr('class', 'innerRoundRectSlider')
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('x', this.config.sliderDrawplane.inner.min - 6)
      .attr('y', this.config.svgDy - 17)
      .attr('width', this.config.sliderDrawplane.inner.max - this.config.sliderDrawplane.inner.min + 12)
      .attr('height', 10)
      .style('fill', '#999')
      .on('mouseover', () => this.document.getElementById('field-inset').style.cursor = 'default')
      .on('mouseleave', () => this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor)
      .call(dragContent);

    const arrows = [
      { name: 'sider-arrow-left', direction: -1, },
      { name: 'sider-arrow-right', direction: 1 }
    ];

    const sliderArrows = this.config.svg.selectAll('path.sliderArrow')
      .data(arrows)
      .enter()
      .append('path')
      .attr('class', 'sliderArrow')
      .attr('d', (d: { direction: number }) => {
        return d.direction === -1 ?
          'M 10 ' + (this.config.svgDy - 12) + ' L 15 ' +
          (this.config.svgDy - 17) + ' L 15 ' + (this.config.svgDy - 7) + ' Z' :
          'M ' + (this.config.chartDx - 50 + this.config.rulerWidth) + ' ' + (this.config.svgDy - 12) + ' L ' + (this.config.chartDx - 55 + this.config.rulerWidth) + ' ' +
          (this.config.svgDy - 17) + ' L ' + (this.config.chartDx - 55 + this.config.rulerWidth) + ' ' + (this.config.svgDy - 7) + ' Z';
      })
      .style('fill', '#999')
      .style('stroke', 'transparent')
      .style('stroke-width', 3)
      .on('mousedown', (d: { direction: number }) => this.clickToMove(d.direction))
      .on('mouseover', this.document.getElementById('field-inset').style.cursor = 'default')
      .on('mouseleave', this.document.getElementById('field-inset').style.cursor = this.config.cursor.cursor);

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
    this.redraw();
  }


  saveEffect() {
    this.fileService.updateEffect(this.file.activeEffect);
  }



  updateSelectedModule(xMin: number, xMax: number, yMin: number, yMax: number) {
    this.resetSelectedModule(xMin, xMax, yMin, yMax);
    this.redraw();
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

  public showMessageDialog( data: { msg: string, type: string }) {
    this.showMessage.next(data);
  }

  public alignSelectedItems(direction: string) {
    this.align.next(direction);
  }

  saveFile(file: File) {
    // console.log(file);
    this.fileService.update(file);
  }

  resetPathData() {
    this.nodeService.reset();
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
        .text(() => 'position (' + this.file.activeEffect.grid.units.name + ')');

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
    var yValue = y - (window.innerHeight * (this.file.configuration.horizontalScreenDivision / 100));
    if (x > this.config.margin.left && yValue > 64) {


      this.config.svg.selectAll('.cursorPos').remove();
      const posXaxis = this.config.svg.append('line')
          .attr('class', 'cursorPos')
          .attr('x1', x - this.config.margin.left)
          .attr('x2', x - this.config.margin.left)
          .attr('y1', 64 + this.config.rulerWidth)
          .attr('y2', 64);

      const posYaxis = this.config.svg.append('line')
          .attr('class', 'cursorPos')
          .attr('x1', this.config.chartDx + this.config.rulerWidth)
          .attr('x2', this.config.chartDx)
          .attr('y1', yValue)
          .attr('y2', yValue);

      this.config.svg.selectAll('.cursorPos')
          .style('fill', '#00FFFF')
          .style('stroke', '#00FFFF')
          .style('stroke-width', 1);
      }
  }

  rulerFunctions(e: MouseEvent) {

    this.drawCursorPosition(e.clientX, e.clientY);

    if (this.config.mouseDown.y !== null && this.config.mouseDown.x !== null) {

      let yRef = { y1: 66, y2: 66 + this.config.rulerWidth };
      let yRef2 = { y1: 66, y2: this.config.svgDy - 88 };

      if (this.config.mouseDown.x < this.config.margin.left &&
        this.config.mouseDown.x > this.config.margin.left - this.config.rulerWidth &&
        this.config.mouseDown.y > yRef2.y1 && this.config.mouseDown.y < yRef2.y2) {

        this.config.drawRulerAxis = 'y';
        this.drawGuide(this.config.drawRulerAxis, e.clientX, e.clientY, 'guide');
        this.dataService.updatePoints(
          this.nodeService.scale.scaleX.invert(e.clientX - this.config.margin.left), null, null, null);

        this.config.newGuide = true;
      } else if (this.config.mouseDown.y > yRef.y1 && this.config.mouseDown.y < yRef.y2 &&
                 this.config.mouseDown.x > this.config.margin.left) {
        this.config.drawRulerAxis = 'x';
        this.drawGuide(this.config.drawRulerAxis, e.clientX, e.clientY, 'guide');
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
          .attr('x', this.config.margin.left - this.config.rulerWidth)
          .attr('width', this.config.svgDx - (this.config.margin.left - this.config.rulerWidth))
          .attr('y', y)
          .attr('height', 0.3);

    } else if (axis === 'y') {
      const rulerYaxis = this.config.svg.append('rect')
          .attr('class', cl + ' new')
          .attr('x', x)
          .attr('width', 0.3)
          .attr('y', 0)
          .attr('height', this.config.svgDy);
    }

    this.config.svg.selectAll('.' + cl + '.new')
        .style('fill', '#666')
        .style('stroke', 'none');
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
                if (d.axis === 'x' && d3.event.y < this.config.svgDy - this.config.rulerWidth) {
                  d3.select('#id_' + d.id).attr('y', d3.event.y);
                  this.dataService.updatePoints(
                    null, this.nodeService.scale.scaleY.invert(d3.event.y - this.config.margin.top), null, null);
                } else if (d.axis === 'y' && d3.event.x > this.config.margin.left) {
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
            d.axis === 'x' ? this.config.margin.left : this.nodeService.scale.scaleX(d.coords.x) + this.config.margin.left)
          .attr('width', (d: { axis: string; coords: { x: any; }; }) =>
            d.axis === 'x' ? this.config.chartDx : 0.3)
          .attr('y', (d: { axis: string; coords: { y: any; }; }) => {
            if (d.axis === 'y') {
              return this.config.rulerWidth * -1;
            } else {
              return this.nodeService.scale.scaleY(d.coords.y) + this.config.margin.top;
            }
          })
          .attr('height', (d: { axis: string; coords: { y: any; }; }) => {
            if (d.axis === 'y') {
              return this.config.svgDy;
             } else {
              return 0.3;
            }
          })
          .style('stroke', 'transparent')
          .style('stroke-width', 3)
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

    this.config.svg.selectAll('.gridSVG').remove();

    if (this.file.activeEffect.grid.visible) {

      const gridData = this.calculateGridArray(gridSettings);

      this.config.gridSVG = this.config.svg.append('g')
        .attr('id', 'gridSVG')
        .attr('class', 'gridSVG')
        .attr('clip-path', 'url(#clip)')
        .attr('transform', 'translate(' + this.config.margin.left + ', ' + this.config.margin.top + ')');

      this.config.gridSVG.selectAll('rect.gridX')
        .data(gridData.x)
        .enter()
        .append('rect')
        .attr('class', 'gridX')
        .attr('x', (d) => this.nodeService.scale.scaleX(d) - 0.25)
        .attr('width', 0.5)
        .attr('y', this.nodeService.scale.scaleY(this.config.editBounds.yMax))
        .attr('height', this.config.chartDy)
        .style('fill', gridSettings.color.hash)
        .style('opacity', 0.75)
        .attr('pointer-events', 'none');

      this.config.gridSVG.selectAll('rect.gridY')
        .data(gridData.y)
        .enter()
        .append('rect')
        .attr('class', 'gridY')
        .attr('x', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
        .attr('width', this.nodeService.scale.scaleX(this.config.editBounds.xMax) -
                       this.nodeService.scale.scaleX(this.config.editBounds.xMin))
        .attr('y', (d) => this.nodeService.scale.scaleY(d) + 0.25)
        .attr('height', 0.5)
        .style('fill', gridSettings.color.hash)
        .style('opacity', 0.75)
        .attr('pointer-events', 'none');

      if (this.file.activeEffect.scale !== null) {
        if (this.file.activeEffect.scale.k >= 1) {

          const subDivisions = this.calculateGridSubDivisions(gridSettings);

          this.config.gridSVG.selectAll('rect.subDivisionX')
            .data(subDivisions.x)
            .enter()
            .append('rect')
            .attr('class', 'gridX')
            .attr('x', (d) => this.nodeService.scale.scaleX(d) - 0.15)
            .attr('width', 0.3)
            .attr('y', this.nodeService.scale.scaleY(this.config.editBounds.yMax))
            .attr('height', () => this.config.chartDy)
            .style('fill', gridSettings.color.hash)
            .style('opacity', 0.5)
            .attr('pointer-events', 'none');

          this.config.gridSVG.selectAll('rect.subDivisionY')
            .data(subDivisions.y)
            .enter()
            .append('rect')
            .attr('class', 'subDivisionY')
            .attr('x', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
            .attr('width', this.nodeService.scale.scaleX(this.config.editBounds.xMax) -
                       this.nodeService.scale.scaleX(this.config.editBounds.xMin))
            .attr('y', (d) => this.nodeService.scale.scaleY(d) + 0.15)
            .attr('height', 0.3)
            .style('fill', gridSettings.color.hash)
            .style('opacity', 0.5)
            .attr('pointer-events', 'none');
          }
      }
    }
  }

  calculateGridArray(gridSettings: any) {

    const gridX = [];
    const gridY = [];

    const spacingX = (this.config.editBounds.xMax - this.config.editBounds.xMin) / gridSettings.spacingX;

    for (let i = 0; i < spacingX; i++) {
      const x = i * gridSettings.spacingX;
      gridX.push(x);
    }

    const spacingY = (this.config.editBounds.yMax - this.config.editBounds.yMin) / gridSettings.spacingY;

    for (let i = 0; i < spacingY; i++) {
      const y = i * gridSettings.spacingY;
      gridY.push(y);
    }

    return { x: gridX, y: gridY };
  }

  calculateGridSubDivisions(gridSettings: any) {

    const gridX = [];
    const gridY = [];

    const spacingX = (this.config.editBounds.xMax - this.config.editBounds.xMin) / gridSettings.spacingX;
    const subX = gridSettings.spacingX / (gridSettings.subDivisionsX);
    for (let i = 0; i < spacingX; i++) {
      for (let j = 1; j < gridSettings.subDivisionsX; j++) {
        const x = (j * subX) + (i * gridSettings.spacingX);
        gridX.push(x);
      }
    }

    const spacingY = (this.config.editBounds.yMax - this.config.editBounds.yMin) / gridSettings.spacingY;
    const subY = gridSettings.spacingY / (gridSettings.subDivisionsY);

    for (let i = 0; i < spacingY; i++) {
      for (let j = 1; j < gridSettings.subDivisionsY; j++) {
        const y = (j * subY) + (i * gridSettings.spacingY);
        gridY.push(y);
      }
    }

    return { x: gridX, y: gridY };
  }





}
