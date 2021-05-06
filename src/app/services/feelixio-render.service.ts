import { Injectable } from '@angular/core';
import { FeelixioFile, ComponentLink } from '../models/feelixio-file.model';
import { Tree, TreeNode } from '../models/render-tree.model';
import { FeelixioDrawElementsService } from './feelixio-draw-elements.service';
import { ComponentObject } from '../models/component.model';
import { UploadService } from './upload.service';
import { EffectUploadModel } from '../models/effect-upload.model';
import { ElectronService } from 'ngx-electron';
import { HardwareService } from './hardware.service';
import { MicroController } from '../models/hardware.model';
import { timeout } from 'd3';


@Injectable()
export class FeelixioRenderService {

  public feelixioFile: FeelixioFile;
  public trees: Array<Tree> = [];
  private nodeId = 0;

  updateSendFunction: any;



  constructor(private electronService: ElectronService, private feelixioDrawElementsService: FeelixioDrawElementsService,
              private uploadService: UploadService, private hardwareService: HardwareService) {

    // this.uploadService.getLinearOutput.subscribe(res => {
    //   this.getLinearOutput(res);
    // });
  }


  render() {
    this.nodeId = 0;
    this.trees = [];

    const motorLinksInFile = this.feelixioFile.links.
      filter(l => l.input.component.feelixio === 'motor' || l.output.component.feelixio === 'motor');

    if (motorLinksInFile.length === 0) {return { render: false, msg: 'No motors connected.' }; }

    for (const link of this.feelixioFile.links) {
      link.inUse = false;
      if (!link.valid) {
        const index = this.feelixioFile.links.indexOf(link);
        this.feelixioFile.links.splice(index, 1);
      }
    }
    for (const comp of this.feelixioFile.components) {
      comp.valid = true;
    }
    for (const effect of this.feelixioFile.effects) {
      effect.valid = true;
    }

    let level = 0;
    let treeIndex = 0;
    const allMotors = this.feelixioFile.hardware;

    for (const motor of allMotors) {
      const motorLinks = this.feelixioFile.links.filter(l => l.input.component.id === motor.id);
      if (motorLinks.length > 0) {
        level = 0;
        const newTree = new Tree();
        const newTreeNode = new TreeNode(this.nodeId, null, level, null, [], motor);
        newTree.list.push(newTreeNode);
        this.trees.push(newTree);
        level++;
        this.nodeId++;
        const parent = 0;

        for (const link of motorLinks) {
          if (link.output.component.feelixio === 'effect') {
            this.getAllInputParametersEffect(link, level, treeIndex, parent);
          } else if (link.output.component.feelixio === 'component') {
            this.getAllInputParametersComponent(link, level, treeIndex, parent);
          }
        }
        treeIndex++;
        this.nodeId = 0;
      }
    }

    this.feelixioDrawElementsService.saveFileData(this.feelixioFile);
    this.feelixioFile.config.rendered = true;
    this.calculateParameterValuesInTrees();
    const invalidComponents = this.feelixioFile.components.filter(c => !c.valid);
    const invalidEffects = this.feelixioFile.effects.filter(e => !e.valid);
    const invalidMotors = this.feelixioFile.hardware.filter(h => !h.valid);

    if (invalidComponents.length > 0 || invalidEffects.length > 0 || invalidMotors.length > 0) {
      return { render: false, msg: 'Rendering failed.' };
    }

    return { render: true, msg: 'Rendering complete.' };
  }



  getAllInputParametersEffect(link: ComponentLink, level: number, treeIndex: number, parent: number) {
    const effect = this.feelixioFile.effects.filter(c => c.id === link.output.component.id)[0];
    if (effect && this.trees[treeIndex].list.filter(t => t.data.id === effect.id).length === 0) {
      const parentObject = this.trees[treeIndex].list.filter(t => t.id === parent)[0];
      const newTreeNode = new TreeNode(this.nodeId, link.id, level, parent, [], effect);
      const parentId = this.nodeId;
      if (parentObject) { parentObject.children.push(parentId); }
      this.nodeId++;
      this.trees[treeIndex].list.push(newTreeNode);
      for (const inputParameter of effect.parameters.input.filter(p => !p.hidden)) {
        const inputParameterLinks = this.feelixioFile.links.filter(l => l.input.parameter.id === inputParameter.id);
        if (inputParameterLinks.length === 0) {
          effect.valid = false;
        } else {
          for (const inputParLink of inputParameterLinks) {
            const newLevel = level + 1;
            if (inputParLink.output.component.feelixio === 'component') {
              this.getAllInputParametersComponent(inputParLink, newLevel, treeIndex, parentId);
            }
          }
        }
      }
    }
  }

  getAllInputParametersComponent(link: ComponentLink, level: number, treeIndex: number, parent: number) {
    const component = this.feelixioFile.components.filter(c => c.id === link.output.component.id)[0];
    if (component) {
      const parentObject = this.trees[treeIndex].list.filter(t => t.id === parent)[0];
      const newTreeNode = new TreeNode(this.nodeId, link.id, level, parent, [], component);
      const parentId = this.nodeId;
      if (parentObject) { parentObject.children.push(parentId); }
      this.nodeId++;
      this.trees[treeIndex].list.push(newTreeNode);
      for (const inputParameter of component.parameters.input) {
        const inputParameterLinks = this.feelixioFile.links.filter(l => l.input.parameter.id === inputParameter.id);
        if (inputParameterLinks.length > 0) {
          for (const inputParLink of inputParameterLinks) {
            const newLevel = level + 1;
            if (inputParLink.output.component.feelixio === 'effect') {
              this.getAllInputParametersEffect(inputParLink, newLevel, treeIndex, parentId);
            } else if (inputParLink.output.component.feelixio === 'component') {
              this.getAllInputParametersComponent(inputParLink, newLevel, treeIndex, parentId);
            }
          }
        }
      }
    }
  }

  getSwitchValue(comp: any, links: Array<any>) {
    const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
    if (component) {
      const selectedParameter = component.parameters.input[component.component.selectedInput];
      if (selectedParameter) {
        const inputLink = links.filter(l => l.input.parameter.id === selectedParameter.id)[0];
        if (inputLink) {
          const linkedComponent = inputLink.output.component.feelixio === 'component' ?
            this.feelixioFile.components.filter(c => c.id === inputLink.output.component.id)[0] :
            this.feelixioFile.effects.filter(c => c.id === inputLink.output.component.id)[0];
          if (linkedComponent) {
            const parameter = linkedComponent.parameters.output.filter(p => p.id === inputLink.output.parameter.id)[0];
            if (parameter) {
              return parameter.defaultVal;
            }
          }
        }
      }
    }
  }

  getOperatorOutput(comp: any, links: Array<any>) {
    const inputOne = this.getOutputParameterByName(links, 'inputOne');
    const inputTwo = this.getOutputParameterByName(links, 'inputTwo');
    if (inputOne && inputTwo) {
      if (inputOne.units.name !== 'category' && inputTwo.units.name !== 'category') {
        if (comp.component.operator.name === 'equal') {
          return inputOne.type.val === inputTwo.type.val ? true : false;
        } else if (comp.component.operator.name === 'not-equal') {
          return inputOne.type.val !== inputTwo.type.val ? true : false;
        } else if (comp.component.operator.name === 'less-than') {
          return inputOne.type.val < inputTwo.type.val ? true : false;
        } else if (comp.component.operator.name === 'equal or less') {
          return inputOne.type.val <= inputTwo.type.val ? true : false;
        } else if (comp.component.operator.name === 'greater-than') {
          return inputOne.type.val > inputTwo.type.val ? true : false;
        } else if (comp.component.operator.name === 'equal or greater') {
          return inputOne.type.val >= inputTwo.type.val ? true : false;
        }
        return null;
      } else {
        if (comp.component.operator.name === 'equal') {
          return inputOne.category.val === inputTwo.category.val ? true : false;
        } else if (comp.component.operator.name === 'not-equal') {
          return inputOne.category.val !== inputTwo.category.val ? true : false;
        } else if (comp.component.operator.name === 'and' && inputOne.units.symbol === 'boolean') {
          return inputOne.category.val === 'true' && inputTwo.category.val === 'true' ? true : false;
        } else if (comp.component.operator.name === 'or' && inputOne.units.symbol === 'boolean') {
          return inputOne.category.val === 'true' || inputTwo.category.val === 'true' ? true : false;
        }
        return null;
      }
    } else {
      return null;
    }

  }

  getArithmeticOutput(comp: any, links: Array<any>) {
    const inputList = this.getAllOutputParameters(links);
    const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
    if (component) {
      const outputParVal = component.parameters.output[0].defaultVal;
      outputParVal.type.val = inputList[0].type.val;
      let i = 0;
      for (const input of inputList) {
        if (i > 0) {
          if (comp.component.operator.name === 'plus') {
            outputParVal.type.val += input.type.val;
          } else if (comp.component.operator.name === 'minus') {
            outputParVal.type.val -= input.type.val;
          } else if (comp.component.operator.name === 'multiply') {
            outputParVal.type.val *= input.type.val;
          } else if (comp.component.operator.name === 'divide') {
            outputParVal.type.val /= input.type.val;
          }
        }
        i++;
      }
      return outputParVal;
    }
  }

  getOutputParameterByName(links: Array<any>, name: string) {
    const Link = links.filter(l => l.input.parameter.name === name)[0];
    if (Link) {
      let component: any;
      if (Link.output.component.feelixio === 'motor') {
        component = this.feelixioFile.hardware.filter(c => c.id === Link.output.component.id)[0];
      } else {
        component = Link.output.component.feelixio === 'component' ?
          this.feelixioFile.components.filter(c => c.id === Link.output.component.id)[0] :
          this.feelixioFile.effects.filter(c => c.id === Link.output.component.id)[0];
      }
      if (component) {
        const OutputParameter = component.parameters.output.filter(p => p.id === Link.output.parameter.id)[0];
        if (OutputParameter) {
          return OutputParameter.defaultVal;
        }
      }

    }
    return null;
  }

  getAllOutputParameters(links: Array<any>) {
    const parameters = [];
    for (const link of links) {
      const Component = link.output.component.feelixio === 'component' ?
        this.feelixioFile.components.filter(c => c.id === link.output.component.id)[0] :
        this.feelixioFile.effects.filter(c => c.id === link.output.component.id)[0];
      if (Component) {
        const OutputParameter = Component.parameters.output.filter(p => p.id === link.output.parameter.id)[0];
        if (OutputParameter) {
          parameters.push(OutputParameter.defaultVal);
        }
      }
    }
    return parameters;
  }

  getConstrainOutput(comp: any, links: Array<any>) {
    const min = this.getOutputParameterByName(links, 'Min input');
    const max = this.getOutputParameterByName(links, 'Max input');
    const input = this.getOutputParameterByName(links, 'Input');

    if (min && max && input) {
      const output = input;
      if (input.type.val < min.type.val) { output.type.val = min.type.val; }
      if (input.type.val > max.type.val) { output.type.val = max.type.val; }
      return output;
    } else {
      const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
      if (component) { component.valid = false; }
      return null;
    }
  }

  getMapOutput(comp: any, links: Array<any>) {
    const inputMin = this.getOutputParameterByName(links, 'Min input');
    const inputMax = this.getOutputParameterByName(links, 'Max input');
    const input = this.getOutputParameterByName(links, 'Input');
    const outputMin = this.getOutputParameterByName(links, 'Min output');
    const outputMax = this.getOutputParameterByName(links, 'Max output');

    if (outputMax && outputMin && inputMax && inputMin && input) {
      const output = input;
      output.type.val = ((outputMax.type.val - outputMin.type.val) / (inputMax.type.val - inputMin.type.val)) * input.type.val;
      return output;
    } else {
      const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
      if (component) { component.valid = false; }
      return null;
    }
  }

  getTimerOutput(comp: any, links: Array<any>) {

    const start = this.getOutputParameterByName(links, 'Start');
    const reset = this.getOutputParameterByName(links, 'Reset');
    const time = this.getOutputParameterByName(links, 'Time');

    const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
    if (component) {
      if (time) {
        component.parameters.input.filter(p => p.name === 'Time')[0].defaultVal = time;
      }
      if (this.feelixioFile.config.running) {
        if (reset) {
          component.parameters.input.filter(p => p.name === 'Reset')[0].defaultVal = reset;
          if (reset.category.val === 'true') {
            this.resetTimer(comp);
          }
        }
        if (start) {
          if (start.category.val === 'true' && component.parameters.input.filter(p => p.name === 'Time')[0].defaultVal.type.val > 0) {
            this.startTimer(comp);
          }
          component.parameters.input.filter(p => p.name === 'Start')[0].defaultVal = start;
        }
      }
      const outputParVal = component.parameters.output[0].defaultVal;
      return outputParVal;
    }

  }

  resetTimer(comp: any) {
    comp.parameters.input.filter(p => p.name === 'Time')[0].defaultVal.type.val = comp.component.type.val;
    comp.parameters.output.filter(p => p.name === 'End')[0].defaultVal.category.val = 'false';
    this.feelixioDrawElementsService.saveFileData(this.feelixioDrawElementsService.feelixioFile);
  }

  startTimer(comp: ComponentObject) {
    const timerInterval = setInterval(() => {
      const defaultVal = comp.parameters.input.filter(p => p.name === 'Time')[0].defaultVal;
      const start = comp.parameters.input.filter(p => p.name === 'Start')[0].defaultVal;
      const reset = comp.parameters.input.filter(p => p.name === 'Reset')[0].defaultVal;
      if (start.category.val === 'true' && reset.category.val === 'true') {
        if (defaultVal.units.name === 'seconds') {
          defaultVal.type.val = ((defaultVal.type.val * 1000) - 1) / 1000;
        } else {
          defaultVal.type.val--;
        }
      } else {
        clearInterval(timerInterval);
      }
      this.feelixioDrawElementsService.drawTimer(comp);
      if (defaultVal.type.val === 0) {
        comp.parameters.output.filter(p => p.name === 'End')[0].defaultVal.category.val = 'true';
        clearInterval(timerInterval);
      }
    }, 1);
  }


  getRepeatOutput(comp: any, links: Array<any>) {
    const repeatValues = [];
    const spacingParameter = this.getOutputParameterByName(links, 'Spacing');
    const repeatArray = links.filter(l => l.input.parameter.name === '');

    let times = 1;
    let evenSpacing = false;
    let spacing = spacingParameter;
    const outputLink = this.feelixioFile.links.filter(l => l.output.component.id === comp.id &&
        l.input.component.feelixio === 'effect')[0];
    if (outputLink) {
      const effect = this.feelixioFile.effects.filter(e => e.id === outputLink.input.component.id)[0];
      const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
      if (effect && component) {
        const angleParameter = effect.parameters.input.filter(p => p.name === 'angle')[0];
        const positionParameter = effect.parameters.input.filter(p => p.name === 'position')[0];
        const position = positionParameter.defaultVal;
        const width = angleParameter.defaultVal;
        const timesInputParameter = component.parameters.input.filter(p => p.name === 'Times')[0];
        if (timesInputParameter) {
          times = parseInt(timesInputParameter.defaultVal.category.val, 10);
        }
        const evenSpacingInputParameter = component.parameters.input.filter(p => p.name === 'Even spacing')[0];
        if (evenSpacingInputParameter) {
          evenSpacing = evenSpacingInputParameter.defaultVal.category.val === 'true' ? true : false;
        }

        if (spacingParameter === null) {
          const spacingInputParameter = component.parameters.input.filter(p => p.name === 'Spacing')[0];
          if (spacingInputParameter) {
            spacing = spacingInputParameter.value ? spacingInputParameter.value : spacingInputParameter.defaultVal;
          }
        }
        if (evenSpacing) {
          const multiplyWidth = width.units.symbol === 'ppr' ? (360 / 4096) : 1;
          const multiplyPos = position.units.symbol === 'ppr' ? (360 / 4096) : 1;
          const multiplySpace = spacing.units.symbol === 'ppr' ? (360 / 4096) : 1;
          for (let i = 0; i < times; i++) {
            const positionVal =
              (position.type.val * multiplyPos) + (i * ((width.type.val * multiplyWidth) + (spacing.type.val * multiplySpace)));
            repeatValues.push({ val: positionVal, units: { name: 'degrees', symbol: '&deg;' } });
          }
          return repeatValues;
        } else if (!evenSpacing) {
          if (repeatArray.length === 0) {
            repeatValues.push({ val: position.type.val, units: position.units });
          } else {
            times = repeatArray.length;
            for (const link of repeatArray) {
              const outputComponent = this.feelixioFile.components.filter(c => c.id === link.output.component.id)[0];
              if (outputComponent) {
                const parameter = outputComponent.parameters.output.filter(p => p.id === link.output.parameter.id)[0];
                if (parameter.value) {
                  repeatValues.push({ val: parameter.value.type.val, units: parameter.value.units });
                } else {
                  repeatValues.push({ val: parameter.defaultVal.type.val, units: parameter.defaultVal.units });
                }
              }
            }
          }
          return repeatValues;
        }
      }
    }
    return [];
  }


  getAlignOutput(comp: any, links: Array<any>) {
    const input = this.getOutputParameterByName(links, 'input');
    const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
    if (component) {
      const outputParVal = component.parameters.output[0].defaultVal;
      if (input) {
        if (input.type) {
          if (input.type.val === 0) {
            outputParVal.category.val = 'left';
          } else if (input.type.val === 1) {
            outputParVal.category.val = 'center';
          } else if (input.type.val === 2) {
            outputParVal.category.val = 'right';
          }
          return outputParVal;
        }
      }
    }
    component.valid = false;
    return null;
  }

  getLinearOutput(comp: any) {
    const component = this.feelixioFile.components.filter(c => c.id === comp.id)[0];
    if (component) {
      const outputParVal = component.parameters.output[0].defaultVal;
      const inputVariable = component.parameters.input.filter(p => !p.hidden)[0];
      const link = this.feelixioFile.links.filter(l => l.output.component.id === component.id)[0];
      if (inputVariable) {
        if (link && inputVariable.name === 'Position') {
          const effect = this.feelixioFile.effects.filter(c => c.id === link.input.component.id)[0];
          const position = effect.parameters.input.filter(p => p.name === 'position')[0];
          const angle = effect.parameters.input.filter(p => p.name === 'angle')[0];
          const angleVal = !angle.hidden && angle.value ? angle.value : angle.defaultVal;
          const angleUnitVal = angleVal.units.symbol === 'ppr' ? Math.round(angleVal.type.val) :
            Math.round(angleVal.type.val * (4096 / 360));

          const positionVal = !position.hidden && position.value ? position.value : position.defaultVal;
          const positionUnitVal = positionVal.units.symbol === 'ppr' ? Math.round(positionVal.type.val) :
          Math.round(positionVal.type.val * (4096 / 360));

          const inv = angleUnitVal / (inputVariable.defaultVal.type.end - inputVariable.defaultVal.type.start);
          outputParVal.type.start2 = positionUnitVal;
          outputParVal.type.end2 = positionUnitVal + angleUnitVal;
          outputParVal.type.val2 = inputVariable.defaultVal.type.val * inv;
        } else {
          outputParVal.type.start2 = inputVariable.defaultVal.type.start;
          outputParVal.type.end2 = inputVariable.defaultVal.type.end;
          outputParVal.type.val2 = inputVariable.defaultVal.type.val;
        }
      }
      outputParVal.type.val =
        Math.round(((outputParVal.type.end - outputParVal.type.start) /
          (outputParVal.type.end2 - outputParVal.type.start2)) * 1000000) / 1000000;

      return outputParVal;
    }
    return null;
  }

  calculateParameterValuesInTrees() {
    let currentLevel = 0;
    for (const tree of this.trees) {
      const levels = this.findMinMax(tree.list);
      currentLevel = levels.max;
      while (currentLevel > 0) {
        const objectsWithChildrenAtCurrentLevel =
          tree.list.filter(t => t.level === currentLevel &&
            (t.children.length > 0 || t.data.type === 'linear' || t.data.type === 'repeat'));

        for (const object of objectsWithChildrenAtCurrentLevel) {
          this.getParameterValue(object);
        }
        currentLevel--;
      }
    }
  }

  getParameterValueComponent(component: any) {
    let change = false;
    const oldValue = JSON.stringify(component.parameters.output[0].defaultVal);
    const objectType = component.type;
    const parameterInputLinks = this.feelixioFile.links.filter(l => l.input.component.id === component.id);
    let output: any;
    if (objectType === 'switch') {
      output = this.getSwitchValue(component, parameterInputLinks);
    } else if (objectType === 'operator') {
      output = this.getOperatorOutput(component, parameterInputLinks);
    } else if (objectType === 'arithmetic') {
      output = this.getArithmeticOutput(component, parameterInputLinks);
    } else if (objectType === 'timer') {
      output = this.getTimerOutput(component, parameterInputLinks);
    } else if (objectType === 'repeat') {
      output = this.getRepeatOutput(component, parameterInputLinks);
    } else if (objectType === 'map') {
      output = this.getMapOutput(component, parameterInputLinks);
    } else if (objectType === 'constrain') {
      output = this.getConstrainOutput(component, parameterInputLinks);
    } else if (objectType === 'align') {
      output = this.getAlignOutput(component, parameterInputLinks);
    } else if (objectType === 'linear') {
      output = this.getLinearOutput(component);
    }
    if (output !== null) {
      if (objectType === 'operator') {
        if (component.parameters.output[0].defaultVal.category.val !== output.toString()) {
          change = true;
          component.parameters.output[0].defaultVal.category.val = output.toString();
        }
      } else {
        if (oldValue !== JSON.stringify(output)) {
          change = true;
        }
        component.parameters.output[0].defaultVal = output;
      }
    }
    return change;
  }



  getParameterValue(object: any) {
    if (object.data.feelixio === 'component') {
      const component = this.feelixioFile.components.filter(c => c.id === object.data.id)[0];
      if (component) {
        const change = this.getParameterValueComponent(component);
      }

    } else if (object.data.feelixio === 'effect') {
      const inputParameters = object.data.parameters.input.filter(p => !p.hidden);
      for (const parameter of inputParameters) {
        const links = this.feelixioFile.links.filter(l => l.input.parameter.id === parameter.id);
        if (links) {
          const link =
            links.filter(l => l.output.component.feelixio === 'component' && l.output.component.type === 'linear')[0];
          if (link) {
            parameter.value = this.getLinearOutput(link.output.component);
          } else {
            parameter.value = this.getOutputParameterByName(links, parameter.name);
            if (parameter.value === undefined || parameter.value === null) {
              const effect = this.feelixioFile.effects.filter(c => c.id === object.data.id)[0];
              if (effect) { effect.valid = false; }
              return false;
            }
          }
        }

      }
    } else if (object.data.feelixio === 'motor') {
      console.log('get parameter value motor', object);
    }
  }

  findMinMax(arr: Array<TreeNode>) {
    // tslint:disable-next-line: variable-name
    let _min = arr[0].level;
    // tslint:disable-next-line: variable-name
    let _max = arr[0].level;

    for (const el of arr) {
      const v = el.level;
      _min = (v < _min) ? v : _min;
      _max = (v > _max) ? v : _max;
    }

    return { min: _min, max: _max };
  }



  uploadEffectData() {
    let treeIndex = 0;
    let effectIndex = 0;
    for (const tree of this.trees) {
      const effectList: Array<EffectUploadModel> = [];
      const microcontroller = this.hardwareService.getMicroControllerByCOM(tree.list[0].data.microcontroller.serialPort.path);
      if (microcontroller) {
        const effects = tree.list.filter(t => t.data.feelixio === 'effect');
        if (treeIndex > 0 && microcontroller.serialPort.path !==
            this.trees[treeIndex - 1].list[0].data.microcontroller.serialPort.path) {
          effectIndex = 0;
        }
        for (const treeItem of effects) {
          const effectObject = this.feelixioFile.effects.filter(e => e.id === treeItem.data.id)[0];

          if (effectObject.effect.type === 'motion' || effectObject.effect.type === 'ease') {
            // const translatedEffect = this.uploadService.
            //   translateSingleTimeBasedEffectData(effectObject, microcontroller.motor);
            // if (translatedEffect) {
            //   translatedEffect.treeIndex = treeIndex;
            //   translatedEffect.index = effectIndex;
            //   effectList.push(translatedEffect);
            // }
          } else {
            // const translatedEffect = this.uploadService.
            //   translateSinglePositionBasedEffectData(effectObject, microcontroller.motor);

            // if (translatedEffect) {
            //   translatedEffect.treeIndex = treeIndex;
            //   translatedEffect.index = effectIndex;
            //   effectList.push(translatedEffect);
            // }
          }
          effectIndex++;
        }

        if (effectList.filter(e => e.loop).length > 1) {
          console.log('can only loop one effect at a time');
          const loopEffects = effectList.filter(e => e.loop);
          let i = 0;
          for (const effectEl of loopEffects) {
            if (i > 0) {
              effectEl.loop = false;
            }
            i++;
          }
        }

        // this.hardwareService.updateMotorEffectList(microcontroller.id, effectList);
        // console.log(effectList);

        if (this.electronService.isElectronApp) {
          // this.electronService.ipcRenderer.send('addFilesToUploadList',
            // { effects: effectList, motor: microcontroller.motor,
            //   microcontroller: { port: microcontroller.serialPort, type: microcontroller.type }});
        }
      } else {
        // show message
        console.log('microcontroller undefined');
      }
      treeIndex++;
    }

    this.feelixioFile.config.loaded = true;
  }



  playEffectData(start: boolean) {
    for (const tree of this.trees) {
      const motorObject = tree.list[0].data;
      this.electronService.ipcRenderer.send('playEffect',
        { motors: motorObject.microcontroller.motor, play: start, microcontroller: { port:  motorObject.microcontroller.serialPort }});
    }
    this.feelixioDrawElementsService.setRunningBackground(start);
  }



  updateOutputParametersMotor(microcontroller: MicroController) {
    const motorObject = this.feelixioFile.hardware.filter(h => h.microcontroller.id === microcontroller.id)[0];
    if (motorObject) {
      // motorObject.parameters.output.filter(p => p.name === 'position')[0].defaultVal.type.val = microcontroller.motor.position.current;
      // motorObject.parameters.output.filter(p => p.name === 'speed')[0].defaultVal.type.val = microcontroller.motor.speed;
      // motorObject.parameters.output.filter(p => p.name === 'clockwise')[0].defaultVal.category.val =
        // microcontroller.motor.direction === 1 ? 'true' : 'false';
      this.updateOutputParametersLinkedParameter(motorObject.id);
    }
  }

  updateOutputParametersLinkedParameter(id: any) {
    const outputLinks = this.feelixioFile.links.filter(l => l.output.component.id === id);
    if (outputLinks.length > 0) {
      this.updateLinkedParameters(outputLinks);
    }
  }



  updateLinkedParameters(links: Array<ComponentLink>) {
    for (const link of links) {
      if (link.valid) {
        if (link.input.component.feelixio === 'component') {
          const component = this.feelixioFile.components.filter(c => c.id === link.input.component.id)[0];
          if (component) {
            const change = this.getParameterValueComponent(component);
            if (change) {
              this.updateOutputParametersLinkedParameter(component.id);
            }
          }
        } else if (link.input.component.feelixio === 'effect') {
          const effect = this.feelixioFile.effects.filter(e => e.id === link.input.component.id)[0];
          if (effect) {
            const parameter = effect.parameters.input.filter(p => p.id === link.input.parameter.id)[0];
            if (parameter) {
              const value = this.getOutputParameterByName(links, parameter.name);
              if (value) {
                parameter.value = value;
                if (this.feelixioFile.config.running) {
                  this.sendUpdatedParameter(effect, parameter);
                }
              }
            }
          }
        }
      }
    }
  }


  sendUpdatedParameter(effectObj: any, parameter: any) {
    for (const tree of this.trees) {
      if (tree.list.filter(t => t.data.id === effectObj.id).length > 0) {
        const motorObject = tree.list[0].data;
        const microcontroller = this.hardwareService.getMicroControllerByCOM(motorObject.microcontroller.serialPort.path);
        const time = new Date().getTime();
        const ms = time - microcontroller.lastDataSend;
        if (microcontroller) {

          // const effectInList = microcontroller.motor.effectList.filter(e => e.effectID === effectObj.effect.id)[0];

          // if (effectInList) {
          //   if (this.updateSendFunction) {
          //     clearTimeout(this.updateSendFunction);
          //   }
          //   this.updateSendFunction = setTimeout(() => {
          //     this.hardwareService.updateDataSendTime(microcontroller.id);
          //     if (parameter.name === 'intensity') {
          //       const intensity = this.uploadService.getIntensityValue(effectObj);
          //       if (intensity !== -1) {
          //         // this.sendDataElement('Y', intensity, effectInList.index, { port:  microcontroller.serialPort });
          //       } else {
          //         const linear = this.uploadService.getLinearValue(effectObj, microcontroller.motor);
          //         if (linear) {
          //         // this.sendDataElement('L', (linear.Xmin + ':' + linear.Xmax + ':' + linear.Ymin + ':' + linear.Ymax + ':' +
          //           // (Math.round(linear.dYdX * 10000) / 10000)), effectInList.index, { port:  microcontroller.serialPort });
          //         // }
          //       }

              // } else if (parameter.name === 'intensity (l)') {
                // const linear = this.uploadService.getLinearValue(effectObj, microcontroller.motor);
                // if (linear) {
                  // this.sendDataElement('L', (linear.Xmin + ':' + linear.Xmax + ':' + linear.Ymin + ':' + linear.Ymax + ':' +
                  //     (Math.round(linear.dYdX * 10000) / 10000)), effectInList.index, { port:  microcontroller.serialPort });
                // }

              // } else if (parameter.name === 'position' || parameter.name === 'align') {
              //   const position = this.uploadService.getPositionValue(effectObj, microcontroller.motor);
              //   this.sendDataElement('A', position, effectInList.index, { port:  microcontroller.serialPort });

              // } else if (parameter.name === 'angle') {
              //   const angle = this.uploadService.getAngleValue(effectObj, microcontroller.motor);
              //   this.sendDataElement('X', angle, effectInList.index, { port:  microcontroller.serialPort });

              // } else if (parameter.name === 'direction') {
              //   const direction = this.uploadService.getDirectionValue(effectObj);
              //   this.sendDataElement('D', direction, effectInList.index, { port:  microcontroller.serialPort });

            //   } else if (parameter.name === 'infinite' || parameter.name === 'loop') {
            //     const infinite = this.uploadService.
            //       getBooleanValue(effectObj.parameters.input.filter((p: { name: string; }) =>
            //       p.name === 'infinite' || p.name === 'loop')[0]);
            //     this.sendDataElement('I', infinite ? 1 : 0, effectInList.index, { port:  microcontroller.serialPort });

            //   } else if (parameter.name === 'enabled') {
            //     const enabled =
            //       this.uploadService.getBooleanValue(effectObj.parameters.input.filter((p: { name: string; }) => p.name === 'enabled')[0]);
            //     this.sendDataElement('E', enabled ? 1 : 0, effectInList.index, { port:  microcontroller.serialPort });

            //   } else if (parameter.name === 'start') {
            //     const startTime = this.uploadService.getStartTime(effectObj);
            //     this.sendDataElement('S', startTime, effectInList.index, { port:  microcontroller.serialPort });
            //   }
            // }, (ms > 200 ? 0 : 200 - ms));
          // }
        }
      }
    }
  }


  sendDataElement(parameterType: string, value: any, index: number, port: any) {
    if (this.electronService.isElectronApp) {
      this.electronService.ipcRenderer.send('updateEffectData',
        { type: parameterType, data: value, effectIndex: index, microcontroller: port });
    }
  }

  sendDataToExternalDevice(microcontroller: MicroController) {
    if (this.feelixioFile.config.running) {
      if (microcontroller && microcontroller.dataToOtherDevices && microcontroller.dataToOtherDevices.length > 0) {
        for (const device of microcontroller.dataToOtherDevices) {
          const dataList = [];

          // if (device.position && microcontroller.motor.position.current !== null) {
          //   dataList.push({ identifier: 'P', value: microcontroller.motor.position.current });
          // }
          // if (device.speed && microcontroller.motor.speed !== null) {
          //   dataList.push({ identifier: 'S', value: microcontroller.motor.speed });
          // }
          // if (device.direction && microcontroller.motor.direction !== null) {
          //   dataList.push({ identifier: 'D', value: microcontroller.motor.direction });
          // }
          if (dataList.length > 0) {
            device.serialPort.lastDataSend = new Date().getTime();
            this.electronService.ipcRenderer.send('updateExternalDevice', { COM: device.serialPort, list: dataList });
          }
        }
      }
    }
  }

  startIntervalDataSend() {
    if (this.feelixioFile.config.running) {
      for (const tree of this.trees) {
        const microcontroller = this.hardwareService.getMicroControllerByCOM(tree.list[0].data.microcontroller.serialPort.path);
        if (microcontroller) {
          for ( const device of microcontroller.dataToOtherDevices) {
            const update = device.updateSpeed < 20 ? 20 : device.updateSpeed;
            if (!this.hardwareService.deviceConnected(device.serialPort)) {
              // console.log('device not connected');
            } else {
              device.intervalFunction = setInterval( () => {
                this.sendDataToExternalDevice(microcontroller);
              }, update);
            }
          }
        }
      }
    }
  }

  clearIntervalDataSend() {
    for (const tree of this.trees) {
      const microcontroller = this.hardwareService.getMicroControllerByCOM(tree.list[0].data.microcontroller.serialPort.path);
      if (microcontroller) {
        for ( const device of microcontroller.dataToOtherDevices) {
          if (device.intervalFunction !== null) {
            clearInterval(device.intervalFunction);
          }
        }
      }
    }
  }

}

