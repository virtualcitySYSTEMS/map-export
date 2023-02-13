import disjoint from '@turf/boolean-disjoint';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON.js';
import { checkMaybe, check } from '@vcsuite/check';
import { getLogger } from '@vcsuite/logger';
import { Extent, mercatorProjection, ObliqueMap, VectorLayer } from '@vcmap/core';
import reprojectObliqueGeometry from '../obliqueHelper.js';

/**
 * @param {AbstractDataSourceOptions} options
 * @returns {boolean}
 */
export function validateOptions(options) {
  try {
    checkMaybe(options.baseUrl, String);
  } catch (e) {
    getLogger('@vcmap/export').error(e.message);
    return false;
  }
  return true;
}

/**
 * @typedef {Object} AbstractDataSourceOptions
 * @property {import("../configManager.js").DataSourceOptions} type - type of export data source to be used by the factory, one of 'oblique' or 'geojson'. 'cityModel' is ignored by the factory but is a valid data source.
 * @property {string} [baseUrl]
 * @api
 */

/**
 * @class
 * @export
 * @api
 */
class AbstractDataSource {
  /**
   * @param {AbstractDataSourceOptions} options
   * @param {import("@vcmap/core").VcsApp} app
   */
  constructor(options, app) {
    /** @type {string} */
    this.url = options.baseUrl ? options.baseUrl.replace(/\/$/, '') : '';
    /** @type {import("@vcmap/core").VcsApp} */
    this._app = app;

    let layer = this._app.layers.getByKey('_exportResultLayer');
    if (!layer) {
      layer = new VectorLayer({
        projection: mercatorProjection,
        name: '_exportResultLayer',
        classificationType: 'both',
        altitudeMode: 'clambToGround',
        allowPicking: false,
      });
      this._app.layers.add(layer);
    }
    /**
     * @type {import("@vcmap/core").VectorLayer}
     * @private
     */
    this._resultLayer = /** @type {import("@vcmap/core").VectorLayer} */ (layer);
    /**
     * the results of the last query
     * @type {Array<import("../results/abstractResult").default>}
     * @api
     */
    this.results = [];
  }

  /**
   * @returns {import("@vcmap/core").VectorLayer}
   */
  get resultLayer() {
    return this._resultLayer;
  }

  /**
   * query the given data source based on a features geometry
   * @param {import("ol").Feature<import("ol/geom/Geometry").default>} feature The feature that is used to query the overlapping data sources.
   * @api
   * @returns {Promise<void>}
   */
  async query(feature) {
    check(feature, Feature);
    this.clear();

    const geom = this._app.maps.activeMap instanceof ObliqueMap ?
      await reprojectObliqueGeometry(feature, this._app) :
      feature.getGeometry();

    if (geom) {
      const extent = new Extent({
        coordinates: geom.getExtent(),
        projection: mercatorProjection.toJSON(),
      });

      if (extent.isValid()) {
        const geojson = new GeoJSON();
        // TODO: do I need to provide crs information?
        const target = geojson.writeFeatureObject(new Feature(geom));
        const features = (await this.getFeaturesInExtent(extent))
          .map((candidateFeature) => {
            const candidate = geojson.writeFeatureObject(candidateFeature);
            if (!disjoint(candidate, target)) {
              const result = this.getResultFromFeature(candidateFeature);
              this.results.push(result);
              return candidateFeature;
            }
            return null;
          })
          .filter(f => f);

        this._resultLayer.addFeatures(features);
        this._resultLayer.featureVisibility.hideObjects(features.map(f => f.getId()));
      }
    }
  }

  /**
   * clears the results and the result layer
   * @api
   */
  clear() {
    this.results.splice(0);
    this._resultLayer.removeAllFeatures();
  }

  /**
   * @param {import("ol").Feature<import("ol/geom/Geometry").default>} feature
   * @returns {import("../results/abstractResult").default}
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  getResultFromFeature(feature) {
    throw new Error('Implementation Error');
  }

  /**
   * @param {import("@vcmap/core").Extent} extent
   * @returns {Promise<Array<import("ol").Feature<import("ol/geom/Geometry").default>>>}
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars,class-methods-use-this
  async getFeaturesInExtent(extent) {
    throw new Error('Implementation Error');
  }
}

export default AbstractDataSource;
