import { Injectable } from '@angular/core';
import { ComponentLink, FeelixioFile } from '../models/feelixio-file.model';

@Injectable()
export class FeelixioValidationService {

  public feelixioFile: FeelixioFile;

  constructor() {}

  checkSwitchInput(link: ComponentLink) {
    if ((link.input.component.type === 'switch' && link.output.parameter.defaultVal &&
        link.output.parameter.defaultVal.units.name === 'category') || link.output.component.feelixio === 'motor') {
      return false;
    }

    const switchComponent = this.feelixioFile.components.filter(c => c.id === link.input.component.id)[0];
    if (switchComponent) {
      if (link.output.parameter.defaultVal && switchComponent.parameters.output[0].defaultVal &&
         (switchComponent.parameters.output[0].defaultVal.unitOptions === undefined ||
          switchComponent.parameters.output[0].defaultVal.unitOptions.length === 0)) {
        switchComponent.parameters.output[0].defaultVal.unitOptions = [ link.output.parameter.defaultVal.units ];
        return true;
      } else if (link.output.component.feelixio === 'component') {
        if (switchComponent.parameters.output[0].defaultVal &&
            switchComponent.parameters.output[0].defaultVal.unitOptions
            .filter(u => u.name === link.output.parameter.defaultVal.units.name &&
            u.symbol === link.output.parameter.defaultVal.units.symbol).length > 0) {
          return true;
        } else {
          return false;
        }
      } else if (link.output.component.feelixio === 'effect') {
        for (const unit of link.output.parameter.unitOptions) {
          if (unit && switchComponent.parameters.output[0].defaultVal &&
              switchComponent.parameters.output[0].defaultVal.unitOptions &&
              switchComponent.parameters.output[0].defaultVal.unitOptions.filter(
                (u: { name: any; symbol: any; }) => u.name === unit.name && u.symbol === unit.symbol).length > 0) {
            return true;
          }
        }
      }
    }
    return false;
  }

  checkSwitchOutput(link: ComponentLink) {
    const component = this.feelixioFile.components.filter(c => c.id === link.output.component.id)[0];
    if (component) {
      if (link.input.component.feelixio === 'effect' || link.input.component.feelixio === 'motor') {
        for (const option of link.input.parameter.unitOptions) {
          if (component.parameters.output[0].defaultVal && component.parameters.output[0].defaultVal.unitOptions) {
            if (component.parameters.output[0].defaultVal.unitOptions.length > 0) {
              if (component.parameters.output[0].defaultVal.unitOptions
                .filter(u => u.name === option.name && u.symbol === option.symbol).length > 0) {
                return true;
              }
            } else if (component.parameters.output[0].defaultVal.units.name === option.name &&
                component.parameters.output[0].defaultVal.units.symbol === option.symbol ) {
              return true;
            }
          }
        }
      } else if (link.input.component.feelixio === 'component') {
        if (component.parameters.output[0].defaultVal && component.parameters.output[0].defaultVal.unitOptions) {
          for (const option of component.parameters.output[0].defaultVal.unitOptions) {
            if (link.input.parameter.defaultVal.units) {
              if (option.name === link.input.parameter.defaultVal.units.name &&
                  option.symbol === link.input.parameter.defaultVal.units.symbol) {
                return true;
              }
            }
          }
        }
      }
    }
    return false;
  }

  checkIfSimilarToOtherInputs(link: ComponentLink) {
    if (link.output.component.type === 'play' || link.output.component.type === 'repeat' ||
        link.output.component.type === 'switch') { return false; }
    if (link.output.parameter.defaultVal && link.output.parameter.defaultVal.units.name === 'category') {
      if (link.input.component.type === 'operator') {
        const component = this.feelixioFile.components.filter(c => c.id === link.input.component.id)[0];
        if (component) {
          if (component.component.operator.name === 'less-than' || component.component.operator.name === 'greater-than'
              || component.component.operator.name === 'equal or less' || component.component.operator.name === 'equal or greater' ) {
            return false;
          }
        }
      } else {
        return false;
      }
    }
    if (link.input.component.type !== 'operator' && link.output.parameter.defaultVal &&
        link.output.parameter.defaultVal.units.name === '') {
      return true;
    } else {
      const inputList = this.feelixioFile.links.filter(l => l.input.component.id === link.input.component.id && l.id !== link.id);
      if (inputList.length === 0) { return true; }
      for (const componentLink of inputList) {
        if (componentLink.output.component.feelixio === 'component' && link.output.component.feelixio === 'component') {
          if (componentLink.output.parameter.defaultVal.units.name === link.output.parameter.defaultVal.units.name &&
            componentLink.output.parameter.defaultVal.units.symbol === link.output.parameter.defaultVal.units.symbol) {
            return true;
          }
        } else {
          if (componentLink.output.component.feelixio === 'motor' && link.output.component.feelixio === 'motor') {
            for (const option of link.output.parameter.unitOptions) {
              if (componentLink.output.parameter.unitOptions.filter(u => u.name === option.name && u.symbol === option.symbol).length > 0) {
                return true;
              }
            }
          } else if (componentLink.output.component.feelixio === 'motor' && link.output.component.feelixio === 'component') {
            for (const option of componentLink.output.parameter.unitOptions) {
              if (option.name === link.output.parameter.defaultVal.units.name &&
                  option.symbol === link.output.parameter.defaultVal.units.symbol) {
                return true;
              }
            }
          } else if (componentLink.output.component.feelixio === 'component' && link.output.component.feelixio === 'motor') {
            for (const option of link.output.parameter.unitOptions) {
              if (option.name === componentLink.output.parameter.defaultVal.units.name &&
                  option.symbol === componentLink.output.parameter.defaultVal.units.symbol) {
                return true;
              }
            }
          }
        }
      }
      return false;
    }
  }


  checkUnitOptions(link: ComponentLink) {
    const component = this.feelixioFile.components.filter(c => c.id === link.output.component.id)[0];
    if (component) {
      const parameter = component.parameters.output.filter(p => p.id === link.output.parameter.id)[0];
      if (parameter) {
        const units = parameter.defaultVal && parameter.defaultVal.units ? parameter.defaultVal.units : component.component.units;
        return link.input.parameter.unitOptions
          .filter(u => u.name === units.name && u.symbol === units.symbol).length === 0 ? false : true;
      }
    }
    return false;
  }


  checkLinkValidity(link: ComponentLink) {

    if (link.output.component.feelixio === 'component' &&
       (link.output.component.type === 'switch' || link.output.component.type === 'arithmetic' ||
        link.output.component.type === 'map' || link.output.component.type === 'constrain')) {
      return this.checkSwitchOutput(link);
    }

    if (link.input.component.feelixio === 'component' &&
       (link.input.component.type === 'switch' || link.input.component.type === 'arithmetic')) {
      return this.checkSwitchInput(link);
    } else if (link.input.component.feelixio === 'component' &&
        (link.input.component.type === 'operator' || link.input.component.type === 'map' || link.input.component.type === 'constrain')) {
      if (link.output.component.feelixio === 'component' || link.output.component.feelixio === 'motor') {
        return this.checkIfSimilarToOtherInputs(link);
      } else {
        return false;
      }
    }

    if (link.output.component.feelixio === 'component') {
      return this.checkUnitOptions(link);

    } else if (link.output.component.feelixio === 'effect') {
      if (link.input.component.feelixio === 'effect' || link.input.parameter.type === link.output.parameter.type) {
        return false;
      }
      if (link.input.component.feelixio === 'motor') {
        if (link.input.component.combinedVariables !== link.output.component.combinedVariables) {
          return false;
        }
        if (link.input.parameter.name !== link.output.parameter.name) {
          return false;
        }
      }
    }
    return true;
  }
}
