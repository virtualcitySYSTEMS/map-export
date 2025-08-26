import type { ObliqueMap } from '@vcmap/core';
import { imageGeometryToMercatorGeometry, obliqueGeometry } from '@vcmap/core';
import type { VcsUiApp } from '@vcmap/ui';
import { downloadURI } from '@vcmap/ui';
import type Feature from 'ol/Feature.js';
import type Geometry from 'ol/geom/Geometry.js';
import type { ObliqueDownloadState } from './results/obliqueResult.js';
import { downloadObliqueImage } from './results/obliqueResult.js';
import type ObliqueDataSource from './dataSources/obliqueDataSource.js';

export default async function reprojectObliqueGeometry(
  feature: Feature,
  app: VcsUiApp,
): Promise<Geometry | null> {
  const imageGeometry = feature[obliqueGeometry];
  if (imageGeometry) {
    const originalGeometry = imageGeometry.clone();
    const obliqueMap = app.maps.activeMap as ObliqueMap;
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
 * @param app The VcsApp instance.
 * @param obliqueDataSource The obliqueDataSource instance
 * @param downloadState The state of the download process including progress from 0 to 100, how many images are downloaded and which one is the current, if the download is running or not
 */
export function downloadCurrentImage(
  app: VcsUiApp,
  obliqueDataSource: ObliqueDataSource,
  downloadState: ObliqueDownloadState,
): Promise<void> {
  const { currentImage } = app.maps.activeMap as ObliqueMap;
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
