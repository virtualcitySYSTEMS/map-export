import { ObliqueView, ObliqueImage, hasSameOrigin } from '@vcmap/core';
import { checkMaybe, check } from '@vcsuite/check';
import AbstractResult from './abstractResult.js';
import { downloadURI } from './fileResult.js';

/**
 * @param {string} fileExtension
 * @returns {string}
 */
function getMimeTypeForExtension(fileExtension) {
  if (/jpe?g$/i.test(fileExtension)) {
    return 'image/jpeg';
  } else if (/png$/i.test(fileExtension)) {
    return 'image/png';
  } else if (/tiff?$/i.test(fileExtension)) {
    return 'image/tiff';
  }
  return '';
}

/**
 * Downloads a given oblique image by stitching the tiles together
 * @param {ObliqueImage} obliqueImage
 * @param {{progress: number, queue: Array<number>, running: boolean}} downloadState The state of the download process including progress from 0 to 100, how many images are downloaded and which one is the current, if the download is running or not
 * @param {?number=} resolution
 * @param {string} [fileExtension='jpg'] Image file extension. Allowed values are 'jpg', 'jpeg', 'png', 'tif', 'tiff'
 * @returns {Promise<void>}
 * @api
 * @export
 */
// eslint-disable-next-line import/prefer-default-export
export function downloadObliqueImage(obliqueImage, downloadState, resolution, fileExtension = 'jpg') {
  check(obliqueImage, ObliqueImage);
  checkMaybe(fileExtension, ['jpg', 'jpeg', 'png', 'tif', 'tiff']);
  checkMaybe(resolution, Number);

  const view = new ObliqueView(obliqueImage.meta, {
    maxZoom: 0,
    minZoom: 0,
    scaleFactor: 4,
    hideLevels: 0,
  });
  view.setImageName(obliqueImage.name);
  const source = /** @type {import("ol/source").TileImage} */ (view.layer.getSource());
  const tileGrid = source.getTileGrid();
  if (!tileGrid) {
    throw new Error('tileGrid not available');
  }
  const tileUrlFunction = source.getTileUrlFunction();

  const zoomLevel = resolution ?
    tileGrid.getResolutions().indexOf(resolution) :
    tileGrid.getMaxZoom();

  const { size } = obliqueImage.meta;
  const canvas = document.createElement('canvas');
  const tileSize = tileGrid.getTileSize(zoomLevel);
  const canvasSize = size.slice();
  if (resolution) {
    canvasSize[0] /= resolution;
    canvasSize[1] /= resolution;
  }
  // Limits of max canvas area for different browsers: https://github.com/jhildenbiddle/canvas-size#test-results
  // Firefox v108.0.1 has lowest limit of 124,992,400 pixels
  // XXX always scale down to firefox size????????
  canvas.width = canvasSize[0];
  canvas.height = canvasSize[1];
  const context = canvas.getContext('2d');
  const imagePromises = [];
  let completed = 0;

  tileGrid.forEachTileCoord([0, 0, size[0], size[1]], zoomLevel, (coord) => {
    const img = new Image();
    if (!hasSameOrigin(obliqueImage.meta.url)) {
      img.crossOrigin = 'anonymous';
    }
    imagePromises.push(new Promise((resolve, reject) => {
      img.onload = () => {
        context.drawImage(
          img,
          0,
          0,
          tileSize[0],
          tileSize[1],
          coord[1] * tileSize[0],
          canvasSize[1] + ((coord[2]) * tileSize[1]),
          tileSize[0],
          tileSize[1],
        );
        completed += 1;
        if (downloadState) {
          downloadState.progress = Math.round((completed * 100) / imagePromises.length);
        }
        resolve();
      };

      img.onerror = reject;
      // @ts-ignore XXX ignored, since the typedef includes resolution and projection. something we dont support or need
      img.src = tileUrlFunction(coord);
    }));
  });

  return new Promise((resolve, reject) => {
    Promise.all(imagePromises).then(() => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Image conversion failed. If using Firefox try using Chrome or Edge.'));
        } else {
          downloadURI(URL.createObjectURL(blob), `${obliqueImage.name}.${fileExtension}`);
          resolve();
        }
        downloadState.progress = 0;
      }, getMimeTypeForExtension(fileExtension));
    });
  });
}


/**
 * @typedef {Object} ObliqueResultOptionAdditions
 * @property {string} obliqueCollectionName
 * @property {string} imageName
 * @property {string} fileExtension
 * @property {number|undefined} resolution
 * @property {{progress: number, queue: Array<number>, running: boolean}} downloadState The state of the download process including progress from 0 to 100, how many images are downloaded and which one is the current, if the download is running or not
 * @typedef {import("./abstractResult").AbstractResultOptions & ObliqueResultOptionAdditions} ObliqueResultOptions
 * @api
 */

/**
 * @class
 * @api
 * @export
 */
class ObliqueExportResult extends AbstractResult {
  /**
   * @param {ObliqueResultOptions} options
   * @param {import("@vcmap/core").VcsApp} app
   */
  constructor(options, app) {
    super(options);
    /** @type {string} */
    this.obliqueCollectionName = options.obliqueCollectionName;
    /** @type {string} */
    this.imageName = options.imageName;
    /** @type {string} */
    this.fileExtension = options.fileExtension;
    /** @type {number|undefined} */
    this.resolution = options.resolution;
    /** @type {Object} */
    this.downloadState = options.downloadState;
    /**
     * @type {import("@vcmap/core").VcsApp}
     * @private
     */
    this._app = app;
  }

  download() {
    const obliqueCollection = this._app.obliqueCollections.getByKey(this.obliqueCollectionName);
    const obliqueImage = obliqueCollection.getImageByName(this.imageName);
    return downloadObliqueImage(obliqueImage, this.downloadState, this.resolution, this.fileExtension);
  }
}

export default ObliqueExportResult;
