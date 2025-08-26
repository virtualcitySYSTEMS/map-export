import type {
  PluginConfigEditor,
  SingleToolboxComponent,
  VcsAction,
  VcsPlugin,
  VcsUiApp,
} from '@vcmap/ui';
import { createToggleAction, ToolboxType, WindowSlot } from '@vcmap/ui';
import { getDefaultProjection, vcsLayerName } from '@vcmap/core';
import { reactive } from 'vue';
import deepEqual from 'fast-deep-equal';
import { version, name, mapVersion } from '../package.json';
import ExportWindow from './exportWindow.vue';
import ExportConfigEditor from './ExportConfigEditor.vue';
import type {
  ExportOptions,
  ExportConfig,
  ExportState,
} from './configManager.js';
import {
  DataSourceOptions,
  SelectionTypes,
  getConfigAndState,
} from './configManager.js';
import getDefaultOptions from './defaultOptions.js';
import createDataSourceFromConfig from './dataSources/dataSourceFactory.js';
import ObliqueDataSource from './dataSources/obliqueDataSource.js';
import de from './i18n/de.json';
import en from './i18n/en.json';
import type GeoJSONDataSource from './dataSources/geojsonDataSource.js';
import type { ObliqueDownloadState } from './results/obliqueResult.js';
import type {
  AbstractDataSourceOptions,
  OneOfDataSourceOptions,
} from './dataSources/abstractDataSource';
import type AbstractDataSource from './dataSources/abstractDataSource.js';

export const windowId = 'export_window_id';

/**
 * Updates the dataProjection and crs config and state in case a module is added or removed. If these are not set in the options, the defaults map projection is used, which can change on module changes.
 * @param options The plugin options.
 * @param config The config created by configManager
 * @param state The state created by configManager
 */
function updateCrs(
  options: ExportOptions,
  config: ExportConfig,
  state: ExportState,
): void {
  const defaultProjection = getDefaultProjection();
  if (!options.dataProjection) {
    config.settingsCityModel.dataProjection = defaultProjection;
  }
  if (!options.crs) {
    config.settingsCityModel.crs = defaultProjection.epsg;
    state.settingsCityModel.selectedCrs = defaultProjection.epsg;
  }
}

export type ExportPlugin = VcsPlugin<ExportOptions, ExportState> & {
  readonly config: ExportConfig;
  readonly state: ExportState;
  /**
   * Additional parameters (if any) that can be used to customize or configure the plugin further.
   * These can be set from other plugins and are handled in the body of the FME Request.
   * They can be used to forward login information (SessionIds).
   */
  additionalParams: Record<string, unknown> | undefined;
  /** initial state for setting back state to default values */
  readonly defaultState: ExportState;
  readonly dataSource: AbstractDataSource | null;
  updateDataSource: (
    vcsUiApp: VcsUiApp,
    dataSourceOptions: OneOfDataSourceOptions,
    downloadState: ObliqueDownloadState,
  ) => void;
  resetState: () => void;
};

export default function exportPlugin(options: ExportOptions): ExportPlugin {
  let dataSource: ObliqueDataSource | GeoJSONDataSource | null = null;
  const { pluginConfig: config, pluginState } = getConfigAndState(
    options,
    getDefaultOptions(),
  );
  const state = reactive(pluginState);
  const defaultState = JSON.parse(JSON.stringify(pluginState));
  const listeners: (() => void)[] = [];
  let app: VcsUiApp;

  return {
    get name(): string {
      return name;
    },
    get version(): string {
      return version;
    },
    get mapVersion(): string {
      return mapVersion;
    },
    get config(): ExportConfig {
      return config;
    },
    get state(): ExportState {
      return state;
    },
    additionalParams: undefined,
    get defaultState(): ExportState {
      return defaultState;
    },
    get dataSource(): ObliqueDataSource | GeoJSONDataSource | null {
      return dataSource;
    },
    initialize(vcsUiApp: VcsUiApp): void {
      app = vcsUiApp;
      listeners.push(
        vcsUiApp.moduleAdded.addEventListener(() => {
          updateCrs(options, config, state);
        }),
        vcsUiApp.moduleRemoved.addEventListener(() => {
          updateCrs(options, config, state);
        }),
      );
    },
    onVcsAppMounted: (vcsUiApp: VcsUiApp): void => {
      const { action, destroy } = createToggleAction(
        { name: 'export.name', title: 'export.tooltip', icon: '$vcsExport' },
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
        { id: windowId, type: ToolboxType.SINGLE, action },
        name,
      );
      listeners.push(destroy);

      vcsUiApp.contextMenuManager.addEventHandler((event) => {
        const contextEntries: VcsAction[] = [];
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
              name: 'export.context.cityModel',
              icon: '$vcsExport',
              async callback() {
                const { action: toolboxAction } = vcsUiApp.toolboxManager.get(
                  windowId,
                ) as SingleToolboxComponent;
                if (!toolboxAction.active) {
                  await toolboxAction.callback();
                  toolboxAction.active = true;
                }
                const plugin = vcsUiApp.plugins.getByKey(name) as ExportPlugin;
                // XXX Should this be a function of the plugin? `set dataSource` and `set selectionType`
                plugin.state.selectedDataSourceOptions = {
                  type: DataSourceOptions.CITY_MODEL,
                  title: 'export.dataSources.cityModel',
                };
                plugin.state.step = 2;
                plugin.state.highestStep = 2;
                plugin.state.selectedSelectionType =
                  SelectionTypes.OBJECT_SELECTION;
                plugin.state.selectedObjects = [String(event.feature?.getId())];
              },
            });
          }
        }
        return contextEntries;
      }, name);
    },
    updateDataSource(
      vcsUiApp: VcsUiApp,
      dataSourceOptions: AbstractDataSourceOptions,
      downloadState: ObliqueDownloadState,
    ): void {
      dataSource = createDataSourceFromConfig(dataSourceOptions, vcsUiApp);
      if (dataSource instanceof ObliqueDataSource) {
        dataSource.viewDirectionFilter = state.settingsOblique.directionFilter;
        dataSource.downloadState = downloadState;
      }
    },
    resetState: (): void => {
      Object.assign(state, JSON.parse(JSON.stringify(defaultState)));
    },
    i18n: { de, en },
    getDefaultOptions,
    toJSON(): ExportOptions {
      const defaultOptions = getDefaultOptions();
      const flatConfig: ExportOptions = {
        termsOfUse: config.termsOfUse,
        dataSourceOptionsList: config.dataSourceOptionsList,
        allowDescription: config.allowDescription,
        allowEmail: config.allowEmail,
        allowExportName: config.allowExportName,
        maxSelectionArea: config.maxSelectionArea,
        ...config.settingsCityModel,
        ...config.defaults,
      };
      const customOptions = (
        Object.keys(flatConfig) as (keyof ExportOptions)[]
      ).reduce((acc, key) => {
        if (!deepEqual(defaultOptions[key], flatConfig[key])) {
          // @ts-expect-error ignore
          acc[key] = flatConfig[key];
        }
        return acc;
      }, {}) as ExportOptions;
      return customOptions;
    },
    getConfigEditors(): PluginConfigEditor<object>[] {
      return [
        {
          component: ExportConfigEditor,
          title: 'export.editorTitle',
          infoUrlCallback: app?.getHelpUrlCallback(
            '/components/plugins/exportToolConfig.html',
            'app-configurator',
          ),
        },
      ];
    },
    destroy(): void {
      listeners.forEach((l) => {
        l();
      });
    },
  };
}
