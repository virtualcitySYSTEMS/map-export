import type { VcsUiApp } from '@vcmap/ui';
import GeoJSONDataSource, {
  isValidGeoJSONOptions,
} from './geojsonDataSource.js';
import ObliqueDataSource, {
  isValidObliqueOptions,
} from './obliqueDataSource.js';
import { DataSourceOptions } from '../configManager.js';
import type { AbstractDataSourceOptions } from './abstractDataSource.js';

export default function createDataSourceFromConfig(
  options: AbstractDataSourceOptions,
  app: VcsUiApp,
): GeoJSONDataSource | ObliqueDataSource | null {
  if (isValidGeoJSONOptions(options)) {
    return new GeoJSONDataSource(options, app);
  } else if (isValidObliqueOptions(options, app)) {
    return new ObliqueDataSource(options, app);
  } else if (options.type === DataSourceOptions.CITY_MODEL) {
    return null;
  } else {
    throw new Error(`Datasource "${options.type}" not valid`);
  }
}

export function validateDataSourceOptions(
  app: VcsUiApp,
  options: AbstractDataSourceOptions,
): boolean {
  return (
    isValidGeoJSONOptions(options) ||
    isValidObliqueOptions(options, app) ||
    options.type === DataSourceOptions.CITY_MODEL
  );
}
