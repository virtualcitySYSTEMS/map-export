import { createToggleAction, ToolboxType, WindowSlot } from '@vcmap/ui';
import { vcsLayerName } from '@vcmap/core';
import { reactive } from 'vue';
import { version, name } from '../package.json';
import ExportWindow from './exportWindow.vue';
import { getSetupAndState } from './configManager.js';
import getDefaultConfig from './defaultConfig.js';
import createDataSourceFromConfig from './dataSources/dataSourceFactory.js';
import ObliqueDataSource from './dataSources/obliqueDataSource.js';
import de from './i18n/de.json';
import en from './i18n/en.json';

export const windowId = 'export_window_id';

/**
 * @param {Object} config - the configuration of this plugin instance, passed in from the app.
 * @returns {import("@vcmap/ui/src/vcsUiApp").VcsPlugin<T>}
 */
export default (config) => {
  const { pluginSetup, pluginState } = getSetupAndState(
    config,
    getDefaultConfig(),
  );
  /** initial state for setting back state to default values */
  const defaultState = JSON.parse(JSON.stringify(pluginState));
  /**
   * @readonly
   */
  let dataSource = null;

  return {
    get name() {
      return name;
    },
    get version() {
      return version;
    },
    config: pluginSetup,
    state: reactive(pluginState),
    defaultState,
    get dataSource() {
      return dataSource;
    },
    updateDataSource(app, downloadState) {
      const dataSourceOptions = pluginSetup.dataSourceOptionsList.find(
        (dataSourceOption) =>
          dataSourceOption.type === pluginState.selectedDataSource,
      );
      if (dataSourceOptions) {
        dataSource = createDataSourceFromConfig(dataSourceOptions, app);
        if (dataSource instanceof ObliqueDataSource) {
          dataSource.viewDirectionFilter =
            pluginState.settingsOblique.directionFilter;
          dataSource.downloadState = downloadState;
        }
      } else {
        dataSource = null;
      }
    },
    resetState: () =>
      Object.assign(pluginState, JSON.parse(JSON.stringify(defaultState))),
    /**
     * @param {import("@vcmap/ui").VcsUiApp} vcsUiApp
     * @returns {Promise<void>}
     */
    onVcsAppMounted: async (vcsUiApp) => {
      const { action } = createToggleAction(
        {
          name: 'export.name',
          title: 'export.tooltip',
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
            properties.exportWorkbench &&
            properties.exportWorkbench ===
              pluginSetup.settingsCityModel.fmeServerUrl
          ) {
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
      de,
      en,
    },
    destroy() {},
  };
};
