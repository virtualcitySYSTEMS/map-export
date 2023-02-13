import { createToggleAction, ToolboxType, WindowSlot } from '@vcmap/ui';
import { vcsLayerName } from '@vcmap/core';
import { reactive } from 'vue';
import { version, name } from '../package.json';
import ExportWindow, { windowId } from './exportWindow.vue';
import { getSetupAndState } from './configManager.js';
import getDefaultConfig from './defaultConfig.js';
import createDataSourceFromConfig from './dataSources/dataSourceFactory.js';
import ObliqueDataSource from './dataSources/obliqueDataSource.js';

/**
 * @param {Object} config - the configuration of this plugin instance, passed in from the app.
 * @returns {import("@vcmap/ui/src/vcsUiApp").VcsPlugin<T>}
 */
export default (config) => {
  const { pluginSetup, pluginState } = getSetupAndState(config, getDefaultConfig());
  /** initial state for setting back state to default values */
  const defaultState = JSON.parse(JSON.stringify(pluginState));
  /**
   * @readonly
   */
  let dataSource = null;

  return {
    get name() { return name; },
    get version() { return version; },
    config: pluginSetup,
    state: reactive(pluginState),
    defaultState,
    get dataSource() { return dataSource; },
    updateDataSource(app, downloadState) {
      const dataSourceOptions = pluginSetup.dataSourceOptionsList.find(
        dataSourceOption => dataSourceOption.type === pluginState.selectedDataSource,
      );
      if (dataSourceOptions) {
        dataSource = createDataSourceFromConfig(dataSourceOptions, app);
        if (dataSource instanceof ObliqueDataSource) {
          dataSource.viewDirectionFilter = pluginState.settingsOblique.directionFilter;
          dataSource.downloadState = downloadState;
        }
      } else {
        dataSource = null;
      }
    },
    resetState: () => Object.assign(pluginState, JSON.parse(JSON.stringify(defaultState))),
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @returns {Promise<void>}
     */
    onVcsAppMounted: async (vcsUiApp) => {
      const { action } = createToggleAction(
        {
          name: 'export.name',
          icon: '$vcsImport',
        },
        {
          id: windowId,
          component: ExportWindow,
          slot: WindowSlot.DYNAMIC_LEFT,
          state: {
            headerTitle: 'export.headerTitle',
            headerIcon: '$vcsImport',
            styles: { width: '350px', height: 'auto' },
          },
        },
        vcsUiApp.windowManager,
        name,
      );
      vcsUiApp.toolboxManager.add(
        {
          id: windowId,
          type: ToolboxType.SINGLE,
          action: {
            name: 'export.name',
            title: 'export.tooltip',
            icon: '$vcsImport',
            active: false,
            callback() {
              action.callback();
              this.active = !this.active;
            },
          },
        },
        name,
      );
      vcsUiApp.contextMenuManager.addEventHandler(async (event) => {
        const contextEntries = [];
        if (event.feature) {
          const properties = vcsUiApp.layers.getByKey(event.feature[vcsLayerName])?.properties;
          if (properties.exportWorkbench && properties.exportWorkbench === pluginSetup.settingsCityModel.fmeServerUrl) {
            contextEntries.push({
              id: 'export_object',
              name: 'export.context.cityModel',
              icon: '$vcsImport',
              callback() {
                if (!vcsUiApp.toolboxManager.get(windowId).action.active) {
                  action.callback();
                  vcsUiApp.toolboxManager.get(windowId).action.active = true;
                }
                const plugin = vcsUiApp.plugins.getByKey(name);
                // XXX Should this be a function of the plugin? `set dataSource` and `set selectionType`
                plugin.state.selectedDataSource = 'cityModel';
                plugin.state.step = 2;
                plugin.state.highestStep = 2;
                plugin.state.selectedSelectionType = 'objectSelection';
                plugin.state.selectedObjects = [event.feature?.getId()];
              },
            });
          }
        }
        return contextEntries;
      }, name);
    },
    i18n: {
      de: {
        export: {
          name: 'Export',
          headerTitle: 'Objekt Export Wizard',
          tooltip: 'Export Plugin',
          stepTitles: {
            dataSources: 'Datenquelle',
            selectionType: 'Datenauswahl',
            settings: 'Einstellungen',
            selectImages: 'Bilder auswählen',
            selectFiles: 'Dateien auswählen',
            exportDestination: 'E-Mail Adresse',
          },
          dataSources: {
            cityModel: '3D Objekte',
            oblique: 'Schrägluftbild',
            geojson: 'GeoJSON',
          },
          selectionTypes: {
            areaSelection: 'Flächen-Auswahl',
            objectSelection: 'Objekt-Auswahl',
            currentImage: 'Aktuelles Schrägluftbild',
            drawPolygon: 'Zeichne ein Polygon',
            drawBBox: 'Zeichne eine Bouding Box',
            objectCount: 'Ausgewählte Objekte',
            objectSelection1: 'Nutze',
            objectSelection2: 'und halte die Strg-Taste gedrückt um Objekte auszuwählen',
          },
          settingsCityModel: {
            exportFormat: 'Exportformat',
            lod: 'Level of Detail',
            thematicClasses: 'Thematische Klassen',
            terrainExport: 'Geländeexport',
            genericAttrs: 'Generische Attribute anfügen',
            textureExport: 'Texturen ausgeben',
            localCoordinates: 'Lokale Koordinaten verwenden',
            tiledExport: 'Gekachelter Export',
            terrainTexture: 'Geländetextur',
            appearanceTheme: 'Objekttextur',
            heightMode: 'Höhenmodus',
            absolute: 'absolute',
            ellipsoid: 'ellipsoid',
            coordinateSystem: 'Koordinatensystem',
          },
          settingsOblique: {
            directionFilter: 'Bildausrichtungsfilter',
            north: 'Nord',
            east: 'Ost',
            south: 'Süd',
            west: 'West',
            nadir: 'Alle',
            directionPlaceholder: 'Richtung',
          },
          enterMail: 'Hier E-Mail Adresse eingeben',
          descriptionPlaceholder: 'Beschreibe den Datensatz, um ihn später zuordnen zu können.',
          accept: 'Ich akzeptiere die',
          termsOfUse: 'Nutzungsbedingungen',
          select: 'Auswählen',
          continue: 'Weiter',
          reset: 'Zurücksetzen',
          sendRequest: 'Anfrage senden',
          notification: {
            success: 'Vielen Dank für Ihre Anfrage. Der Auftrag wurde angenommen. Sie erhalten eine Benachrichtigung, sobald die Daten zum Download bereit stehen. Dies kann je nach Datenmenge bis zu mehreren Stunden dauern.',
            error: {
              standard: 'Bei der Bearbeitung Ihrer Anfrage ist ein Fehler aufgetreten. Bitte versuchen sie es zu einem anderen Zeitpunkt erneut.',
              validation: 'Bitte stelle sicher, dass alle Eingabefelder valide sind.',
            },
          },
          validation: {
            termsOfUse: 'Um eine Anfrage abzusenden, muss den Nutzungsbedingungen zugestimmt werden.',
            selectField: 'Bitte wähle eine Option.',
            selectFieldMultiple: 'Bitte wähle mindestens eine Option.',
            provideEmail: 'Gib bitte eine E-Mail Adresse an.',
            epsg: 'Bitte stelle sicher, dass der EPSG Code valide ist. Z.B. EPSG:25832 oder 25832.',
            objectSelection: 'Bitte wähle mindestens ein Objekt aus.',
            areaSelection: 'Bitte zeichne eine Auswahlfläche.',
            polygonFeature: 'Die Geometrie der Flächenauswahl ist nicht valide.',
            polygonFeatureArea: 'Die maximale Größe der Auswahlfläche wurde überschritten.',
          },
          context: {
            cityModel: 'Objekt exportieren',
          },
          resetButtons: {
            settingsCityModel: 'Einstellungen zurücksetzen',
            objectSelection: 'Objekt-Auswahl zurücksetzen',
            exportDestination: 'Eingabe zurücksetzen',
          },
          help: {
            dataSources: {
              cityModel: 'Exportiere Objekte des Stadtmodells wie z.B. Gebäude, Bäume oder Brücken.',
              oblique: 'Exportiere hochaufgelöste Schrägluftbilder.',
              geojson: 'Exportiere räumliche Daten mittels Gebietsauswahl.',
            },
            selectionTypes: {
              areaSelection: 'Zeichne eine Geometrie um einen Bereich zu exportieren.',
              objectSelection: 'Klicke auf Objekte des Stadtmodells um sie auszuwählen. Nur verfügbar in der 3D Karte.',
              currentImage: 'Lade das aktuell sichtbare Schrägluftbild herunter. Nur verfügbar im Schrägluftbild Modus.',
            },
          },
        },
      },
      en: {
        export: {
          name: 'Export',
          headerTitle: 'Object Export Wizard',
          tooltip: 'Export Plugin',
          stepTitles: {
            dataSources: 'Data source',
            selectionType: 'Data selection',
            settings: 'Settings',
            selectImages: 'Select images',
            selectFiles: 'Select files',
            exportDestination: 'Email address',
          },
          dataSources: {
            cityModel: '3D Objects',
            oblique: 'Oblique images',
            geojson: 'GeoJSON',
          },
          selectionTypes: {
            areaSelection: 'Area selection',
            objectSelection: 'Object selection',
            currentImage: 'Current image',
            drawPolygon: 'Draw a polygon',
            drawBBox: 'Draw a bounding box',
            objectCount: 'Object count',
            objectSelection1: 'Use',
            objectSelection2: 'while holding down ctrl key to select objects',
          },
          settingsCityModel: {
            exportFromat: 'Export format',
            lod: 'Level of Detail',
            thematicClasses: 'Thematic classes',
            terrainExport: 'Terrain export',
            genericAttrs: 'Add generic attributes',
            textureExport: 'Texture export',
            localCoordinates: 'Use local coordinates',
            tiledExport: 'Tiled export',
            terrainTexture: 'Terrain appearence',
            appearanceTheme: 'Object appearence',
            heightMode: 'Height mode',
            absolute: 'Absolute',
            ellipsoid: 'Ellipsoid',
            coordinateSystem: 'Coordinate system',
          },
          settingsOblique: {
            directionFilter: 'Image direction filter',
            north: 'North',
            east: 'East',
            south: 'South',
            west: 'West',
            nadir: 'All',
            directionPlaceholder: 'Direction',
          },
          enterMail: 'Enter your email address',
          descriptionPlaceholder: 'Describe your data export so you can identify it later.',
          accept: 'I accept the',
          termsOfUse: 'terms of use',
          select: 'Select',
          continue: 'Continue',
          reset: 'Reset',
          sendRequest: 'Send request',
          notification: {
            success: 'Thank you for your request. The request has been accepted. You will get a response when the data export is done. This can take up to several hours, depending on the size of the data.',
            error: {
              standard: 'There was an error processing your request. Please try again later.',
              validation: 'Please ensure that all inputs are valid',
            },
          },
          validation: {
            termsOfUse: 'You need to accept the terms of use.',
            selectField: 'Please choose an option.',
            selectFieldMultiple: 'Please select at least one option.',
            provideEmail: 'Please provide an email address.',
            epsg: 'Please make sure the EPSG code is valid. Eiter e.g. EPSG:25832 or just 25832.',
            objectSelection: 'Please select at least one object.',
            areaSelection: 'Please draw a selection area.',
            polygonFeature: 'Geometry of area selection is not valid.',
            polygonFeatureArea: 'Selection geometry exceeds max area.',
          },
          context: {
            cityModel: 'Export object',
          },
          resetButtons: {
            settingsCityModel: 'Reset settings',
            objectSelection: 'Reset object selection',
            exportDestination: 'Reset export destination',
          },
          help: {
            dataSources: {
              cityModel: 'Export city model objects like 3D buildings, trees or bridges.',
              oblique: 'Export high resolution oblique images.',
              geojson: 'Export spatial data by area selection.',
            },
            selectionTypes: {
              areaSelection: 'Select the area you want to export by drawing a geometry.',
              objectSelection: 'Select city model objects by clicking on them. Only available in 3D view.',
              currentImage: 'Download the currently visible oblique image. Only available in oblique view.',
            },
          },
        },
      },
    },
    destroy() {
    },
  };
};
