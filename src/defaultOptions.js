/**
 * @returns {import("./configManager").ExportOptions} the default plugin options
 */
export default () => {
  return {
    exportFormatList: [
      '2D Shape',
      '3D Shape - PolygonZ',
      '3D Shape - Multipatch',
      'ESRI FGDB',
      'KMZ',
      'CityGML',
      'CityJSON',
      'DXF',
      'DWG',
      '3DS',
      'SketchUp',
      'OBJ',
      'VRML',
      'COLLADA',
      'GLTF',
      '3DPDF',
      'FMEAR',
      'STL',
      'STEP',
      'GEOPACKAGE',
      'FBX',
    ],
    exportFormatDefault: ['CityGML'],
    lodList: ['LoD1', 'LoD2', 'LoD3', 'haLoD'],
    lodDefault: 'haLoD',
    thematicClassList: [
      '26',
      '7',
      '14',
      '5',
      '21',
      '85',
      '64',
      '45',
      '43',
      '46',
      '8',
      '9',
      '4',
      '44',
    ],
    thematicClassDefault: ['26'],
    dataSourceOptionsList: [],
    appearanceThemeList: ['rgbTexture'],
    appearanceThemeDefault: 'rgbTexture',
    heightModeDefault: 'absolute',
    allowHeightMode: true,
    allowCrsTextInput: false,
    allowTextureExport: true,
    allowAddGenericAttrs: true,
    allowTiledExport: true,
    allowTerrainExport: true,
    termsOfUse:
      'https://www.businesslocationcenter.de/berlin3d-downloadportal/templates/en/datenschutzhinweise.html',
    terrainAppearanceOptions: {},
    terrainUrl: null,
    terrainZoomLevel: -1,
    crs: 'EPSG:25832',
    allowDescription: true,
    dataProjection: { epsg: 'EPSG:25832' },
    exportScene: true,
    maxSelectionArea: 2000000,
  };
};