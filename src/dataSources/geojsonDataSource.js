import { check } from '@vcsuite/check';
import { getLogger as getLoggerByName } from '@vcsuite/logger';
import { GeoJSONLayer } from '@vcmap/core';
import AbstractDataSource, { validateOptions } from './abstractDataSource.js';
import { getStringFileSizeFromkB } from '../exportHelper.js';
import FileResult from '../results/fileResult.js';

/**
 * @param {GeoJSONDataSourceOptions} options
 * @returns {boolean}
 */
export function validateGeoJSONOptions(options) {
  const abstractValidation = validateOptions(options);
  try {
    check(options.geojsonUrl, String);
  } catch (error) {
    getLoggerByName('@vcmap/export/dataSources/GeoJSONDataSource').error(
      error.message,
    );
    return false;
  }
  return abstractValidation;
}

/**
 * @typedef {Object} GeoJSONDataSourceOptionsAdditions
 * @property {string} geojsonUrl
 * @property {string} title
 * @typedef {import("./abstractDataSource").AbstractDataSourceOptions & GeoJSONDataSourceOptionsAdditions} GeoJSONDataSourceOptions
 * @api
 */

/**
 * @class
 * @export
 * @api
 * @extends {AbstractDataSource}
 */
class GeoJSONDataSource extends AbstractDataSource {
  /**
   * @param {GeoJSONDataSourceOptions} options
   * @param {import("@vcmap/core").VcsApp} app
   */
  constructor(options, app) {
    super(options, app);
    /**
     * the title of this data source to be rendered in the UI
     * @type {string|Object}
     * @api
     */
    this.title = options.title;

    /** @type {string} */
    this.geojsonUrl = options.geojsonUrl;

    /**
     * @type {import("@vcmap/core").GeoJSONLayer}
     * @private
     */
    this._geojsonLayer = new GeoJSONLayer({
      name: '_exportGeojsonLayer',
      url: this.geojsonUrl,
      vectorProperties: {
        altitudeMode: 'clampToGround',
      },
    });
  }

  /**
   * @inheritdoc
   */
  getResultFromFeature(feature) {
    const props = feature.getProperties();
    return new FileResult({
      href: `${this.url}/${props.url.replace(/^\//, '')}`,
      title: props.url,
      featureId: feature.getId(),
      fileSize: props.fileSize
        ? getStringFileSizeFromkB(props.fileSize)
        : undefined,
    });
  }

  /**
   * @inheritDoc
   */
  async getFeaturesInExtent(extent) {
    const layer = /** @type {import("@vcmap/core").GeoJSONLayer} */ (
      this._geojsonLayer
    );
    if (layer) {
      await layer.fetchData();
      return layer.source.getFeaturesInExtent(extent.extent);
    } else {
      throw new Error('GeoJSON layer does not exist.');
    }
  }
}

export default GeoJSONDataSource;
