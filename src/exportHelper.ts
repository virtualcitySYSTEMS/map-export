import {
  Extent,
  mercatorProjection,
  ObliqueMap,
  TerrainLayer,
  TMSLayer,
  WMSLayer,
  Projection,
} from '@vcmap/core';
import { Polygon } from 'ol/geom';
import { getArea } from 'ol/sphere';
import type Feature from 'ol/Feature.js';
import type { VcsUiApp } from '@vcmap/ui';
import collectScene from './collectScene.js';
import type { ExportConfig, ExportState } from './configManager.js';
import { exportFormats, SelectionTypes } from './configManager.js';
import reprojectObliqueGeometry from './obliqueHelper.js';

/**
 * @param fileSize The size in kilobyte.
 * @returns The size with unit as string.
 */
export function getStringFileSizeFromkB(fileSize: number): string {
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
 * @param feature
 * @param app The VcsApp instance
 * @param maxSelectionArea The max area for area selection in meters
 * @returns Promise<import("ol/geom").Polygon>
 * @throws Error - throws if the geometry is not a Polygon or the area is too large
 */
export async function validatePolygonFeature(
  feature: Feature,
  app: VcsUiApp,
  maxSelectionArea: number,
): Promise<Polygon> {
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
 * @param pluginConfig The setup configuration of the plugin.
 * @param pluginState The state of the plugin.
 * @param selectedArea The feature representing the selected area.
 * @param app The VcsUiApp instance
 * @param additionalParams
 * @returns The promise of the fetch post request to the fme server.
 */
export async function prepareQueryAndSend(
  pluginConfig: ExportConfig,
  pluginState: ExportState,
  selectedArea: Feature,
  app: VcsUiApp,
  additionalParams?: Record<string, unknown>,
): Promise<Response> {
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

  const {
    email,
    exportName,
    description,
    selectedSelectionType,
    selectedObjects,
  } = pluginState;

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

  /** The query paramters for GET request to VC Warehouse. */
  const query: Record<string, number | string | string[]> = {
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
    ...(email && { OPT_REQUESTEREMAIL: email }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    ...(exportName && { nm_NAME: exportName }),
    // eslint-disable-next-line @typescript-eslint/naming-convention
    nm_DESC: description,
    TERRAIN: 'No',
  };

  if (
    terrainExport &&
    selectedExportFormats.some((formatType) => formatType !== '2D Shape')
  ) {
    const activeTerrainLayer = [...app.layers].find(
      (layer) => layer instanceof TerrainLayer && layer.active,
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
    if (terrainZoomLevel && terrainZoomLevel >= 0) {
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
          terrainAppearanceOptions?.[selectedTerrainAppearanceLayer] ||
          layer.maxLevel;
        textureUrl.search = new URLSearchParams(layer.parameters).toString();
        query.WMS_URL = textureUrl.toString();
      } else if (layer instanceof TMSLayer) {
        query.TEX_TYPE = 'TMS';
        query.TMS_LEVEL =
          terrainAppearanceOptions?.[selectedTerrainAppearanceLayer] ||
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
    const geometry = (
      await validatePolygonFeature(selectedArea, app, maxSelectionArea)
    ).clone();

    geometry.transform(
      mercatorProjection.proj,
      new Projection(dataProjection).proj,
    );

    const coords = geometry.getCoordinates()[0];

    query.POLYGON = coords
      .map((coord) => {
        const [x, y] = coord;
        return `${x},${y}`;
      })
      .join(';');
    const bbox = new Extent({
      projection: mercatorProjection.toJSON(),
      coordinates: selectedArea.getGeometry()?.getExtent(),
    });
    if (exportScene) {
      sceneExport = await collectScene(bbox, app);
    }
  } else {
    sceneExport = { selectedFeatures: selectedObjects };
  }

  // TODO: Validate server url. isTrustedUrl not in core anymore?
  if (!fmeServerUrl) {
    throw new Error('FME server URL is not configured');
  }
  const serverUrl = new URL(fmeServerUrl, window.location.href);
  Object.entries(query).forEach(([key, value]) => {
    serverUrl.searchParams.set(key, String(value));
  });

  const combinedData = { ...sceneExport, ...additionalParams };

  return fetch(serverUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'Content-Type': 'application/json',
      ...(fmeSecurityToken
        ? { Authorization: `fmetoken token=${fmeSecurityToken}` }
        : {}),
    },
    body: JSON.stringify(combinedData),
  });
}
