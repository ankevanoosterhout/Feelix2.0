import { Injectable } from '@angular/core';
import { FeelixioConfig } from '../models/feelixio-config.model';
import * as d3 from 'd3';
import { v4 as uuid } from 'uuid';
import { FeelixioDrawService } from './feelixio-draw.service';
import { FeelixioFile, ComponentLink } from '../models/feelixio-file.model';
import { ComponentObject, Link } from '../models/component.model';
import { Subject } from 'rxjs';
import { EffectVisualizationService } from './effect-visualization.service';
import { FeelixioValidationService } from './feelixio-validation.service';
import { MicroController } from '../models/hardware.model';

@Injectable()
export class FeelixioDrawElementsService {

  public config: FeelixioConfig;
  public feelixioFile: FeelixioFile;


  activeComponentChange: Subject<any> = new Subject<any>();

  saveFile: Subject<any> = new Subject();
  showMsg: Subject<any> = new Subject();
  updateOutputParameters: Subject<any> = new Subject();



  constructor(private feelixioDrawService: FeelixioDrawService,
              private effectVisualizationService: EffectVisualizationService, private validationService: FeelixioValidationService ) {

    this.config = this.feelixioDrawService.config;

  }

  drawFileData() {
    this.config.svg.selectAll('.componentSVG, .connectionSVG, #clip').remove();

    const clipPathLarge = this.config.svg.append('clipPath')
      .attr('id', 'clip')
      .append('svg:rect')
      .attr('width', this.config.chartDx)
      .attr('height', this.config.chartDy);

    this.config.componentSVG = this.config.svg.append('g')
      .attr('class', 'componentSVG')
      .attr('clip-path', 'url(#clip)')
      .attr('width', this.feelixioFile.config.field.width)
      .attr('height', this.feelixioFile.config.field.height);

    this.config.connectionSVG = this.config.svg.append('g')
      .attr('class', 'connectionSVG')
      .attr('clip-path', 'url(#clip)')
      .attr('width', this.feelixioFile.config.field.width)
      .attr('height', this.feelixioFile.config.field.height);

    this.drawLibraryEffects();
    this.drawComponents();
    this.drawMotors();
    this.drawLinks();
  }

  saveFileData(file: FeelixioFile) {
    this.saveFile.next(file);
  }

  updateParameters(links: Array<ComponentLink>) {
    this.updateOutputParameters.next(links);
  }

  updateMicrocontroller(microcontroller: MicroController) {
    const controllerObject =
      this.feelixioFile.hardware.filter(h => h.microcontroller.serialPort.path === microcontroller.serialPort.path)[0];
    if (controllerObject) {
      controllerObject.microcontroller = microcontroller;
      this.saveFileData(this.feelixioFile);
    }
  }

  deleteEffect(id: string) {
    if (!this.feelixioFile.config.running) {
      this.config.componentSVG.selectAll('.obj-' + id).remove();
    }
  }

  showMessage(Msg: string, Type: string) {
    this.showMsg.next({ msg: Msg, type: Type });
  }

  updateActiveComponent(comp: any) {
    this.config.activeComponent = comp;
    this.config.activeLink = null;
    this.config.activeConnection = null;
    this.config.activeInput = false;
    this.activeComponentChange.next(this.config.activeComponent);
  }

  drawLibraryEffects() {
    for (const effect of this.feelixioFile.effects) {
      this.drawLibraryEffect(effect);
    }
  }

  drawLibraryEffect(comp: any) {

    this.config.componentSVG.selectAll('#effect_' + comp.id).remove();

    comp.size.height = (comp.parameters.input.filter(p => !p.hidden).length * 20) + 20;

    if (comp.size.height < 60) { comp.size.height = 60; }

    const effectGroup = this.config.componentSVG.append('g')
      .attr('id', 'effect_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    const sub = comp.effect.type === 'motion' || comp.effect.type === 'ease' ? ' (T)' : ' (P)';

    this.drawBlock(effectGroup, 'block-effect-' + comp.id, comp.id, this.feelixioFile.config.scale.scaleX(comp.coords.x) - 130,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height, '#2c2c2c', '#fff');

    this.drawText(effectGroup, 'text-effect-' + comp.id, comp.id, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2) - 5,
      comp.effect.interface.name + sub, 10, true, '#ccc', '#ccc');

    const nodePath = effectGroup.append('rect')
      .attr('id', 'effectPath_' + comp.id)
      .attr('class', 'nodePath-' + comp.id)
      .attr('x', this.feelixioFile.config.scale.scaleX(comp.coords.x) - 60)
      .attr('y', this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2))
      .attr('width', 120)
      .attr('height', comp.size.height)
      .style('fill', () => {
        if (comp.effect.type !== 'normal' && comp.effect.type !== 'motion') {
          return comp.effect.interface.colors[0].hash;
        } else {
          return comp.effect.type === 'normal' ? '#f2662d' : '#52b8d8';
        }
      });

    const nodes = effectGroup.append('g')
      .attr('id', 'effect_' + comp.id)
      .attr('class', 'obj-' + comp.id)
      .attr('transform', () => comp.effect.type !== 'ease' ?
        'translate(' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) - 70) +
        ', ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2)) + ')' :
        'translate(' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) - 50) +
        ', ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2) + 5) + ')');

    if (comp.effect.type === 'ease') {
      comp.xScale = this.effectVisualizationService.drawNodePathModule(nodes, comp.effect, 100, comp.size.height - 10);
    } else if (comp.effect.type === 'normal') {
      // comp.xScale = this.effectVisualizationService.drawEffectData(nodes, comp.effect, comp.size.height, 'position',
      //   ['#fff', '#fff', 'rgba(255,255,255,0.5)']);
    } else if (comp.effect.type === 'motion') {
      // comp.xScale =
        // this.effectVisualizationService.drawEffectData(nodes, comp.effect, comp.size.height, 'time', ['#fff', '#fff', '#fff']);
    }



    this.drawConnectionPoints(effectGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), 260, comp.size.height);

    this.drawSelectBlock(effectGroup, comp,  this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

  }



  updateCursors(angle: any) {
    for (const comp of this.feelixioFile.effects) {
      if (comp.effect.slug > 3) {
        this.effectVisualizationService.updateCursor(comp.effect.id, comp.effect.units, angle, comp.xScale, 140);
      }
    }
  }


  drawComponents() {
    for (const component of this.feelixioFile.components) {
      this.drawComponent(component);
    }
  }


  drawComponent(d: any) {

    if (d.type === 'value' || d.type === 'boolean' || d.type === 'custom') {
      this.drawValue(d);
    } else if (d.type === 'slider') {
      this.drawSlider(d);
    } else if (d.type === 'position') {
      this.drawPosition(d);
    } else if (d.type === 'angle') {
      this.drawAngle(d);
    } else if (d.type === 'operator' || d.type === 'arithmetic' || d.type === 'constrain' || d.type === 'map') {
      this.drawOperator(d);
    } else if (d.type === 'switch') {
      this.drawSwitch(d);
    } else if (d.type === 'direction' || d.type === 'align') {
      this.drawCategory(d);
    } else if (d.type === 'play') {
      this.drawPlay(d);
    } else if (d.type === 'timer') {
      this.drawTimer(d);
    } else if (d.type === 'repeat') {
      this.drawRepeat(d);
    } else if (d.type === 'linear') {
      this.drawLinear(d);
    }
  }


  drawCategory(comp: any) {
    this.config.componentSVG.select('#category' + comp.id).remove();

    const outputParVal = comp.parameters.output[0].defaultVal;

    const categoryGroup = this.config.componentSVG.append('g')
      .attr('id', 'category' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    comp.size.width = 7 * (outputParVal.category.val.length + comp.type.length) + 40;
    comp.size.height = 30;
    const smallBlockWidth = (comp.type.length * 7) + 20;

    this.drawBlock(categoryGroup, 'block-0-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), smallBlockWidth, comp.size.height, '#1c1c1c', '#fff');
    this.drawBlock(categoryGroup, 'block-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + smallBlockWidth,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2),
      (comp.size.width - smallBlockWidth), comp.size.height, '#2c2c2c', '#bbb');
    this.drawText(categoryGroup, 'text-0-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + (smallBlockWidth / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) + 4, comp.type, 11, false, '#ccc', '#2c2c2c');
    this.drawText(categoryGroup, 'text-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + smallBlockWidth +
      ((comp.size.width - smallBlockWidth) / 2), this.feelixioFile.config.scale.scaleY(comp.coords.y) + 4,
      outputParVal.category.val, 11, true, '#ccc', '#2c2c2c');

    this.drawSelectBlock(categoryGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(categoryGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);
  }


  drawOperator(comp: ComponentObject) {

    this.config.componentSVG.select('#operator_' + comp.id).remove();

    const operatorGroup = this.config.componentSVG.append('g')
      .attr('id', 'operator_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    comp.size.height = 60;
    comp.size.width = comp.type === 'arithmetic' ? 30 : 38;

    if (comp.type === 'arithmetic' || comp.type === 'operator') { comp.size.height = 20 * comp.parameters.input.length; }

    this.drawBlock(operatorGroup, 'block-0-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2),
      comp.size.width, comp.size.height, '#1c1c1c', '#fff');

    if (comp.type === 'operator' || comp.type === 'arithmetic') {
      const value = comp.component.operator.symbol;

      this.drawText(operatorGroup, 'text-0-' + comp.id, comp.id,
        this.feelixioFile.config.scale.scaleX(comp.coords.x), this.feelixioFile.config.scale.scaleY(comp.coords.y) + 4,
        value, 15, true, '#ccc', '#2c2c2c');

    } else if (comp.type === 'constrain' || comp.type === 'map') {

      this.drawText(operatorGroup, 'text-0-' + comp.id, comp.id,
        this.feelixioFile.config.scale.scaleX(comp.coords.x), this.feelixioFile.config.scale.scaleY(comp.coords.y) - 13,
        'MIN', 10, true, '#ccc', '#2c2c2c');

      this.drawText(operatorGroup, 'text-1-' + comp.id, comp.id,
        this.feelixioFile.config.scale.scaleX(comp.coords.x), this.feelixioFile.config.scale.scaleY(comp.coords.y) + 20,
        'MAX', 10, true, '#ccc', '#2c2c2c');
    }

    this.drawSelectBlock(operatorGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x) - 12,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(operatorGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);

  }


  drawPlay(comp: ComponentObject) {

    this.config.componentSVG.select('#play_' + comp.id).remove();

    const playGroup = this.config.componentSVG.append('g')
      .attr('id', 'play_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    comp.size.height = (comp.parameters.input.length * 20);
    comp.size.width = 26;

    this.drawBlock(playGroup, 'block-0-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height, '#1c1c1c', '#fff');

    const play = playGroup.append('path')
      .attr('class', 'obj-' + comp.id)
      .attr('id', 'play-' + comp.id)
      .attr('d', 'M ' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) - 2) + ' ' +
      (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 4) +
        ' L ' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) - 2) + ' ' +
        (this.feelixioFile.config.scale.scaleY(comp.coords.y) + 4) +
        ' L ' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) + 6) + ' ' +
        (this.feelixioFile.config.scale.scaleY(comp.coords.y)) + ' Z')
      .style('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#2c2c2c' : '#ccc')
      .on('mousedown', () => { console.log('play'); });

    this.drawSelectBlock(playGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x) - 12,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(playGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);
  }


  drawSwitch(comp: ComponentObject) {

    this.config.componentSVG.select('#switch_' + comp.id).remove();

    comp.size.height = (comp.parameters.input.length * 20);
    comp.size.width = 30;

    if (comp.size.height < 40) { comp.size.height = 40; }

    const switchGroup = this.config.componentSVG.append('g')
      .attr('id', 'switch_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    this.drawBlock(switchGroup, 'block-' + comp.id, comp.id, this.feelixioFile.config.scale.scaleX(comp.coords.x) - 15,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height, '#1c1c1c', '#fff');

    this.drawSelectBlock(switchGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(switchGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);

    if (comp.component.selectedInput !== null) {
      const lineOutput = switchGroup.append('line')
        .attr('x1', this.feelixioFile.config.scale.scaleX(comp.coords.x) - 6)
        .attr('y1', this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2) +
          ((comp.component.selectedInput) * 20) + 10)
        .attr('x2', this.feelixioFile.config.scale.scaleX(comp.coords.x) + 6)
        .attr('y2', this.feelixioFile.config.scale.scaleY(comp.coords.y))
        .attr('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#2c2c2c' : '#ccc')
        .attr('stroke-width', 2);
    }

    const input = switchGroup.selectAll('circle.input')
      .data(comp.parameters.input)
      .enter()
      .append('circle')
      .attr('id', (d, i) => 'input-' + comp.id + '-' + i)
      .attr('cx', this.feelixioFile.config.scale.scaleX(comp.coords.x) - 6)
      .attr('cy', (d, i) => this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2) + (i * 20) + 10)
      .attr('r', 3)
      .attr('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#1c1c1c' : '#ccc')
      .attr('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#eee' : '#1c1c1c')
      .attr('stroke-width', 1)
      .on('mouseenter', (d: any, i: number) => {
        this.config.componentSVG.select('#input-' + comp.id + '-' + i).attr('stroke', '#f2662d');
      })
      .on('mouseleave', (d: any, i: number) => {
        this.config.componentSVG.select('#input-' + comp.id + '-' + i)
          .attr('stroke', this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#eee' : '#1c1c1c');
      })
      .on('click', (d: any, i: number) => {
        d3.event.preventDefault();
        d3.event.stopPropagation();
        this.feelixioFile.components.filter(c => c.id === comp.id)[0].component.selectedInput = i;
        this.saveFileData(this.feelixioFile);
      });

    const output = switchGroup.selectAll('circle.ouput')
      .data(comp.parameters.output)
      .enter()
      .append('circle')
      .attr('id', (d, i) => 'ouput-' + comp.id + '-' + i)
      .attr('id', (d, i) =>  'ouput-' + comp.id + '-' + i)
      .attr('cx', this.feelixioFile.config.scale.scaleX(comp.coords.x) + 6)
      .attr('cy', (d, i) => this.feelixioFile.config.scale.scaleY(comp.coords.y))
      .attr('r', 3)
      .attr('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#1c1c1c' : '#eee')
      .attr('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#eee' : '#1c1c1c')
      .attr('stroke-width', 1);


  }

  drawValue(comp: ComponentObject) {
    this.config.componentSVG.select('#value_' + comp.id).remove();

    const valueGroup = this.config.componentSVG.append('g')
      .attr('id', 'value_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    comp.size.height = 30;
    const outputParVal = comp.parameters.output[0].defaultVal;

    let value = '';
    if (comp.type === 'boolean') {
      value = outputParVal.category.val;
      comp.size.width = ((value.length * 8) + 20);
    } else {
      value = outputParVal.decimals === 0 ? Math.round(outputParVal.type.val).toString() + ' ' + outputParVal.units.symbol :
        (Math.round(outputParVal.type.val * (Math.pow(10, outputParVal.decimals))) / (Math.pow(10, outputParVal.decimals))).toString()
          + ' ' + outputParVal.units.symbol;

      comp.size.width =
        ((Math.round(outputParVal.type.val).toString().length + outputParVal.decimals) * 8) + 40;
    }

    this.drawBlock(valueGroup, 'block-' + comp.id, comp.id, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height, '#1c1c1c', '#fff');
    this.drawText(valueGroup, 'text-' + comp.id, comp.id, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) + 4, value, 11,
      true, '#ccc', '#2c2c2c');

    this.drawSelectBlock(valueGroup, comp,  this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(valueGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);
  }


  drawPosition(comp: ComponentObject) {
    this.config.componentSVG.select('#angle_' + comp.id).remove();

    const outputParVal = comp.parameters.output[0].defaultVal;
    const multiply = outputParVal.units.name === 'points per revolution' ? (360 / 4096) : 1;
    const multiplyInv = outputParVal.units.name === 'points per revolution' ? (4096 / 360) : 1;
    const valueBlockWidth = ((Math.round(outputParVal.type.val).toString().length + outputParVal.decimals) * 7) + 35;

    comp.size.height = 60;
    comp.size.width = 60 + valueBlockWidth;

    const angleGroup = this.config.componentSVG.append('g')
      .attr('id', 'angle_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    const changeAngle = d3
    .drag()
    .on('drag', () => {
      const cursorAngle =
        this.returnAngle(((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) - d3.event.x),
          this.feelixioFile.config.scale.scaleY(comp.coords.y) -  d3.event.y);

      this.config.componentSVG.select('#angleCircle-' + comp.id)
        .attr('cx', (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
          (Math.sin((Math.PI / 180) * cursorAngle) * 20))
        .attr('cy', (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) * cursorAngle) * 20));

      this.config.componentSVG.select('#line-' + comp.id)
        .attr('x2', (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
          (Math.sin((Math.PI / 180) * cursorAngle) * 20))
        .attr('y2', (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) * cursorAngle) * 20));

      this.config.componentSVG.select('#text-1-' + comp.id)
        .html(Math.round(cursorAngle * multiplyInv) + ' ' + outputParVal.units.symbol);

    })
    .on('end', () => {
      const cursorAngle =
        this.returnAngle(((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) - d3.event.x),
          this.feelixioFile.config.scale.scaleY(comp.coords.y) -  d3.event.y);
      const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
      if (component) {
        component.parameters.output[0].defaultVal.type.val = Math.round(cursorAngle * multiplyInv);
        const outputLinks = this.feelixioFile.links.filter(l => l.output.component.id === comp.id);
        if (outputLinks.length > 0) { this.updateParameters(outputLinks); }
        this.saveFileData(this.feelixioFile);
      }
    });

    this.drawBlock(angleGroup, 'block-0-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.height, comp.size.height, '#2c2c2c', '#bbb');

    this.drawBlock(angleGroup, 'block-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) + (comp.size.width / 2) - valueBlockWidth,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), valueBlockWidth, comp.size.height, '#1c1c1c', '#fff');

    this.drawText(angleGroup, 'text-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) + (comp.size.width / 2) - (valueBlockWidth / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) + 4, Math.round(outputParVal.type.val) + ' ' + outputParVal.units.symbol,
      11, true, '#ccc', '#2c2c2c');

    this.drawSelectBlock(angleGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(angleGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);

    const circle = angleGroup.append('circle')
      .attr('class', 'obj-' + comp.id)
      .attr('r', 20)
      .attr('cx', this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30)
      .attr('cy', this.feelixioFile.config.scale.scaleY(comp.coords.y))
      .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#2c2c2c' : '#ccc')
      .style('stroke-width', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? 2.5 : 2)
      .style('fill', 'transparent');

    const line = angleGroup.append('line')
      .attr('class', 'obj-' + comp.id)
      .attr('id', 'line-' + comp.id)
      .attr('x1', this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30)
      .attr('y1', this.feelixioFile.config.scale.scaleY(comp.coords.y))
      .attr('x2', (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
        (Math.sin((Math.PI / 180) * (outputParVal.type.val * multiply)) * 20))
      .attr('y2', (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) *
        (outputParVal.type.val * multiply)) * 20))
      .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#2c2c2c' : '#ccc')
      .style('stroke-linecap', 'round')
      .style('stroke-width', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? 2.5 : 2);

    const positionCircle =  angleGroup.append('circle')
      .attr('class', 'obj-' + comp.id)
      .attr('id', 'angleCircle-' + comp.id)
      .attr('r', 3)
      .attr('cx', (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
        (Math.sin((Math.PI / 180) * (outputParVal.type.val * multiply)) * 20))
      .attr('cy', (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) *
        (outputParVal.type.val * multiply)) * 20))
      .style('fill', '#f2662d')
      .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#ccc' : '#1c1c1c')
      .style('stroke-width', 0.75)
      .style('opacity', 1.0)
      .call(changeAngle);
  }


  drawTimer(comp: ComponentObject) {
    this.config.componentSVG.select('#timer_' + comp.id).remove();

    if (comp.size.height === null || comp.size.width === null) {
      comp.size.height = 25;
      comp.size.width = 135;
    }
    const timerGroup = this.config.componentSVG.append('g')
      .attr('id', 'timer_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    this.drawBlock(timerGroup, 'block-0-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 40,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2),
      comp.size.width - 60, comp.size.height, '#2c2c2c', '#ccc');

    this.drawBlock(timerGroup, 'block-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2),
      20, comp.size.height, '#1c1c1c', '#fff');

    this.drawBlock(timerGroup, 'block-R-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 20,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2),
      20, comp.size.height, '#1c1c1c', '#fff');

    this.drawText(timerGroup, 'text-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) + 3.5, 'R',
      10, false, '#ccc', '#2c2c2c');

    this.drawBlock(timerGroup, 'block-2-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) + (comp.size.width / 2) - 20,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2),
      20, comp.size.height, '#1c1c1c', '#fff');

    const textType = timerGroup.append('text')
      .attr('class', 'obj-' + comp.id)
      .attr('id', comp.id)
      .html(() => {
        const minutes = Math.floor(comp.parameters.input[2].defaultVal.type.val / 60000);
        const minutesStr = minutes < 10 ? '0' + minutes.toString() : minutes.toString();
        const seconds = Math.floor((comp.parameters.input[2].defaultVal.type.val - (60000 * minutes)) / 1000);
        const secondsStr = seconds < 10 ? '0' + seconds.toString() : seconds.toString();
        const ms = comp.parameters.input[2].defaultVal.type.val - (60000 * minutes) - (1000 * seconds);
        let msStr = ms.toString();
        if (ms < 10) { msStr = '00' + msStr; } else if (ms < 100) { msStr = '0' + msStr; }
        return minutesStr + ':' + secondsStr + ':' + msStr;
      })
      .attr('x', this.feelixioFile.config.scale.scaleX(comp.coords.x) + 10)
      .attr('y', this.feelixioFile.config.scale.scaleY(comp.coords.y) + 5.5)
      .attr('text-anchor', 'middle')
      .style('fill', this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#1c1c1c' : '#ccc')
      .style('font-weight', 'bold')
      .style('font-family', 'Open Sans, Arial, sans-serif')
      .style('font-size', '13px');

    this.drawSelectBlock(timerGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(timerGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);
  }


  drawRepeat(comp: ComponentObject) {
    this.config.componentSVG.select('#repeat_' + comp.id).remove();
    const evenSpacingParameter = comp.parameters.input.filter(p => p.name === 'Even spacing')[0];
    const evenSpacing = evenSpacingParameter && evenSpacingParameter.defaultVal.category.val === 'true' ? true : false;
    const categoryValueTimes = comp.parameters.input.filter(p => p.name === 'Times')[0].defaultVal.category.val;
    const times: number = categoryValueTimes === 'infinite' ? -1 : +categoryValueTimes;
    const inputParList = comp.parameters.input.filter(p => p.name === '');

    comp.size.height = 20;
    comp.size.width = evenSpacing || times === -1 ? 25 : (times * 20) + 10;

    const repeatGroup = this.config.componentSVG.append('g')
      .attr('id', 'repeat_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    this.drawBlock(repeatGroup, 'block-0-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2),
      comp.size.width, comp.size.height, '#1c1c1c', '#fff');

    if (!evenSpacing) {
      this.drawBlock(repeatGroup, 'line-' + comp.id, comp.id,
        this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 7,
        this.feelixioFile.config.scale.scaleY(comp.coords.y) - 1,
        comp.size.width - 14, 1.5, '#bbb', '#2c2c2c');

      let i = 0;
      for (const par of inputParList) {
        this.drawBlock(repeatGroup, 'block-' + par.id, comp.id,
          ((comp.size.width - 10) / times) * (i + 0.5) +
          this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 4,
          this.feelixioFile.config.scale.scaleY(comp.coords.y) - 4, 2, 8, '#f2662d', '#f2662d');
        i++;
      }
    }

    this.drawSelectBlock(repeatGroup, comp,  this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(repeatGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);
  }


  returnAngle(dX: number, dY: number) {
    const distance = Math.sqrt((Math.pow(dX, 2) + Math.pow(dY, 2)));
    if (dX < 0 && dY <= 0) {
      return (Math.atan(dY / dX) * (180 / Math.PI)) + 90;
    } else if (dX >= 0 && dY < 0) {
      return 90 - (Math.acos(dX / distance) * (180 / Math.PI)) + 180;
    } else if (dX < 0 && dY > 0) {
      return (Math.asin(dX / distance)  * (180 / Math.PI)) * -1;
    } else {
      return (Math.asin(dY / distance) * (180 / Math.PI)) + 270;
    }
  }


  drawAngle(comp: ComponentObject) {
    this.config.componentSVG.select('#range_' + comp.id).remove();

    const outputParVal = comp.parameters.output[0].defaultVal;
    const multiply = outputParVal.units.name === 'points per revolution' ? (360 / 4096) : 1;
    const multiplyInv = outputParVal.units.name === 'points per revolution' ? (4096 / 360) : 1;

    const valueBlockWidth = ((Math.round(outputParVal.type.val).toString().length + outputParVal.decimals) * 7) + 35;

    comp.size.height = 60;
    comp.size.width = 60 + valueBlockWidth;


    const rangeGroup = this.config.componentSVG.append('g')
      .attr('id', 'range_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    this.drawBlock(rangeGroup, 'block-0-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2),
      comp.size.height, comp.size.height, '#2c2c2c', '#bbb');

    this.drawBlock(rangeGroup, 'block-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + comp.size.height,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), valueBlockWidth, comp.size.height, '#1c1c1c', '#fff');

    this.drawText(rangeGroup, 'text-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) + (comp.size.width / 2) - (valueBlockWidth / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) + 4,
      Math.round(Math.abs(outputParVal.type.val)) + ' ' + outputParVal.units.symbol, 11, true, '#ccc', '#2c2c2c');

    this.drawSelectBlock(rangeGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(rangeGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);

    const rangeCP = [ 0, outputParVal.type.val * multiply];
    if (rangeCP[1] > 360) {
      rangeCP[1] = 360;
    }

    const plane = rangeGroup.append('path')
      .attr('class', 'obj-' + comp.id)
      .attr('id', 'planeCircle-' + comp.id)
      .attr('d', Math.abs(outputParVal.type.val * multiply) < 180 ?
        'M ' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) + ' ' +
        (this.feelixioFile.config.scale.scaleY(comp.coords.y)) + ' L ' +
        ((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
        (Math.sin((Math.PI / 180) * (rangeCP[1])) * 20)) + ' ' +
        (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (Math.cos((Math.PI / 180) * rangeCP[1]) * 20)) + ' A 20 20 0 0 0 ' +
        ((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
        (Math.sin((Math.PI / 180) * (rangeCP[0])) * 20)) + ' ' +
        (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (Math.cos((Math.PI / 180) * rangeCP[0]) * 20)) + ' Z' :
        'M ' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) + ' ' +
        (this.feelixioFile.config.scale.scaleY(comp.coords.y)) + ' L ' +
        ((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
        (Math.sin((Math.PI / 180) * rangeCP[1]) * 20)) + ' ' +
        (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (Math.cos((Math.PI / 180) * rangeCP[1]) * 20)) + ' A 20 20 0 1 0 ' +
        ((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
        (Math.sin((Math.PI / 180) * rangeCP[0]) * 20)) + ' ' +
        (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (Math.cos((Math.PI / 180) * rangeCP[0]) * 20)) + ' Z')
      .style('fill', '#666');

    const circle = rangeGroup.append('circle')
      .attr('class', 'obj-' + comp.id)
      .attr('r', 20)
      .attr('cx', this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30)
      .attr('cy', this.feelixioFile.config.scale.scaleY(comp.coords.y))
      .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#2c2c2c' : '#ccc')
      .style('stroke-width', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? 2.5 : 2)
      .style('fill', 'transparent');

    for (let i = 0; i < 2; i++) {

      const changeAngle = d3
        .drag()
        .on('drag', () => {
          if (i > 0) {
            const cursorAngle = this.returnAngle(((this.feelixioFile.config.scale.scaleX(comp.coords.x) - 20) - d3.event.x),
                this.feelixioFile.config.scale.scaleY(comp.coords.y) -  d3.event.y);

            if (i === 1) { outputParVal.type.val = Math.round(cursorAngle * multiplyInv); }

            this.config.componentSVG.select('#angleCircle-' + comp.id + '-' + i)
              .attr('cx', (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
                (Math.sin((Math.PI / 180) * cursorAngle) * 20))
              .attr('cy', (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) * cursorAngle) * 20));

            this.config.componentSVG.select('#line-' + comp.id + '-' + i)
              .attr('x2', (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
                (Math.sin((Math.PI / 180) * cursorAngle) * 20))
              .attr('y2', (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) * cursorAngle) * 20));

            this.config.componentSVG.select('#text-1-' + comp.id + '-' + i)
              .html(Math.round(cursorAngle) + ' ' + outputParVal.units.symbol);

            this.config.componentSVG.select('#text-' + comp.id)
              .html(Math.round(Math.abs(outputParVal.type.val)) + ' ' + outputParVal.units.symbol);


            const range = [ 0, outputParVal.type.val * multiply];
            if (range[1] > 360) {
              range[1] = 360;
            }

            this.config.componentSVG.select('#planeCircle-' + comp.id).attr('d', () =>
              Math.abs(outputParVal.type.val * multiply) < 180 ?
              'M ' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) + ' ' +
              (this.feelixioFile.config.scale.scaleY(comp.coords.y)) + ' L ' +
              ((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
              (Math.sin((Math.PI / 180) * (range[1])) * 20)) + ' ' +
              (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (Math.cos((Math.PI / 180) * range[1]) * 20)) + ' A 20 20 0 0 0 ' +
              ((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
              (Math.sin((Math.PI / 180) * (range[0])) * 20)) + ' ' +
              (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (Math.cos((Math.PI / 180) * range[0]) * 20)) + ' Z' :
              'M ' + (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) + ' ' +
              (this.feelixioFile.config.scale.scaleY(comp.coords.y)) + ' L ' +
              ((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
              (Math.sin((Math.PI / 180) * range[1]) * 20)) + ' ' +
              (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (Math.cos((Math.PI / 180) * range[1]) * 20)) + ' A 20 20 0 1 0 ' +
              ((this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
              (Math.sin((Math.PI / 180) * range[0]) * 20)) + ' ' +
              (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (Math.cos((Math.PI / 180) * range[0]) * 20)) + ' Z');
          }
        })
        .on('end', () => {
          if (i > 0) {
            comp.parameters.output[0].defaultVal.type.val = outputParVal.type.val;
            const outputLinks = this.feelixioFile.links.filter(l => l.output.component.id === comp.id);
            if (outputLinks.length > 0) { this.updateParameters(outputLinks); }
            this.saveFileData(this.feelixioFile);
          }
        });

      const line = rangeGroup.append('line')
        .attr('class', 'obj-' + comp.id)
        .attr('id', 'line-' + comp.id + '-' + i)
        .attr('x1', this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30)
        .attr('y1', this.feelixioFile.config.scale.scaleY(comp.coords.y))
        .attr('x2', () => i === 0 ?
          (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
            (Math.sin((Math.PI / 180) * 0) * 20) :
          (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
            (Math.sin((Math.PI / 180) * outputParVal.type.val * multiply) * 20))
        .attr('y2', () => i === 0 ?
          (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) * 0) * 20) :
          (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) * outputParVal.type.val * multiply) * 20))
        .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#2c2c2c' : '#ccc')
        .style('stroke-width', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? 2.5 : 2)
        .style('stroke-linecap', 'round');

      const positionCircle = rangeGroup.append('circle')
        .attr('class', 'obj-' + comp.id)
        .attr('id', 'angleCircle-' + comp.id + '-' + i)
        .attr('r', 3)
        .attr('cx', () => i === 0 ?
          (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
            (Math.sin((Math.PI / 180) * 0) * 20) :
          (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 30) +
            (Math.sin((Math.PI / 180) * outputParVal.type.val * multiply) * 20))
        .attr('cy', () => i === 0 ?
          (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) * 0) * 20) :
          (this.feelixioFile.config.scale.scaleY(comp.coords.y)) - (Math.cos((Math.PI / 180) * outputParVal.type.val * multiply) * 20))
        .style('fill', '#f2662d')
        .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#bbb' : '#1c1c1c')
        .style('stroke-width', 0.75)
        .style('opacity', 1.0)
        .call(changeAngle);
    }
  }

  drawLinear(comp: ComponentObject) {

    this.config.componentSVG.select('#linear' + comp.id).remove();

    comp.size.height = 80;
    comp.size.width = 100;

    const linearGroup = this.config.componentSVG.append('g')
      .attr('id', 'linear' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    this.drawBlock(linearGroup, 'block-0-' + comp.id, comp.id, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height, '#1c1c1c', '#fff');

    this.drawSelectBlock(linearGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    for (let i = 0; i < 3; i++) {
      this.drawBlock(linearGroup, 'horizontal-' + i, comp.id,
        this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 10,
        this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2) + 10 + (i * 30),
        comp.size.width - 20, 0.5, '#999', '#999');

      this.drawBlock(linearGroup, 'vertical-' + i, comp.id,
        this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 10 + (i * 40),
        this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2) + 10,
        0.5, comp.size.height - 20, '#999', '#999');
    }

    const values = [0.6 * comp.parameters.output[0].defaultVal.type.start, 0.6 * comp.parameters.output[0].defaultVal.type.end];

    const line = linearGroup.append('line')
        .attr('class', 'obj-' + comp.id)
        .attr('id', 'line-' + comp.id)
        .attr('x1', this.feelixioFile.config.scale.scaleX(comp.coords.x) - 40)
        .attr('y1', this.feelixioFile.config.scale.scaleY(comp.coords.y) + (comp.size.height / 2) - values[0] - 10)
        .attr('x2', this.feelixioFile.config.scale.scaleX(comp.coords.x) + 40)
        .attr('y2', this.feelixioFile.config.scale.scaleY(comp.coords.y) + (comp.size.height / 2) - values[1] - 10)
        .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#2c2c2c' : '#fff')
        .style('stroke-width', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? 2.5 : 2)
        .style('stroke-linecap', 'round');

    for (let p = 0; p < 2; p++) {

      const changePosition = d3
        .drag()
        .on('drag', () => {
          let pos = (comp.size.height - 20) -
            (d3.event.y - (this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2) + 10));

          if (pos < 0) { pos = 0; } else if (pos > comp.size.height - 20) { pos = comp.size.height - 20; }

          if (p === 0) { comp.parameters.output[0].defaultVal.type.start = Math.round(pos / 0.6);
          } else { comp.parameters.output[0].defaultVal.type.end = Math.round(pos / 0.6); }

          comp.parameters.output[0].defaultVal.type.val =
           Math.round(((comp.parameters.output[0].defaultVal.type.end - comp.parameters.output[0].defaultVal.type.start) /
           (comp.parameters.output[0].defaultVal.type.end2 - comp.parameters.output[0].defaultVal.type.start2)) * 1000000) / 1000000;

          this.config.componentSVG.select('#speedCircle-' + comp.id + '-' + p)
            .attr('cy', this.feelixioFile.config.scale.scaleY(comp.coords.y) + (comp.size.height / 2) - pos - 10);

          if (p === 0) {
            this.config.componentSVG.select('#line-' + comp.id)
              .attr('y1', this.feelixioFile.config.scale.scaleY(comp.coords.y) + (comp.size.height / 2) - pos - 10);
          } else {
            this.config.componentSVG.select('#line-' + comp.id)
              .attr('y2', this.feelixioFile.config.scale.scaleY(comp.coords.y) + (comp.size.height / 2) - pos - 10);
          }
        })
        .on('end', () => {
            const outputLinks = this.feelixioFile.links.filter(l => l.output.component.id === comp.id);
            if (outputLinks.length > 0) { this.updateParameters(outputLinks); }
            this.saveFileData(this.feelixioFile);
        });

      const speedCircle = linearGroup.append('circle')
        .attr('class', 'obj-' + comp.id)
        .attr('id', 'speedCircle-' + comp.id + '-' + p)
        .attr('r', 3.5)
        .attr('cx', () => p === 0 ? this.feelixioFile.config.scale.scaleX(comp.coords.x) - 40 :
          this.feelixioFile.config.scale.scaleX(comp.coords.x) + 40)
        .attr('cy', () => p === 0 ? this.feelixioFile.config.scale.scaleY(comp.coords.y) + (comp.size.height / 2) - values[0] - 10 :
          this.feelixioFile.config.scale.scaleY(comp.coords.y) + (comp.size.height / 2)  - values[1] - 10)
        .style('fill', '#f2662d')
        .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#bbb' : '#1c1c1c')
        .style('stroke-width', .75)
        .style('opacity', 1.0)
        .call(changePosition);
    }

    this.drawConnectionPoints(linearGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);
  }


  drawSlider(comp: ComponentObject) {

    this.config.componentSVG.select('#slider_' + comp.id).remove();

    const outputParVal = comp.parameters.output[0].defaultVal;

    const value = outputParVal.decimals === 0 ? Math.round(outputParVal.type.val).toString() + ' ' + outputParVal.units.symbol :
    (Math.round(outputParVal.type.val * (Math.pow(10, outputParVal.decimals))) / (Math.pow(10, outputParVal.decimals))).toString()
      + ' ' + outputParVal.units.symbol;

    const valueBlockWidth = ((Math.round(outputParVal.type.val).toString().length + outputParVal.decimals) * 7) + 50;

    comp.size.height = 30;
    comp.size.width = 150 + valueBlockWidth;

    const sliderGroup = this.config.componentSVG.append('g')
      .attr('id', 'slider_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id)
      .attr('transform', 'translate(-300, -45)');

    this.drawBlock(sliderGroup, 'block-0-' + comp.id, comp.id, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), 150, comp.size.height, '#2c2c2c', '#bbb');
    this.drawBlock(sliderGroup, 'block-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) + (150 - (comp.size.width / 2)),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), valueBlockWidth, comp.size.height, '#1c1c1c', '#fff');
    this.drawText(sliderGroup, 'text-1-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) + (comp.size.width / 2) - (valueBlockWidth / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) + 5, value, 11,
      true, '#ccc', '#2c2c2c');

    this.drawBlock(sliderGroup, 'slider-' + comp.id, comp.id,
      this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 10,
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - 2, 130, 4, '#ccc', '#666');

    this.drawSelectBlock(sliderGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2),
      this.feelixioFile.config.scale.scaleY(comp.coords.y) - (comp.size.height / 2), comp.size.width, comp.size.height);

    this.drawConnectionPoints(sliderGroup, comp, this.feelixioFile.config.scale.scaleX(comp.coords.x),
      this.feelixioFile.config.scale.scaleY(comp.coords.y), comp.size.width, comp.size.height);

    const handlePos = (((outputParVal.type.val - outputParVal.type.start) /
      (outputParVal.type.end - outputParVal.type.start)) * 114) +
      (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 18);

    const dragHandle = d3
      .drag()
      .on('start', () => { this.updateActiveComponent(comp); })
      .on('drag', () => {
        const diff = d3.event.x - (this.feelixioFile.config.scale.scaleX(comp.coords.x) - (comp.size.width / 2) + 10);
        const newValue = ((diff - 8) / 114) * (outputParVal.type.end - outputParVal.type.start) + outputParVal.type.start;
        if (newValue >= outputParVal.type.start && newValue <= outputParVal.type.end) {
          outputParVal.type.val = Math.round(newValue * (Math.pow(10, outputParVal.decimals))) /
            (Math.pow(10, outputParVal.decimals));

          this.config.componentSVG.select('#text-1-' + comp.id)
            .html(outputParVal.type.val + ' ' + outputParVal.units.symbol);

          this.config.componentSVG.select('#handle-' + comp.id).attr('d', () =>
            'M ' + (d3.event.x) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) + 3) +
            ' L ' + (d3.event.x + 5) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 2) +
            ' L ' + (d3.event.x + 5) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 8) +
            ' L ' + (d3.event.x - 5) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 8) +
            ' L ' + (d3.event.x - 5) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 2) + ' Z');

        }
      })
      .on('end', () => {
        const outputLinks = this.feelixioFile.links.filter(l => l.output.component.id === comp.id);
        if (outputLinks.length > 0) { this.updateParameters(outputLinks); }
        this.saveFileData(this.feelixioFile);
      });

    const handle = sliderGroup.append('path')
      .attr('class', 'obj-' + comp.id)
      .attr('id', 'handle-' + comp.id)
      .attr('d', () => 'M ' + handlePos + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) + 3) +
        ' L ' + (handlePos + 5) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 2) +
        ' L ' + (handlePos + 5) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 8) +
        ' L ' + (handlePos - 5) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 8) +
        ' L ' + (handlePos - 5) + ' ' + (this.feelixioFile.config.scale.scaleY(comp.coords.y) - 2) + ' Z')
      .style('fill', '#f2662d')
      .style('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#fff' : '#1c1c1c')
      .style('stroke-width', 0.5)
      .call(dragHandle);
  }


  drawBlock(group: any, id: string, cl: string, x: number, y: number, w: number, h: number, color: string, selColor: string) {

    const componentObjectBlock = group.append('rect')
      .attr('class', 'obj-' + cl)
      .attr('id', id)
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h)
      .style('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === cl ? selColor : color);
  }

  drawSelectBlock(group: any, comp: any, x: number, y: number, w: number, h: number) {
    let draggrabPos = null;

    const drag = d3.drag()
      .on('start', () => {
        this.updateActiveComponent(comp);
        draggrabPos = { x: this.feelixioFile.config.scale.scaleX.invert(d3.event.x),
                        y: this.feelixioFile.config.scale.scaleY.invert(d3.event.y) };
        this.drawFileData();
      })
      .on('drag', () => {
        if (!this.feelixioFile.config.running) {
          const newPos = { x: this.feelixioFile.config.scale.scaleX.invert(d3.event.x),
                          y: this.feelixioFile.config.scale.scaleY.invert(d3.event.y) };

          const diff = { x: newPos.x - draggrabPos.x,
                        y: newPos.y - draggrabPos.y};

          comp.coords.x += diff.x;
          comp.coords.y += diff.y;

          draggrabPos = newPos;

          this.drawFileData();
        }
      })
      .on('end', () => {
        draggrabPos = null;
      });


    const componentObjectBlock = group.append('rect')
      .attr('class', 'obj-' + comp.id)
      .attr('id', 'selblock-' + comp.id)
      .attr('x', x)
      .attr('y', y)
      .attr('width', w)
      .attr('height', h)
      .style('fill', 'transparent')
      .style('stroke', () => comp.valid ? 'transparent' : '#ff0036')
      .style('stroke-width', 1)
      .call(drag);
  }


  drawText(group: any, id: string, cl: string, x: number, y: number, value: string, size = 12, bold = true,
           color = '#ccc', selColor = '#2c2c2c') {

    const textType = group.append('text')
      .attr('class', 'obj-' + cl)
      .attr('id', id)
      .html(value)
      .attr('x', x)
      .attr('y', y)
      .attr('text-anchor', 'middle')
      .style('fill', this.config.activeComponent !== null && this.config.activeComponent.id === cl ? selColor : color)
      .style('font-weight', () => bold ? 'bold' : 'normal')
      .style('font-family', 'Open Sans, Arial, sans-serif')
      .style('font-size', size + 'px');
  }


  drawMotors() {
    for (const motor of this.feelixioFile.hardware) {
      this.drawMotor(motor);
    }
  }


  drawMotor(d: any) {
    this.config.componentSVG.select('#motor_' + d.id).remove();

    const motorGroup = this.config.componentSVG.append('g')
      .attr('id', 'motor_' + d.id)
      .attr('class', 'svgEl obj-' + d.id)
      .attr('transform', 'translate(-300, -45)');

    this.drawBlock(motorGroup, 'motor-' + d.id, d.id, this.feelixioFile.config.scale.scaleX(d.coords.x) - (d.size.width / 2),
      this.feelixioFile.config.scale.scaleY(d.coords.y) - (d.size.height / 2), d.size.width, d.size.height, '#1c1c1c', '#fff');

    this.drawBlock(motorGroup, 'motor-' + d.id, d.id, this.feelixioFile.config.scale.scaleX(d.coords.x) - (d.size.width / 2),
      this.feelixioFile.config.scale.scaleY(d.coords.y) - (d.size.height / 2) + 15, d.size.width, d.size.height - 30, '#2c2c2c', '#ccc');

    const motorObject = motorGroup.append('circle')
      .attr('class', 'obj-' + d.id)
      .attr('id', 'motorObjCircle-' + d.id)
      .attr('cx', this.feelixioFile.config.scale.scaleX(d.coords.x) + 5)
      .attr('cy', this.feelixioFile.config.scale.scaleY(d.coords.y))
      .attr('r', 27)
      .style('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === d.id ? '#2c2c2c' : '#929497');

    const textCOM = motorGroup.append('text')
      .attr('class', 'obj-' + d.id)
      .attr('id', 'motorObjText-' + d.id)
      .text('M')
      .attr('x', this.feelixioFile.config.scale.scaleX(d.coords.x) + 5)
      .attr('y', this.feelixioFile.config.scale.scaleY(d.coords.y))
      .attr('text-anchor', 'middle')
      .style('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === d.id ? '#ccc' : '#1c1c1c')
      .style('font-weight', 'bold')
      .style('font-family', 'Open Sans, Arial, sans-serif')
      .style('font-size', '24px');

    const textType = motorGroup.append('text')
      .attr('class', 'obj-' + d.id)
      .attr('id', 'motorObjText2-' + d.id)
      .text(d.microcontroller.serialPort.path)
      .attr('x', this.feelixioFile.config.scale.scaleX(d.coords.x) + 5)
      .attr('y', this.feelixioFile.config.scale.scaleY(d.coords.y) + 13)
      .attr('text-anchor', 'middle')
      .style('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === d.id ? '#ccc' : '#1c1c1c')
      // .style('font-weight', 'bold')
      .style('font-family', 'Open Sans, Arial, sans-serif')
      .style('font-size', '10px');

    this.drawSelectBlock(motorGroup, d, this.feelixioFile.config.scale.scaleX(d.coords.x) - (d.size.width / 2),
      this.feelixioFile.config.scale.scaleY(d.coords.y) - (d.size.height / 2), d.size.width, d.size.height);

    this.drawConnectionPoints(motorGroup, d,
      this.feelixioFile.config.scale.scaleX(d.coords.x), this.feelixioFile.config.scale.scaleY(d.coords.y), d.size.width, d.size.height);

    // const play = motorGroup.append('path')
    //   .attr('class', 'obj-' + d.id)
    //   .attr('id', 'motorObjPlay-' + d.id)
    //   .attr('d', 'M ' + (this.feelixioFile.config.scale.scaleX(d.coords.x) + 60) + ' '
    //     + (this.feelixioFile.config.scale.scaleY(d.coords.y) - 6) +
    //     ' L ' + (this.feelixioFile.config.scale.scaleX(d.coords.x) + 60) + ' ' + (this.feelixioFile.config.scale.scaleY(d.coords.y) + 6) +
    //     ' L ' + (this.feelixioFile.config.scale.scaleX(d.coords.x) + 70) + ' ' + (this.feelixioFile.config.scale.scaleY(d.coords.y)) + ' Z')
    //   .style('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === d.id ? '#2c2c2c' : '#999')
    //   .on('mousedown', () => { console.log('play'); });
  }


  drawEffect(component: any) {
    if (component.feelixio === 'effect') {
      this.drawLibraryEffect(component);
    } else if (component.feelixio === 'component') {
      this.drawComponent(component);
    } else if (component.feelixio === 'motor') {
      this.drawMotor(component);
    }
  }


  drawConnectionPoints(group: any, comp: any, x: number, y: number, w: number, h: number) {
    this.config.connectionSVG.select('#connections_' + comp.id).remove();

    const parameters = comp.parameters.input.filter(p => !p.hidden).concat(comp.parameters.output.filter(p => !p.hidden));

    const connections = group.append('g')
      .attr('id', 'connections_' + comp.id)
      .attr('class', 'svgEl obj-' + comp.id);

    this.config.linesSVG = this.config.connectionSVG.append('g')
        .attr('id', 'connections_' + comp.id)
        .attr('class', 'svgEl obj-' + comp.id)
        .attr('transform', 'translate(-300, -45)');

    const inputs = connections.selectAll('rect.connection')
      .data(parameters)
      .enter()
      .append('rect')
      .attr('class', (d) => d.type)
      .attr('id', (d) => 'rect-' + d.id)
      .attr('x', (d) => {
        const list = parameters.filter(p => p.displayPosition === d.displayPosition);
        const index = list.indexOf(d);
        if (d.displayPosition === 'left') { return x - (w / 2); }
        if (d.displayPosition === 'right') { return x + (w / 2) - 2; }
        if (d.displayPosition === 'top' || d.displayPosition === 'bottom') {
          if (d.displayPosition === 'top' && comp.type === 'timer') {
            return x - (comp.size.width / 2) + ((index + 1) * 20) + 5;
          } else if (d.displayPosition === 'top' && comp.feelixio === 'motor') {
            return x + (comp.size.width / 2) - ((index + 1) * 20) + 5;
          }
          return x - (list.length * 10) + (index * 20) + 5; }
      })
      .attr('y', (d, i) => {
        const list = parameters.filter(p => p.displayPosition === d.displayPosition);
        const index = list.indexOf(d);
        if (d.displayPosition === 'top') { return y - (h / 2); }
        if (d.displayPosition === 'bottom') { return y + (h / 2) - 2; }
        if (d.displayPosition === 'left' || d.displayPosition === 'right') {
          return y - (list.length * 10) + (index * 20) + 5;
        }
      })
      .attr('width', (d) => d.displayPosition === 'top' || d.displayPosition === 'bottom' ? 10 : 2)
      .attr('height', (d) => d.displayPosition === 'top' || d.displayPosition === 'bottom' ? 2 : 10)
      .style('fill', (d) => {
        if (this.config.activeConnection !== null && this.config.activeConnection.parameter === d) {
          return '#f2662d';
        }
        return '#bbb'; });


    const inputsCircle = connections.selectAll('circle.connection')
      .data(parameters)
      .enter()
      .append('circle')
      .attr('class', (d) => 'connection-' + d.type)
      .attr('id', (d) => 'circle-' + d.id)
      .attr('cx', (d) => {
        const list = parameters.filter(p => p.displayPosition === d.displayPosition);
        const index = list.indexOf(d);
        if (d.displayPosition === 'left') { return x - (w / 2) - 10; }
        if (d.displayPosition === 'right') { return x + (w / 2) + 10; }
        if (d.displayPosition === 'top' || d.displayPosition === 'bottom') {
          if (d.displayPosition === 'top' && comp.type === 'timer') {
            return x - (comp.size.width / 2) + ((index + 1) * 20) + 10;
          } else if (d.displayPosition === 'top' && comp.feelixio === 'motor') {
            return x + (comp.size.width / 2) - ((index + 1) * 20) + 10;
          }
          return x - (list.length * 10) + (index * 20) + 10; }
      })
      .attr('cy', (d, i) => {
        const list = parameters.filter(p => p.displayPosition === d.displayPosition);
        const index = list.indexOf(d);
        if (d.displayPosition === 'top') { return y - (h / 2) - 10; }
        if (d.displayPosition === 'bottom') { return y + (h / 2) + 10; }
        if (d.displayPosition === 'left' || d.displayPosition === 'right') {
          return y - (list.length * 10) + (index * 20) + 10;
        }
      })
      .attr('r', 2.5)
      .style('fill', (d) => this.config.activeConnection !== null &&
        this.config.activeConnection.parameter.id === d.id ? '#f2662d' : 'transparent')
      .style('stroke', (d) => this.config.activeConnection !== null &&
        this.config.activeConnection.parameter.id === d.id ? '#f2662d' : '#999')
      .style('stroke-width', 2);

    const inputsCircleClick = this.config.linesSVG.selectAll('circle.connection')
      .data(parameters)
      .enter()
      .append('circle')
      .attr('class', (d) => 'connectionEl-' + d.type)
      .attr('id', (d) => 'circleEl-' + d.id)
      .attr('cx', (d) => {
        const list = parameters.filter(p => p.displayPosition === d.displayPosition);
        const index = list.indexOf(d);
        if (d.displayPosition === 'left') { return x - (w / 2) - 10; }
        if (d.displayPosition === 'right') { return x + (w / 2) + 10; }
        if (d.displayPosition === 'top' || d.displayPosition === 'bottom') {
          if (d.displayPosition === 'top' && comp.type === 'timer') {
            return x - (comp.size.width / 2) + ((index + 1) * 20) + 10;
          } else if (d.displayPosition === 'top' && comp.feelixio === 'motor') {
            return x + (comp.size.width / 2) - ((index + 1) * 20) + 10;
          }
          return x - (list.length * 10) + (index * 20) + 10; }
      })
      .attr('cy', (d) => {
        const list = parameters.filter(p => p.displayPosition === d.displayPosition);
        const index = list.indexOf(d);
        if (d.displayPosition === 'top') { return y - (h / 2) - 10; }
        if (d.displayPosition === 'bottom') { return y + (h / 2) + 10; }
        if (d.displayPosition === 'left' || d.displayPosition === 'right') {
          return y - (list.length * 10) + (index * 20) + 10;
        }
      })
      .attr('r', 8)
      .style('fill', 'transparent')
      .on('mouseenter', (d) => {
        d3.select('#circle-' + d.id).style('stroke', '#f2662d');
        d3.select('#rect-' + d.id).style('fill', '#f2662d'); })
      .on('mouseleave', (d) => {
        if (this.config.activeConnection === null || this.config.activeConnection.component.id !== comp.id) {
          d3.select('#circle-' + d.id).style('stroke', '#999');
          d3.select('#rect-' + d.id).style('fill', '#999'); }
        })
      .on('mousedown', (d: any) => {
        if (this.config.activeConnection === null || this.config.activeConnection.parameter.type === d.type) {
          if (this.config.activeConnection !== null && this.config.activeConnection.parameter.type === d.type) {
            this.showMessage('Cannot connect ' + this.config.activeConnection.parameter.type + ' to ' + d.type + '.', 'message');
          }
          this.config.activeConnection = new Link(d, comp);
        } else if (this.config.activeConnection.parameter.type !== d.type && this.config.activeConnection.component.id !== comp.id) {
          this.setRenderedFalse();
          const newConnectionPoint = new Link(d, comp);
          const newLinkID = uuid();
          const newLink = d.type === 'output' ?
            new ComponentLink(newLinkID, this.config.activeConnection, newConnectionPoint) :
            new ComponentLink(newLinkID, newConnectionPoint, this.config.activeConnection);

          if (newLink.input.component.feelixio === 'effect' && newLink.output.component.type === 'linear') {
            const linearComponent = this.feelixioFile.components.filter(c => c.id === newLink.output.component.id)[0];
            if (newLink.input.component.effect.slug === 1) {
              linearComponent.parameters.input.filter(p => p.name === 'Position')[0].hidden = false;
              linearComponent.parameters.input.filter(p => p.name === 'Speed')[0].hidden = true;
            } else if (newLink.input.component.effect.slug === 3) {
              linearComponent.parameters.input.filter(p => p.name === 'Position')[0].hidden = true;
              linearComponent.parameters.input.filter(p => p.name === 'Speed')[0].hidden = false;
            } else {
              linearComponent.parameters.input.filter(p => p.name === 'Position')[0].hidden = false;
              linearComponent.parameters.input.filter(p => p.name === 'Speed')[0].hidden = false;
            }
          }
          if (newLink.output.component.feelixio === 'component' && (newLink.output.component.type === 'switch' ||
              newLink.output.component.type === 'arithmetic' || newLink.output.component.type === 'constrain' ||
              newLink.output.component.type === 'map')) {
            const operatorComponent = this.feelixioFile.components.filter(c => c.id === newLink.output.component.id)[0];
            if (operatorComponent) {
              operatorComponent.parameters.output[0].defaultVal.unitOptions = newLink.input.parameter.unitOptions;
            }
          }
          this.feelixioFile.links.push(newLink);
          this.config.activeConnection = null;
          this.saveFileData(this.feelixioFile);
        }
        this.config.activeLink = null;
        this.config.activeComponent = null;
        this.drawFileData();
      });

    const textInput = connections.selectAll('text.connection')
      .data(parameters)
      .enter()
      .append('text')
      .attr('class', (d: { type: any; }) => d.type)
      .attr('id', (d: { id: any; }) => d.id)
      .attr('x', (d: { displayPosition: string }) => {
        const list = parameters.filter(p => p.displayPosition === d.displayPosition);
        const index = list.indexOf(d);
        if (d.displayPosition === 'left') { return x - (w / 2) + 8; }
        if (d.displayPosition === 'right') { return x + (w / 2) - 8; }
        if (d.displayPosition === 'top' || d.displayPosition === 'bottom') {
          if (d.displayPosition === 'top' && comp.type === 'timer') {
            return x - (comp.size.width / 2) + ((index + 1) * 20) + 10;
          } else if (d.displayPosition === 'top' && comp.feelixio === 'motor') {
            return x + (comp.size.width / 2) - ((index + 1) * 20) + 10;
          }
          return x - (list.length * 10) + (index * 20) + 10; }
      })
      .attr('y', (d: { displayPosition: string; }) => {
        const list = parameters.filter(p => p.displayPosition === d.displayPosition);
        const index = list.indexOf(d);
        if (d.displayPosition === 'top') { return y - (h / 2) + 11; }
        if (d.displayPosition === 'bottom') { return y + (h / 2) - 6; }
        if (d.displayPosition === 'left' || d.displayPosition === 'right') {
          return y - (list.length * 10) + (index * 20) + 13.5;
        }
      })
      .text((d: { name: string; slug: any; type: string; displayPosition: string; }) => {
          if ((comp.feelixio === 'component' && d.name !== 'play') || (comp.feelixio === 'motor' && d.type !== 'input')) { return d.slug; }
          if (d.name === 'play') { return ''; } else {
          return comp.combinedVariables !== undefined && comp.combinedVariables &&
          ((d.type === 'output' && comp.feelixio === 'effect') || (d.type === 'input' && comp.feelixio === 'motor')) ? d.type : d.name;
        }
      })
      .attr('text-anchor', (d: { displayPosition: string; }) => {
        if (d.displayPosition === 'left') { return 'start'; }
        if (d.displayPosition === 'right') { return 'end'; }
        if (d.displayPosition === 'top' || d.displayPosition === 'bottom') { return 'middle'; }
      })
      .style('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#2c2c2c' : '#aaa')
      .style('font-family', 'Open Sans, Arial, sans-serif')
      .style('font-weight', (d) => (d.displayPosition === 'right' && comp.feelixio === 'motor') ? 'bold' : 'normal')
      .style('font-size', (d) => d.displayPosition === 'right' && comp.feelixio === 'motor' ? '9px' : '10px');

    /* if (comp.feelixio === 'effect' || comp.feelixio === 'motor') {

      const buttonBg = this.config.linesSVG.append('rect')
        .attr('x', () => comp.feelixio === 'effect' ? x + (w / 2) - 58 :  x - (w / 2) + 41)
        .attr('y', y - 12)
        .attr('rx', 6)
        .attr('ry', 6)
        .attr('height', 24)
        .attr('width', 16)
        .attr('id', 'btn-' + comp.id)
        .attr('fill', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#eee' : 'rgba(0,0,0,0.3)')
        .attr('stroke', () => this.config.activeComponent !== null && this.config.activeComponent.id === comp.id ? '#999' : '#1c1c1c')
        .style('stroke-width', 0.5)
        .on('mousedown', () => {
          const componentEl = comp.feelixio === 'effect' ? this.feelixioFile.effects.filter(e => e.id === comp.id)[0] :
            this.feelixioFile.hardware.filter(e => e.id === comp.id)[0];
          if (componentEl) {
            componentEl.combinedVariables = !componentEl.combinedVariables;
            const directionParameter = comp.feelixio === 'effect' ? componentEl.parameters.output.filter(o => o.name === 'offset')[0] :
              componentEl.parameters.input.filter(o => o.name === 'offset')[0];
            if (directionParameter && componentEl.combinedVariables) { directionParameter.hidden = true; }
            if (directionParameter && !componentEl.combinedVariables) { directionParameter.hidden = false; }

            this.drawFileData();
          }
        });

      const linkIcon = this.config.linesSVG.selectAll('image.linkIcon-' + comp.id).data([0]);
      linkIcon.enter()
        .append('svg:image')
        .attr('class', 'linkIcon-' + comp.id)
        .attr('xlink:href', () => comp.combinedVariables ?
          '../../src/assets/icons/align/link-vertical.svg' : '../../src/assets/icons/align/unlink-vertical.svg')
        .attr('x', () => comp.feelixio === 'effect' ? x + (w / 2) - 57 : x - (w / 2) + 42)
        .attr('y', y - 8.25)
        .attr('width', 14)
        .attr('height', 17.5)
        .attr('pointer-events', 'none');
    } */
  }


  drawLinks() {
    for (const link of this.feelixioFile.links) {
      this.drawLink(link);
    }
  }

  drawLink(link: any) {
    const path = this.returnPathAsString(link.input, link.output);
    if (path && path !== 'M' && path !== '') {
      link.valid = this.validationService.checkLinkValidity(link);
      const connectionPathBg = this.config.linesSVG.append('path')
        .attr('d', path)
        .attr('id', 'linkBg-' + link.id)
        .style('stroke', '#4a4a4a')
        .style('stroke-width', 3.5)
        .style('fill', 'transparent')
        .style('stroke-linecap', 'round');

      const connectionPath = this.config.linesSVG.append('path')
        .attr('d', path)
        .attr('id', 'link-' + link.id)
        .style('stroke', () => {
          if (link.inUse) { return '#52b8d8'; }
          return this.config.activeLink !== null && this.config.activeLink.id === link.id ? '#f2662d' : '#eee';
        })
        .style('stroke-width', 2.2)
        .style('stroke-dasharray', () => link.valid ? 'none' : ('4, 8'))
        .style('fill', 'transparent')
        .style('stroke-linecap', 'round')
        .attr('pointer-events', 'none');

      const connectionPathPointerEvents = this.config.linesSVG.append('path')
        .attr('d', path)
        .attr('id', 'linkPointerEvents-' + link.id)
        .style('stroke', 'transparent')
        .style('stroke-width', 5)
        .style('fill', 'transparent')
        .style('stroke-linecap', 'round')
        .on('mouseenter', () => d3.select('#link-' + link.id).style('stroke', '#f2662d'))
        .on('mouseleave', () => {
          const color = this.config.activeLink !== null && this.config.activeLink.id === link.id ? '#f2662d' : '#eee';
          d3.select('#link-' + link.id).style('stroke', color);
        })
        .on('mousedown', () => {
          this.config.activeComponent = null;
          this.config.activeConnection = null;
          this.config.activeLink = link;
          this.drawFileData();
        });
    } else {
      this.deleteLink(link);
    }
  }

  getCPBasedOnPosition(parameter: any, coords: any) {
    if (parameter.par.displayPosition === 'left') {
      return { x: coords.x - 40, y: coords.y };
    } else if (parameter.par.displayPosition === 'right') {
      return { x: coords.x + 40, y: coords.y };
    } else if (parameter.par.displayPosition === 'top') {
      return { x: coords.x, y: coords.y - 40 };
    } else if (parameter.par.displayPosition === 'bottom') {
      return { x: coords.x, y: coords.y + 40 };
    }
  }

  returnPathAsString(input: any, output: any) {
    let path = 'M';
    const coordsList = [];
    let inputIndex: number;
    let outputIndex: number;

    if (input && output) {
      const components = [
        this.getComponent(input.component.id, input.component.feelixio),
        this.getComponent(output.component.id, output.component.feelixio) ];

      const parInputComponent = components[0].parameters.input.filter(p => !p.hidden)
          .concat(components[0].parameters.output.filter(p => !p.hidden));

      const parOutputComponent = components[1].parameters.input.filter(p => !p.hidden)
        .concat(components[1].parameters.output.filter(p => !p.hidden));

      const inputParameter = parInputComponent.filter(p => p.id === input.parameter.id)[0];
      if (inputParameter) {
        inputIndex = parInputComponent.filter(p => p.displayPosition === inputParameter.displayPosition).indexOf(inputParameter);
      }
      const outputParameter = parOutputComponent.filter(p => p.id === output.parameter.id)[0];
      if (outputParameter) {
        outputIndex = parOutputComponent.filter(p => p.displayPosition === outputParameter.displayPosition).indexOf(outputParameter);
      }
      const parameterList = [{ par: inputParameter, comp: components[0], parList: parInputComponent, index: inputIndex },
                             { par: outputParameter, comp: components[1], parList: parOutputComponent, index: outputIndex  }];

      const coordsParameters = [
        this.getCoordinatesConnectionPoints(parameterList[0]),
        this.getCoordinatesConnectionPoints(parameterList[1])];

      if (coordsParameters[0] && coordsParameters[1]) {
        if (components[0] && components[1] && inputParameter && outputParameter) {
          coordsList.push(coordsParameters[0]);
          coordsList.push(this.getCPBasedOnPosition(parameterList[0], coordsParameters[0]));

          coordsList.push(this.getCPBasedOnPosition(parameterList[1], coordsParameters[1]));
          coordsList.push(coordsParameters[1]);
        }
      }
    }

    let i = 0;
    for (const coords of coordsList) {
      if (i % 3 === 1) {
        path += 'C';
      }
      path += coords.x + ', ' + coords.y + ' ';
      i++;
    }
    return path;
  }


  getCoordinatesConnectionPoints(el: any) {

    const coords = { x: null, y: null };

    if (el && el.par) {
      if (el.par.displayPosition === 'top' || el.par.displayPosition === 'bottom') {

        coords.y = el.par.displayPosition === 'top' ?
          this.feelixioFile.config.scale.scaleY(el.comp.coords.y) - (el.comp.size.height / 2) - 10 :
          this.feelixioFile.config.scale.scaleY(el.comp.coords.y) + (el.comp.size.height / 2) + 10;

        if (el.par.displayPosition === 'top' && el.comp.type === 'timer') {
          coords.x = this.feelixioFile.config.scale.scaleX(el.comp.coords.x) -
            (el.comp.size.width / 2) + ((el.index + 1) * 20) + 10;
        } else if (el.par.displayPosition === 'top' && el.comp.feelixio === 'motor') {
          coords.x = this.feelixioFile.config.scale.scaleX(el.comp.coords.x) +
            (el.comp.size.width / 2) - ((el.index + 1) * 20) + 10;
        } else {
          coords.x = this.feelixioFile.config.scale.scaleX(el.comp.coords.x) -
            (el.parList.filter(p => p.displayPosition === el.par.displayPosition).length * 10) + (el.index * 20) + 10;
        }

      } else if (el.par.displayPosition === 'left' || el.par.displayPosition === 'right') {

        coords.x =  el.par.displayPosition === 'right' ?
          this.feelixioFile.config.scale.scaleX(el.comp.coords.x) + (el.comp.size.width / 2) + 10 :
          this.feelixioFile.config.scale.scaleX(el.comp.coords.x) - (el.comp.size.width / 2) - 10;

        coords.y = this.feelixioFile.config.scale.scaleY(el.comp.coords.y) -
          (el.parList.filter(p => p.displayPosition === el.par.displayPosition).length * 10) + (el.index * 20) + 10;
      }
      return coords;
    }
    return;
  }




  deleteActiveComponent() {
    if (this.config.activeComponent !== null) {
      this.setRenderedFalse();
      const componentLinks = this.feelixioFile.links.
        filter(l => l.input.component.id === this.config.activeComponent.id || l.output.component.id === this.config.activeComponent.id);

      for (const link of componentLinks) {
        const index = this.feelixioFile.links.indexOf(link);
        if (index > -1) {  this.feelixioFile.links.splice(index, 1); }
      }
      if (this.config.activeComponent.feelixio === 'effect') {
        const index = this.feelixioFile.effects.indexOf(this.config.activeComponent);
        if (index > -1) {  this.feelixioFile.effects.splice(index, 1); }

      } else if (this.config.activeComponent.feelixio === 'motor') {
        const index = this.feelixioFile.hardware.indexOf(this.config.activeComponent);
        if (index > -1) { this.feelixioFile.hardware.splice(index, 1); }

      } else if (this.config.activeComponent.feelixio === 'component') {
        const index = this.feelixioFile.components.indexOf(this.config.activeComponent);
        if (index > -1) { this.feelixioFile.components.splice(index, 1); }
      }
      this.deleteRelatedLinks(this.config.activeComponent);
    }
    if (this.config.activeLink !== null) {
      this.deleteLink(this.config.activeLink);
    }
    if (this.config.activeLink !== null || this.config.activeComponent !== null) {
      this.saveFileData(this.feelixioFile);
      this.config.activeLink = null;
      this.config.activeComponent = null;
    }
  }

  setRenderedFalse() {
    if (this.feelixioFile.config.rendered) {
      this.feelixioFile.config.rendered = false;
      this.feelixioFile.config.loaded = false;
      this.feelixioFile.config.running = false;
    }
  }

  getComponent(id: string, type: string) {
    let component: any;
    if (type === 'motor') {
      component = this.feelixioFile.hardware.filter(m => m.id === id)[0];
    } else if (type === 'effect') {
      component = this.feelixioFile.effects.filter(m => m.id === id)[0];
    } else if (type === 'component') {
      component = this.feelixioFile.components.filter(m => m.id === id)[0];
    }
    return component;
  }


  deleteLink(link: ComponentLink) {
    if (!this.feelixioFile.config.running) {
      if (link.output.component.feelixio === 'component' && link.output.component.type === 'switch') {
        const switchOutputs = this.feelixioFile.links.filter(l => l.output.component.id === link.output.component.id && l.id !== link.id);
        if (switchOutputs.length > 0) {
          const switchComponent = this.feelixioFile.components.filter(c => c.id === link.output.component.id)[0];
          if (switchComponent && switchOutputs[0].input.component.feelixio === 'effect') {
            switchComponent.component.unitOptions = switchOutputs[0].input.parameter.unitOptions;

          } else if (switchComponent && switchOutputs[0].input.component.feelixio === 'component') {
            switchComponent.component.unitOptions = [ switchOutputs[0].input.component.units ];
          }
        }
      }
      const linkIndex = this.feelixioFile.links.indexOf(link);
      if (linkIndex > -1) {
        this.feelixioFile.links.splice(linkIndex, 1);
      }
    }
  }

  deleteRelatedLinks(component: any) {
    for (const link of this.feelixioFile.links) {
      if (link.input.component.id === component.id || link.output.component.id === component.id) {
        this.deleteLink(link);
      }
    }
  }

  setRunningBackground(running: boolean) {
    this.feelixioDrawService.setRunningBackground(running);
  }
}
