import { Injectable } from '@angular/core';
import { v4 as uuid } from 'uuid';
import { Effect, Parameter } from '../models/position-effect.model';
import { Colors } from '../models/colors.model';
import { Value3, Value6, Unit } from '../models/component.model';


@Injectable()
export class VariableService {

  public colors = new Colors().list;

  public infiniteRotation = false;


  public effects = [
    new Effect(uuid(), 'Barrier', '../../src/assets/icons/effects/hardstop.svg', 0),
    new Effect(uuid(), 'Spring', '../../src/assets/icons/effects/spring.svg', 1),
    new Effect(uuid(), 'Friction', '../../src/assets/icons/effects/friction.svg', 2),
    new Effect(uuid(), 'Damper', '../../src/assets/icons/effects/damper.svg', 3)
  ];

  constructor() { }


  getEffects() {
    this.effects[0].type = 'limit';
    this.effects[1].type = 'limit';
    this.effects[0].interface.colors = [{ name: 'gray', hash: '#222' }, { name: 'gray', hash: '#333' }];
    this.effects[1].interface.colors = [{ name: 'light gray', hash: '#777' }, { name: 'light gray', hash: '#999' }];
    this.effects[2].type = 'constant';
    this.effects[3].type = 'constant';
    this.effects[2].interface.colors = [{ name: 'dOrange', hash: '#d05827' }, { name: 'orange', hash: '#f2662d' }];
    this.effects[3].interface.colors = [{ name: 'dMagenta', hash: '#cc1165' }, { name: 'magenta', hash: '#ed1a75' }];
    let copyOfEffect = JSON.stringify(this.effects[0]);
    this.effects[0] = this.createStandardRulesHardstop(JSON.parse(copyOfEffect));
    copyOfEffect = JSON.stringify(this.effects[1]);
    this.effects[1] = this.createStandardRulesSpring(JSON.parse(copyOfEffect));
    copyOfEffect = JSON.stringify(this.effects[2]);
    this.effects[2] = this.createStandardRulesFriction(JSON.parse(copyOfEffect));
    copyOfEffect = JSON.stringify(this.effects[3]);
    this.effects[3] = this.createStandardRulesDamper(JSON.parse(copyOfEffect));

    return this.effects;
  }


  createStandardRulesHardstop(effect: any) {
    const intensity = new Value3(0, 100, 80, [ new Unit() ]);
    effect.details.parameter = new Parameter('intensity', intensity);
    return effect;
  }

  createStandardRulesSpring(effect: any) {
    const intensity = new Value6(0, 0, 0, 0, 100, 50, [ new Unit('position', '&deg;') ], [ new Unit('intensity', '&percnt;') ]);
    effect.details.parameter = new Parameter('intensity', intensity);
    return effect;
  }

  createStandardRulesFriction(effect: any) {
    const intensity = new Value3(0, 100, 50, [ new Unit() ]);
    effect.details.parameter = new Parameter('intensity', intensity);
    return effect;
  }

  createStandardRulesDamper(effect: any) {
    const intensityOverSpeed = new Value6(0, 80, 0, 0, 100, 20, [ new Unit('speed', 'rpm') ], [ new Unit('intensity', '&percnt;') ]);
    effect.details.parameter = new Parameter('intensity', intensityOverSpeed);
    return effect;
  }

}


