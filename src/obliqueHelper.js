import { imageGeometryToMercatorGeometry, obliqueGeometry } from '@vcmap/core';
import { downloadURI } from '@vcmap/ui';
import { downloadObliqueImage } from './results/obliqueResult.js';

/**
 * @param {import("ol").Feature<import("ol/geom/Geometry").default>} feature
 * @param {import("@vcmap/core").VcsApp} app
 * @returns {Promise<import("ol/geom/Geometry").default|null>}
 */
export default async function reprojectObliqueGeometry(feature, app) {
  const imageGeometry = feature[obliqueGeometry];
  if (imageGeometry) {
    const originalGeometry = imageGeometry.clone();
    const obliqueMap = /** @type {import("@vcmap/core").ObliqueMap} */ (
      app.maps.activeMap
    );
    const image = obliqueMap.currentImage;
    if (image) {
      return imageGeometryToMercatorGeometry(
        imageGeometry,
        originalGeometry,
        obliqueMap.currentImage,
      );
    }
  }
  return null;
}

/**
 * Downloads the currently visible oblique image.
 * @param {import("@vcmap/core").VcsApp} app The VcsApp instance.
 * @param {import("./dataSources/obliqueDataSource").default} obliqueDataSource The obliqueDataSource instance
 * @param {{progress: number, queue: Array<number>, running: boolean}} downloadState The state of the download process including progress from 0 to 100, how many images are downloaded and which one is the current, if the download is running or not
 * @returns {Promise<void>}
 */
export function downloadCurrentImage(app, obliqueDataSource, downloadState) {
  const { currentImage } = /** @type {import("@vcmap/core").ObliqueMap} */ (
    app.maps.activeMap
  );
  if (currentImage) {
    if (obliqueDataSource.dedicatedSource) {
      downloadURI(
        obliqueDataSource.getUriForImage(currentImage.name),
        `${currentImage.name}.${obliqueDataSource.fileExtension}`,
      );
    } else {
      downloadState.progress = 0;
      return downloadObliqueImage(
        currentImage,
        downloadState,
        obliqueDataSource.resolution,
        obliqueDataSource.fileExtension,
      );
    }
  }
  return Promise.resolve();
}
