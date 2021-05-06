import { Injectable } from '@angular/core';
import { DrawingPlaneConfig } from '../models/drawing-plane-config.model';
import { Curve } from '../models/ease-functions.model';
import { Node, Path } from '../models/node.model';
import { Color } from '../models/colors.model';
import { v4 as uuid } from 'uuid';
import { DrawingService } from './drawing.service';
import { Unit } from '../models/effect.model';

@Injectable()
export class EaseFunctionLibraryService {

  public config: DrawingPlaneConfig;

  duration = 50;
  range = 360;


  public functions = [
    new Curve('easeInSine', 'C', 0, 0, 0.47, 0, 0.745, 0.715, 1, 1),
    new Curve('easeOutSine', 'C', 0, 0, 0.39, 0.575, 0.565, 1, 1, 1),
    new Curve('easeInOutSine', 'C', 0, 0, 0.445, 0.05, 0.55, 0.95, 1, 1),
    new Curve('easeInQuad', 'C', 0, 0, 0.55, 0.085, 0.068, 0.53, 1, 1),
    new Curve('easeOutQuad', 'C', 0, 0, 0.25, 0.46, 0.45, 0.94, 1, 1),
    new Curve('easeInOutQuad', 'C', 0, 0, 0.455, 0.03, 0.515, 0.955, 1, 1),
    new Curve('easeInCubic', 'C', 0, 0, 0.55, 0.055, 0.675, 0.19, 1, 1),
    new Curve('easeOutCubic', 'C', 0, 0, 0.215, 0.61, 0.355, 1, 1, 1),
    new Curve('easeInOutCubic', 'C', 0, 0, 0.645, 0.045, 0.355, 1, 1, 1),
    new Curve('easeInQuart', 'C', 0, 0, 0.895, 0.03, 0.685, 0.22, 1, 1),
    new Curve('easeOutQuart', 'C', 0, 0, 0.165, 0.84, 0.44, 1, 1, 1),
    new Curve('easeInOutQuart', 'C', 0, 0, 0.77, 0, 0.175, 1, 1, 1),
    new Curve('easeInQuint', 'C', 0, 0, 0.755, 0.05, 0.855, 0.06, 1, 1),
    new Curve('easeOutQuint', 'C', 0, 0, 0.23, 1, 0.32, 1, 1, 1),
    new Curve('easeInOutQuint', 'C', 0, 0, 0.86, 0, 0.07, 1, 1, 1),
    new Curve('easeInExpo', 'C', 0, 0, 0.95, 0.05, 0.795, 0.035, 1, 1),
    new Curve('easeOutExpo', 'C', 0, 0, 0.19, 1, 0.22, 1, 1, 1),
    new Curve('easeInOutExpo', 'C', 0, 0, 1, 0, 0, 1, 1, 1),
    new Curve('easeOutCirc', 'C', 0, 0, 0.075, 0.82, 0.165, 1, 1, 1),
    new Curve('easeInCirc', 'C', 0, 0, 0.6, 0.04, 0.98, 0.335, 1, 1),
    new Curve('easeInOutCirc', 'C', 0, 0, 0.785, 0.135, 0.15, 0.86, 1, 1),
    new Curve('easeInBack', 'C', 0, 0, 0.6, -0.28, 0.735, 0.045, 1, 1),
    new Curve('easeOutBack', 'C', 0, 0, 0.6, -0.28, 0.735, 0.045, 1, 1),
    new Curve('easeInOutBack', 'C', 0, 0, 0.68, -0.55, 0.265, 1.55, 1, 1)
  ];

  constructor(private drawingService: DrawingService) {

    this.config = this.drawingService.config;

  }



  getAllEaseFunctions() {
    const easeFunctions = [];
    // create path
    for (const f of this.functions) {
      const path = new Path(uuid());
      let index = 0;
      let nodeID: string;
      let type: string;
      for (const p of f.points) {
        let cpID = uuid();
        type = 'cp';
        if (index === 0 || index === 3) {
          nodeID = uuid();
          cpID = null;
          type = 'node';
        }
        const node = new Node(nodeID, path.id, cpID, type, p, p);
        path.nodes.push(node);
        index++;
      }
      path.nodes[1].id = path.nodes[0].id;
      path.nodes[2].id = path.nodes[3].id;

      
    }
    return easeFunctions;
  }


}
