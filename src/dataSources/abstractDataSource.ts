import disjoint from '@turf/boolean-disjoint';
import Feature from 'ol/Feature';
import GeoJSON from 'ol/format/GeoJSON.js';
import { check, maybe } from '@vcsuite/check';
import { getLogger } from '@vcsuite/logger';
import {
  Extent,
  markVolatile,
  mercatorProjection,
  ObliqueMap,
  VectorLayer,
} from '@vcmap/core';
import type { VcsUiApp } from '@vcmap/ui';
import { name } from '../../package.json';
import reprojectObliqueGeometry from '../obliqueHelper.js';
import type AbstractResult from '../results/abstractResult.js';
import type { GeoJSONDataSourceOptions } from './geojsonDataSource';
import type { ObliqueDataSourceOptions } from './obliqueDataSource';
import type { DataSourceOptions } from '../configManager.js';

export type AbstractDataSourceOptions = {
  baseUrl?: string;
  title?: string;
  help?: string;
  /** type of export data source to be used by the factory, one of 'oblique' or 'geojson'. 'cityModel' is ignored by the factory but is a valid data source. */
  type: DataSourceOptions;
};

export type OneOfDataSourceOptions =
  | ObliqueDataSourceOptions
  | GeoJSONDataSourceOptions
  | AbstractDataSourceOptions;

export function validateOptions(
  options: AbstractDataSourceOptions,
): options is AbstractDataSourceOptions {
  try {
    check(options.baseUrl, maybe(String));
  } catch (e: unknown) {
    getLogger(name).error((e as Error).message);
    return false;
  }
  return true;
}

class AbstractDataSource {
  type: DataSourceOptions;
  url: string;

  protected _app: VcsUiApp;

  private _resultLayer: VectorLayer;

  /** the results of the last query */
  results: Array<AbstractResult>;

  constructor(options: AbstractDataSourceOptions, app: VcsUiApp) {
    this._app = app;
    this.type = options.type;
    this.url = options.baseUrl ? options.baseUrl.replace(/\/$/, '') : '';

    let layer = this._app.layers.getByKey('_exportResultLayer') as VectorLayer;
    if (!layer) {
      layer = new VectorLayer({
        projection: mercatorProjection,
        name: '_exportResultLayer',
        allowPicking: false,
        vectorProperties: {
          classificationType: 'both',
          altitudeMode: 'clampToGround',
        },
      });
      markVolatile(layer);
      this._app.layers.add(layer);
    }
    this._resultLayer = layer;
    /**
     * the results of the last query
     * @type {Array<import("../results/abstractResult").default>}
     */
    this.results = [];
  }

  get resultLayer(): VectorLayer {
    return this._resultLayer;
  }

  /**
   * query the given data source based on a features geometry
   * @param feature The feature that is used to query the overlapping data sources.
   */
  async query(feature: Feature): Promise<void> {
    check(feature, Feature);
    this.clear();

    const geom =
      this._app.maps.activeMap instanceof ObliqueMap
        ? await reprojectObliqueGeometry(feature, this._app)
        : feature.getGeometry();

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
          .filter((f) => !!f);

        this._resultLayer.addFeatures(features);
        this._resultLayer.featureVisibility.hideObjects(
          features.map((f) => f.getId()!),
        );
      }
    }
  }

  /**
   * clears the results and the result layer
   */
  clear(): void {
    this.results.splice(0);
    this._resultLayer.removeAllFeatures();
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars
  getResultFromFeature(_feature?: Feature): AbstractResult {
    throw new Error('Implementation Error');
  }

  // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-unused-vars, @typescript-eslint/require-await
  async getFeaturesInExtent(_extent: Extent): Promise<Array<Feature>> {
    throw new Error('Implementation Error');
  }
}

export default AbstractDataSource;
