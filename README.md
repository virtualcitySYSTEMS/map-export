# @vcmap/export

## General

The export plugin allows to export different source data from within the VC Map.
This includes data from the city model, oblique images and other spatial data that is visualized in the map as geojson areas.

General configurations are:

| key                   | type                                                                                       | default                 | description                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------ | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| dataSourceOptionsList | Array<ObliqueDataSourceOptions &vert; GeoJSONDataSourceOptions &vert; {type: 'cityModel'}> | [{ type: 'cityModel' }] | The data sources that the export widget should support.                                                                   |
| requestTermsConsent   | Url                                                                                        | null                    | A link to the terms of use. If a link is provided the acceptance of the terms is requested before a download is possible. |
| maxSelectionArea      | number                                                                                     | 2000000                 | The maximum area of the area selection mode.                                                                              |

#### ObliqueDataSourceOptions

| key                   | type      | required | description                                                                                                  |
| --------------------- | --------- | -------- | ------------------------------------------------------------------------------------------------------------ |
| type                  | 'oblique' | &check;  | type of export data source. For ObliqueDataSourceOptions it is always 'oblique'.                             |
| baseUrl               | string    |          | The base url for the images if dedicatedSource is true.                                                      |
| obliqueCollectionName | string    | &check;  | The name of the oblique collection.                                                                          |
| fileExtension         | string    |          | The file extension for the images. Allowed values are 'jpg', 'jpeg', 'png', 'tif', 'tiff'. Default is 'jpg'. |
| dedicatedSource       | boolean   |          | If the oblique images can be downloaded directly. Otherwise they are put together from the tiles in the map. |
| resolution            | number    |          | The zoom level of the images.                                                                                |

#### GeoJSONDataSourceOptions

| key        | type               | required | description                                                                                                   |
| ---------- | ------------------ | -------- | ------------------------------------------------------------------------------------------------------------- |
| type       | 'geojson'          | &check;  | type of export data source. For GeoJSONDataSourceOptions it is always 'geojson'.                              |
| baseUrl    | string &vert; null |          | The base url for the urls in the GeoJSON file.                                                                |
| geojsonUrl | string             | &check;  | The url of the geojson data set, which contains a property `url`, linking to the datasets to download.        |
| title      | string             |          | The title that is shown in the ui for this data source. If no title is provided, the title will be "GeoJSON". |

### City Model

This data source type allows to download city model objects, the terrain and the whole scene in many different data formats.
Selected are either single objects or surfaces, as polygon or as BBOX.
For object selection you need at least one layer in a module configuration with an `exportWorkbench` property configured, where the property value corresponds to the `fmeServerUrl` of the table below:

```json
{
  "layers": [
    {
      "type": "CesiumTilesetLayer",
      "name": "Berlin untexturiert openData (pbr recalculation)",
      "url": "https://www.virtualcitymap.de/datasource-data/f892f6af-180a-4eef-917f-5ff03c260b32/tileset.json",
      "properties": {
        "title": "Berlin - LOD2",
        "exportWorkbench": "https://fmeserver-virtualcitysystems--2.fmecloud.com/fmedatadownload/germany_viewer/MultiExporter.fmw"
      }
    }
  ]
}
```

> The `exportWorkbench` property is checked, whenever a feature is clicked upon object selection or right click interactions (context menu). Only features of 3D layers with that property assigned are supported for export!

The export of this source has the following configurations:

| key                      | type                          | default                                                                                                                                                                                                                          | description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| exportFormatList         | Array<string>                 | ['2D Shape', '3D Shape - PolygonZ', '3D Shape - Multipatch', 'ESRI FGDB', 'KMZ', 'CityGML', 'CityJSON', 'DXF', 'DWG', '3DS', 'SketchUp', 'OBJ', 'VRML', 'COLLADA', 'GLTF', '3DPDF', 'FMEAR', 'STL', 'STEP', 'GEOPACKAGE', 'FBX'] | The export formats the user can select from. The supported formats are listed [here](#supported-city-model-export-formats).                                                                                                                                                                                                                                                                                                                                      |
| exportFormatDefault      | Array<string>                 | ['2D Shape']                                                                                                                                                                                                                     | The export formats that are initially selected. They need to be listed inside exportFormatList.                                                                                                                                                                                                                                                                                                                                                                  |
| lodList                  | Array<string>                 | ['LoD1', 'LoD2', 'LoD3', 'haLoD']                                                                                                                                                                                                | The available level of details the user can select from.                                                                                                                                                                                                                                                                                                                                                                                                         |
| lodDefault               | string                        | 'haLoD'                                                                                                                                                                                                                          | The initially selected level of detail.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| thematicClassOptions     | Array<string>                 | ['26', '7', '14', '5', '21', '85', '64', '45', '43', '46', '8', '9', '4', '44']                                                                                                                                                  | The ids of the thematic classes the user can select from. A list of the possible ids with the corresponding class names can be found [here](#supported-thematic-classes).                                                                                                                                                                                                                                                                                        |
| thematicClassDefault     | Array<string>                 | ['26']                                                                                                                                                                                                                           | The initially selected thematic classes.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| appearanceThemeList      | Array<string>                 | ['rgbTexture']                                                                                                                                                                                                                   | The available appearance themes for the city model.                                                                                                                                                                                                                                                                                                                                                                                                              |
| appearanceThemeDefault   | string                        | 'rgbTexture'                                                                                                                                                                                                                     | The initially selected appearance theme. Needs to be listed in appearanceThemeList.                                                                                                                                                                                                                                                                                                                                                                              |
| heightModeDefault        | 'absolute' &vert; 'ellipsoid' | 'absolute'                                                                                                                                                                                                                       | If the z values of the exported data are absolute values or relative to the ellipsoid.                                                                                                                                                                                                                                                                                                                                                                           |
| allowHeightMode          | boolean                       | true                                                                                                                                                                                                                             | If the user can select the height mode.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| allowAddGenericAttrs     | boolean                       | true                                                                                                                                                                                                                             | If true, the user can choose whether generic attributes should be added to the exported dataset or not.                                                                                                                                                                                                                                                                                                                                                          |
| allowTiledExport         | boolean                       | true                                                                                                                                                                                                                             | If true, the user can choose whether the data should be exported as tiles or not.                                                                                                                                                                                                                                                                                                                                                                                |
| allowTerrainExport       | boolean                       | true                                                                                                                                                                                                                             | If true, the user can select whether ther terrain should also be exported. Only available for some data formats.                                                                                                                                                                                                                                                                                                                                                 |
| terrainAppearanceOptions | Object<string, number>        | {}                                                                                                                                                                                                                               | With this setting the terrain texture for different zoom levels can be set. The key of the object is the name of the imagery layer, the value the zoom level.                                                                                                                                                                                                                                                                                                    |
| terrainUrl               | string                        | null                                                                                                                                                                                                                             | URL used if terrainExport is true, if not provided the currently active terrain will be used.                                                                                                                                                                                                                                                                                                                                                                    |
| terrainZoomLevel         | number                        | -1                                                                                                                                                                                                                               | Zoom level of terrain used if terrainExport is true. To have an effect, the number needs to be > 0.                                                                                                                                                                                                                                                                                                                                                              |
| crs                      | string                        | null                                                                                                                                                                                                                             | The output crs as epsg code. If array is provided user can select. Example: ["EPSG:25832", "EPSG:3587"]. If not provided, the default projection of the VC Map is used.                                                                                                                                                                                                                                                                                          |
| allowDescription         | boolean                       | true                                                                                                                                                                                                                             | If user can add an export description. This helps the user to identify a specific request, if many requests were send. The description is added to a summary text file of the download.                                                                                                                                                                                                                                                                          |
| dataProjection           | ProjectionOptions             | null                                                                                                                                                                                                                             | The projection of the data in the data base. If not provided, the default projection of the VC Map is used, which is in most cases the correct one (take care when loading multiple modules). In the rare case the dataProjection still needs to be changed, make sure to pass both, epsg code AND proj4 string in the following format: `{"epsg": "EPSG:25832", "proj4": "+proj=utm +zone=32 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs"}` |
| exportScene              | boolean                       | true                                                                                                                                                                                                                             | If the entire scene should be exported when using area selection.                                                                                                                                                                                                                                                                                                                                                                                                |
| fmeServerUrl             | string                        | null                                                                                                                                                                                                                             | The FME server URL. Is required.                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| fmeSecurityToken         | string                        | null                                                                                                                                                                                                                             | The FME security token for the given server. Is required.                                                                                                                                                                                                                                                                                                                                                                                                        |

#### ProjectionOptions

| key   | type                 | description                                                                                        |
| ----- | -------------------- | -------------------------------------------------------------------------------------------------- |
| epsg  | string &vert; number | EPSG of the projection, for example: "EPSG:3587". If not specified, uses the framework projection. |
| proj4 | string               | definition of the projection. See for example: http://spatialreference.org/ref/epsg/3587/proj4/    |

### Oblique

With this data source type high resolution oblique images can be downloaded.
It is possible to either download the currently visible image when being in oblique view or oblique tiles that are in a specific area using the area selection mode.

> Note: The Firefox browser (<= v108.0.1) has a canvas size limit of 124,992,400 pixels. If this number is exceeded by the oblique image, the download will fail.

### GeoJSON

This data source type makes it possible to provide any possible data to the user through the export plugin.
For this, a GeoJSON file is needed, where each feature has a "url" property, which provides a link to the data source.
The features mark the extend of the data source in the map and are fetched by the area selection mode.

## Appendix

### Supported City Model export formats

- '2D Shape'
- '3D Shape - PolygonZ'
- '3D Shape - Multipatch'
- 'ESRI FGDB'
- KMZ
- CityGML
- CityJSON
- DXF
- DWG
- '3DS'
- SketchUp
- OBJ
- VRML
- COLLADA
- GLTF
- '3DPDF'
- FMEAR
- STL
- STEP
- GEOPACKAGE
- FBX

### Supported thematic classes

- 4: 'LandUse',
- 5: 'GenericCityObject',
- 7: 'SolitaryVegetationObjects',
- 8: 'Plant Cover',
- 9: 'WaterBody',
- 14: 'ReliefFeature',
- 21: 'CityFurniture',
- 26: 'Building',
- 43: 'Track',
- 44: 'Railway',
- 45: 'Road',
- 46: 'Square',
- 64: 'Bridge',
- 85: 'Tunnel',
