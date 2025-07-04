import {
  wgs84Projection,
  mercatorProjection,
  writeGeoJSONFeature,
  parseGeoJSON,
  SingleImageLayer,
  VectorLayer,
  VectorTileLayer,
  VectorStyleItem,
  vectorStyleSymbol,
  hidden,
  volatileModuleId,
  moduleIdSymbol,
  createAbsoluteFeature,
  CesiumMap,
  getExtrusionHeightInfo,
} from '@vcmap/core';
import { intersects } from 'ol/extent';
import { satisfies } from 'semver';

/**
 * @enum {string}
 */
const LayerType = {
  SINGLE_IMAGE: 'singleImage',
  GEOJSON: 'geojson',
  FEATURE_COLLECTION: 'FeatureCollection',
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

/**
 * @typedef {import("@vcmap/core").FeatureStoreLayer & { fetchFeatureCollection: function(options: {
 *     asJson: boolean;
 *     onlyStatic: boolean;
 *     bbox: number[];
 *   }): Promise<import("geojson").FeatureCollection> }} PlanningFeatureStoreLayer
 */

/**
 * @typedef {import("@vcmap/core").ExtrusionHeightInfo} ExtrusionInfo
 * @property {number} groundLevel
 */

/**
 * @typedef {Object} SceneFeature
 * @property {*} geometry
 * @property {*} properties
 * @property {import("@vcmap/core").VectorPropertiesModelOptions|null} [model]
 * @property {ExtrusionInfo} heightInfo
 * @property {import("@vcmap/core").VectorStyleItemOptions | import("@vcmap/core").DeclarativeStyleItemOptions} [style]
 */

/**
 * @param {import("ol/geom").SimpleGeometry} geometry
 * @returns {number}
 */
function getGeometryMinHeight(geometry) {
  let minZ = Infinity;
  const stride = geometry.getStride();
  if (stride > 2) {
    const flatCoordinates = geometry.getFlatCoordinates();
    const flatCoordinatesLength = flatCoordinates.length;
    for (let i = 0; i < flatCoordinatesLength; i += stride) {
      const z = flatCoordinates[i + 2];
      minZ = z < minZ ? z : minZ;
    }
  }

  return minZ !== Infinity ? minZ : 0;
}

/**
 * This functions converts VC Map feature to an interface of the VC Warehouse
 * // TODO discuss whether VC Warehouse can directly support geojson with vcsMeta, because this seems a bit cumbersome especially for FeatureStoreLayer
 * @param {import("ol").Feature[]} olFeatures
 * @param {import("@vcmap/core").VectorProperties} vectorProperties
 * @param {import("@vcmap/core").StyleItem} defaultStyle
 * @param {import("@vcmap-cesium/engine").Scene} scene
 * @returns {Promise<SceneFeature[]>}
 */
async function convertFeaturesToSceneFeatures(
  olFeatures,
  vectorProperties,
  defaultStyle,
  scene,
) {
  return Promise.all(
    olFeatures.map(async (feature) => {
      /** @type {import("ol").Feature} */
      const absoluteFeature = await createAbsoluteFeature(
        feature,
        vectorProperties,
        scene,
      );

      /** @type {SceneFeature} */
      const geojsonFeature = writeGeoJSONFeature(absoluteFeature, {
        asObject: true,
      });

      const groundLevel = getGeometryMinHeight(absoluteFeature.getGeometry());
      geojsonFeature.heightInfo = {
        ...getExtrusionHeightInfo(absoluteFeature, vectorProperties),
        groundLevel,
      };

      const model = vectorProperties.getModel(absoluteFeature);
      if (model) {
        geojsonFeature.model = model;
      }

      const styleItem = olFeatures[vectorStyleSymbol] ?? defaultStyle;
      if (styleItem instanceof VectorStyleItem) {
        geojsonFeature.style = styleItem.getOptionsForFeature(absoluteFeature);
      } else {
        geojsonFeature.style = styleItem.toJSON();
      }
      return geojsonFeature;
    }),
  );
}

/**
 * @typedef {Object} GeojsonExport
 * @property {string} type
 * @property {Array<SceneFeature>} features
 * @property {import("@vcmap/core").VectorPropertiesOptions} vcsMeta
 * @property {import("@vcmap/core").StyleItemOptions} style
 */

/**
 * Prepares featureStoreLayer for the export with the VC Warehouse.
 * @param {import("@vcmap/ui").VcsUiApp} app
 * @param {PlanningFeatureStoreLayer} layer Layer to be exported.
 * @param {import("@vcmap/core").Extent} bbox Bounding box of the area to be exported.
 * @returns {Promise<GeojsonExport|null>}
 */
async function exportFeatureStoreLayer(app, layer, bbox) {
  const planningVersion = app.plugins.getByKey('@vcmap/planning').version;
  const range = '>=6.0.0-0 <7.0.0';

  if (satisfies(planningVersion, range, { includePrerelease: true })) {
    const [cesiumMap] = app.maps.getByType(CesiumMap.className);
    const scene = cesiumMap.getScene();
    if (!scene) {
      return null;
    }
    const collection = await layer.fetchFeatureCollection({
      bbox: bbox.getCoordinatesInProjection(wgs84Projection),
      asJson: true,
    });
    const geojson = parseGeoJSON(collection);
    geojson.features = await convertFeaturesToSceneFeatures(
      geojson.features,
      layer.vectorProperties,
      layer.style,
      scene,
    );
    return geojson;
  }
  return null;
}

/**
 * @param {import("@vcmap/core").VcsApp} app
 * @param {import("@vcmap/core").VectorLayer} layer
 * @param {import("@vcmap/core").Extent} bbox
 * @returns {Promise<GeojsonExport|null>}
 */
async function exportVectorLayer(app, layer, bbox) {
  const [cesiumMap] = app.maps.getByType(CesiumMap.className);
  const scene = cesiumMap.getScene();
  if (!scene) {
    return null;
  }

  const bboxMercator = bbox.getCoordinatesInProjection(mercatorProjection);
  const features = layer
    .getFeatures()
    .filter(
      (feature) =>
        feature.getGeometry()?.intersectsExtent(bboxMercator) &&
        !feature[hidden],
    );

  const sceneFeatures = await convertFeaturesToSceneFeatures(
    features,
    layer.vectorProperties,
    layer.style,
    scene,
  );

  if (sceneFeatures.length === 0) {
    return null;
  }

  return {
    type: LayerType.GEOJSON,
    features: sceneFeatures,
    vcsMeta: layer.getVcsMeta(),
    style: layer.style.toJSON(),
  };
}

/**
 * @param {import("@vcmap/core").VcsApp} app
 * @param {import("@vcmap/core").VectorTileLayer} layer
 * @param {import("@vcmap/core").Extent} bbox
 * @returns {Promise<GeojsonExport|null>}
 */

async function exportVectorTileLayer(app, layer, bbox) {
  if (!layer.tileProvider) {
    return null;
  }

  const [cesiumMap] = app.maps.getByType(CesiumMap.className);
  const scene = cesiumMap.getScene();
  if (!scene) {
    return null;
  }

  const features = (await layer.tileProvider.getFeaturesForExtent(bbox)).filter(
    (feature) => !feature[hidden],
  );

  const sceneFeatures = await convertFeaturesToSceneFeatures(
    features,
    layer.vectorProperties,
    layer.style,
    scene,
  );

  if (sceneFeatures.length === 0) {
    return null;
  }

  return {
    type: LayerType.GEOJSON,
    features: sceneFeatures,
    vcsMeta: layer.vectorProperties.getVcsMeta(),
    style: layer.style.toJSON(),
  };
}

/**
 * Collects all layers that should be exported.
 * @param {import("@vcmap/core").Extent} bbox The area that defines which objects should be exported.
 * @param {import("@vcmap/ui").VcsUiApp} app The VcsApp instance.
 * @returns {Promise<{ baseLayers: Array<GeojsonExport | SingleImageExport>, hiddenObjects: [] | [string]}>}
 */
export default async function collectScene(bbox, app) {
  const { activeMap } = app.maps;
  const promises = [...app.layers]
    .filter(
      (layer) =>
        layer.active &&
        layer.isSupported(activeMap) &&
        layer[moduleIdSymbol] !== volatileModuleId,
    )
    .map((layer) => {
      if (layer instanceof SingleImageLayer) {
        return exportSingleImageLayer(layer, bbox);
      } else if (layer instanceof VectorLayer) {
        if (layer.className === 'PlanningFeatureStoreLayer') {
          return exportFeatureStoreLayer(app, layer, bbox);
        } else {
          return exportVectorLayer(app, layer, bbox);
        }
      } else if (layer instanceof VectorTileLayer) {
        return exportVectorTileLayer(app, layer, bbox);
      }
      return null;
    });
  const promiseAll = await Promise.all(promises);
  const baseLayers = promiseAll.filter((baseLayer) => {
    if (baseLayer) {
      if (
        baseLayer.type === LayerType.GEOJSON ||
        baseLayer.type === LayerType.FEATURE_COLLECTION
      ) {
        return baseLayer.features.length > 0;
      }
      return true;
    }
    return false;
  });
  return {
    baseLayers,
    hiddenObjects: [...app.hiddenObject].map((object) => object.id),
  };
}
