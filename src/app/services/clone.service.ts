import { Injectable } from '@angular/core';
import * as clone from 'clone';


@Injectable({providedIn: 'root'})
export class CloneService {

  // deepClone<T>(value): T {
  //     return clone<T>(value);
  // }
  public deepClone<T>(source: T): T {
    return Array.isArray(source)
    ? source.map(item => this.deepClone(item))
    : source instanceof Date
    ? new Date(source.getTime())
    : source && typeof source === 'object'
          ? Object.getOwnPropertyNames(source).reduce((o, prop) => {
             Object.defineProperty(o, prop, Object.getOwnPropertyDescriptor(source, prop));
             o[prop] = this.deepClone(source[prop]);
             return o;
          }, Object.create(Object.getPrototypeOf(source)))
    : source as T;
  }

}
