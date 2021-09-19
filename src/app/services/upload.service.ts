import { Injectable } from '@angular/core';
import { MicroController, Motor } from '../models/hardware.model';
import { Path } from '../models/node.model';
import { BezierService } from './bezier.service';
import { NodeService } from './node.service';
import { Linear, UploadModel } from '../models/effect-upload.model';
import { Collection } from '../models/collection.model';
import { Details, Effect } from '../models/effect.model';
import { CloneService } from './clone.service';
import { v4 as uuid } from 'uuid';

@Injectable()
export class UploadService {


  constructor(private bezierService: BezierService, private nodeService: NodeService, private cloneService: CloneService) {}


  renderCollection(collection: Collection, effectList: Array<Effect>) {
    const effectlistCollection = this.removeDuplicateEffects(collection.effects);
    collection.effectDataList = [];
    collection.overlappingData = [];
    collection.renderedData = [];

    let n = 0;

    const updatedEffectList = this.createNewEffectListWithRepeatedEffects(collection.effects);

    for (const collEffect of updatedEffectList) {
      this.calculateOverlappingPaths(collection, updatedEffectList, collEffect, effectList);

      const effectData = effectList.filter(e => e.id === collEffect.effectID)[0];

      if (collection.effectDataList.filter(c => c.effectID === collEffect.effectID).length === 0) {
        collection.effectDataList.push(this.translateEffectData(collEffect, effectData));
      }
      if (n >= updatedEffectList.length - 1) {
        this.convertDataList(collection, effectList);
      }
      n++;
    }
  }

  createNewEffectListWithRepeatedEffects(collEffects: Array<Details>) {
    const effectListCopy = [];

    for (const collEffect of collEffects) {
      const collEffect_clone = this.cloneService.deepClone(collEffect);
      effectListCopy.push(collEffect_clone);
      for (const repeated_collEffect of collEffect.repeat.repeatInstances) {
        const collEffect_clone_repeated = this.cloneService.deepClone(collEffect);
        collEffect_clone_repeated.position.x = repeated_collEffect.x;
        effectListCopy.push(collEffect_clone_repeated);
      }
    }

    return effectListCopy;

  }

  convertDataList(collection: Collection, effectList: Array<Effect>) {
    let dataArray = [];
    for (const d of collection.overlappingData) {
      const newDataArray = [];

      if (d.effect1 && d.effect2) {
        const effectData1 = effectList.filter(e => e.id === d.effect1.effectID)[0];
        const effectData2 = effectList.filter(e => e.id === d.effect2.effectID)[0];
        const translatedDataEffect1 = this.cloneService.deepClone(collection.effectDataList.filter(e => e.id === effectData1.id)[0]);
        const translatedDataEffect2 = this.cloneService.deepClone(collection.effectDataList.filter(e => e.id === effectData2.id)[0]);
        const multiply = collection.rotation.units.name === 'radians' ? (Math.PI / 180) : 1;

        for (const el of translatedDataEffect1.data) {
          if (el.x >= d.overlap.x1 * effectData1.size.width - 2 && el.x <= d.overlap.x2 * effectData1.size.width + 2) {
            el.x *= (d.effect1.scale.x / 100);
            el.y *= (d.effect1.scale.y / 100);
            el.x += d.effect1.position.x;
            el.y += (d.effect1.position.y / 100);
            if (el.d) {
              el.o *= (d.effect1.scale.x / 100);
              el.o += d.effect1.position.x;
            }
            newDataArray.push(el);
          }
        }

        if (newDataArray.length > 0) {

          const obj = { position: { x1: Math.ceil(newDataArray[0].x), x2: Math.floor(newDataArray[newDataArray.length - 1].x) },
                        points: newDataArray,
                        effect1: d.effect1,
                        effect2: d.effect2,
                        inf: translatedDataEffect1.infinite && translatedDataEffect2 ? true : false,
                        type: effectData1.type,
                        id: uuid()
                      };
          dataArray.push(obj);

        }
      }
    }
    this.mergeAndSplitDataArray(collection, dataArray);

  }



  mergeAndSplitDataArray(collection: Collection, array: any) {
    // console.log(array);
    let newArray = [];

    for (const item of array) {
      const cw = item.effect1.direction.cw && item.effect2.direction.cw ? true : false;
      const ccw = item.effect1.direction.ccw && item.effect2.direction.ccw ? true : false;


      if (cw || ccw) {
        for (let i = item.position.x1; i <= item.position.x2; i++) {

          const y1 = this.bezierService.closestY(i, item.points);
          const x1 = item.points.filter(p => p.y === y1)[0].x;
          const d1 = item.type === 'position' ? item.points.filter(p => p.y === y1)[0].d * (180 / Math.PI) : null;
          const o1 = item.type === 'position' ? item.points.filter(p => p.y === y1)[0].o : null;

          const y2 = x1 > i ? this.bezierService.closestY(i - 1, item.points) : this.bezierService.closestY(i + 1, item.points);
          const x2 = item.points.filter(p => p.y === y2)[0].x;
          const d2 = item.type === 'position' ? item.points.filter(p => p.y === y2)[0].d * (180 / Math.PI) : null;
          const o2 = item.type === 'position' ? item.points.filter(p => p.y === y2)[0].o : null;


          let newY = (y2 - y1) / (x2 - x1) * (i - x1) + y1;

          let newD = null;
          let newO = null;
          if (d1 && d2 && o1 && o2) {
            newD = (d2 - d1) / (x2 - x1) * (i - x1) + d1;
            newO = (o2 - o1) / (x2 - x1) * (i - x1) + o1;
          }

          const pointAtNewArray = newArray.filter(n => n.x === i && n.id !== item.id && ((n.direction.cw === cw) || (n.direction.ccw === ccw)))[0];

          if (pointAtNewArray) {
            pointAtNewArray.y += (newY);
            if (pointAtNewArray.y > 1) { pointAtNewArray.y = 1; }
            if (pointAtNewArray.y < -1) { pointAtNewArray.y = -1; }
            if (pointAtNewArray.d && newD) { pointAtNewArray.d += (newD); }
            // if (pointAtNewArray.o && newO) { console.log(pointAtNewArray.o, newO); }
            pointAtNewArray.n++;
          } else {
            newArray.push({ x: i, y: newY, d: newD, o: newO, direction: { cw: cw, ccw: ccw }, type: item.type, inf: item.inf, n: 1, effect: item.id });
          }
        }
      }
      if (array.indexOf(item) === array.length - 1) {
        newArray.sort((a,b) => (a.x > b.x) ? 1 : ((b.x > a.x) ? -1 : 0));
        collection.renderedData = this.splitDataArray(newArray.filter(a => a.n !== 1));
      }
    }

  }



  splitDataArray(array: Array<any>) {
    if (array.length > 1) {
      let newArray = [];
      let tmpArray = [];
      let startPosition = array[0].x;
      let i = 0;
      for (const el of array) {
        if (tmpArray.length > 0 && ((el.x - array[i - 1].x > 1) || i === array.length - 1) &&
          (el.direction.cw === array[i - 1].direction.cw || el.direction.ccw === array[i - 1].direction.ccw)) {
          newArray.push({ data: tmpArray, direction: el.direction, type: el.type, inf: el.inf, position: { start: startPosition, end: array[i - 1].x } });
          tmpArray = [];
          startPosition = array[i].x;
        }
        tmpArray.push( { x: el.x - startPosition, y: el.y, d: el.d, o: el.o - startPosition });

        i++;
      }
      return newArray;
    } else {
      return array;
    }
  }



  removeDuplicateCoords(list: Array<any>) {
    let newList = [];
    for (const element of list) {
      if (newList.filter(l => l.x === element.x).length === 0) {
        newList.push(element);
      }
    }
    return newList;
  }

  removeDuplicateEffects(effectList: Array<Details>) {
    let newEffectList: Array<Details> = [];
    for (const collEffect of effectList) {
      if (newEffectList.filter(e => e.effectID === collEffect.effectID).length === 0) {
        newEffectList.push(collEffect);
      }
    }
    return newEffectList;
  }

  translateEffectData(collEffect: Details, effectData: Effect) {
    let copyEffectList = this.cloneService.deepClone(effectData);
    const multiply = effectData.grid.xUnit.name === 'radians' ? (180 / Math.PI) : 1;

    for (const path of copyEffectList.paths) {
      if (effectData.type === 'torque' || effectData.type === 'velocity') {
        // data.push(this.translateTorqueEffectData(path, multiply));
        return { id: collEffect.effectID, type: effectData.type, size: effectData.size, rotation: effectData.rotation, infinite: collEffect.infinite, data:this.translateTorqueEffectData(path, multiply) };
      }
      else if (effectData.type === 'position') {
        return { id: collEffect.effectID, type: effectData.type, size: effectData.size, rotation: effectData.rotation, infinite: collEffect.infinite, data:this.translatePositionEffectData(path, multiply) };
        // data.push(this.translatePositionEffectData(path, multiply));

      }
    }
    // return { id: collEffect.effectID, type: effectData.type, size: effectData.size, data:data };
  }

  translateTorqueEffectData(path: Path, multiply: number, quality = 1) {
    let translatedData = [];

    if (path.nodes[0].pos.x > path.nodes[path.nodes.length - 1].pos.x) {
      path.nodes.reverse();
    }

    let i = 0;
    const nodes = path.nodes.filter(n => n.type === 'node');
    const startPos = Math.ceil(nodes[0].pos.x * multiply);
    for (const node of nodes) {

      if (i < nodes.length - 1) {
        const pathSegment = this.nodeService.getNodesOfPath(node.id + '&&' + nodes[i + 1].id, path);
        const range = this.bezierService.getCurveLength(pathSegment);
        const coords = this.bezierService.getAllCoordinates(range[0] * 4, (1 / (range[0] * 4)), pathSegment, multiply, 'force');

        const start = Math.ceil(pathSegment[0].pos.x * multiply);
        const end = Math.round(pathSegment[pathSegment.length - 1].pos.x * multiply);

        for (let m = start; m <= end; m += quality) {
          let yValue = this.bezierService.closestY(m, coords);
          if (yValue > 100) { yValue = 100; }
          if (yValue < -100) { yValue = -100; }

          const inlistValue = translatedData.filter(d => d.x === m - startPos)[0] ? translatedData.filter(d => d.x === m - startPos)[0] : null;
          if (inlistValue) {
            const index = translatedData.indexOf(inlistValue);
            if (index > -1) {
              translatedData.splice(index, 1);
            }
          }

          const coordinates = {
            x: m - startPos,
            y: inlistValue ? (inlistValue.y + (yValue / 100)) / 2 : (yValue / 100)
          };

          translatedData.push(coordinates);
        }
      }
      i++;
    }

    return translatedData;
  }



  translatePositionEffectData(path: Path, multiply: number, quality = 1) {
    let translatedData = [];

    if (path.nodes[0].pos.x > path.nodes[path.nodes.length - 1].pos.x) {
      path.nodes.reverse();
    }

    let i = 0;
    const nodes = path.nodes.filter(n => n.type === 'node');
    const startPos = Math.ceil(nodes[0].pos.x * multiply);
    for (const node of nodes) {

      if (i < nodes.length - 1) {
        const pathSegment = this.nodeService.getNodesOfPath(node.id + '&&' + nodes[i + 1].id, path);
        const range = this.bezierService.getCurveLength(pathSegment);
        const coords = this.bezierService.getAllCoordinates(range[0] * 4, (1 / (range[0] * 4)), pathSegment, multiply, 'force');
        let coordsForce = coords;

        if (range[0] !== range[1]) {
          coordsForce = this.bezierService.getAllCoordinates(range[1] * 4, (1 / (range[1] * 4)), pathSegment, multiply, 'angle');
        }

        const start = Math.ceil(pathSegment[0].pos.x * multiply);
        const end = Math.round(pathSegment[pathSegment.length - 1].pos.x * multiply);

        for (let m = start; m <= end; m += quality) {
          let yValue = this.bezierService.closestY(m, coords);
          if (yValue > 100) { yValue = 100; }
          if (yValue < 0) { yValue = 0; }
          let xOffset = m;
          if (range[0] !== range[1]) {
            xOffset = this.bezierService.closestForce(yValue, coordsForce);
          }

          const inlistValue = translatedData.filter(d => d.x === m - startPos)[0] ? translatedData.filter(d => d.x === m - startPos)[0] : null;
          if (inlistValue) {
            const index = translatedData.indexOf(inlistValue);
            if (index > -1) {
              translatedData.splice(index, 1);
            }
          }

          const coordinates = {
            x: m - startPos,
            o: (xOffset - startPos),
            d: (xOffset - m) * (Math.PI / 180),
            y: inlistValue ? (inlistValue.y + (yValue / 100)) / 2 : (yValue / 100)
          };

          translatedData.push(coordinates);
        }
      }
      i++;
    }

    return translatedData;
  }


  calculateOverlappingPaths(collection: Collection, collEffectList: Array<Details>, collEffect: Details, effectList: Array<Effect>) {

    for (const el of collEffectList) {
      if (JSON.stringify(el) !== JSON.stringify(collEffect)) {
        this.calculateOverlay(collection, effectList, collEffect, el);
      }
    }
  }

  calculateOverlay(collection: Collection, effectList: Array<Effect>, collEffect1: Details, collEffect2: Details) {
    const original_effect = effectList.filter(e => e.id === collEffect1.effectID)[0];
    const multiply = original_effect.grid.xUnit.name === 'radians' ? (180 / Math.PI) : 1;
    const original_effect_x1 = collEffect1.position.x * multiply;
    const width = (original_effect.size.width * (collEffect1.scale.x / 100)) * multiply;
    const original_effect_x2 = (collEffect1.position.x + width) * multiply;

    const overlay_effect = effectList.filter(e => e.id === collEffect2.effectID)[0];

    if (overlay_effect.type === original_effect.type) {
      const multiply_el = overlay_effect.grid.xUnit.name === 'radians' ? (180 / Math.PI) : 1;
      const x1 = collEffect2.position.x * multiply_el;
      const width_el = (overlay_effect.size.width * (collEffect2.scale.x / 100)) * multiply_el;
      const x2 = (collEffect2.position.x * multiply_el) + width_el;
      let overlap = null;


      if (x1 >= original_effect_x1 && x1 <= original_effect_x2) {
        overlap = { x1: ((100 / width) * (x1 - original_effect_x1) / 100), x2: 1 };
      }
      if (x2 >= original_effect_x1 && x2 <= original_effect_x2) {
        overlap = { x1: (overlap ? overlap.x1 : 0), x2: (overlap ? 1 - ((100 / width) * (original_effect_x2 - x2) / 100) : (100 / width) * (x2 - original_effect_x1) / 100) };
      }
      if (original_effect_x1 >= x1 && original_effect_x2 <= x2) {
        overlap = { x1: 0, x2: 1 };
      }
      if (overlap) {
        collection.overlappingData.push({ effect1: collEffect1, effect2: collEffect2, overlap: overlap });
      }
    }
  }


  getMultiplyFactor(effectUnits: any, motor: Motor, PR = null) {
    // let conversion = 1;
    // let multiply = 1;
    // const unitsPR = PR === null ? effectUnits.PR : PR;
    // if (motor.config.rotation.linear && (effectUnits.name === 'mm' || effectUnits.name === 'cm')) {
    //   const radialValue = motor.config.rotation.translation.radial.unit.name === 'degrees' ?
        // motor.config.rotation.translation.radial.value * (motor.config.encoder.PR / 360) : motor.config.rotation.translation.radial.value;
      // const radialFactor = radialValue / motor.config.encoder.PR;
      // let linearValue = motor.config.rotation.translation.linear.value;
      // if (effectUnits.name === 'mm' && motor.config.rotation.translation.linear.unit.name === 'cm') {
      //   linearValue *= 10;
      // } else if (effectUnits.name === 'cm' && motor.config.rotation.translation.linear.unit.name === 'mm') {
      //   linearValue /= 10;
      // }
      // linearValue *= radialFactor;
      // conversion = motor.config.encoder.PR / linearValue;
    //   multiply = conversion * motor.config.transmission;
    // } else {
    //   if (effectUnits.name !== 'mm' || effectUnits.name !== 'cm') {
    //     // multiply = (motor.config.encoder.PR / unitsPR) * motor.config.transmission;
    //   } else {
    //     // console.log('effect linear, motor details not linear');
    //     return false;
    //   }
    // }
    // return multiply;
  }

  getInvertedMultiplyFactor(effectUnits: any, motor: Motor) {
    // if (effectUnits.name === 'mm' || effectUnits.name === 'cm') {
    //   const radialValue = motor.config.rotation.translation.radial.unit.name === 'degrees' ?
    //     motor.config.rotation.translation.radial.value * (motor.config.encoder.PR / 360) : motor.config.rotation.translation.radial.value;
    //   const radialFactor = radialValue / motor.config.encoder.PR;
    //   let linearValue = motor.config.rotation.translation.linear.value;
    //   if (effectUnits.name === 'mm' && motor.config.rotation.translation.linear.unit.name === 'cm') {
    //     linearValue *= 10;
    //   } else if (effectUnits.name === 'cm' && motor.config.rotation.translation.linear.unit.name === 'mm') {
    //     linearValue /= 10;
    //   }
    //   linearValue *= radialFactor;
    //   return linearValue / motor.config.encoder.PR;
    // } else if (effectUnits.name === 'degrees') {
    //   return 360 / 4096;
    // } else {
    //   return 1;
    // }
  }



  createUploadModel(collection: Collection, microcontroller: MicroController) {
    let model = new UploadModel(collection, microcontroller);
    // console.log(model);
    return model;
  }













  translatePositionEffectForExport(effectObj: any, motor: any) {
    let data = '';
    let translatedData: any;
    const multiply = this.getMultiplyFactor(effectObj.effect.units, motor);
    // if (multiply) {
    //   translatedData =
    //     this.translateDataPathEffects(effectObj.path, multiply, 8, 'default', []);
    //   const angle = translatedData[translatedData.length - 1].x - translatedData[0].x;
    //   let forceArray = '{ ';
    //   let offsetArray = '{ ';
    //   let i = 0;
    //   for (const item of translatedData) {
    //     if (i < translatedData.length - 1) {
    //       forceArray += item.y + ', ';
    //       offsetArray += item.d + ', ';
    //     } else {
    //       forceArray += item.y + ' }';
    //       offsetArray += item.d + ' } ';
    //     }
    //     i++;
    //   }

    //   data = '/* initialize */ \nEffect ' + effectObj.effect.interface.name.replace('-', '_') + ';\nint force_' +
    //       effectObj.effect.interface.name.replace('-', '_') + '[] = ' + forceArray + ';\nint offset_' +
    //       effectObj.effect.interface.name.replace('-', '_') + '[] = ' + offsetArray + ';\n\r/* call in setup */\n' +
    //       effectObj.effect.interface.name.replace('-', '_') + '.initPositionEffect(force_' +
    //       effectObj.effect.interface.name.replace('-', '_') + ',  offset_' +
    //       effectObj.effect.interface.name.replace('-', '_') + ', ' + angle + ', ' + (translatedData.length) + ');\n\r';
    //   return data;
    // }

  }

  translateTimeEffectForExport(effectObj: any, motor: any) {
    let data = '';
    let translatedData: any;
    if (effectObj.effect.units === undefined || effectObj.effect.units.PR === undefined) {
      effectObj.effect.units = { name: 'degrees', PR: 360 };
    }
    const multiply = this.getMultiplyFactor(effectObj.effect.units, motor);
  //   if (multiply) {
  //     translatedData = this.translateTimeBasedData(effectObj.effect.nodes[0].nodes, 1, multiply);

  //     let positionArray = '{ ';
  //     let i = 0;
  //     for (const item of translatedData) {
  //       positionArray += '{ ' + (item.x - translatedData[0].x) + ', ' + (item.y - translatedData[0].y) + ', ' +
  //         (item.cp1x - translatedData[0].x) + ', ' + (item.cp1y - translatedData[0].y) + ', ' + (item.cp2x - translatedData[0].x) + ', ' +
  //         (item.cp2y - translatedData[0].y) + '}';

  //       if (i < translatedData.length - 1) {
  //         positionArray += ', ';
  //       } else {
  //         positionArray += ' }';
  //       }

  //       i++;
  //     }

  //     data = '/* initialize */ \nEffect ' + effectObj.effect.interface.name.replace('-', '_') + '; \n' + 'int data_' +
  //            effectObj.effect.interface.name.replace('-', '_') + '[][6] = ' + positionArray +
  //            ';\n\r\/* call in setup */ \n' + effectObj.effect.interface.name.replace('-', '_') + '.initTimeEffect(' +
  //            'data_' + effectObj.effect.interface.name.replace('-', '_') + ', ' + (translatedData.length) + ');\n\r';

  //     return data;
  //   }
  }
}

