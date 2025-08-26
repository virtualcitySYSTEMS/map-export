import { ObliqueView, ObliqueImage, hasSameOrigin } from '@vcmap/core';
import { check, maybe, ofLiteralType } from '@vcsuite/check';
import type { VcsUiApp } from '@vcmap/ui';
import { downloadBlob } from '@vcmap/ui';
import type { TileImage } from 'ol/source.js';
import { toSize } from 'ol/size.js';
import type { AbstractResultOptions } from './abstractResult.js';
import AbstractResult from './abstractResult.js';

function getMimeTypeForExtension(fileExtension: string): string {
  if (/jpe?g$/i.test(fileExtension)) {
    return 'image/jpeg';
  } else if (/png$/i.test(fileExtension)) {
    return 'image/png';
  } else if (/tiff?$/i.test(fileExtension)) {
    return 'image/tiff';
  }
  return '';
}

export type ObliqueDownloadState = {
  progress: number;
  queue: Array<number>;
  running: boolean;
};

/**
 * Downloads a given oblique image by stitching the tiles together
 * @param obliqueImage
 * @param downloadState The state of the download process including progress from 0 to 100, how many images are downloaded and which one is the current, if the download is running or not
 * @param resolution
 * @param fileExtension Image file extension. Allowed values are 'jpg', 'jpeg', 'png', 'tif', 'tiff'
 */

export function downloadObliqueImage(
  obliqueImage: ObliqueImage,
  downloadState: ObliqueDownloadState,
  resolution?: number,
  fileExtension = 'jpg',
): Promise<void> {
  check(obliqueImage, ObliqueImage);
  check(
    fileExtension,
    maybe(ofLiteralType(['jpg', 'jpeg', 'png', 'tif', 'tiff'])),
  );
  check(resolution, maybe(Number));

  const view = new ObliqueView(obliqueImage.meta, {
    maxZoom: 0,
    minZoom: 0,
    scaleFactor: 4,
    hideLevels: 0,
  });
  view.setImageName(obliqueImage.name);
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const source = view.layer.getSource() as TileImage;
  const tileGrid = source.getTileGrid();
  if (!tileGrid) {
    throw new Error('tileGrid not available');
  }
  const tileUrlFunction = source.getTileUrlFunction();

  const zoomLevel = resolution
    ? tileGrid.getResolutions().indexOf(resolution)
    : tileGrid.getMaxZoom();

  const { size } = obliqueImage.meta;
  const canvas = document.createElement('canvas');
  const tileSize = toSize(tileGrid.getTileSize(zoomLevel));
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
  const context = canvas.getContext('2d')!;
  const imagePromises: Array<Promise<void>> = [];
  let completed = 0;

  tileGrid.forEachTileCoord([0, 0, size[0], size[1]], zoomLevel, (coord) => {
    const img = new Image();
    if (!hasSameOrigin(obliqueImage.meta.url)) {
      img.crossOrigin = 'anonymous';
    }
    imagePromises.push(
      new Promise((resolve, reject) => {
        img.onload = (): void => {
          context.drawImage(
            img,
            0,
            0,
            tileSize[0],
            tileSize[1],
            coord[1] * tileSize[0],
            canvasSize[1] + coord[2] * tileSize[1],
            tileSize[0],
            tileSize[1],
          );
          completed += 1;
          if (downloadState) {
            downloadState.progress = Math.round(
              (completed * 100) / imagePromises.length,
            );
          }
          resolve();
        };

        img.onerror = reject;
        // @ts-expect-error XXX ignored, since the typedef includes resolution and projection. something we dont support or need
        img.src = tileUrlFunction(coord);
      }),
    );
  });

  return new Promise((resolve, reject) => {
    Promise.all(imagePromises)
      .then(() => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(
              new Error(
                'Image conversion failed. If using Firefox try using Chrome or Edge.',
              ),
            );
          } else {
            downloadBlob(blob, `${obliqueImage.name}.${fileExtension}`);
            resolve();
          }
          downloadState.progress = 0;
        }, getMimeTypeForExtension(fileExtension));
      })
      .catch((e: unknown) => {
        reject(new Error(`Image download failed: ${String(e)}`));
        downloadState.progress = 0;
      });
  });
}

/**
 * Options for ObliqueExportResult that extend AbstractResultOptions
 */
type ObliqueResultOptionAdditions = {
  obliqueCollectionName: string;
  imageName: string;
  fileExtension: string;
  resolution?: number;
  downloadState: ObliqueDownloadState;
};

type ObliqueResultOptions = AbstractResultOptions &
  ObliqueResultOptionAdditions;

/**
 * @class
 * @api
 * @export
 */
class ObliqueExportResult extends AbstractResult {
  obliqueCollectionName: string;
  imageName: string;
  fileExtension: string;
  resolution?: number;
  downloadState: ObliqueDownloadState;

  private _app: VcsUiApp;

  constructor(options: ObliqueResultOptions, app: VcsUiApp) {
    super(options);
    this.obliqueCollectionName = options.obliqueCollectionName;
    this.imageName = options.imageName;
    this.fileExtension = options.fileExtension;
    this.resolution = options.resolution;
    this.downloadState = options.downloadState;
    this._app = app;
  }

  download(): Promise<void> {
    const obliqueCollection = this._app.obliqueCollections.getByKey(
      this.obliqueCollectionName,
    );
    const obliqueImage = obliqueCollection?.getImageByName(this.imageName);
    if (obliqueImage) {
      return downloadObliqueImage(
        obliqueImage,
        this.downloadState,
        this.resolution,
        this.fileExtension,
      );
    }
    throw new Error('Oblique image not found');
  }
}

export default ObliqueExportResult;
