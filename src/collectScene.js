import {
  wgs84Projection,
  mercatorProjection,
  DeclarativeStyleItem,
  // parseGeoJSON,
  writeGeoJSONFeature,
  // FeatureStoreLayer,
  SingleImageLayer,
  VectorLayer,
  VectorTileLayer,
  VectorStyleItem,
  vectorStyleSymbol,
  hidden,
  getHeightInfo,
  getFlatCoordinatesFromGeometry,
} from '@vcmap/core';
import { intersects } from 'ol/extent';

/**
 * @enum {string}
 */
const LayerType = {
  SINGLE_IMAGE: 'singleImage',
  GEOJSON: 'geojson',
};

/**
 * @typedef {Object} SingleImageExport
 * @property {string} type
 * @property {import("ol/extent").Extent} extent the layers extent
 * @property {number} opacity
 * @property {string} url
 */

/**
 * Prepares SingleImageLayer for the export with the VC Warehouse.
 * @param {import("@vcmap/core").SingleImageLayer} layer Single image layer that should be exported.
 * @param {import("@vcmap/core").Extent} bbox Bounding box of the area to be exported.
 * @returns {SingleImageExport | null} An object with the necessary information for the export.
 */
function exportSingleImageLayer(layer, bbox) {
  const layerExtentWgs84 =
    layer.extent?.getCoordinatesInProjection(wgs84Projection);
  const bboxWgs84 = bbox.getCoordinatesInProjection(wgs84Projection);

  if (!layerExtentWgs84 || !intersects(layerExtentWgs84, bboxWgs84)) {
    return null;
  }

  return {
    type: LayerType.SINGLE_IMAGE,
    opacity: layer.opacity,
    extent: layerExtentWgs84,
    url: layer.url,
  };
}

// XXX Wait for planner 5.0
// /**
//  * Prepares featureStoreLayer for the export with the VC Warehouse.
//  * @param {import("@vcmap/core").FeatureStoreLayer} layer Layer to be exported.
//  * @param {import("@vcmap/core").Extent} bbox Bounding box of the area to be exported.
//  */
// async function exportFeatureStoreLayer(layer, bbox) {
//   // add check for url
//   if (!layer.url) {
//     return null;
//   }

//   const layerUrl = new URL(layer.url, window.location.href);
//   layerUrl.pathname = `${layerUrl.pathname.replace(/\/$/, '')}/get-layer-file`;
//   layerUrl.searchParams.append('bbox', JSON.stringify(bbox.getCoordinatesInProjection(wgs84Projection)));
//   layerUrl.searchParams.append('asJson', 'true');

//   const geojson = await fetch(layerUrl.toString(), {
//     headers: Login.getInstance().getAuthHeader(),
//   }).then(r => r.json());

// }

/**
 * @typedef {Object} SceneFeature
 * @property {*} geometry
 * @property {*} properties
 * @property {import("@vcmap/core").VectorPropertiesModelOptions|null} model
 * @property {import("@vcmap/core").VectorHeightInfo} heightInfo
 * TODO: add vcs.vcm.util.style.ClusterStyleItem.Options?
 * @property {import("@vcmap/core").VectorStyleItemOptions | import("@vcmap/core").DeclarativeStyleItemOptions} style
 */

/**
 * @param {import("ol").Feature} olFeature
 * @param {import("@vcmap/core").VectorProperties} vectorProperties
 * @param {import("@vcmap/core").StyleItem} defaultStyle
 * @returns {SceneFeature | null}
 */
function convertFeatureToSceneFeature(
  olFeature,
  vectorProperties,
  defaultStyle,
) {
  const geojsonFeature = writeGeoJSONFeature(olFeature, { asObject: true });
  const geometry = olFeature.getGeometry();
  if (!geometry) {
    return null;
  }
  const flatCoordinates = getFlatCoordinatesFromGeometry(geometry);
  geojsonFeature.heightInfo = getHeightInfo(
    olFeature,
    vectorProperties,
    flatCoordinates,
  );
  const model = vectorProperties.getModel(olFeature);
  if (model) {
    geojsonFeature.model = model;
  }
  let styleItem = olFeature[vectorStyleSymbol] ?? defaultStyle;
  if (styleItem instanceof DeclarativeStyleItem) {
    const style = styleItem.style(olFeature);
    styleItem = new VectorStyleItem({});
    if (style.getText() && style.getText().getText()) {
      styleItem.label = style.getText().getText();
    }
    styleItem.style = style;
  }
  geojsonFeature.style = styleItem.getOptions({
    fill: true,
    stroke: true,
    image: true,
    text: true,
    label: true,
  });
  return geojsonFeature;
}

/**
 * @typedef {Object} GeojsonExport
 * @property {string} type
 * @property {Array<SceneFeature>} features
 * @property {import("@vcmap/core").VectorPropertiesOptions} vcsMeta
 * @property {import("@vcmap/core").StyleItemOptions} style
 * @property {Object<string, number> | undefined} hiddenObjects
 */

/**
 * @param {import("@vcmap/core").VectorLayer} layer
 * @param {import("@vcmap/core").Extent} bbox
 * @returns {GeojsonExport|null}
 */
function exportVectorLayer(layer, bbox) {
  const bboxMercator = bbox.getCoordinatesInProjection(mercatorProjection);
  const sceneFeatures = layer
    .getFeatures()
    .filter(
      (feature) =>
        feature.getGeometry()?.intersectsExtent(bboxMercator) &&
        !feature[hidden],
    )
    .flatMap((feature) => {
      const sceneFeature = convertFeatureToSceneFeature(
        feature,
        layer.vectorProperties,
        layer.style,
      );
      return sceneFeature ? [sceneFeature] : [];
    });

  if (sceneFeatures.length === 0) {
    return null;
  }

  return {
    type: LayerType.GEOJSON,
    features: sceneFeatures,
    vcsMeta: layer.getVcsMeta(),
    style: layer.style.toJSON(),
    hiddenObjects: layer.globalHider?.hiddenObjects,
  };
}

/**
 * @param {import("@vcmap/core").VectorTileLayer} layer
 * @param {import("@vcmap/core").Extent} bbox
 * @returns {Promise<GeojsonExport|null>}
 */

async function exportVectorTileLayer(layer, bbox) {
  if (!layer.tileProvider) {
    return null;
  }

  const features = await layer.tileProvider.getFeaturesForExtent(bbox);
  const sceneFeatures = features
    .filter((feature) => !feature[hidden])
    .flatMap((feature) => {
      const sceneFeature = convertFeatureToSceneFeature(
        feature,
        layer.vectorProperties,
        layer.style,
      );
      return sceneFeature ? [sceneFeature] : [];
    });

  if (sceneFeatures.length === 0) {
    return null;
  }

  return {
    type: LayerType.GEOJSON,
    features: sceneFeatures,
    vcsMeta: layer.vectorProperties.getVcsMeta(),
    style: layer.style.toJSON(),
    hiddenObjects: layer.globalHider?.hiddenObjects,
  };
}

/**
 * Collects all layers that should be exported.
 * @param {import("@vcmap/core").Extent} bbox The area that defines which objects should be exported.
 * @param {import("@vcmap/core").VcsApp} app The VcsApp instance.
 * @returns {Promise<{ baseLayers: Array<GeojsonExport | SingleImageExport>, hiddenObjects: [] | [string]}>}
 */
export default async function collectScene(bbox, app) {
  // TODO: implement add drawing widget layer
  const { activeMap } = app.maps;
  const promises = [...app.layers]
    .filter((layer) => layer.active && layer.isSupported(activeMap))
    .flatMap((layer) => {
      let promise;
      if (layer instanceof SingleImageLayer) {
        promise = exportSingleImageLayer(layer, bbox);
        // TODO: Only necessary when planner is implemented?
        // } else if (layer instanceof FeatureStoreLayer) {
        //   promise = exportFeatureStoreLayer(layer, bbox);
      } else if (layer instanceof VectorLayer) {
        if (
          // layer[configContentSymbol] || TODO: is this needed?
          // layer === drawingWidgetLayer || TODO: see above implement drawing widget ...
          /^_.*_model$/.test(layer.name) // what is that? is this a name that the planner generates?
        ) {
          promise = exportVectorLayer(layer, bbox);
        }
      } else if (layer instanceof VectorTileLayer && layer.tileProvider) {
        promise = exportVectorTileLayer(layer, bbox);
      }
      return promise ? [promise] : [];
    });
  const layerExports = await Promise.all(promises);
  return {
    baseLayers: layerExports,
    hiddenObjects: layerExports.reduce((hiddenObjects, layerExport) => {
      if (layerExport && layerExport.type === LayerType.GEOJSON) {
        hiddenObjects.concat(Object.keys(layerExport.hiddenObjects));
      }
      return hiddenObjects;
    }, []),
  };
}
