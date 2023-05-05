import { ObliqueCollection } from '@vcmap/core';
import { check, checkMaybe } from '@vcsuite/check';
import { parseBoolean } from '@vcsuite/parsers';
import { getLogger as getLoggerByName } from '@vcsuite/logger';
import AbstractDataSource, { validateOptions } from './abstractDataSource.js';
import FileResult from '../results/fileResult.js';
import ObliqueResult from '../results/obliqueResult.js';

/**
 * @param {ObliqueDataSourceOptions} options
 * @param {import("@vcmap/core").VcsApp} app
 * @returns {boolean}
 */
export function validateObliqueOptions(options, app) {
  const abstractValidation = validateOptions(options);
  if (!abstractValidation) {
    return false;
  }

  try {
    check(options.obliqueCollectionName, String);
    check(
      app.obliqueCollections.getByKey(options.obliqueCollectionName),
      ObliqueCollection,
    );
    checkMaybe(options.fileExtension, String);
    checkMaybe(options.resolution, Number);
  } catch (e) {
    getLoggerByName('@vcmap/export/dataSources/ObliqueDataSource').error(
      e.message,
    );
    return false;
  }
  return true;
}

/**
 * @typedef {Object} ObliqueDataSourceOptionsAdditions
 * @property {string} obliqueCollectionName
 * @property {string} [fileExtension='jpg']
 * @property {boolean} [dedicatedSource=false] Oblique images don't have to be put together from tiles but can be downloaded as a FileResult directly.
 * @property {number|null} resolution
 * @property {{progress: number, queue: Array<number>, running: boolean}} downloadState The state of the download process including progress from 0 to 100, how many images are downloaded and which one is the current, if the download is running or not
 * @typedef {import("./abstractDataSource").AbstractDataSourceOptions & ObliqueDataSourceOptionsAdditions} ObliqueDataSourceOptions
 * @api
 */

/**
 * @class
 * @export
 * @api
 * @extends {AbstractDataSource}
 */
class ObliqueDataSource extends AbstractDataSource {
  /**
   * @param {ObliqueDataSourceOptions} options
   * @param {import("@vcmap/core").VcsApp} app
   */
  constructor(options, app) {
    super(options, app);
    /** @type {boolean} */
    this.dedicatedSource = parseBoolean(options.dedicatedSource, false);
    /** @type {string} */
    this.obliqueCollectionName = options.obliqueCollectionName;
    /** @type {string} */
    this.fileExtension = options.fileExtension || 'jpg';
    /** @type {import("@vcmap/core").ObliqueViewDirection | null} */
    this.viewDirectionFilter = null;
    /** @type {number|null} */
    this.resolution = options.resolution;
    /** @type {{progress: number, queue: Array<number>, running: boolean}} */
    this.downloadState = options.downloadState;
  }

  /**
   * generates a download link for a given image, if this data source has a dedicated source
   * @api
   * @param {string} imageName
   * @returns {string}
   */
  getUriForImage(imageName) {
    return `${this.url}/${imageName}.${this.fileExtension}`;
  }

  /**
   * @inheritdoc
   */
  getResultFromFeature(feature) {
    const imageName = feature.getId();
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

  /**
   * @inheritdoc
   */
  async getFeaturesInExtent(extent) {
    const obliqueCollection = this._app.obliqueCollections.getByKey(
      this.obliqueCollectionName,
    );
    if (obliqueCollection) {
      await obliqueCollection.load();
      await obliqueCollection.loadDataForExtent(extent.extent);

      const source = obliqueCollection.imageFeatureSource;
      const features = source.getFeaturesInExtent(extent.extent);
      if (this.viewDirectionFilter && this.viewDirectionFilter !== 5) {
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
