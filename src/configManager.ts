/* eslint-disable @typescript-eslint/naming-convention */
import { check, maybe, ofEnum, ofLiteralType, oneOf } from '@vcsuite/check';
import { parseBoolean, parseInteger } from '@vcsuite/parsers';
import type { ObliqueViewDirection, ProjectionOptions } from '@vcmap/core';
import type {
  AbstractDataSourceOptions,
  OneOfDataSourceOptions,
} from './dataSources/abstractDataSource';

/** Configuration options of the export plugin. */
export type ExportFormatProperties = {
  /** If the format supports textures. */
  texture: boolean;
  /** If the format supports local coordinates. */
  localCoordinates: boolean;
  /** If the format supports generic attributes. */
  genericAttributes: boolean;
  /** If the format supports height mode (move to ellipsoid). */
  heightMode: boolean;
};

/**  The possible export formats for the city model with properties. */
export const exportFormats: Record<string, ExportFormatProperties> = {
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

/** Represents properties of a thematic class. */
export type ThematicClassProperties = {
  /** The CityGML class value */
  value: string;
  /** The associated string representation, e.g. Building, Tunnel */
  title: string;
  /** Whether this class can only be handled when exporting to the CityGML format */
  citygmlOnly: boolean;
};

/** Object that maps the thematic class ids to the corresponding titles. */
export const thematicClassTitles: Record<string, string> = {
  '26': 'Building',
  '7': 'SolitaryVegetationObjects',
  '5': 'GenericCityObject',
  '21': 'CityFurniture',
  '14': 'ReliefFeature',
  '85': 'Tunnel',
  '64': 'Bridge',
  '45': 'Road',
  '44': 'Railway',
  '43': 'Track',
  '46': 'Square',
  '8': 'Plant Cover',
  '9': 'WaterBody',
  '4': 'LandUse',
};

/**
 * Maps an array of thematic city gml class ids to an array of objects with the properties of the classes.
 * @param classes The thematic classes that should be mapped.
 * @returns The thematic classes with title and if only available as city gml.
 */
export function mapThematicClasses(
  classes: string[],
): ThematicClassProperties[] {
  const cityGmlOnly: Record<string, boolean> = {
    '85': true,
    '45': true,
    '44': true,
    '43': true,
    '46': true,
    '8': true,
    '9': true,
    '4': true,
  };
  return classes.map((key) => ({
    value: key,
    title: thematicClassTitles[key],
    citygmlOnly: cityGmlOnly[key],
  }));
}

/** The available selection types. */
export enum SelectionTypes {
  AREA_SELECTION = 'areaSelection',
  OBJECT_SELECTION = 'objectSelection',
  CURRENT_IMAGE = 'currentImage',
}

/** The available dataSource options. */
export enum DataSourceOptions {
  CITY_MODEL = 'cityModel',
  OBLIQUE = 'oblique',
  GEOJSON = 'geojson',
}

/** The possible height modes. */
export enum HeightModes {
  ABSOLUTE = 'absolute',
  ELLIPSOID = 'ellipsoid',
}

/** The possible LODs for the city model. */
export enum LodOptions {
  LOD1 = 'LoD1',
  LOD2 = 'LoD2',
  LOD3 = 'LoD3',
  LOD4 = 'LoD4',
  HALOD = 'haLoD',
}

// TODO: Add default values to type

/** Configuration options for default city model settings. */
export type SettingsCityModelDefaults = {
  /** The default export formats. */
  exportFormatDefault: string[];
  /** The default LOD. */
  lodDefault: string;
  /** The default thematic class. */
  thematicClassDefault: string[];
  /** Default appearance theme for the city model. */
  appearanceThemeDefault: string;
  /** The default value for if height mode can be selected. */
  heightModeDefault: HeightModes;
};

/** General setup configuration options. */
export type GeneralSetup = {
  /** List of selectable data sources and their options. GeoJSON can additionally contain title and help. */
  dataSourceOptionsList: AbstractDataSourceOptions[];
  /** URL to a website with the term of use. */
  termsOfUse: string | null;
  /** Export name for export. */
  allowExportName: boolean;
  /** Export email. */
  allowEmail: boolean;
  /** If user can add a description to the city model export. */
  allowDescription: boolean;
  /** The max area for area selection in meters. */
  maxSelectionArea: number;
};

/** Available city model thematic classes the user can select from. */
export type AlteredSettingsCityModelInput = {
  /** Available city model thematic classes the user can select from. */
  thematicClassList: string[];
};

/** Configuration options for city model setup. */
export type SettingsCityModelSetup = {
  /** Available export formats the user can select from. */
  exportFormatList: string[];
  /** Available city model level of details the user can select from. */
  lodList: string[];
  /** Key value pairs of imagery layer name and level for textured terrain export */
  terrainAppearanceOptions: Record<string, number> | null;
  /** The possible appearance themes for the city model. */
  appearanceThemeList: string[];
  /** If the user can select a height mode (absolut/ellipsoid) */
  allowHeightMode: boolean;
  /** If user can choose to export textures */
  allowTextureExport: boolean;
  /** If user can choose to add generic attributes */
  allowAddGenericAttrs: boolean;
  /** If user can choose to export as tiles */
  allowTiledExport: boolean;
  /** If user can choose to export terrain */
  allowTerrainExport: boolean;
  /** The output crs as epsg code. Defaults to EPSG:25832. If array is provided user can select. Example: ["EPSG:25832", "EPSG:3587"] */
  crs: string | string[];
  /** URL used if terrainExport is true, if not provided the currently active terrain will be used. */
  terrainUrl: string | null;
  /** Zoom level of terrain used if terrainExport is true. */
  terrainZoomLevel?: number | null;
  /** The datas projection, defaults to EPSG:25832. */
  dataProjection?: ProjectionOptions;
  /** export entire scene, not just the city model. */
  exportScene: boolean;
  /** The FME server URL. */
  fmeServerUrl?: string;
  /** The FME security token for the given server. */
  fmeSecurityToken?: string;
};

/** Available city model thematic classes the user can select from. */
export type AlteredSettingsCityModelOutput = {
  /** Available city model thematic classes the user can select from. */
  thematicClassList: string[];
};

/** Setup variables of the export plugin. */
export type ExportConfig = GeneralSetup & {
  settingsCityModel: SettingsCityModelSetup & AlteredSettingsCityModelOutput;
} & {
  defaults: SettingsCityModelDefaults;
};

/** Configuration options of the export plugin. */
export type ExportOptions = SettingsCityModelSetup &
  SettingsCityModelDefaults &
  GeneralSetup &
  AlteredSettingsCityModelInput;

/** Configuration options for city model state. */
export type SettingsCityModelState = {
  /** The selected export formats of dataSource city model. */
  selectedExportFormats: string[];
  /** The selected level of detail of dataSource city model. */
  selectedLod: string;
  /** The selected thematic classes of dataSource city model. */
  selectedThematicClasses: string[];
  /** If terrain should be exported. */
  terrainExport: boolean;
  /** If texture should be exported. */
  textureExport: boolean;
  /** If the exported data should be tiled. */
  tiledExport: boolean;
  /** If the coordinates of the exported data should have a local coordinate system. */
  localCoordinates: boolean;
  /** If the generic attributes of the city model should also be exported. */
  genericAttributes: boolean;
  /** The output crs. */
  selectedCrs: string;
  /** The selected appearance theme for the city model. */
  selectedAppearanceTheme: string;
  /** The selected TMS or WMS Layer that is draped on the terrain for appearance. */
  selectedTerrainAppearanceLayer: string | null;
  /** The selected height mode. */
  selectedHeightMode: HeightModes;
};

/** Configuration options for oblique state. */
export type SettingsObliqueState = {
  /** Filters the direction so the user gets only images from this direction. */
  directionFilter: ObliqueViewDirection | null;
};

/** State variables of the export plugin. */
export type ExportState = {
  /** Step of the v-stepper vuetify component. */
  step: number;
  /** Highest step of the v-stepper vuetify component reached in this session. */
  highestStep: number;
  /** The selected settings for city model export. */
  settingsCityModel: SettingsCityModelState;
  /** The selected settings for oblique export. */
  settingsOblique: SettingsObliqueState;
  /** If user accepted the terms of use. */
  termsConsented: boolean;
  /** Email address provided by the user for sending results. */
  email: string | null;
  /** Name provided by the user for the exportet file. */
  exportName: string | null;
  /** A description that the user can add to the exported dataset to make it easier for him to identify the exported data. */
  description: string;
  /** The selected selection type. */
  selectedSelectionType: SelectionTypes | null;
  /** The selected dataSource options. */
  selectedDataSourceOptions: OneOfDataSourceOptions | null;
  /** The IDs of the selected city model objects via the object selection using mouse click. */
  selectedObjects: string[];
  /** The selected dataSource results (geojson or oblique). Objects are VcsListItems. */
  selectedResultItems: {
    name: string;
    title: string;
    tooltip: string;
    selectionChanged: () => void;
  }[];
};

/** Return type for the getConfigAndState function. */
export type ConfigAndState = {
  pluginConfig: ExportConfig;
  pluginState: ExportState;
};

/**
 * Parses the default options as well as the custom map plugin options and merges them.
 * @param pluginOptions The options which is defined when setting up the map.
 * @param defaultOptions The default plugin options inside the source code of the plugin.
 */
export function getConfigAndState(
  pluginOptions: ExportOptions,
  defaultOptions: ExportOptions,
): ConfigAndState {
  // perform validation

  check(
    pluginOptions.exportFormatList,
    maybe([ofLiteralType(Object.keys(exportFormats))]),
  );
  check(
    pluginOptions.exportFormatDefault || defaultOptions.exportFormatDefault,
    [
      ofLiteralType(
        pluginOptions.exportFormatList || defaultOptions.exportFormatList,
      ),
    ],
  );

  check(
    pluginOptions.thematicClassList,
    maybe([ofLiteralType(Object.keys(thematicClassTitles))]),
  );
  check(
    pluginOptions.thematicClassDefault || defaultOptions.thematicClassDefault,
    [
      ofLiteralType(
        pluginOptions.thematicClassList || defaultOptions.thematicClassList,
      ),
    ],
  );

  check(
    pluginOptions.lodList,
    maybe([ofLiteralType(Object.values(LodOptions))]),
  );
  check(
    pluginOptions.lodDefault || defaultOptions.lodDefault,
    ofLiteralType(pluginOptions.lodList || defaultOptions.lodList),
  );

  check(pluginOptions.appearanceThemeList, maybe([String]));
  check(
    pluginOptions.appearanceThemeDefault ||
      defaultOptions.appearanceThemeDefault,
    ofLiteralType(
      pluginOptions.appearanceThemeList || defaultOptions.appearanceThemeList,
    ),
  );

  check(
    pluginOptions.dataSourceOptionsList,
    maybe([{ type: ofLiteralType(Object.values(DataSourceOptions)) }]),
  );

  check(pluginOptions.heightModeDefault, maybe(ofEnum(HeightModes)));
  check(pluginOptions.terrainAppearanceOptions, maybe(Object));
  check(pluginOptions.terrainZoomLevel, maybe(Number));
  check(pluginOptions.allowHeightMode, maybe(Boolean));
  check(pluginOptions.allowTextureExport, maybe(Boolean));
  check(pluginOptions.allowAddGenericAttrs, maybe(Boolean));
  check(pluginOptions.allowTiledExport, maybe(Boolean));
  check(pluginOptions.allowTerrainExport, maybe(Boolean));
  check(pluginOptions.termsOfUse, maybe(String));
  check(pluginOptions.allowDescription, maybe(Boolean));
  check(pluginOptions.exportScene, maybe(Boolean));
  check(pluginOptions.crs, maybe(oneOf(String, [String])));
  check(pluginOptions.dataProjection, maybe(Object));
  check(pluginOptions.maxSelectionArea, maybe(Number));

  check(pluginOptions.allowEmail, maybe(Boolean));
  check(pluginOptions.allowExportName, maybe(Boolean));

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
    check(pluginOptions.fmeSecurityToken, maybe(String));
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
