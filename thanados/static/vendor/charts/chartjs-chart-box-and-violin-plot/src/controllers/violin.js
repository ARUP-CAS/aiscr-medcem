﻿'use strict';

import {asViolinStats} from '../data';
import * as Chart from 'chart.js';
import base, {verticalDefaults, horizontalDefaults, toFixed} from './base';

const defaults = {
  tooltips: {
    callbacks: {
      label(item, data) {
        const datasetLabel = data.datasets[item.datasetIndex].label || '';
        const value = item.value;
        const label = `${datasetLabel} ${typeof item.xLabel === 'string' ? item.xLabel : item.yLabel}`;
        return `${label} (${toFixed.call(this, value)})`;
      }
    }
  }
};

Chart.defaults.violin = Chart.helpers.merge({}, [Chart.defaults.bar, verticalDefaults, defaults]);
Chart.defaults.horizontalViolin = Chart.helpers.merge({}, [Chart.defaults.horizontalBar, horizontalDefaults, defaults]);

const controller = {
  ...base,
  dataElementType: Chart.elements.Violin,

  _elementOptions() {
    return this.chart.options.elements.violin;
  },
  /**
   * @private
   */
  _updateElementGeometry(elem, index, reset) {
    Chart.controllers.bar.prototype._updateElementGeometry.call(this, elem, index, reset);
    const custom = elem.custom || {};
    const options = this._elementOptions();
    elem._model.violin = this._calculateViolinValuesPixels(this.index, index, custom.points !== undefined ? custom.points : options.points);
  },

  /**
   * @private
   */

  _calculateViolinValuesPixels(datasetIndex, index, points) {
    const scale = this._getValueScale();
    const data = this.chart.data.datasets[datasetIndex].data[index];
    const violin = asViolinStats(data);

    if ((!Array.isArray(data) && typeof data === 'number' && !Number.isNaN) || violin == null) {
      return {
        min: data,
        max: data,
        median: data,
        coords: [{v: data, estimate: Number.NEGATIVE_INFINITY}],
        maxEstimate: Number.NEGATIVE_INFINITY
      };
    }

    const range = violin.max - violin.min;
    const samples = [];
    const inc = range / points;
    for (let v = violin.min; v <= violin.max && inc > 0; v += inc) {
      samples.push(v);
    }
    if (samples[samples.length - 1] !== violin.max) {
      samples.push(violin.max);
    }
    const coords = violin.coords || violin.kde(samples).map((v) => ({v: v[0], estimate: v[1]}));
    const r = {
      min: scale.getPixelForValue(violin.min),
      max: scale.getPixelForValue(violin.max),
      median: scale.getPixelForValue(violin.median),
      coords: coords.map(({v, estimate}) => ({v: scale.getPixelForValue(v), estimate})),
      maxEstimate: coords.reduce((a, d) => Math.max(a, d.estimate), Number.NEGATIVE_INFINITY)
    };
    this._calculateCommonModel(r, data, violin, scale);
    return r;
  }
};
/**
 * This class is based off controller.bar.js from the upstream Chart.js library
 */
export const Violin = Chart.controllers.violin = Chart.controllers.bar.extend(controller);
export const HorizontalViolin = Chart.controllers.horizontalViolin = Chart.controllers.horizontalBar.extend(controller);
