import { Injectable } from '@angular/core';
import { Motor } from '../models/hardware.model';
import { Path } from '../models/node.model';
import { BezierService } from './bezier.service';
import { NodeService } from './node.service';
import { EffectObject } from '../models/feelixio-file.model';
import { EffectUploadModel, Linear } from '../models/effect-upload.model';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {


  constructor(private bezierService: BezierService, private nodeService: NodeService) {}


  getMultiplyFactor(effectUnits: any, motor: Motor, PR = null) {
    let conversion = 1;
    let multiply = 1;
    const unitsPR = PR === null ? effectUnits.PR : PR;
    if (motor.rotation.linear && (effectUnits.name === 'mm' || effectUnits.name === 'cm')) {
      const radialValue = motor.rotation.translation.radial.unit.name === 'degrees' ?
        motor.rotation.translation.radial.value * (motor.encoder.PR / 360) : motor.rotation.translation.radial.value;
      const radialFactor = radialValue / motor.encoder.PR;
      let linearValue = motor.rotation.translation.linear.value;
      if (effectUnits.name === 'mm' && motor.rotation.translation.linear.unit.name === 'cm') {
        linearValue *= 10;
      } else if (effectUnits.name === 'cm' && motor.rotation.translation.linear.unit.name === 'mm') {
        linearValue /= 10;
      }
      linearValue *= radialFactor;
      conversion = motor.encoder.PR / linearValue;
      multiply = conversion * motor.transmission;
    } else {
      if (effectUnits.name !== 'mm' || effectUnits.name !== 'cm') {
        multiply = (motor.encoder.PR / unitsPR) * motor.transmission;
      } else {
        // console.log('effect linear, motor details not linear');
        return false;
      }
    }
    return multiply;
  }

  getInvertedMultiplyFactor(effectUnits: any, motor: Motor) {
    if (effectUnits.name === 'mm' || effectUnits.name === 'cm') {
      const radialValue = motor.rotation.translation.radial.unit.name === 'degrees' ?
        motor.rotation.translation.radial.value * (motor.encoder.PR / 360) : motor.rotation.translation.radial.value;
      const radialFactor = radialValue / motor.encoder.PR;
      let linearValue = motor.rotation.translation.linear.value;
      if (effectUnits.name === 'mm' && motor.rotation.translation.linear.unit.name === 'cm') {
        linearValue *= 10;
      } else if (effectUnits.name === 'cm' && motor.rotation.translation.linear.unit.name === 'mm') {
        linearValue /= 10;
      }
      linearValue *= radialFactor;
      return linearValue / motor.encoder.PR;
    } else if (effectUnits.name === 'degrees') {
      return 360 / 4096;
    } else {
      return 1;
    }
  }

  translateFileData(file: any, motor: Motor) {

    const multiply = this.getMultiplyFactor(file.grid.units, motor);

    if (multiply) {

      const fileData = JSON.parse(JSON.stringify(file));

      const effectModelList: Array<EffectUploadModel> = [];
      let index = 0;
      for (const effect of fileData.effects) {

        if (effect.details.linked === null) {
          const effectModel = new EffectUploadModel(uuid(), effect.id);
          effectModel.index = index;
          effectModel.name = effect.interface.name;
          effectModel.quality = effect.details.quality.division;
          effectModel.angle = Math.round(effect.details.position.end * multiply) - Math.round(effect.details.position.start * multiply);
          effectModel.slug = effect.slug;
          effectModel.mirror = effect.details.mirror !== null ? true : false;
          effectModel.enabled = true;
          effectModel.infinite = effect.details.infinite ? true : false;
          effectModel.layer = effect.interface.layer;
          effectModel.playAfterUpload = true;

          if (effectModel.slug === 1 || effectModel.slug === 3) {
            effectModel.linear = this.getLinearValues(effectModel.slug, effect.details, multiply);
          } else if (effectModel.slug < 5) {
            effectModel.scaleY = effect.details.parameter.value.val / 100;
          }

          let direction = 0;
          if (effect.details.direction === 'clockwise') {
            direction = 1;
          } else if (effect.details.direction === 'counterclockwise') { direction = -1; }
          effectModel.direction = direction;

          effectModel.position = effect.slug < 2 && effectModel.direction === -1 ?
            Math.round(effect.details.position.end * multiply) : Math.round(effect.details.position.start * multiply);

          effectModel.repeat = this.getRepeatList(effect.details.parent, file.effects, effectModel.position, multiply);

          if (effect.slug === 5) {
            const path = fileData.nodes.filter(p => p.id === effect.path)[0];
            effectModel.translatedData =
              this.translateDataPathEffects(path, multiply, effect.details.quality.division, file.type, file.stepDetails);

          }

          if (effect.slug === 5 && effectModel.translatedData.length === 0) {
            // remove effect
          } else {
            effectModel.slug === 0 ? effectModelList.unshift(effectModel) : effectModelList.push(effectModel);
          }
          index++;

        }
      }
      const dataList = this.getOverlappingEffects(effectModelList);
      return dataList;
    }
  }

  getOverlappingEffects(list: Array<EffectUploadModel>) {
    list.sort((a, b) => a.position - b.position );

    let index = 0;
    for (const item of list) {
      if (item.slug === 0) {
        item.overlapping = 0;
      } else {
        for (const itemInnerLoop of list) {
          if (itemInnerLoop.direction === item.direction || item.direction === 0) {
            if (item.position >= itemInnerLoop.position && item.position <= itemInnerLoop.position + itemInnerLoop.angle) {
              item.overlapping++;
            } else if (item.position + item.angle >= itemInnerLoop.position &&
                item.position + item.angle <= itemInnerLoop.position + itemInnerLoop.angle) {
              item.overlapping++;
            } else if (itemInnerLoop.position >= item.position && itemInnerLoop.position <= item.position + item.angle) {
              item.overlapping++;
            } else if (itemInnerLoop.position + itemInnerLoop.angle >= item.position &&
                itemInnerLoop.position + itemInnerLoop.angle <= item.position + item.angle) {
              item.overlapping++;
            }
          }
        }
      }
      index ++;
    }
    return list;
  }

  translateDataPathEffects(path: Path, multiply: number, quality: number, fileType = 'default', stepDetails = []) {
    const translatedData = [];

    if (path.nodes[0].pos.x > path.nodes[path.nodes.length - 1].pos.x) {
      path.nodes.reverse();
    }
    let i = 0;
    let index = 0;
    const nodes = path.nodes.filter(n => n.type === 'node');
    for (const node of nodes) {

      if (i < nodes.length - 1) {
        const pathSegment = this.nodeService.getNodesOfPath(node.id + '&&' + nodes[i + 1].id, path);
        const range = this.bezierService.getCurveLength(pathSegment);
        const coords = this.bezierService.getAllCoordinates(range[0], (1 / (range[0])), pathSegment, multiply, 'force');
        let coordsForce = coords;
        if (range[0] !== range[1]) {
          coordsForce = this.bezierService.getAllCoordinates(range[1], (1 / (range[1])), pathSegment, multiply, 'angle');
        }

        const start = Math.round(pathSegment[0].pos.x * multiply);
        const end = Math.round(pathSegment[pathSegment.length - 1].pos.x * multiply);
        for (let m = start; m <= end; m += quality) {
          let yValue = this.bezierService.closestY(m, coords);
          if (yValue > 255) { yValue = 255; }
          if (yValue < 0) { yValue = 0; }
          let xOffset = m;
          if (fileType === 'default') {
            if (range[0] !== range[1]) {
              xOffset = this.bezierService.closestForce(yValue, coordsForce);
            }
          } else {
            xOffset = this.getForceStepOffset({ x: m, y: yValue }, multiply, stepDetails);
          }
          const inList = translatedData.filter(d => d.x === m)[0];
          if (inList) {
            const inListIndex = translatedData.indexOf(inList);
            translatedData.splice(inListIndex, 1);
          }
          const coordinates = {
            i: index,
            x: m,
            o: Math.round(xOffset),
            d: Math.round(xOffset) - m,
            y: yValue
          };
          translatedData.push(coordinates);

          index++;
        }
      }
      i++;
    }
    return translatedData;
  }

  getForceStepOffset(coords: any, multiply: number, stepDetails: any) {

    let xOffset: number;
    for (const step of stepDetails) {
      if (coords.x >= step.x[0] * multiply && coords.x < step.x[1] * multiply) {
        // console.log(m, coordinates[m].x, step.x[0] * multiply, step.x[1] * multiply);
        if (coords.x <= step.forcePos * multiply) {
          if (step.direction[0] === '<') {
            xOffset = step.x[0] * multiply;
          } else if (step.direction[0] === '>') {
            xOffset = step.forcePos * multiply;
          }
        } else if (coords.x > step.forcePos * multiply) {
          if (step.direction[1] === '<') {
            xOffset = step.forcePos * multiply;
          } else if (step.direction[1] === '>') {
            xOffset = step.x[1] * multiply;
          }
        }
        return Math.round(xOffset);
      }
    }
  }

  translateTimeBasedData(nodes: any, multiplyX: number, multiplyY: number) {
    const nodeList = [];
    const keyframeNodes = nodes.filter(n => n.type === 'node');
    let i = 0;
    if (keyframeNodes[0].pos.x > keyframeNodes[keyframeNodes.length - 1].pos.x) {
      keyframeNodes.reverse();
    }
    for (const node of keyframeNodes) {

      let xPos = Math.round(node.pos.x);
      if (xPos <= 0) {
        xPos = 0;
      }
      const coords = { x: Math.round(xPos * multiplyX),
                       y: Math.round(node.pos.y * multiplyY),
                       cp1x: Math.round(xPos * multiplyX),
                       cp1y: Math.round(node.pos.y * multiplyY),
                       cp2x: Math.round(xPos * multiplyX),
                       cp2y: Math.round(node.pos.y * multiplyY) };

      const index = nodes.indexOf(node);

      const previousNode = keyframeNodes[i - 1];
      const nextNode = keyframeNodes[i + 1];

      if (index < nodes.length - 1) {
        const nextCP = nodes[index + 1];
        // console.log(nextCP.pos);
        if (nextCP.type === 'cp' && nextNode) {
          coords.cp2y = Math.round(nextCP.pos.y * multiplyY);
          coords.cp2x = coords.cp2x > Math.round(nextNode.pos.x * multiplyX) ? Math.round(nextNode.pos.x * multiplyX) :
            Math.round(nextCP.pos.x * multiplyX);
        }
      }
      if (index > 0 && previousNode) {
        const prevCP = nodes[index - 1];
        // console.log(prevCP.pos);
        if (prevCP.type === 'cp') {
          coords.cp1y = Math.round(prevCP.pos.y * multiplyY);
          coords.cp1x = coords.cp1x < Math.round(previousNode.pos.x * multiplyX) ? Math.round(previousNode.pos.x * multiplyX) :
            Math.round(prevCP.pos.x * multiplyX);
        }
      }
      nodeList.push(coords);
      i++;
    }
    return nodeList;
  }

  translateTimeBasedEffectData(file: any, keyframes: any, motor: Motor) {

    const effectModelList = [];
    let i = 0;
    for (const frame of keyframes) {
      const effectModel = new EffectUploadModel(uuid(), file._id);

      const multiply = this.getMultiplyFactor(file.grid.units, motor);
      // console.log(multiply);

      if (multiply) {
        effectModel.angle = Math.round(frame.rangeX.end - frame.rangeX.start);
        effectModel.slug = 4;
        effectModel.loop = false;
        effectModel.enabled = true;
        effectModel.name = file.name;
        effectModel.quality = 1;
        effectModel.translatedData = this.translateTimeBasedData(frame.path.nodes, 1, multiply);
        effectModel.startTime = effectModel.translatedData[0].x;
        effectModel.position = Math.round(frame.position.start * multiply);
        effectModel.index = 0;

        effectModelList.push(effectModel);
      }
      i++;
    }
    if (file.rotation.loop) {
      effectModelList[effectModelList.length - 1].loop = true;
    }
    // console.log(effectModelList);
    return effectModelList;
  }

  translateSingleTimeBasedEffectData(effectObj: EffectObject, motor: Motor) {
    const multiply = this.getMultiplyFactor(effectObj.effect.units, motor);
    if (multiply) {
      const effectModel = new EffectUploadModel(uuid(), effectObj.effect.id);
      effectModel.angle = this.getDurationAsValue(effectObj);
      effectModel.scaleX = this.getDurationValue(effectObj);
      effectModel.scaleY = this.getAngleValue(effectObj, motor);
      effectModel.position = this.getPositionValue(effectObj, motor);
      // effectModel.mirror = this.getBooleanValue(effectObj.parameters.input.filter(p => p.name === 'mirror')[0]);
      effectModel.enabled = this.getBooleanValue(effectObj.parameters.input.filter(p => p.name === 'enabled')[0]);
      effectModel.loop = this.getBooleanValue(effectObj.parameters.input.filter(p => p.name === 'loop')[0]);
      if (effectObj.effect.type === 'ease') {
        effectModel.translatedData = this.translateTimeBasedData(effectObj.effect.nodes[0].nodes, effectObj.effect.details.duration, 4096);
      } else {
        effectModel.translatedData = this.translateTimeBasedData(effectObj.effect.nodes[0].nodes, 1, multiply);
      }
      const startX = effectModel.translatedData[0].x;
      effectModel.startTime = this.getStartTime(effectObj, startX);
      for (const item of effectModel.translatedData) {
        item.x -= startX;
        item.cp1x -= startX;
        item.cp1x -= startX;
      }
      effectModel.slug = 4;
      effectModel.name = effectObj.effect.interface.name;
      effectModel.quality = 1;

      return effectModel;
    }
    return null;
  }

  translateSinglePositionBasedEffectData(effectObj: EffectObject, motor: Motor) {

    const effectModel = new EffectUploadModel(uuid(), effectObj.effect.id);
    effectModel.angle = this.getAngleAsWidth(effectObj, motor);
    effectModel.scaleX = effectObj.effect.slug === 5 ? this.getAngleValue(effectObj, motor) : 1;
    effectModel.scaleY = this.getIntensityValue(effectObj);
    if (effectModel.scaleY === -1) {
      effectModel.scaleY = 1;
      const linearValue = this.getLinearValue(effectObj, motor);
      if (linearValue) { effectModel.linear = linearValue; }
    }
    effectModel.position = this.getPositionValue(effectObj, motor);
    effectModel.enabled = this.getBooleanValue(effectObj.parameters.input.filter(p => p.name === 'enabled')[0]);
    if (effectObj.effect.slug > 1) {
      effectModel.infinite = this.getBooleanValue(effectObj.parameters.input.filter(p => p.name === 'infinite')[0]);
    } else {
      effectModel.infinite = false;
    }
    effectModel.direction = this.getDirectionValue(effectObj);
    effectModel.repeat = this.getRepeatValue(effectObj, motor);
    effectModel.slug = effectObj.effect.slug;
    effectModel.name = effectObj.effect.interface.name;
    effectModel.quality = effectObj.effect.slug === 5 ? effectObj.effect.details.quality.division : 1;

    if (effectModel.repeat.length === 0) {
      effectModel.repeat.push(effectModel.position);
    }

    if (effectObj.effect.slug === 5) {
      const multiply = this.getMultiplyFactor(effectObj.effect.units, motor);
      if (multiply) {
        effectModel.translatedData =
          this.translateDataPathEffects(effectObj.effect.path, multiply, effectObj.effect.details.quality.division, 'default', []);
      }
    }
    return effectModel;
  }

  getStartTime(effectObj: EffectObject, defaultStartTime = 0) {
    const startTime = effectObj.parameters.input.filter(p => p.name === 'start')[0];
    const value = !startTime.hidden && startTime.value ? startTime.value : startTime.defaultVal;
    const unitValue = value.units.name === 'cm' ? Math.round(value.type.val * 10) : Math.round(value.type.val);
    return unitValue;
  }

  getDirectionValue(effectObj: EffectObject) {
    const direction = effectObj.parameters.input.filter(p => p.name === 'direction')[0];
    let directionValue = 0;
    if (direction) {
      const value = !direction.hidden && direction.value ? direction.value.category.val : direction.defaultVal.category.val;
      if (value === 'clockwise') { directionValue = 1; } else if (value === 'counterclockwise') { directionValue = -1; }
    }
    return directionValue;
  }

  getRepeatValue(effectObj: EffectObject, motor: any) {
    const repeat = effectObj.parameters.input.filter(p => p.name === 'repeat')[0];
    const repeatList = [];
    if (repeat && repeat.value && repeat.value.length > 0) {
      for (const r of repeat.value) {
        if (r.units) {
          const value = r.units.name === 'degrees' ? r.val * (motor.encoder.PR / 360) : r.val;
          repeatList.push(Math.round(value));
        }
      }
      repeatList.sort((a, b) => a - b);
    }
    return repeatList;
  }


  getRepeatList(parentlist: any, effectList: any, startPosition: number, multiply: number) {
    const repeatList = [];
    repeatList.push(startPosition);

    for (const el of parentlist) {
      const effectFromList = effectList.filter(e => e.id === el)[0];
      if (effectFromList) {
        repeatList.push(Math.round(effectFromList.details.position.start * multiply));
      }
    }
    repeatList.sort((a, b) => a - b);
    return repeatList;
  }

  getAngleAsWidth(effectObj: EffectObject, motor: any) {

    if (effectObj.effect.slug !== 0 && effectObj.effect.slug !== 4) {
      const angle = effectObj.parameters.input.filter(p => p.name === 'angle')[0];
      const value = !angle.hidden ? angle.value : angle.defaultVal;
      const multiply = this.getMultiplyFactor(value.units, motor, value.units.name === 'degrees' ? 360 : motor.encoder.PR);
      if (multiply) {
        return Math.round(value.type.val * multiply);
      }
      return Math.round(value.type.val);
      // if (angle.defaultVal.units !== 'mm' && angle.defaultVal.units !== 'cm') {
      //   return value.units.symbol === 'ppr' ? Math.round(value.type.val) : Math.round(value.type.val * (motor.encoder.PR / 360));
      // } else {
      //   return Math.round(value.type.val * multiply);
      // }
    } else {
      return 30;
    }
  }

  getAngleValue(effectObj: EffectObject, motor: any) {
    const angle = effectObj.parameters.input.filter(p => p.name === 'angle')[0];
    if (angle && !angle.hidden) {
      if (angle.defaultVal.units !== 'mm' && angle.defaultVal.units !== 'cm') {
        const unitValue = angle.value.units.symbol === 'ppr' ?
          Math.round(angle.value.type.val) : Math.round(angle.value.type.val * (motor.encoder.PR / 360));
        const unitDefaultValue = angle.defaultVal.units.symbol === 'ppr' ?
          Math.round(angle.defaultVal.type.val) : Math.round(angle.defaultVal.type.val * (motor.encoder.PR / 360));
        return unitValue / unitDefaultValue;
      } else {
        // console.log(angle);
        return 1;
      }
    } else {
      return 1;
    }
  }

  getLinearValue(effectObj: EffectObject, motor: any) {
    const intensity = effectObj.parameters.input.filter(p => p.name === 'intensity (l)')[0];
    // console.log(effectObj.parameters.input, intensity);
    if (intensity) {
      const linear = new Linear();
      linear.Ymin = Math.round(intensity.value.type.start * 2.55);
      linear.Ymax = Math.round(intensity.value.type.end * 2.55);
      if (effectObj.effect.slug <= 1) {
        const angle = effectObj.parameters.input.filter(p => p.name === 'angle')[0];
        const angleVal = !angle.hidden && angle.value ? angle.value : angle.defaultVal;
        const angleUnitVal = angleVal.units.symbol === 'ppr' ? Math.round(angleVal.type.val) :
          Math.round(angleVal.type.val * (motor.encoder.PR / 360));

        const position = effectObj.parameters.input.filter(p => p.name === 'position')[0];
        const positionVal = !position.hidden && position.value ? position.value : position.defaultVal;
        const positionUnitVal = positionVal.units.symbol === 'ppr' ? Math.round(positionVal.type.val) :
          Math.round(positionVal.type.val * (motor.encoder.PR / 360));
        linear.Xmin = positionUnitVal;
        linear.Xmax = positionUnitVal + angleUnitVal;
      } else {
        linear.Xmin = Math.round(intensity.value.type.start2);
        linear.Xmax = Math.round(intensity.value.type.end2);
      }

      linear.dYdX = (linear.Ymax - linear.Ymin) / (linear.Xmax - linear.Xmin);
      return linear;
    } else {
      return null;
    }
  }


  getLinearValues(slug: number, details: any, multiply: number) {
    const linear = new Linear();
    linear.Ymin = Math.round(details.parameter.value.start2 * 2.55);
    linear.Ymax = Math.round(details.parameter.value.end2 * 2.55);

    if (slug <= 1) {
      linear.Xmin = Math.round(details.position.start * multiply);
      linear.Xmax = Math.round(details.position.end * multiply);
    } else {
      linear.Xmin = Math.round(details.parameter.value.start);
      linear.Xmax = Math.round(details.parameter.value.end);
    }
    linear.dYdX = (linear.Ymax - linear.Ymin) / (linear.Xmax - linear.Xmin);
    return linear;
  }


  getIntensityValue(effectObj: EffectObject) {
    const intensity = effectObj.parameters.input.filter(p => p.name === 'intensity' || p.name === 'intensity (l)')[0];
    if (intensity.value && intensity.value.type.val2 !== undefined) {
      return -1; // linear value
    }
    return !intensity.hidden ? intensity.value.type.val / 100 : 1;

  }

  getPositionValue(effectObj: EffectObject, motor: any) {
    let posVal = 0;
    const position = effectObj.parameters.input.filter(p => p.name === 'position')[0];
    const pos = !position.hidden && position.value ? position.value : position.defaultVal;

    if (pos.units.name !== 'mm' && pos.units.name !== 'cm') {
      posVal = pos.units.symbol === 'ppr' ? Math.round(pos.type.val) : Math.round(pos.type.val * (motor.encoder.PR / 360));
      const align = effectObj.parameters.input.filter(p => p.name === 'align')[0];
      const angle = effectObj.parameters.input.filter(p => p.name === 'angle')[0];
      if (angle && align) {
        const angleVal = !angle.hidden && angle.value ? angle.value : angle.defaultVal;
        const angleUnitValue = angleVal.units.symbol === 'ppr' ? Math.round(angleVal.type.val) :
          Math.round(angleVal.type.val * (motor.encoder.PR / 360));
        const alignVal = !align.hidden && align.value ? align.value.category.val : align.defaultVal.category.val;
        if (alignVal !== 'left') {
          posVal = alignVal === 'center' ? posVal - (angleUnitValue / 2) : posVal - angleUnitValue;
        }
      }
    } else {
      const multiply = this.getMultiplyFactor(pos.units, motor);
      if (multiply) {
        return Math.round(pos.type.val * multiply);
      }
    }
    return posVal;
  }

  getDurationAsValue(effectObj: EffectObject) {
    const duration = effectObj.parameters.input.filter(p => p.name === 'duration')[0];
    const velocity = effectObj.parameters.input.filter(p => p.name === 'velocity')[0];

    const durationVal = !duration.hidden ? duration.value : duration.defaultVal;
    const durationUnitValue = durationVal.units.symbol !== 's' ? durationVal.type.val : durationVal.type.val * 1000;
    let scaleX = durationUnitValue / duration.defaultVal.type.val;

    const velocityVal = !velocity.hidden && velocity.value ? velocity.value : velocity.defaultVal;
    if (!velocity.hidden) {
      scaleX = velocityVal.type.val;
    }
    return durationUnitValue;
  }


  getDurationValue(effectObj: EffectObject) {
    const duration = effectObj.parameters.input.filter(p => p.name === 'duration')[0];
    const velocity = effectObj.parameters.input.filter(p => p.name === 'velocity')[0];

    const durationVal = !duration.hidden ? duration.value : duration.defaultVal;
    const durationUnitValue = durationVal.units.symbol !== 's' ? durationVal.type.val : durationVal.type.val * 1000;
    let scaleX = durationUnitValue / duration.defaultVal.type.val;

    const velocityVal = !velocity.hidden && velocity.value ? velocity.value : velocity.defaultVal;
    if (!velocity.hidden) {
      scaleX = velocityVal.type.val;
    }
    return scaleX;
  }

  getBooleanValue(parameter: any) {
    const value = !parameter.hidden && parameter.value ? parameter.value : parameter.defaultVal;
    return value.category.val === 'true' ? true : false;
  }



  translatePositionEffectForExport(effectObj: any, motor: any) {
    let data = '';
    let translatedData: any;
    const multiply = this.getMultiplyFactor(effectObj.effect.units, motor);
    if (multiply) {
      translatedData =
        this.translateDataPathEffects(effectObj.path, multiply, 8, 'default', []);
      const angle = translatedData[translatedData.length - 1].x - translatedData[0].x;
      let forceArray = '{ ';
      let offsetArray = '{ ';
      let i = 0;
      for (const item of translatedData) {
        if (i < translatedData.length - 1) {
          forceArray += item.y + ', ';
          offsetArray += item.d + ', ';
        } else {
          forceArray += item.y + ' }';
          offsetArray += item.d + ' } ';
        }
        i++;
      }

      data = '/* initialize */ \nEffect ' + effectObj.effect.interface.name.replace('-', '_') + ';\nint force_' +
          effectObj.effect.interface.name.replace('-', '_') + '[] = ' + forceArray + ';\nint offset_' +
          effectObj.effect.interface.name.replace('-', '_') + '[] = ' + offsetArray + ';\n\r/* call in setup */\n' +
          effectObj.effect.interface.name.replace('-', '_') + '.initPositionEffect(force_' +
          effectObj.effect.interface.name.replace('-', '_') + ',  offset_' +
          effectObj.effect.interface.name.replace('-', '_') + ', ' + angle + ', ' + (translatedData.length) + ');\n\r';
      return data;
    }

  }

  translateTimeEffectForExport(effectObj: any, motor: any) {
    let data = '';
    let translatedData: any;
    if (effectObj.effect.units === undefined || effectObj.effect.units.PR === undefined) {
      effectObj.effect.units = { name: 'degrees', PR: 360 };
    }
    const multiply = this.getMultiplyFactor(effectObj.effect.units, motor);
    if (multiply) {
      translatedData = this.translateTimeBasedData(effectObj.effect.nodes[0].nodes, 1, multiply);

      let positionArray = '{ ';
      let i = 0;
      for (const item of translatedData) {
        positionArray += '{ ' + (item.x - translatedData[0].x) + ', ' + (item.y - translatedData[0].y) + ', ' +
          (item.cp1x - translatedData[0].x) + ', ' + (item.cp1y - translatedData[0].y) + ', ' + (item.cp2x - translatedData[0].x) + ', ' +
          (item.cp2y - translatedData[0].y) + '}';

        if (i < translatedData.length - 1) {
          positionArray += ', ';
        } else {
          positionArray += ' }';
        }

        i++;
      }

      data = '/* initialize */ \nEffect ' + effectObj.effect.interface.name.replace('-', '_') + '; \n' + 'int data_' +
             effectObj.effect.interface.name.replace('-', '_') + '[][6] = ' + positionArray +
             ';\n\r\/* call in setup */ \n' + effectObj.effect.interface.name.replace('-', '_') + '.initTimeEffect(' +
             'data_' + effectObj.effect.interface.name.replace('-', '_') + ', ' + (translatedData.length) + ');\n\r';

      return data;
    }
  }
}

