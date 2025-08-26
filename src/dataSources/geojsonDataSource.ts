import type { Extent } from '@vcmap/core';
import { GeoJSONLayer } from '@vcmap/core';
import { check } from '@vcsuite/check';
import { getLogger } from '@vcsuite/logger';
import type Feature from 'ol/Feature.js';
import type { VcsUiApp } from '@vcmap/ui';
import type { AbstractDataSourceOptions } from './abstractDataSource.js';
import AbstractDataSource, { validateOptions } from './abstractDataSource.js';
import { getStringFileSizeFromkB } from '../exportHelper.js';
import FileResult from '../results/fileResult.js';
import { DataSourceOptions } from '../configManager.js';

export function isValidGeoJSONOptions(
  options: AbstractDataSourceOptions,
): options is GeoJSONDataSourceOptions {
  const abstractValidation = validateOptions(options);
  if (abstractValidation && options.type === DataSourceOptions.GEOJSON) {
    try {
      check((options as GeoJSONDataSourceOptions).geojsonUrl, String);
      return true;
    } catch (e: unknown) {
      getLogger('@vcmap/export/dataSources/GeoJSONDataSource').error(
        (e as Error).message,
      );
      return false;
    }
  }
  return false;
}

/** Complete options for GeoJSON data source */
export type GeoJSONDataSourceOptions = AbstractDataSourceOptions & {
  geojsonUrl: string;
  title: string;
};

class GeoJSONDataSource extends AbstractDataSource {
  /** the title of this data source to be rendered in the UI */
  title?: string;

  geojsonUrl: string;

  private _geojsonLayer: GeoJSONLayer;
  constructor(options: GeoJSONDataSourceOptions, app: VcsUiApp) {
    super(options, app);
    this.title = options.title;
    this.geojsonUrl = options.geojsonUrl;
    this._geojsonLayer = new GeoJSONLayer({
      name: '_exportGeojsonLayer',
      url: this.geojsonUrl,
      vectorProperties: {
        altitudeMode: 'clampToGround',
      },
    });
  }

  getResultFromFeature(feature: Feature): FileResult {
    const props = feature.getProperties();
    return new FileResult({
      href: `${this.url}/${props.url.replace(/^\//, '')}`,
      title: props.url,
      featureId: feature.getId()!,
      fileSize: props.fileSize
        ? getStringFileSizeFromkB(props.fileSize)
        : undefined,
    });
  }

  async getFeaturesInExtent(extent: Extent): Promise<Feature[]> {
    const layer = this._geojsonLayer;
    if (layer) {
      await layer.fetchData();
      return layer.source.getFeaturesInExtent(extent.extent);
    } else {
      throw new Error('GeoJSON layer does not exist.');
    }
  }
}

export default GeoJSONDataSource;
