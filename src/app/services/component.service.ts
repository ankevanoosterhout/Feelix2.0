import { Injectable } from '@angular/core';
import { ComponentObject, ValueComponent, Operator, Value, Value3,
    Category, Unit, ParameterDetails, Value6 } from '../models/component.model';

@Injectable()
export class ComponentService {

  value = new ComponentObject(
          new ValueComponent(new Value(1,
        [ new Unit('', ''), new Unit('percentages', '&percnt;'), new Unit('degrees', '&deg;'),
          new Unit('points per revolution', 'ppr'), new Unit('milliseconds', 'ms'), new Unit('seconds', 's'),
          new Unit('RPM', 'rpm'), new Unit('cm', 'cm'), new Unit('mm', 'mm') ]), null,
          new Unit('', ''), 0), 'value', 'value.svg', [],
        [ new ParameterDetails('value', '', 'right', [], new ValueComponent(new Value(1,
        [ new Unit('', ''), new Unit('percentages', '&percnt;'), new Unit('degrees', '&deg;'),
          new Unit('points per revolution', 'ppr'), new Unit('milliseconds', 'ms'), new Unit('seconds', 's'),
          new Unit('RPM', 'rpm'), new Unit('cm', 'cm'), new Unit('mm', 'mm') ]), null, new Unit('', ''), 0)) ]);

  slider = new ComponentObject(
           new ValueComponent(new Value3(0, 100, 50,
         [ new Unit('', ''), new Unit('percentages', '&percnt;'), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
           new Unit('milliseconds', 'ms'), new Unit('seconds', 's'), new Unit('RPM', 'rpm'), new Unit('cm', 'cm'), new Unit('mm', 'mm') ]),
           null, new Unit('', ''), 0), 'slider', 'slider.svg', [],
         [ new ParameterDetails('value', '', 'right', [], new ValueComponent(new Value3(0, 100, 50,
         [ new Unit('', ''), new Unit('percentages', '&percnt;'), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
           new Unit('milliseconds', 'ms'), new Unit('seconds', 's'), new Unit('RPM', 'rpm'), new Unit('cm', 'cm'), new Unit('mm', 'mm') ]),
           null, new Unit('', ''), 0)) ]);

  direction = new ComponentObject(
              new ValueComponent(null, new Category('any', 'Direction', ['any', 'clockwise', 'counterclockwise']),
              new Unit('category', 'direction'), null), 'direction', 'direction.svg', [],
            [ new ParameterDetails('category', '', 'right', [], new ValueComponent(null, new Category('any', 'Direction',
            ['any', 'clockwise', 'counterclockwise']), new Unit('category', 'direction'), null)) ]);

  align = new ComponentObject(
          new ValueComponent(null, new Category('left', 'Align', ['left', 'center', 'right']),
          new Unit('category', 'align'), null), 'align', 'align.svg',
        [ new ParameterDetails('input', '', 'left', [ new Unit('', ''), new Unit('category', 'direction') ], [])],
        [ new ParameterDetails('category', '', 'right', [], new ValueComponent(null, new Category('left', 'Align',
        ['left', 'center', 'right']), new Unit('category', 'align'), null)) ]);

  boolean = new ComponentObject(new ValueComponent(null, new Category('false', 'Value', ['true', 'false'])), 'boolean', 'boolean.svg', [],
          [ new ParameterDetails('category', '', 'right', [],
            new ValueComponent(null, new Category('false', 'Value', ['true', 'false']),
            new Unit('category', 'boolean'), null)) ]);

  position = new ComponentObject(new ValueComponent(new Value(0, [ new Unit('degrees', '&deg;'),
             new Unit('points per revolution', 'ppr')]), null, new Unit('degrees', '&deg;'), null), 'position', 'pos.svg', [],
           [ new ParameterDetails('position', '', 'right', [ new Unit('degrees', '&deg;') ],
             new ValueComponent(new Value(0, [ new Unit('degrees', '&deg;'),
             new Unit('points per revolution', 'ppr')]), null, new Unit('degrees', '&deg;'), 0)) ]);

  angle = new ComponentObject(new ValueComponent(new Value(90, [ new Unit('degrees', '&deg;'),
            new Unit('points per revolution', 'ppr') ]), null, new Unit('degrees', '&deg;'), 0), 'angle', 'range.svg', [],
          [ new ParameterDetails('angle', '', 'right', [],
            new ValueComponent(new Value(90, [ new Unit('degrees', '&deg;'),
            new Unit('points per revolution', 'ppr') ]), null, new Unit('degrees', '&deg;'), 0)) ]);

  timer = new ComponentObject(new ValueComponent(new Value(2000, [new Unit('milliseconds', 'ms')]), null,
            new Unit('milliseconds', 'ms'), null), 'timer', 'timer.svg',
          [ new ParameterDetails('Start', 'S', 'left', [ new Unit('category', 'boolean') ],
            new ValueComponent(null, new Category('false', 'Value', ['true', 'false']), new Unit('category', 'boolean'), null)),
            new ParameterDetails('Reset', '', 'top', [ new Unit('category', 'boolean') ],
            new ValueComponent(null, new Category('false', 'Value', ['true', 'false']), new Unit('category', 'boolean'), null)),
            new ParameterDetails('Time', '', 'top', [ new Unit('milliseconds', 'ms'), new Unit('seconds', 's'), new Unit('', '') ],
            new ValueComponent(new Value(2000, [new Unit('milliseconds', 'ms')]), null, new Unit('milliseconds', 'ms'), null))],
          [ new ParameterDetails('End', 'E', 'right', [ new Unit('category', 'boolean') ],
            new ValueComponent(null, new Category('false', 'Value', ['true', 'false']), new Unit('category', 'boolean'), null)) ]);

  arithmetic = new ComponentObject(new Operator(new Unit('plus', '&#43;'), [ new Unit('plus', '&plus;'), new Unit('minus', '&minus;'),
               new Unit('multiply', '&times;'), new Unit('divide', '&divide;')], new Unit('', '')), 'arithmetic', 'operator.svg',
               [ new ParameterDetails('', '', 'left', [],
                 new ValueComponent(new Value(0, [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
                 new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), null)),
                 new ParameterDetails('', '', 'left', [],
                 new ValueComponent(new Value(0, [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
                 new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), null)) ],
               [ new ParameterDetails('Out', '', 'right', [],
                 new ValueComponent(new Value(0, [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
                 new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), null)) ]);

  operator = new ComponentObject(new Operator(new Unit('equal', '&equals;&equals;'),
            [ new Unit('equal', '&equals;&equals;'), new Unit('not-equal', '!&equals;'),
              new Unit('less-than', '&lt;'), new Unit('greater-than', '&gt;'),
              new Unit('equal or less', '&lt;&equals;'), new Unit('equal or greater', '&gt;&equals;'),
              new Unit('and', '&&'), new Unit('or', '||')],
              new Unit('category', 'boolean')), 'operator', 'operator2.svg',
              [ new ParameterDetails('inputOne', '', 'left', [],
                new ValueComponent(new Value(0, [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
                new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), null)),
                new ParameterDetails('inputTwo', '', 'left', [],
                new ValueComponent(new Value(0, [ new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
                new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), null)) ],
              [ new ParameterDetails('category', '', 'right', [ new Unit('category', 'boolean') ],
                new ValueComponent(null, new Category(null, 'Value', ['true', 'false']), new Unit('category', 'boolean'), null)) ]);

  switch = new ComponentObject(
        new Operator(new Unit('', ''), [new Unit('', '')], new Unit('', '')), 'switch', 'switch.svg',
      [ new ParameterDetails('', '', 'left', [], null),
        new ParameterDetails('', '', 'left', [], null) ],
      [ new ParameterDetails('value', '', 'right', [],
        new ValueComponent(null, null, new Unit('', ''), null)) ]);

  play = new ComponentObject(
        new Operator(new Unit('', ''), [ new Unit('play', '') ], new Unit('play', '')), 'play', 'play.svg',
      [ new ParameterDetails('', '', 'left', [ new Unit('play', '') ], null),
        new ParameterDetails('', '', 'left', [ new Unit('play', '') ], null) ], []);

  constrain = new ComponentObject(
        new Operator(new Unit('', ''), [new Unit('', '')], new Unit('', '')), 'constrain', 'constrain.svg',
      [ new ParameterDetails('Min input', '', 'top', [new Unit('', '')],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0)),
        new ParameterDetails('Input', '', 'left', [new Unit('', '')],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0)),
        new ParameterDetails('Max input', '', 'bottom', [new Unit('', '')],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0)) ],
      [ new ParameterDetails('value', '', 'right', [new Unit('', '')],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0)) ]);

  map = new ComponentObject(
        new Operator(new Unit('', ''), [new Unit('', '')], new Unit('', '')), 'map', 'map.svg',
      [ new ParameterDetails('Min input', '', 'top', [],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0)),
        new ParameterDetails('Input', '', 'left', [],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0)),
        new ParameterDetails('Max input', '', 'bottom', [],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0)),
        new ParameterDetails('Min output', '', 'top', [],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0)),
        new ParameterDetails('Max output', '', 'bottom', [],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0))],
      [ new ParameterDetails('value', '', 'right', [],
        new ValueComponent(new Value(0, [new Unit('', ''), new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'),
        new Unit('milliseconds', 'ms'), new Unit('seconds', 's')]), null, new Unit('', ''), 0))]);

  repeat = new ComponentObject(
        new Operator(new Unit('repeat', '&part;'), [], new Unit('repeat', '&part;')), 'repeat', 'repeat.svg',
      [ new ParameterDetails('Times', 'T', 'left', [ new Unit('', '') ],
        new ValueComponent(null, new Category('1', 'Times', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']),
        new Unit('category', 'time'), null), true),
        new ParameterDetails('Even spacing', 'E', 'left', [ new Unit('category', 'boolean') ],
        new ValueComponent(null, new Category('true', 'Even spacing', ['true', 'false']), new Unit('category', 'boolean'), null), true),
        new ParameterDetails('Spacing', 'S', 'left', [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr')],
        new ValueComponent(new Value(0, [ new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr')]), null,
        new Unit('degrees', '&deg;'), 0))],
      [ new ParameterDetails('repeat', '', 'right', [new Unit('repeat', '&part;')],
        new ValueComponent(new Value(1, [ new Unit('repeat', '&part;') ]), null, new Unit('repeat', '&part;'), null)) ]);

  linear = new ComponentObject(new ValueComponent(new Value(10,
      [ new Unit('percentages', '&percnt;') ]), null, new Unit('percentages', '&percnt;'), null), 'linear', 'linear.svg',
      [ new ParameterDetails('Speed', '', 'left', [ new Unit('RPM', 'rpm') ],
        new ValueComponent(new Value3(0, 50, 0,
        [ new Unit('RPM', 'rpm') ]), null, new Unit('RPM', 'rpm'), null), false),
        new ParameterDetails('Position', '', 'left', [ new Unit('degrees', '&deg;') ],
        new ValueComponent(new Value3(0, 50, 0,
        [ new Unit('points per revolution', 'ppr'), new Unit('degrees', '&deg;') ]), null, new Unit('degrees', '&deg;'), null), true),
        // new ParameterDetails('Custom', '', 'left', [ new Unit('', '') ],
        // new ValueComponent(new Value3(0, 100, 0,
        // [ new Unit('', '') ]), null, new Unit('', ''), null), true)
        ],
      [ new ParameterDetails('output', '', 'right', [ new Unit('dXdY', '&part;') ],
        new ValueComponent(new Value6(10, 30, 10, 0, 50, 25,
      [ new Unit('percentages', '&percnt;') ], [ new Unit('RPM', 'rpm') ]), null, new Unit('dXdY', '&part;'), null)) ]);


  custom = new ComponentObject(new ValueComponent(new Value(0, [ new Unit('', '') ]), null,
          new Unit('int', 'int'), 0), 'custom', 'custom2.svg', [],
        [ new ParameterDetails('value', '', 'right', [ new Unit('', ''), new Unit('percentages', '&percnt;'),
          new Unit('degrees', '&deg;'), new Unit('points per revolution', 'ppr'), new Unit('milliseconds', 'ms'), new Unit('seconds', 's'),
          new Unit('RPM', 'rpm'), new Unit('cm', 'cm'), new Unit('mm', 'mm') ],
          new ValueComponent(new Value(0, [ new Unit('', ''), new Unit('percentages', '&percnt;'), new Unit('degrees', '&deg;'),
          new Unit('points per revolution', 'ppr'), new Unit('milliseconds', 'ms'), new Unit('seconds', 's'),
          new Unit('RPM', 'rpm'), new Unit('cm', 'cm'), new Unit('mm', 'mm') ]),
          new Category('int', 'Type', ['int', 'float', 'boolean']), new Unit('', ''), null)) ]);

  // random = new ComponentObject();


  public componentList = [ this.value, this.slider, this.direction, this.boolean, this.align, this.position, this.angle, this.repeat,
    this.timer, this.arithmetic, this.operator, this.switch, this.constrain, this.map, this.linear, this.custom ];


  constructor() {}

  getComponents() {
    return this.componentList;
  }

  getComponentType(type: string) {
    return this.componentList.filter(c => c.type === type)[0];
  }
}
