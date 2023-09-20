import {
  Extent,
  mercatorProjection,
  ObliqueMap,
  TerrainLayer,
  TMSLayer,
  VectorLayer,
  WMSLayer,
  Projection,
} from '@vcmap/core';
import { Polygon } from 'ol/geom';
import { getArea } from 'ol/sphere';
import collectScene from './collectScene.js';
import { exportFormats, SelectionTypes } from './configManager.js';
import reprojectObliqueGeometry from './obliqueHelper.js';

/**
 * @param {number} fileSize The size in kilobyte.
 * @returns {string} The size with unit as string.
 */
export function getStringFileSizeFromkB(fileSize) {
  if (fileSize < 1000) {
    return `${fileSize} kB`;
  }
  if (fileSize < 1000 * 1000) {
    return `${fileSize / 1000} MB`;
  }
  return `${fileSize / (1000 * 1000)} GB`;
}

/**
 * Validate a feature for use in the export tool.
 * @param {import("ol").Feature<import("ol/geom/Geometry").default>} feature
 * @param {import("@vcmap/core").VcsApp} app The VcsApp instance
 * @param {number} maxSelectionArea The max area for area selection in meters
 * @returns {Promise<import("ol/geom").Polygon>}
 * @throws {Error} - throws if the geometry is not a Polygon or the area is too large
 */
export async function validatePolygonFeature(feature, app, maxSelectionArea) {
  const geometry =
    app.maps.activeMap instanceof ObliqueMap
      ? await reprojectObliqueGeometry(feature, app)
      : feature.getGeometry();
  if (!geometry || !(geometry instanceof Polygon) || geometry.getArea() === 0) {
    throw new Error('export.validation.polygonFeature');
  }

  if (maxSelectionArea != null) {
    const area = getArea(geometry);
    if (area > maxSelectionArea) {
      throw new Error('export.validation.polygonFeatureArea');
    }
  }
  return geometry;
}

/**
 * Prepares query parameter and sends a post request to the fme server.
 * @param {import("./configManager").ExportConfig} pluginConfig The setup configuration of the plugin.
 * @param {import("./configManager").ExportState} pluginState The state of the plugin.
 * @param {string} selectionLayerName The name of the vector layer for the selection area.
 * @param {import("@vcmap/core").VcsApp} app
 * @returns {Promise<Response>} The promise of the fetch post request to the fme server.
 */
export async function prepareQueryAndSend(
  pluginConfig,
  pluginState,
  selectionLayerName,
  app,
) {
  const {
    selectedCrs,
    selectedExportFormats,
    selectedThematicClasses,
    selectedLod,
    textureExport,
    localCoordinates,
    tiledExport,
    genericAttributes,
    selectedAppearanceTheme,
    terrainExport,
    selectedHeightMode,
    selectedTerrainAppearanceLayer,
  } = pluginState.settingsCityModel;

  const { email, description, selectedSelectionType, selectedObjects } =
    pluginState;

  const {
    terrainUrl,
    terrainZoomLevel,
    terrainAppearanceOptions,
    exportScene,
    dataProjection,
    fmeSecurityToken,
    fmeServerUrl,
  } = pluginConfig.settingsCityModel;

  const { maxSelectionArea } = pluginConfig;

  /**
   * The query paramters for GET request to VC Warehouse.
   */
  const query = {
    COORD_SYS: selectedCrs.startsWith('E')
      ? selectedCrs
      : `EPSG:${selectedCrs}`,
    OPT_SERVICEMODE: 'async',
    EXPORT_FORMAT: selectedExportFormats.join(','),
    THEM_CLASS: selectedThematicClasses, // TODO: Validation (at least 1 class) already in vue component
    LOD_SELECTION: selectedLod,
    TEXTURE:
      textureExport &&
      selectedExportFormats.some(
        (formatType) => exportFormats[formatType].texture,
      )
        ? 'Yes'
        : 'No',
    LOCAL:
      localCoordinates &&
      selectedExportFormats.some(
        (formatType) => exportFormats[formatType].localCoordinates,
      )
        ? 'Yes'
        : 'No',
    TILE_OUTPUT: tiledExport ? 'Yes' : 'No',
    GENERIC_ATTRIB:
      genericAttributes &&
      selectedExportFormats.some(
        (formatType) => exportFormats[formatType].genericAttributes,
      )
        ? 'Yes'
        : 'No',
    APP_THEME: selectedAppearanceTheme || 'none',
    HEIGHTMODE: !terrainExport ? selectedHeightMode : 'absolute',
    OPT_REQUESTEREMAIL: email, // TODO: Validate email in vue component
    DESC: description,
  };

  query.TERRAIN = 'No';
  if (
    terrainExport &&
    selectedExportFormats.some((formatType) => formatType !== '2D Shape')
  ) {
    const activeTerrainLayer = [...app.layers].find(
      (layer) => layer instanceof TerrainLayer && layer.activate,
    );
    const baseUrl = new URL(window.location.href);
    if (terrainUrl) {
      query.TERRAIN = 'Yes';
      query.LAYER_JSON = terrainUrl;
    } else if (activeTerrainLayer) {
      query.TERRAIN = 'Yes';
      const activeTerrainUrl = new URL(
        activeTerrainLayer.url,
        baseUrl,
      ).toString();
      query.LAYER_JSON = /layer.json/.test(activeTerrainUrl)
        ? activeTerrainUrl
        : `${activeTerrainUrl}/layer.json`;
    }
    if (terrainZoomLevel >= 0) {
      query.ZOOM = terrainZoomLevel;
    }
    if (textureExport && selectedTerrainAppearanceLayer) {
      const layer = app.layers.getByKey(selectedTerrainAppearanceLayer);
      if (!layer) {
        throw new Error(
          `Selected terrain appearance layer "${selectedTerrainAppearanceLayer}" does not exist.`,
        );
      }
      const textureUrl = new URL(layer.url, baseUrl);
      if (layer instanceof WMSLayer) {
        query.TEX_TYPE = 'WMS';
        query.WMS_LEVEL =
          terrainAppearanceOptions[selectedTerrainAppearanceLayer] ||
          layer.maxLevel;
        textureUrl.search = new URLSearchParams(layer.parameters).toString();
        query.WMS_URL = textureUrl.toString();
      } else if (layer instanceof TMSLayer) {
        query.TEX_TYPE = 'TMS';
        query.TMS_LEVEL =
          terrainAppearanceOptions[selectedTerrainAppearanceLayer] ||
          layer.maxLevel;
        query.TMS_URL = textureUrl.toString();
      }
    }
  }

  /**
   * If selection type obejct selection than the gmlids are stored in thies variable.
   * If selection type is area selection this variable contains the layer export objects for the current scene.
   */
  let sceneExport;
  if (selectedSelectionType === SelectionTypes.AREA_SELECTION) {
    query.SELECTION = 'Polygon';
    const layer = app.layers.getByKey(selectionLayerName);

    if (!layer || !(layer instanceof VectorLayer)) {
      throw new Error('Layer for area selection does not exist.');
    }

    const feature = layer.getFeatures()[0];
    const geometry = (
      await validatePolygonFeature(feature, app, maxSelectionArea)
    ).clone();

    geometry.transform(
      mercatorProjection.proj,
      new Projection(dataProjection).proj4,
    );

    const coords = geometry.getCoordinates()[0];

    query.POLYGON = coords
      .map((coord) => {
        const [x, y] = coord;
        return `${x},${y}`;
      })
      .join(';');
    const bbox = new Extent({
      ...mercatorProjection.toJSON(),
      coordinates: feature.getGeometry()?.getExtent(),
    });
    if (exportScene) {
      sceneExport = await collectScene(bbox, app);
    }
  } else {
    sceneExport = { selectedFeatures: selectedObjects };
  }

  // TODO: Validate server url. isTrustedUrl not in core anymore?
  const serverUrl = new URL(fmeServerUrl, window.location.href);
  Object.entries(query).forEach(([key, value]) => {
    serverUrl.searchParams.set(key, value);
  });

  return fetch(serverUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `fmetoken token=${fmeSecurityToken}`, // TODO: Ensure in configManager that token exists
    },
    body: JSON.stringify(sceneExport),
  });
}
