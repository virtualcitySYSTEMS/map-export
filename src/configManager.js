import { getDefaultProjection, Projection } from '@vcmap/core';
import { check, checkMaybe } from '@vcsuite/check';
import { parseBoolean, parseInteger } from '@vcsuite/parsers';

/**
 * @typedef {Object} ExportFormatProperties Configuration options of the export plugin.
 * @property {boolean} texture If the format supports textures.
 * @property {boolean} localCoordinates If the format supports local coordinates.
 * @property {boolean} genericAttributes If the format supports generic attributes.
 * @property {boolean} heightMode If the format supports height mode (move to ellipsoid).
 */

/**
 *  The possible export formats for the city model with properties.
 *  @type {Object<string, ExportFormatProperties>}
 */
export const exportFormats = {
  '2D Shape': {
    texture: false,
    localCoordinates: false,
    genericAttributes: true,
    heightMode: false,
  },
  '3D Shape - PolygonZ': {
    texture: false,
    localCoordinates: false,
    genericAttributes: true,
    heightMode: true,
  },
  '3D Shape - Multipatch': {
    texture: false,
    localCoordinates: false,
    genericAttributes: true,
    heightMode: true,
  },
  'ESRI FGDB': {
    texture: false,
    localCoordinates: false,
    genericAttributes: true,
    heightMode: true,
  },
  KMZ: {
    texture: true,
    localCoordinates: true,
    genericAttributes: true,
    heightMode: true,
  },
  CityGML: {
    texture: true,
    localCoordinates: false,
    genericAttributes: true,
    heightMode: false,
  },
  CityJSON: {
    texture: true,
    localCoordinates: false,
    genericAttributes: true,
    heightMode: false,
  },
  DXF: {
    texture: false,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  DWG: {
    texture: false,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  '3DS': {
    texture: true,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  SketchUp: {
    texture: true,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  OBJ: {
    texture: true,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  VRML: {
    texture: true,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  COLLADA: {
    texture: true,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  GLTF: {
    texture: true,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  '3DPDF': {
    texture: true,
    localCoordinates: false,
    genericAttributes: true,
    heightMode: true,
  },
  FMEAR: {
    texture: true,
    localCoordinates: false,
    genericAttributes: false,
    heightMode: true,
  },
  STL: {
    texture: false,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  STEP: {
    texture: false,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
  GEOPACKAGE: {
    texture: false,
    localCoordinates: false,
    genericAttributes: true,
    heightMode: true,
  },
  FBX: {
    texture: true,
    localCoordinates: true,
    genericAttributes: false,
    heightMode: true,
  },
};

/**
 * @typedef {Object} ThematicClassProperties
 * @property {string} value - the CityGML class value
 * @property {string} text - the associated string representation, eg. Building, Tunnel
 * @property {boolean} citygmlOnly - whether this class can only be handled when exporting to the CityGML format
 * @api
 */

/**
 * Maps an array of thematic city gml class ids to an array of objects with the properties of the classes.
 * @param {Array<string>} classes The thematic classes that should be mapped.
 * @returns {Array<ThematicClassProperties>} The thematic classes with title and if only available as city gml.
 */
function mapThematicClasses(classes) {
  const titles = {
    26: 'Building',
    7: 'SolitaryVegetationObjects',
    5: 'GenericCityObject',
    21: 'CityFurniture',
    14: 'ReliefFeature',
    85: 'Tunnel',
    64: 'Bridge',
    45: 'Road',
    44: 'Railway',
    43: 'Track',
    46: 'Square',
    8: 'Plant Cover',
    9: 'WaterBody',
    4: 'LandUse',
  };
  const cityGmlOnly = {
    85: true,
    45: true,
    44: true,
    43: true,
    46: true,
    8: true,
    9: true,
    4: true,
  };
  return classes.map(key => ({
    value: key,
    text: titles[key],
    citygmlOnly: cityGmlOnly[key],
  }));
}

/**
 * The available selection types.
 * @enum {string}
 */
export const SelectionTypes = {
  AREA_SELECTION: 'areaSelection',
  OBJECT_SELECTION: 'objectSelection',
  CURRENT_IMAGE: 'currentImage',
};

/**
 * The available dataSource options.
 * @enum {string}
 */
export const DataSourceOptions = {
  CITY_MODEL: 'cityModel',
  OBLIQUE: 'oblique',
  GEOJSON: 'geojson',
};

/**
 * The possible height modes.
 * @enum {string}
 */
export const HeightModes = {
  ABSOLUTE: 'absolute',
  ELLIPSOID: 'ellipsoid',
};

/**
 * The possible LODs for the city model.
 * @enum {string}
 */
export const LodOptions = {
  LOD1: 'LoD1',
  LOD2: 'LoD2',
  LOD3: 'LoD3',
  LOD4: 'LoD4',
  HALOD: 'haLoD',
};

// TODO: Add default values to type
/**
 * @typedef {Object} SettingsCityModelDefaults
 * @property {Array<string>} exportFormatDefault The default export formats.
 * @property {string} lodDefault The default LOD.
 * @property {Array<string>} thematicClassDefault The default thematic class.
 * @property {string} appearanceThemeDefault Default appearance theme for the city model.
 * @property {HeightModes} heightModeDefault The default value for if height mode can be selected.
 * @typedef GeneralSetup
 * @property {Array<import("./dataSources/abstractDataSource").AbstractDataSourceOptions>} dataSourceOptionsList List of selectable data sources and their options. GeoJSON can additionally contain title and help.
 * @property {URL | string | null} termsOfUse URL to a website with the term of use.
 * @property {boolean} allowDescription If user can add a description to the city model export.
 * @property {number} maxSelectionArea The max area for area selection in meters.
 * Is a setting for city model but type is altered, therefore can not be part of SettingsCityModelSetup typedef
 * @typedef {Object} AlteredSettingsCityModelInput Available city model thematic classes the user can select from.
 * @property {Array<string>} thematicClassOptions Available city model thematic classes the user can select from.
 * @typedef {SettingsCityModelSetup & SettingsCityModelDefaults & GeneralSetup & AlteredSettingsCityModelInput} ExportConfig Configuration options of the export plugin.
 */

/**
 * @typedef {Object} SettingsCityModelSetup The settings for city model exports
 * @property {Array<string>} exportFormatList Available export formats the user can select from.
 * @property {Array<string>} lodList Available city model level of details the user can select from.
 * @property {Object<string, number> | null} terrainAppearanceOptions Key value pairs of imagery layer name and level for textured terrain export
 * @property {Array<string>} appearanceThemeList The possible appearance themes for the city model.
 * @property {boolean} allowHeightMode If the user can select a height mode (absolut/ellipsoid)
 * @property {boolean} allowCrsTextInput If the user can insert an epsg code for output crs
 * @property {boolean} allowTextureExport If user can choose to export textures
 * @property {boolean} allowAddGenericAttrs If user can choose to add generic attributes
 * @property {boolean} allowTiledExport If user can choose to export as tiles
 * @property {boolean} allowTerrainExport If user can choose to export terrain
 * @property {string | Array<string> | null} crs The output crs as epsg code. If array is provided user can select. Example: ["EPSG:25832", "EPSG:4326"]
 * @property {string | null} terrainUrl URL used if terrainExport is true, if not provided the currently active terrain will be used.
 * @property {?number} terrainZoomLevel Zoom level of terrain used if terrainExport is true.
 * @property {import("@vcmap/core").ProjectionOptions | null} dataProjection The datas projection, defaults to getDefaultProjection().
 * @property {boolean} exportScene export entire scene, not just the city model.
 * @property {string=} fmeServerUrl The FME server URL.
 * @property {string=} fmeSecurityToken The FME security token for the given server.
 */

/**
 * @typedef {Object} AlteredSettingsCityModelOutput Available city model thematic classes the user can select from.
 * @property {Array<ThematicClassProperties>} thematicClassList Available city model thematic classes the user can select from.
 * @typedef {GeneralSetup & {settingsCityModel: SettingsCityModelSetup & AlteredSettingsCityModelOutput}} ExportSetup Setup variables of the export plugin.
 */

/**
 * @typedef {Object} SettingsCityModelState
 * @property {Array<string>} selectedExportFormats The selected export formats of dataSource city model.
 * @property {string} selectedLod The selected level of detail of dataSource city model.
 * @property {Array<string>} selectedThematicClasses The selected thematic classes of dataSource city model.
 * @property {boolean} terrainExport If terrain should be exported.
 * @property {boolean} textureExport If texture should be exported.
 * @property {boolean} tiledExport If the exported data should be tiled.
 * @property {boolean} localCoordinates If the coordinates of the exported data should have a local coordinate system.
 * @property {boolean} genericAttributes If the generic attributes of the city model should also be exported.
 * @property {string | null} selectedCrs The output crs.
 * @property {string} selectedAppearanceTheme The selected appearance theme for the city model.
 * @property {string | null} selectedTerrainAppearanceLayer The selected TMS or WMS Layer that is draped on the terrain for appearance.
 * @property {HeightModes} selectedHeightMode The selected height mode.
 */

/**
 * @typedef {Object} SettingsObliqueState
 * @property {import("@vcmap/core").ObliqueViewDirection | null} directionFilter Filters the direction so the user gets only images from this direction.
 */

/**
 * @typedef ExportState State variables of the export plugin.
 * @property {number} step Step of the v-stepper vuetify component.
 * @property {number} highestStep Highest step of the v-stepper vuetify component reached in this session.
 * @property {SettingsCityModelState} settingsCityModel The selected settings for city model export.
 * @property {SettingsObliqueState} settingsOblique The selected settings for oblique export.
 * @property {boolean} termsConsented If user accepted the terms of use.
 * @property {string | null} email Email address provided by the user for sending results.
 * @property {string} description A description that the user can add to the exported dataset to make it easier for him to identify the exported data.
 * @property {SelectionTypes | null} selectedSelectionType The selected selection type.
 * @property {DataSourceOptions | null} selectedDataSource The selected dataSource.
 * @property {Array<string>} selectedObjects The IDs of the selected city model objects via the object selection using mouse click.
 * @property {{name: string, title: string, tooltip: string, selectionChanged: Function}[]} selectedResultItems The selected dataSource results (geojson or oblique). Objects are VcsListItems.
 */

/**
 * Parses the default config as well as the custom map plugin config and merges them.
 * @param {ExportConfig} pluginConfig The config which is defined when setting up the map.
 * @param {ExportConfig} defaultConfig The default plugin config inside the source code of the plugin.
 * @returns {{pluginSetup: ExportSetup, pluginState: ExportState}}
 */
export function getSetupAndState(pluginConfig, defaultConfig) {
  // perform validation

  // is put in an object so that if only one string is in the array/list, the array can be removed so the check of the default value works
  const stringListValidation = {
    exportFormatList: pluginConfig.exportFormatList || defaultConfig.exportFormatList,
    lodList: pluginConfig.lodList || defaultConfig.lodList,
    thematicClassList: pluginConfig.thematicClassOptions || defaultConfig.thematicClassOptions,
    appearanceThemeList: pluginConfig.appearanceThemeList || defaultConfig.appearanceThemeList,
  };

  Object.keys(stringListValidation).forEach((key) => {
    check(stringListValidation[key], [String]);
    if (stringListValidation[key].length === 1) {
      stringListValidation[key] = stringListValidation[key][0];
    }
  });

  checkMaybe(pluginConfig.exportFormatList, [String]);
  if (pluginConfig.exportFormatDefault) {
    pluginConfig.exportFormatDefault?.forEach(
      exportFormat => check(exportFormat, stringListValidation.exportFormatList),
    );
  } else {
    defaultConfig.exportFormatDefault?.forEach(
      exportFormat => checkMaybe(exportFormat, stringListValidation.exportFormatList),
    );
  }
  checkMaybe(pluginConfig.lodList, Object.values(LodOptions));
  check(pluginConfig.lodDefault || defaultConfig.lodDefault, stringListValidation.lodList);
  checkMaybe(pluginConfig.thematicClassOptions, [Number]);
  if (pluginConfig.thematicClassDefault) {
    pluginConfig.thematicClassDefault?.forEach(
      thematicClass => check(thematicClass, stringListValidation.thematicClassList),
    );
  } else {
    defaultConfig.exportFormatDefault?.forEach(
      exportFormat => checkMaybe(exportFormat, pluginConfig.exportFormatList || defaultConfig.exportFormatList),
    );
  }
  checkMaybe(pluginConfig.dataSourceOptionsList, [{ type: String }]);
  checkMaybe(pluginConfig.appearanceThemeList, [String]);

  check(
    pluginConfig.appearanceThemeDefault || defaultConfig.appearanceThemeDefault,
    stringListValidation.appearanceThemeList,
  );
  checkMaybe(pluginConfig.heightModeDefault, HeightModes);
  checkMaybe(pluginConfig.terrainAppearanceOptions, Object);
  checkMaybe(pluginConfig.terrainZoomLevel, Number);
  checkMaybe(pluginConfig.allowHeightMode, Boolean);
  checkMaybe(pluginConfig.allowCrsTextInput, Boolean);
  checkMaybe(pluginConfig.allowTextureExport, Boolean);
  checkMaybe(pluginConfig.allowAddGenericAttrs, Boolean);
  checkMaybe(pluginConfig.allowTiledExport, Boolean);
  checkMaybe(pluginConfig.allowTerrainExport, Boolean);
  checkMaybe(pluginConfig.termsOfUse, [String, URL]);
  checkMaybe(pluginConfig.allowDescription, Boolean);
  checkMaybe(pluginConfig.exportScene, Boolean);
  checkMaybe(pluginConfig.crs, [String, [String]]);
  checkMaybe(pluginConfig.dataProjection, Object);
  checkMaybe(pluginConfig.maxSelectionArea, Number);

  const dataSourceOptionsList = pluginConfig.dataSourceOptionsList || defaultConfig.dataSourceOptionsList;
  dataSourceOptionsList.forEach((dataSourceOptions) => {
    if (dataSourceOptions.type === DataSourceOptions.GEOJSON) {
      if (dataSourceOptions.title) {
        if (typeof dataSourceOptions.title !== 'string') {
          // TODO: Translate if object with i18n strings.
          // Is there a utility function for this?
        }
      } else {
        dataSourceOptions.title = 'export.dataSources.geojson';
      }
      if (dataSourceOptions.help) {
        if (typeof dataSourceOptions.help !== 'string') {
          // TODO: Translate if object with i18n strings.
          // Is there a utility function for this?
        }
      } else {
        dataSourceOptions.help = 'export.help.dataSources.geojson';
      }
    }
  });

  if (dataSourceOptionsList.some(dataSourceOption => dataSourceOption.type === DataSourceOptions.CITY_MODEL)) {
    check(pluginConfig.fmeSecurityToken, String);
    check(pluginConfig.fmeServerUrl, String);
  }

  const exportFormatList = pluginConfig.exportFormatList || defaultConfig.exportFormatList;
  const exportFormatDefault = pluginConfig.exportFormatDefault || defaultConfig.exportFormatDefault;

  const lodList = pluginConfig.lodList || defaultConfig.lodList;
  const lodDefault = pluginConfig.lodDefault || defaultConfig.lodDefault;

  const thematicClassList = mapThematicClasses(
    pluginConfig.thematicClassOptions || defaultConfig.thematicClassOptions,
  );
  const thematicClassDefault = pluginConfig.thematicClassDefault || defaultConfig.thematicClassDefault;

  const termsOfUse = pluginConfig.termsOfUse || defaultConfig.termsOfUse;


  const appearanceThemeList = pluginConfig.appearanceThemeList || defaultConfig.appearanceThemeList;
  const appearanceThemeDefault = pluginConfig.appearanceThemeDefault || defaultConfig.appearanceThemeDefault;

  const terrainAppearanceOptions = pluginConfig.terrainAppearanceOptions || {};

  const allowHeightMode = parseBoolean(pluginConfig.allowHeightMode, defaultConfig.allowHeightMode);
  const heightModeDefault = pluginConfig.heightModeDefault || defaultConfig.heightModeDefault;

  const allowCrsTextInput = parseBoolean(pluginConfig.allowCrsTextInput, defaultConfig.allowCrsTextInput);
  const allowTextureExport = parseBoolean(pluginConfig.allowTextureExport, defaultConfig.allowTextureExport);
  const allowAddGenericAttrs = parseBoolean(pluginConfig.allowAddGenericAttrs, defaultConfig.allowAddGenericAttrs);
  const allowTiledExport = parseBoolean(pluginConfig.allowTiledExport, defaultConfig.allowTiledExport);
  const allowTerrainExport = parseBoolean(pluginConfig.allowTerrainExport, defaultConfig.allowTerrainExport);

  const { terrainUrl } = pluginConfig;
  // terrainZoomLevel needs to be null, so it can be JSON stringified, but input of parseInteger has to be undefined.
  const terrainZoomLevel = parseInteger(pluginConfig.terrainZoomLevel, defaultConfig.terrainZoomLevel || undefined) ||
    null;

  const dataProjection = pluginConfig.dataProjection ?
    new Projection(pluginConfig.dataProjection) : getDefaultProjection();

  const crs = pluginConfig.crs || dataProjection.epsg;

  const allowDescription = parseBoolean(pluginConfig.allowDescription, defaultConfig.allowDescription);

  const fmeSecurityToken = pluginConfig.fmeSecurityToken || defaultConfig.fmeSecurityToken;

  const fmeServerUrl = pluginConfig.fmeServerUrl || defaultConfig.fmeServerUrl;

  const maxSelectionArea = pluginConfig.maxSelectionArea || defaultConfig.maxSelectionArea;

  let selectedCrs = null;
  if (Array.isArray(crs)) {
    selectedCrs = crs[0];
  }

  const exportScene = pluginConfig.exportScene || defaultConfig.exportScene;

  return {
    pluginSetup: {
      settingsCityModel: {
        exportFormatList,
        lodList,
        thematicClassList,
        terrainAppearanceOptions,
        appearanceThemeList,
        allowHeightMode,
        allowCrsTextInput,
        allowTextureExport,
        allowAddGenericAttrs,
        allowTiledExport,
        allowTerrainExport,
        crs,
        terrainUrl,
        terrainZoomLevel,
        dataProjection,
        exportScene,
        fmeSecurityToken,
        fmeServerUrl,
      },
      termsOfUse,
      dataSourceOptionsList,
      allowDescription,
      maxSelectionArea,
    },
    pluginState: {
      step: 1,
      highestStep: 1,
      settingsCityModel: {
        selectedExportFormats: exportFormatDefault,
        selectedLod: lodDefault,
        selectedThematicClasses: thematicClassDefault,
        terrainExport: false,
        textureExport: false,
        tiledExport: false,
        localCoordinates: false,
        genericAttributes: false,
        selectedCrs,
        selectedAppearanceTheme: appearanceThemeDefault,
        selectedTerrainAppearanceLayer: null,
        selectedHeightMode: heightModeDefault,
      },
      settingsOblique: {
        directionFilter: null,
      },
      termsConsented: false,
      email: null,
      description: '',
      selectedSelectionType: null,
      selectedDataSource: null,
      selectedObjects: [],
      selectedResultItems: [],
    },
  };
}
