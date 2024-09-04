import { createToggleAction, ToolboxType, WindowSlot } from '@vcmap/ui';
import { getDefaultProjection, vcsLayerName } from '@vcmap/core';
import { reactive } from 'vue';
import deepEqual from 'fast-deep-equal';
import { version, name, mapVersion } from '../package.json';
import ExportWindow from './exportWindow.vue';
import ExportConfigEditor from './ExportConfigEditor.vue';
import { getConfigAndState } from './configManager.js';
import getDefaultOptions from './defaultOptions.js';
import createDataSourceFromConfig from './dataSources/dataSourceFactory.js';
import ObliqueDataSource from './dataSources/obliqueDataSource.js';
import de from './i18n/de.json';
import en from './i18n/en.json';

export const windowId = 'export_window_id';

/**
 * Updates the dataProjection and crs config and state in case a module is added or removed. If these are not set in the options, the defaults map projection is used, which can change on module changes.
 * @param {import("./configManager").ExportOptions} options The plugin options.
 * @param {import("./configManager").ExportConfig} config The config created by configManager
 * @param {import("./configManager").ExportState} state The state created by configManager
 */
function updateCrs(options, config, state) {
  const defaultProjection = getDefaultProjection();
  if (!options.dataProjection) {
    config.settingsCityModel.dataProjection = defaultProjection;
  }
  if (!options.crs) {
    config.settingsCityModel.crs = defaultProjection.epsg;
    state.settingsCityModel.selectedCrs = defaultProjection.epsg;
  }
}

/**
 * @param {import("./configManager").ExportOptions} options - the options for this plugin instance, passed in from the app.
 * @returns {import("@vcmap/ui/src/vcsUiApp").VcsPlugin<T>}
 */
export default (options) => {
  /**
   * @readonly
   */
  let dataSource = null;
  let config = null;
  let state = null;
  let defaultState = null;
  let moduleListeners = [];
  let app;

  return {
    get name() {
      return name;
    },
    get version() {
      return version;
    },
    get mapVersion() {
      return mapVersion;
    },
    /** @returns {import("./configManager").ExportOptions} */
    get config() {
      return config;
    },
    /** @returns {import("./configManager").ExportState} */
    get state() {
      return state;
    },

    /**
     * Additional parameters (if any) that can be used to customize or configure the plugin further.
     * These can be set from other plugins and are handled in the body of the FME Request.
     * They can be used to forward login information (SessionIds).
     * @type {Object}
     */
    additionalParams: undefined,
    /**
     * initial state for setting back state to default values
     * @returns {import("./configManager").ExportState}
     */
    get defaultState() {
      return defaultState;
    },
    get dataSource() {
      return dataSource;
    },
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     */
    initialize(vcsUiApp) {
      const { pluginConfig, pluginState } = getConfigAndState(
        options,
        getDefaultOptions(),
      );
      app = vcsUiApp;
      config = pluginConfig;
      state = reactive(pluginState);
      defaultState = JSON.parse(JSON.stringify(pluginState));

      moduleListeners = [
        vcsUiApp.moduleAdded.addEventListener(() => {
          updateCrs(options, pluginConfig, pluginState);
        }),
        vcsUiApp.moduleRemoved.addEventListener(() => {
          updateCrs(options, pluginConfig, pluginState);
        }),
      ];
    },
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @returns {Promise<void>}
     */
    onVcsAppMounted: async (vcsUiApp) => {
      const { action } = createToggleAction(
        {
          name: 'export.name',
          title: 'export.tooltip',
          icon: '$vcsExport',
        },
        {
          id: windowId,
          component: ExportWindow,
          slot: WindowSlot.DYNAMIC_LEFT,
          state: {
            headerTitle: 'export.headerTitle',
            headerIcon: '$vcsExport',
            infoUrlCallback: vcsUiApp.getHelpUrlCallback(
              '/tools/exportTool.html',
            ),
            styles: {
              width: '350px',
              height: 'auto',
              overflow: 'none !important',
            },
          },
        },
        vcsUiApp.windowManager,
        name,
      );
      vcsUiApp.toolboxManager.add(
        {
          id: windowId,
          type: ToolboxType.SINGLE,
          action: reactive(action),
        },
        name,
      );
      vcsUiApp.contextMenuManager.addEventHandler(async (event) => {
        const contextEntries = [];
        if (event.feature) {
          const properties = vcsUiApp.layers.getByKey(
            event.feature[vcsLayerName],
          )?.properties;
          if (
            properties?.exportWorkbench &&
            properties?.exportWorkbench ===
              config.settingsCityModel.fmeServerUrl
          ) {
            contextEntries.push({
              id: 'export_object',
              name: 'export.context.cityModel',
              icon: '$vcsExport',
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
    updateDataSource(vcsApp, downloadState) {
      const dataSourceOptions = config.dataSourceOptionsList.find(
        (dataSourceOption) =>
          dataSourceOption.type === state.selectedDataSource,
      );
      if (dataSourceOptions) {
        dataSource = createDataSourceFromConfig(dataSourceOptions, vcsApp);
        if (dataSource instanceof ObliqueDataSource) {
          dataSource.viewDirectionFilter =
            state.settingsOblique.directionFilter;
          dataSource.downloadState = downloadState;
        }
      } else {
        dataSource = null;
      }
    },
    resetState: () =>
      Object.assign(state, JSON.parse(JSON.stringify(defaultState))),
    i18n: {
      de,
      en,
    },
    getDefaultOptions,
    toJSON() {
      const defaultOptions = getDefaultOptions();
      const flatConfig = {
        termsOfUse: config.termsOfUse,
        dataSourceOptionsList: config.dataSourceOptionsList,
        allowDescription: config.allowDescription,
        allowEmail: config.allowEmail,
        allowExportName: config.allowExportName,
        maxSelectionArea: config.maxSelectionArea,
        ...config.settingsCityModel,
        ...config.defaults,
      };
      const customOptions = Object.keys(flatConfig).reduce((acc, key) => {
        if (!deepEqual(defaultOptions[key], flatConfig[key])) {
          acc[key] = flatConfig[key];
        }
        return acc;
      }, {});
      return customOptions;
    },
    getConfigEditors() {
      return [
        {
          component: ExportConfigEditor,
          infoUrlCallback: app?.getHelpUrlCallback(
            '/components/plugins/exportToolConfig.html',
          ),
        },
      ];
    },
    destroy() {
      moduleListeners.forEach((l) => l());
    },
  };
};
