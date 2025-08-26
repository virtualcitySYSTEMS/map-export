import type { Extent } from '@vcmap/core';
import { ObliqueCollection, ObliqueViewDirection } from '@vcmap/core';
import { parseBoolean } from '@vcsuite/parsers';
import { check, maybe } from '@vcsuite/check';
import { getLogger } from '@vcsuite/logger';
import type { VcsUiApp } from '@vcmap/ui';
import type Feature from 'ol/Feature.js';
import type { AbstractDataSourceOptions } from './abstractDataSource.js';
import AbstractDataSource, { validateOptions } from './abstractDataSource.js';
import FileResult from '../results/fileResult.js';
import type { ObliqueDownloadState } from '../results/obliqueResult.js';
import ObliqueResult from '../results/obliqueResult.js';
import { DataSourceOptions } from '../configManager.js';

export function isValidObliqueOptions(
  options: AbstractDataSourceOptions,
  app: VcsUiApp,
): options is ObliqueDataSourceOptions {
  const abstractValidation = validateOptions(options);

  if (abstractValidation && options.type === DataSourceOptions.OBLIQUE) {
    const { obliqueCollectionName, fileExtension, resolution } =
      options as ObliqueDataSourceOptions;
    try {
      check(obliqueCollectionName, String);
      check(
        app.obliqueCollections.getByKey(obliqueCollectionName),
        ObliqueCollection,
      );
      check(fileExtension, maybe(String));
      check(resolution, maybe(Number));
      return true;
    } catch (e: unknown) {
      getLogger('@vcmap/export/dataSources/ObliqueDataSource').error(
        (e as Error).message,
      );
      return false;
    }
  }
  return false;
}

export type ObliqueDataSourceOptions = AbstractDataSourceOptions & {
  obliqueCollectionName: string;
  fileExtension?: string;
  /** Oblique images don't have to be put together from tiles but can be downloaded as a FileResult directly. */
  dedicatedSource?: boolean;
  resolution?: number;
  /** The state of the download process including progress from 0 to 100, how many images are downloaded and which one is the current, if the download is running or not */
  downloadState: ObliqueDownloadState;
};

class ObliqueDataSource extends AbstractDataSource {
  dedicatedSource: boolean;
  obliqueCollectionName: string;
  fileExtension: string;
  viewDirectionFilter?: ObliqueViewDirection | null = null;
  resolution?: number;
  downloadState: ObliqueDownloadState;

  constructor(options: ObliqueDataSourceOptions, app: VcsUiApp) {
    super(options, app);
    this.dedicatedSource = parseBoolean(options.dedicatedSource, false);
    this.obliqueCollectionName = options.obliqueCollectionName;
    this.fileExtension = options.fileExtension || 'jpg';
    this.resolution = options.resolution;
    this.downloadState = options.downloadState;
  }

  /** generates a download link for a given image, if this data source has a dedicated source */
  getUriForImage(imageName: string): string {
    return `${this.url}/${imageName}.${this.fileExtension}`;
  }

  getResultFromFeature(feature: Feature): FileResult | ObliqueResult {
    const imageName = String(feature.getId());
    if (this.dedicatedSource) {
      return new FileResult({
        title: imageName,
        href: this.getUriForImage(imageName),
        featureId: imageName,
        fileSize: undefined,
      });
    }

    return new ObliqueResult(
      {
        title: imageName,
        featureId: imageName,
        obliqueCollectionName: this.obliqueCollectionName,
        imageName,
        fileExtension: this.fileExtension,
        resolution: this.resolution,
        downloadState: this.downloadState,
      },
      this._app,
    );
  }

  async getFeaturesInExtent(extent: Extent): Promise<Feature[]> {
    const obliqueCollection = this._app.obliqueCollections.getByKey(
      this.obliqueCollectionName,
    );
    if (obliqueCollection) {
      await obliqueCollection.load();
      await obliqueCollection.loadDataForExtent(extent.extent);

      const source = obliqueCollection.imageFeatureSource;
      const features = source.getFeaturesInExtent(extent.extent);
      if (
        this.viewDirectionFilter &&
        this.viewDirectionFilter !== ObliqueViewDirection.NADIR
      ) {
        return features.filter(
          (f) => f.get('viewDirection') === this.viewDirectionFilter,
        );
      }
      return features;
    } else {
      throw new Error('Oblique collection does not exist.');
    }
  }
}

export default ObliqueDataSource;
