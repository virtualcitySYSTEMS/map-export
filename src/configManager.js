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
 * Object that maps the thematic class ids to the corresponding titles.
 */
export const thematicClassTitles = {
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

/**
 * Maps an array of thematic city gml class ids to an array of objects with the properties of the classes.
 * @param {Array<string>} classes The thematic classes that should be mapped.
 * @returns {Array<ThematicClassProperties>} The thematic classes with title and if only available as city gml.
 */
export function mapThematicClasses(classes) {
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
  return classes.map((key) => ({
    value: key,
    title: thematicClassTitles[key],
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
 * @property {boolean} allowExportName export name for export.
 * @property {boolean} allowEmail export email.
 * @property {boolean} allowDescription If user can add a description to the city model export.
 * @property {number} maxSelectionArea The max area for area selection in meters.
 * Is a setting for city model but type is altered, therefore can not be part of SettingsCityModelSetup typedef
 * @typedef {Object} AlteredSettingsCityModelInput Available city model thematic classes the user can select from.
 * @property {Array<string>} thematicClassList Available city model thematic classes the user can select from.
 * @typedef {SettingsCityModelSetup & SettingsCityModelDefaults & GeneralSetup & AlteredSettingsCityModelInput} ExportOptions Configuration options of the export plugin.
 */

/**
 * @typedef {Object} SettingsCityModelSetup The settings for city model exports
 * @property {Array<string>} exportFormatList Available export formats the user can select from.
 * @property {Array<string>} lodList Available city model level of details the user can select from.
 * @property {Object<string, number> | null} terrainAppearanceOptions Key value pairs of imagery layer name and level for textured terrain export
 * @property {Array<string>} appearanceThemeList The possible appearance themes for the city model.
 * @property {boolean} allowHeightMode If the user can select a height mode (absolut/ellipsoid)
 * @property {boolean} allowTextureExport If user can choose to export textures
 * @property {boolean} allowAddGenericAttrs If user can choose to add generic attributes
 * @property {boolean} allowTiledExport If user can choose to export as tiles
 * @property {boolean} allowTerrainExport If user can choose to export terrain
 * @property {string | Array<string>} crs The output crs as epsg code. Defaults to EPSG:25832. If array is provided user can select. Example: ["EPSG:25832", "EPSG:3587"]
 * @property {string | null} terrainUrl URL used if terrainExport is true, if not provided the currently active terrain will be used.
 * @property {?number} terrainZoomLevel Zoom level of terrain used if terrainExport is true.
 * @property {import("@vcmap/core").ProjectionOptions} dataProjection The datas projection, defaults to EPSG:25832.
 * @property {boolean} exportScene export entire scene, not just the city model.
 * @property {string=} fmeServerUrl The FME server URL.
 * @property {string=} [fmeSecurityToken] The FME security token for the given server.
 */

/**
 * @typedef {Object} AlteredSettingsCityModelOutput Available city model thematic classes the user can select from.
 * @property {Array<string>} thematicClassList Available city model thematic classes the user can select from.
 * @typedef {GeneralSetup & {settingsCityModel: SettingsCityModelSetup & AlteredSettingsCityModelOutput} & {defaults: SettingsCityModelDefaults}} ExportConfig Setup variables of the export plugin.
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
 * @property {string} selectedCrs The output crs.
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
 * @property {string | null} exportName Name provided by the user for the exportet file.
 * @property {string} description A description that the user can add to the exported dataset to make it easier for him to identify the exported data.
 * @property {SelectionTypes | null} selectedSelectionType The selected selection type.
 * @property {import('./dataSources/abstractDataSource').AbstractDataSourceOptions | null} selectedDataSourceOptions The selected dataSource options.
 * @property {Array<string>} selectedObjects The IDs of the selected city model objects via the object selection using mouse click.
 * @property {{name: string, title: string, tooltip: string, selectionChanged: Function}[]} selectedResultItems The selected dataSource results (geojson or oblique). Objects are VcsListItems.
 */

/**
 * Parses the default options as well as the custom map plugin options and merges them.
 * @param {ExportOptions} pluginOptions The options which is defined when setting up the map.
 * @param {ExportOptions} defaultOptions The default plugin options inside the source code of the plugin.
 * @returns {{pluginConfig: ExportConfig, pluginState: ExportState}}
 */
export function getConfigAndState(pluginOptions, defaultOptions) {
  // perform validation

  // is put in an object so that if only one entry is in the array, the array can be removed so the check of the default value works. Can be removed when @vcsuite/check is updated.
  const listOptions = [
    'exportFormat',
    'thematicClass',
    'lod',
    'appearanceTheme',
  ].reduce((acc, key) => {
    const value = pluginOptions[`${key}List`] || defaultOptions[`${key}List`];
    acc[`${key}List`] = value.length === 1 ? value[0] : value;
    return acc;
  }, {});

  checkMaybe(pluginOptions.exportFormatList, [Object.keys(exportFormats)]);
  check(
    pluginOptions.exportFormatDefault || defaultOptions.exportFormatDefault,
    [listOptions.exportFormatList],
  );

  checkMaybe(pluginOptions.thematicClassList, [
    Object.keys(thematicClassTitles),
  ]);
  check(
    pluginOptions.thematicClassDefault || defaultOptions.thematicClassDefault,
    [listOptions.thematicClassList],
  );

  checkMaybe(pluginOptions.lodList, [Object.values(LodOptions)]);
  check(
    pluginOptions.lodDefault || defaultOptions.lodDefault,
    listOptions.lodList,
  );

  checkMaybe(pluginOptions.appearanceThemeList, [String]);
  check(
    pluginOptions.appearanceThemeDefault ||
      defaultOptions.appearanceThemeDefault,
    listOptions.appearanceThemeList,
  );

  checkMaybe(pluginOptions.dataSourceOptionsList, [
    { type: Object.values(DataSourceOptions) },
  ]);

  checkMaybe(pluginOptions.heightModeDefault, Object.values(HeightModes));
  checkMaybe(pluginOptions.terrainAppearanceOptions, Object);
  checkMaybe(pluginOptions.terrainZoomLevel, Number);
  checkMaybe(pluginOptions.allowHeightMode, Boolean);
  checkMaybe(pluginOptions.allowTextureExport, Boolean);
  checkMaybe(pluginOptions.allowAddGenericAttrs, Boolean);
  checkMaybe(pluginOptions.allowTiledExport, Boolean);
  checkMaybe(pluginOptions.allowTerrainExport, Boolean);
  checkMaybe(pluginOptions.termsOfUse, [String, URL]);
  checkMaybe(pluginOptions.allowDescription, Boolean);
  checkMaybe(pluginOptions.exportScene, Boolean);
  checkMaybe(pluginOptions.crs, [String, [String]]);
  checkMaybe(pluginOptions.dataProjection, Object);
  checkMaybe(pluginOptions.maxSelectionArea, Number);

  checkMaybe(pluginOptions.allowEmail, Boolean);
  checkMaybe(pluginOptions.allowExportName, Boolean);

  const dataSourceOptionsList =
    pluginOptions.dataSourceOptionsList || defaultOptions.dataSourceOptionsList;
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

  if (
    dataSourceOptionsList.some(
      (dataSourceOption) =>
        dataSourceOption.type === DataSourceOptions.CITY_MODEL,
    )
  ) {
    check(pluginOptions.fmeServerUrl, String);
    checkMaybe(pluginOptions.fmeSecurityToken, String);
  }

  const exportFormatList =
    pluginOptions.exportFormatList || defaultOptions.exportFormatList;
  const exportFormatDefault =
    pluginOptions.exportFormatDefault || defaultOptions.exportFormatDefault;

  const lodList = pluginOptions.lodList || defaultOptions.lodList;
  const lodDefault = pluginOptions.lodDefault || defaultOptions.lodDefault;

  const thematicClassList =
    pluginOptions.thematicClassList || defaultOptions.thematicClassList;
  const thematicClassDefault =
    pluginOptions.thematicClassDefault || defaultOptions.thematicClassDefault;

  const termsOfUse =
    pluginOptions.termsOfUse !== undefined
      ? pluginOptions.termsOfUse
      : defaultOptions.termsOfUse;

  const appearanceThemeList =
    pluginOptions.appearanceThemeList || defaultOptions.appearanceThemeList;
  const appearanceThemeDefault =
    pluginOptions.appearanceThemeDefault ||
    defaultOptions.appearanceThemeDefault;

  const terrainAppearanceOptions = pluginOptions.terrainAppearanceOptions || {};

  const allowHeightMode = parseBoolean(
    pluginOptions.allowHeightMode,
    defaultOptions.allowHeightMode,
  );
  const heightModeDefault =
    pluginOptions.heightModeDefault || defaultOptions.heightModeDefault;

  const allowTextureExport = parseBoolean(
    pluginOptions.allowTextureExport,
    defaultOptions.allowTextureExport,
  );
  const allowAddGenericAttrs = parseBoolean(
    pluginOptions.allowAddGenericAttrs,
    defaultOptions.allowAddGenericAttrs,
  );
  const allowTiledExport = parseBoolean(
    pluginOptions.allowTiledExport,
    defaultOptions.allowTiledExport,
  );
  const allowTerrainExport = parseBoolean(
    pluginOptions.allowTerrainExport,
    defaultOptions.allowTerrainExport,
  );

  const terrainUrl = pluginOptions.terrainUrl || defaultOptions.terrainUrl;
  // terrainZoomLevel needs to be null, so it can be JSON stringified, but input of parseInteger has to be undefined.
  const terrainZoomLevel =
    parseInteger(
      pluginOptions.terrainZoomLevel,
      defaultOptions.terrainZoomLevel || undefined,
    ) || null;

  const dataProjection =
    pluginOptions.dataProjection || defaultOptions.dataProjection;

  const crs = pluginOptions.crs || defaultOptions.crs;

  const allowDescription = parseBoolean(
    pluginOptions.allowDescription,
    defaultOptions.allowDescription,
  );

  const fmeSecurityToken =
    pluginOptions.fmeSecurityToken || defaultOptions.fmeSecurityToken;

  const fmeServerUrl =
    pluginOptions.fmeServerUrl || defaultOptions.fmeServerUrl;

  const maxSelectionArea =
    pluginOptions.maxSelectionArea || defaultOptions.maxSelectionArea;

  const selectedCrs = Array.isArray(crs) ? crs[0] : crs;

  const exportScene = parseBoolean(
    pluginOptions.exportScene,
    defaultOptions.exportScene,
  );

  const allowExportName = parseBoolean(
    pluginOptions.allowExportName,
    defaultOptions.allowExportName,
  );

  const allowEmail = parseBoolean(
    pluginOptions.allowEmail,
    defaultOptions.allowEmail,
  );

  return {
    pluginConfig: {
      settingsCityModel: {
        exportFormatList,
        lodList,
        thematicClassList,
        terrainAppearanceOptions,
        appearanceThemeList,
        allowHeightMode,
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
      allowExportName,
      allowEmail,
      termsOfUse,
      dataSourceOptionsList,
      allowDescription,
      maxSelectionArea,
      defaults: {
        exportFormatDefault,
        lodDefault,
        thematicClassDefault,
        appearanceThemeDefault,
        heightModeDefault,
      },
    },
    pluginState: {
      step: 0,
      highestStep: 0,
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
      exportName: null,
      description: '',
      selectedSelectionType: null,
      selectedDataSourceOptions: null,
      selectedObjects: [],
      selectedResultItems: [],
    },
  };
}
