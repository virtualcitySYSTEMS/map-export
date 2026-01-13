import type {
  Extent,
  FeatureStoreLayer,
  ExtrusionHeightInfo,
  DeclarativeStyleItemOptions,
  VectorPropertiesModelOptions,
  VectorStyleItemOptions,
  StyleItem,
  VectorProperties,
  VcsApp,
  VcsMeta,
  StyleItemOptions,
} from '@vcmap/core';
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
  getStyleOrDefaultStyle,
} from '@vcmap/core';
import type { VcsUiApp } from '@vcmap/ui';
import type Geometry from 'ol/geom/Geometry';
import type { Extent as OLExtent } from 'ol/extent';
import { intersects } from 'ol/extent';
import { satisfies } from 'semver';
import type { FeatureCollection } from 'geojson';
import type { SimpleGeometry } from 'ol/geom.js';
import type Feature from 'ol/Feature';
import type { Scene } from '@vcmap-cesium/engine';

enum LayerType {
  SINGLE_IMAGE = 'singleImage',
  GEOJSON = 'geojson',
  FEATURE_COLLECTION = 'FeatureCollection',
}

type SingleImageExport = {
  type: LayerType.SINGLE_IMAGE;
  extent: OLExtent;
  opacity: number;
  url: string;
};

/**
 * Prepares SingleImageLayer for the export with the VC Warehouse.
 * @param layer Single image layer that should be exported.
 * @param bbox Bounding box of the area to be exported.
 * @returns An object with the necessary information for the export.
 */
function exportSingleImageLayer(
  layer: SingleImageLayer,
  bbox: Extent,
): SingleImageExport | null {
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

type PlanningFeatureStoreLayer = FeatureStoreLayer & {
  fetchFeatureCollection(options: {
    asJson: boolean;
    onlyStatic?: boolean;
    bbox: number[];
  }): Promise<FeatureCollection>;
};

type ExtrusionInfo = ExtrusionHeightInfo & { groundLevel: number };

type SceneFeature = {
  geometry: Geometry;
  properties: object;
  model?: VectorPropertiesModelOptions | null;
  heightInfo: ExtrusionInfo;
  style?: VectorStyleItemOptions | DeclarativeStyleItemOptions;
};

function getGeometryMinHeight(geometry: SimpleGeometry): number {
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
 */
async function convertFeaturesToSceneFeatures(
  olFeatures: Feature[],
  vectorProperties: VectorProperties,
  defaultStyle: StyleItem,
  scene: Scene,
): Promise<SceneFeature[]> {
  return Promise.all(
    olFeatures.map(async (feature) => {
      const absoluteFeature = (await createAbsoluteFeature(
        feature,
        vectorProperties,
        scene,
      )) as Feature;

      const geojsonFeature = writeGeoJSONFeature(absoluteFeature, {
        asObject: true,
      }) as object as SceneFeature;

      const groundLevel = getGeometryMinHeight(
        absoluteFeature.getGeometry() as SimpleGeometry,
      );
      geojsonFeature.heightInfo = {
        ...getExtrusionHeightInfo(absoluteFeature, vectorProperties),
        groundLevel,
      };

      const model = vectorProperties.getModel(absoluteFeature);
      if (model) {
        geojsonFeature.model = model;
      }

      const styleItem = feature[vectorStyleSymbol] ?? defaultStyle;
      if (styleItem instanceof VectorStyleItem) {
        geojsonFeature.style = styleItem.getOptionsForFeature(absoluteFeature);
      } else {
        geojsonFeature.style = styleItem.toJSON();
      }
      return geojsonFeature;
    }),
  );
}

type GeojsonExport = {
  type: LayerType.GEOJSON | LayerType.FEATURE_COLLECTION;
  features: Array<SceneFeature>;
  style: StyleItemOptions;
  vcsMeta: Partial<VcsMeta>;
};

/**
 * Prepares featureStoreLayer for the export with the VC Warehouse.
 * @param app
 * @param layer Layer to be exported.
 * @param bbox Bounding box of the area to be exported.
 */
async function exportFeatureStoreLayer(
  app: VcsUiApp,
  layer: PlanningFeatureStoreLayer,
  bbox: Extent,
): Promise<GeojsonExport | null> {
  try {
    const { version } = app.plugins.getByKey('@vcmap/planning')!;
    const range = '>=6.0.0-0';

    if (satisfies(version, range, { includePrerelease: true })) {
      const [cesiumMap] = app.maps.getByType(CesiumMap.className);
      const scene = (cesiumMap as CesiumMap).getScene();
      if (!scene) {
        return null;
      }
      const collection = await layer.fetchFeatureCollection({
        bbox: bbox.getCoordinatesInProjection(wgs84Projection),
        asJson: true,
      });
      const {
        features: geojsonFeatures,
        style,
        vcsMeta,
      } = parseGeoJSON(collection);
      const features = await convertFeaturesToSceneFeatures(
        geojsonFeatures,
        layer.vectorProperties,
        layer.style,
        scene,
      );
      return {
        features,
        style: getStyleOrDefaultStyle(style).toJSON(),
        vcsMeta: vcsMeta!,
        type: LayerType.FEATURE_COLLECTION,
      };
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function exportVectorLayer(
  app: VcsApp,
  layer: VectorLayer,
  bbox: Extent,
): Promise<GeojsonExport | null> {
  const [cesiumMap] = app.maps.getByType(CesiumMap.className);
  const scene = (cesiumMap as CesiumMap).getScene();
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

async function exportVectorTileLayer(
  app: VcsApp,
  layer: VectorTileLayer,
  bbox: Extent,
): Promise<GeojsonExport | null> {
  if (!layer.tileProvider) {
    return null;
  }

  const [cesiumMap] = app.maps.getByType(CesiumMap.className);
  const scene = (cesiumMap as CesiumMap).getScene();
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
 * @param bbox The area that defines which objects should be exported.
 * @param app The VcsApp instance.
 */
export default async function collectScene(
  bbox: Extent,
  app: VcsUiApp,
): Promise<{
  baseLayers: Array<GeojsonExport | SingleImageExport>;
  hiddenObjects: string[];
}> {
  const { activeMap } = app.maps;
  const promises = [...app.layers]
    .filter(
      (layer) =>
        layer.active &&
        layer.isSupported(activeMap!) &&
        layer[moduleIdSymbol] !== volatileModuleId,
    )
    .map((layer) => {
      if (layer instanceof SingleImageLayer) {
        return exportSingleImageLayer(layer, bbox);
      } else if (layer instanceof VectorLayer) {
        if (layer.className === 'PlanningFeatureStoreLayer') {
          return exportFeatureStoreLayer(
            app,
            layer as PlanningFeatureStoreLayer,
            bbox,
          );
        } else {
          return exportVectorLayer(app, layer, bbox);
        }
      } else if (layer instanceof VectorTileLayer) {
        return exportVectorTileLayer(app, layer, bbox);
      }
      return null;
    });
  const promiseAll = await Promise.all(promises);
  const baseLayers = promiseAll
    .filter((baseLayer) => {
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
    })
    .filter((layer) => layer !== null);
  return {
    baseLayers,
    hiddenObjects: [...app.hiddenObject].map((object) => object.id),
  };
}
