import { Injectable, Inject } from '@angular/core';
import { DrawingPlaneConfig } from '../models/drawing-plane-config.model';
import { DrawingService } from './drawing.service';
import { NodeService } from './node.service';


@Injectable()
export class GridService {

  config: DrawingPlaneConfig;

  constructor(private nodeService: NodeService, private drawingService: DrawingService) {
    this.config = this.drawingService.config;
  }


  drawGrid(gridSettings: any) {

    this.config.svg.selectAll('.gridSVG').remove();

    if (this.drawingService.file.activeEffect.grid.visible) {

      const gridData = this.calculateGridArray(gridSettings);

      this.config.gridSVG = this.config.svg.append('g')
        .attr('id', 'gridSVG')
        .attr('class', 'gridSVG')
        .attr('clip-path', 'url(#clip)')
        .attr('transform', () => 'translate(0, ' + this.config.margin.top + ')');

      this.config.gridSVG.selectAll('line.gridX')
        .data(gridData.x)
        .enter()
        .append('line')
        .attr('class', 'gridX')
        .attr('x1', (d) => this.nodeService.scale.scaleX(d) - 0.25)
        .attr('x2', (d) => this.nodeService.scale.scaleX(d) - 0.25)
        .attr('y1', this.nodeService.scale.scaleY(this.config.editBounds.yMin))
        .attr('y2', this.nodeService.scale.scaleY(this.config.editBounds.yMax))
        .style('stroke', gridSettings.color.hash)
        .style('stroke-width', 0.5)
        .style('shape-rendering', 'crispEdges')
        .style('opacity', 0.6)
        .attr('pointer-events', 'none');

      this.config.gridSVG.selectAll('line.gridY')
        .data(gridData.y)
        .enter()
        .append('line')
        .attr('class', 'gridY')
        .attr('x1', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
        .attr('x2', this.nodeService.scale.scaleX(this.config.editBounds.xMax))
        .attr('y1', (d) => this.nodeService.scale.scaleY(d))
        .attr('y2', (d) => this.nodeService.scale.scaleY(d))
        .style('stroke', gridSettings.color.hash)
        .style('stroke-width', 0.5)
        .style('shape-rendering', 'crispEdges')
        .style('opacity', 0.6)
        .attr('pointer-events', 'none');

      if (this.drawingService.file.activeEffect.scale && this.drawingService.file.activeEffect.scale.k >= 1) {

        const subDivisions = this.calculateGridSubDivisions(gridSettings);

        this.config.gridSVG.selectAll('line.subDivisionX')
          .data(subDivisions.x)
          .enter()
          .append('line')
          .attr('class', 'gridX')
          .attr('x1', (d) => this.nodeService.scale.scaleX(d))
          .attr('x2', (d) => this.nodeService.scale.scaleX(d))
          .attr('y1', this.nodeService.scale.scaleY(this.config.editBounds.yMin))
          .attr('y2', this.nodeService.scale.scaleY(this.config.editBounds.yMax))
          .style('stroke', gridSettings.color.hash)
          .style('stroke-width', 0.3)
          .style('shape-rendering', 'crispEdges')
          .style('opacity', 0.4)
          .attr('pointer-events', 'none');

        this.config.gridSVG.selectAll('line.subDivisionY')
          .data(subDivisions.y)
          .enter()
          .append('line')
          .attr('class', 'subDivisionY')
          .attr('x1', this.nodeService.scale.scaleX(this.config.editBounds.xMin))
          .attr('x2', this.nodeService.scale.scaleX(this.config.editBounds.xMax))
          .attr('y', (d) => this.nodeService.scale.scaleY(d))
          .attr('y', (d) => this.nodeService.scale.scaleY(d))
          .style('stroke', gridSettings.color.hash)
          .style('stroke-width', 0.3)
          .style('shape-rendering', 'crispEdges')
          .style('opacity', 0.4)
          .attr('pointer-events', 'none');

      }
    }
  }

  calculateGridArray(gridSettings: any) {

    const gridX = [];
    const gridY = [];

    const spacingX = (this.config.editBounds.xMax - this.config.editBounds.xMin) / gridSettings.spacingX;

    for (let i = 0; i < spacingX; i++) {
      const x = i * gridSettings.spacingX;
      gridX.push((this.config.editBounds.xMin + x));
    }

    const spacingY = (this.config.editBounds.yMax - this.config.editBounds.yMin) / gridSettings.spacingY;

    for (let i = 0; i < spacingY; i++) {
      const y = i * gridSettings.spacingY;
      gridY.push((this.config.editBounds.yMin + y));
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
        gridX.push((this.config.editBounds.xMin + x));
      }
    }

    const spacingY = (this.config.editBounds.yMax - this.config.editBounds.yMin) / gridSettings.spacingY;
    const subY = gridSettings.spacingY / (gridSettings.subDivisionsY);

    for (let i = 0; i < spacingY; i++) {
      for (let j = 1; j < gridSettings.subDivisionsY; j++) {
        const y = (j * subY) + (i * gridSettings.spacingY);
        gridY.push((this.config.editBounds.yMin + y));
      }
    }

    return { x: gridX, y: gridY };
  }


}
