import GeoJSONDataSource, {
  validateGeoJSONOptions,
} from './geojsonDataSource.js';
import ObliqueDataSource, {
  validateObliqueOptions,
} from './obliqueDataSource.js';
import { DataSourceOptions } from '../configManager.js';

/**
 * @param {import("./abstractDataSource").AbstractDataSourceOptions} options
 * @param {import("@vcmap/core").VcsApp} app The VcsApp instance.
 * @returns {?import("./abstractDataSource").default}
 * @throws Error if datasource type is not supported.
 */
export default function createDataSourceFromConfig(options, app) {
  if (
    options.type === DataSourceOptions.GEOJSON &&
    validateGeoJSONOptions(
      /** @type {import("./geojsonDataSource").GeoJSONDataSourceOptions} */ (
        options
      ),
    )
  ) {
    return new GeoJSONDataSource(
      /** @type {import("./geojsonDataSource").GeoJSONDataSourceOptions} */ (
        options
      ),
      app,
    );
  } else if (
    options.type === DataSourceOptions.OBLIQUE &&
    validateObliqueOptions(
      /** @type {import("./obliqueDataSource").ObliqueDataSourceOptions} */ (
        options
      ),
      app,
    )
  ) {
    return new ObliqueDataSource(
      /** @type {import("./obliqueDataSource").ObliqueDataSourceOptions} */ (
        options
      ),
      app,
    );
  } else if (options.type === DataSourceOptions.CITY_MODEL) {
    return null;
  } else {
    throw new Error(`Datasource "${options.type}" not supported`);
  }
}
