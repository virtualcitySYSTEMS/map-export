<template>
  <v-sheet class="pb-2">
    <VcsWizard v-model.number="pluginState.step">
      <VcsWizardStep
        v-model.number="pluginState.step"
        :step="stepOrder.DATASOURCE"
        editable
        :complete="!!pluginState.selectedDataSourceOptions"
        heading="export.stepTitles.dataSources"
      >
        <template #help>
          <ul>
            <li
              v-if="
                dataSourceItems.some(
                  (item) => item.type === DataSourceOptions.CITY_MODEL,
                )
              "
            >
              {{ $t('export.dataSources.cityModel') }}:
              {{ $t('export.help.dataSources.cityModel') }}
            </li>
            <li
              v-if="
                dataSourceItems.some(
                  (item) => item.type === DataSourceOptions.OBLIQUE,
                )
              "
            >
              {{ $t('export.dataSources.oblique') }}:
              {{ $t('export.help.dataSources.oblique') }}
            </li>
            <li
              v-if="
                dataSourceItems.some(
                  (item) => item.type === DataSourceOptions.GEOJSON,
                )
              "
            >
              {{ $st(geoJsonItem.title) }}: {{ $st(geoJsonItem.help) }}
            </li>
          </ul>
        </template>
        <template #default>
          <VcsSelect
            class="px-1 pb-3"
            :items="dataSourceItems"
            :model-value="pluginState.selectedDataSourceOptions"
            :item-value="
              (item) =>
                item.obliqueCollectionName ?? item.geojsonUrl ?? item.type
            "
            return-object
            :placeholder="$t('export.select')"
            @update:model-value="(options) => updateDataSource(options)"
          />
        </template>
      </VcsWizardStep>
      <VcsWizardStep
        v-show="pluginState.highestStep >= stepOrder.SELECTION_MODE"
        v-model.number="pluginState.step"
        :step="stepOrder.SELECTION_MODE"
        editable
        :complete="!!pluginState.selectedSelectionType"
        :rules="[() => stepValid.selectionMode !== false]"
        heading="export.stepTitles.selectionType"
        :header-actions="
          pluginState.selectedSelectionType === SelectionTypes.OBJECT_SELECTION
            ? [resetActions.objectSelection]
            : []
        "
      >
        <template #help>
          <ul>
            <li
              v-for="selectionType in selectionTypeItems"
              :key="selectionType.value"
            >
              {{ $st('export.selectionTypes.' + selectionType.value) }}:
              {{ $st('export.help.selectionTypes.' + selectionType.value) }}
            </li>
          </ul>
        </template>
        <template #default>
          <div class="px-1">
            <v-form
              ref="formSelectionMode"
              v-model="stepValid.selectionMode"
              lazy-validation
            >
              <VcsSelect
                v-model="pluginState.selectedSelectionType"
                :items="selectionTypeItems"
                :placeholder="$t('export.select')"
                :rules="[(v) => !!v || $t('export.validation.selectField')]"
                class="pb-2"
              />
              <SelectionObjects
                v-if="
                  pluginState.selectedSelectionType ===
                  SelectionTypes.OBJECT_SELECTION
                "
                v-model="pluginState.selectedObjects"
                :is-reset="isReset"
                :button-disabled="pluginState.selectedObjects.length === 0"
                :button-show="
                  pluginState.highestStep <= stepOrder.SELECTION_MODE
                "
                @continue="increaseStep(stepOrder.SELECTION_MODE)"
              />
              <SelectionArea
                v-else-if="
                  pluginState.selectedSelectionType ===
                  SelectionTypes.AREA_SELECTION
                "
                @sessionstart="handleSession($event, stepOrder.SELECTION_MODE)"
              />
              <VcsCheckbox
                v-else-if="
                  pluginState.selectedSelectionType ===
                    SelectionTypes.CURRENT_IMAGE && pluginConfig.termsOfUse
                "
                v-model="pluginState.termsConsented"
                :rules="[(v) => !!v || $t('export.validation.termsOfUse')]"
              >
                <template #label>
                  {{ $t('export.userData.accept') }}&thinsp;
                  <a
                    target="_blank"
                    :href="pluginConfig.termsOfUse.toString()"
                    @click.stop
                    >{{ $t('export.userData.termsOfUse') }}</a
                  >
                </template>
              </VcsCheckbox>
            </v-form>
          </div>
        </template>
      </VcsWizardStep>
      <VcsWizardStep
        v-show="
          pluginState.highestStep >= stepOrder.SETTINGS &&
          pluginState.selectedDataSourceOptions?.type !==
            DataSourceOptions.GEOJSON
        "
        v-model="pluginState.step"
        :step="stepOrder.SETTINGS"
        editable
        :complete="pluginState.highestStep >= stepOrder.SETTINGS"
        :rules="[() => !!stepValid.settings]"
        heading="export.stepTitles.settings"
        :header-actions="
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.CITY_MODEL
            ? [resetActions.settingsCityModel]
            : []
        "
      >
        <template #help>
          <span
            v-if="
              pluginState.selectedDataSourceOptions.type ===
              DataSourceOptions.OBLIQUE
            "
          >
            {{ $t('export.help.settings.oblique') }}
          </span>
          <span
            v-else-if="
              pluginState.selectedDataSourceOptions.type ===
              DataSourceOptions.CITY_MODEL
            "
          >
            {{ $t('export.help.settings.cityModel') }}
          </span>
        </template>
        <template #default>
          <div class="px-1">
            <v-form
              ref="formSettings"
              v-model="stepValid.settings"
              lazy-validation
            >
              <SettingsCityModel
                v-if="
                  pluginState.selectedDataSourceOptions.type ===
                  DataSourceOptions.CITY_MODEL
                "
                v-model="pluginState.settingsCityModel"
                :setup="pluginConfig.settingsCityModel"
                :button-disabled="!stepValid.settings"
                :button-show="pluginState.highestStep <= stepOrder.SETTINGS"
                @continue="increaseStep(stepOrder.SETTINGS)"
              />
              <SettingsOblique
                v-else-if="
                  pluginState.selectedDataSourceOptions.type ===
                    DataSourceOptions.OBLIQUE &&
                  pluginState.selectedSelectionType ===
                    SelectionTypes.AREA_SELECTION
                "
                v-model="pluginState.settingsOblique"
                @update:model-value="increaseStep(stepOrder.SETTINGS)"
              />
            </v-form>
          </div>
        </template>
      </VcsWizardStep>
      <VcsWizardStep
        v-show="pluginState.highestStep >= stepOrder.EXPORT_DESTINATION"
        v-model="pluginState.step"
        :step="stepOrder.EXPORT_DESTINATION"
        editable
        :complete="pluginState.highestStep >= stepOrder.EXPORT_DESTINATION"
        :rules="[() => stepValid.exportDestination !== false]"
        :header-actions="
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.CITY_MODEL
            ? [resetActions.exportDestination]
            : []
        "
        :heading="$st(heading)"
      >
        <template v-if="help" #help>
          {{ $t(help) }}
        </template>
        <template #default>
          <div class="px-1">
            <v-form
              ref="formExportDestination"
              v-model="stepValid.exportDestination"
              lazy-validation
            >
              <div
                v-if="
                  pluginState.selectedDataSourceOptions.type ===
                  DataSourceOptions.CITY_MODEL
                "
              >
                <VcsTextField
                  v-if="pluginConfig.allowEmail"
                  v-model="pluginState.email"
                  :label="undefined"
                  :placeholder="$t('export.userData.email')"
                  :rules="[
                    (v) =>
                      isValidEmail(v) || $t('export.validation.provideEmail'),
                  ]"
                />
                <VcsTextField
                  v-if="pluginConfig.allowExportName"
                  v-model="pluginState.exportName"
                  :label="undefined"
                  :placeholder="$t('export.userData.exportName')"
                  :rules="[
                    (v) =>
                      pluginConfig.allowEmail ||
                      v.length > 0 ||
                      $t('components.validation.required'),
                  ]"
                />
                <VcsTextArea
                  v-if="pluginConfig.allowDescription"
                  v-model="pluginState.description"
                  :placeholder="$t('export.userData.description')"
                  class="pb-2"
                  rows="2"
                />
              </div>
              <ResultList
                v-else-if="
                  pluginState.selectedDataSourceOptions.type ===
                    DataSourceOptions.OBLIQUE ||
                  pluginState.selectedDataSourceOptions.type ===
                    DataSourceOptions.GEOJSON
                "
                v-model="pluginState.selectedResultItems"
                :selection-layer-name="areaSelectionLayerName"
                :selected-data-source-options="
                  pluginState.selectedDataSourceOptions
                "
                :active="pluginState.step === stepOrder.EXPORT_DESTINATION"
                :max-selection-area="pluginConfig.maxSelectionArea"
                @invalid-area="pluginState.step = stepOrder.SELECTION_MODE"
              />
              <VcsCheckbox
                v-if="pluginConfig.termsOfUse"
                v-model="pluginState.termsConsented"
                :rules="[(v) => !!v || $t('export.validation.termsOfUse')]"
              >
                <template #label>
                  {{ $t('export.userData.accept') }}&thinsp;
                  <a
                    target="_blank"
                    :href="pluginConfig.termsOfUse.toString()"
                    @click.stop
                    >{{ $t('export.userData.termsOfUse') }}
                  </a>
                </template>
              </VcsCheckbox>
            </v-form>
          </div>
        </template>
      </VcsWizardStep>
      <VcsWizardStep
        v-model="pluginState.step"
        :step="stepOrder.SEND_REQUEST"
        :complete="pluginState.step > stepOrder.SEND_REQUEST"
        :editable="requestEnabled && !running"
      >
        <template #title>
          <div class="d-flex flex-grow-1 flex-row-reverse pa-2">
            <VcsFormButton
              variant="filled"
              :disabled="!requestEnabled || running"
              :loading="running"
              @click="sendRequest()"
            >
              {{ $t('export.sendRequest') }}
            </VcsFormButton>
          </div>
        </template>
      </VcsWizardStep>
    </VcsWizard>
    <v-overlay
      v-model="obliqueDownload.running"
      contained
      opacity="0.8"
      class="d-flex justify-center align-center"
    >
      <v-progress-linear
        v-model="obliqueDownload.progress"
        height="20"
        style="width: 200px"
        color="base-lighten-2"
      >
        <strong>{{ obliqueDownload.progress }} %</strong>
      </v-progress-linear>
      <v-chip color="base-lighten-2"
        >{{ obliqueDownload.queue[0] }} / {{ obliqueDownload.queue[1] }}</v-chip
      >
    </v-overlay>
  </v-sheet>
</template>

<script>
  // @ts-check
  import { computed, inject, onUnmounted, reactive, ref, watch } from 'vue';
  import {
    VSheet,
    VForm,
    VOverlay,
    VProgressLinear,
    VChip,
  } from 'vuetify/components';
  import {
    VcsFormButton,
    VcsSelect,
    VcsTextField,
    VcsCheckbox,
    VcsTextArea,
    VcsWizard,
    VcsWizardStep,
    NotificationType,
  } from '@vcmap/ui';
  import { CesiumTilesetLayer, ObliqueMap } from '@vcmap/core';
  import SelectionArea, { areaSelectionLayerName } from './selectionArea.vue';
  import SelectionObjects from './selectionObjects.vue';
  import SettingsCityModel from './settingsCityModel.vue';
  import SettingsOblique from './settingsOblique.vue';
  import { SelectionTypes, DataSourceOptions } from './configManager.js';
  import { prepareQueryAndSend } from './exportHelper.js';
  import ResultList from './resultList.vue';
  import ObliqueDataSource from './dataSources/obliqueDataSource.js';
  import { downloadCurrentImage } from './obliqueHelper.js';
  import { name } from '../package.json';
  import { validateDataSourceOptions } from './dataSources/dataSourceFactory.js';

  /**
   * @description Main window of the export plugin. Base component is the VcsWizard wich guides through the different steps.
   */
  export default {
    name: 'ExportWindow',
    components: {
      VSheet,
      VForm,
      VOverlay,
      VChip,
      VProgressLinear,
      VcsFormButton,
      VcsSelect,
      VcsTextField,
      VcsTextArea,
      VcsCheckbox,
      VcsWizard,
      VcsWizardStep,
      SelectionArea,
      SelectionObjects,
      SettingsCityModel,
      SettingsOblique,
      ResultList,
    },
    setup() {
      /** @type import("@vcmap/ui").VcsUiApp */
      const app = inject('vcsApp');

      const plugin = app.plugins.getByKey(name);

      /** @type import("./configManager.js").ExportState */
      const pluginState = plugin.state;
      /** @type import("./configManager.js").ExportConfig */
      const pluginConfig = plugin.config;
      const running = ref(false);
      const obliqueDownload = reactive({
        running: false,
        progress: 0,
        // shows how many images should be downloaded (second number) and which is currently downloading (first number).
        queue: [1, 1],
      });

      /**
       * step order of VcsWizard
       * @enum {number}
       */
      const stepOrder = {
        DATASOURCE: 0,
        SELECTION_MODE: 1,
        SETTINGS: 2,
        EXPORT_DESTINATION: 3,
        SEND_REQUEST: 4,
      };

      const stepValid = reactive({
        selectionMode: false,
        settings: false,
        exportDestination: !pluginConfig.termsOfUse,
      });

      const formSelectionMode = ref(null);
      const formSettings = ref(null);
      const formExportDestination = ref(null);

      watch(
        () => pluginState.settingsOblique.directionFilter,
        () => {
          if (
            plugin.dataSource &&
            plugin.dataSource instanceof ObliqueDataSource
          ) {
            plugin.dataSource.viewDirectionFilter =
              pluginState.settingsOblique.directionFilter;
          }
        },
      );

      /**
       * Incereases the current step of VcsWizard. Makes sure to keep highest reached step updated.
       * @param {number} currentStep The current step of the VcsWizard
       */
      function increaseStep(currentStep) {
        pluginState.step = currentStep + 1;
        if (currentStep >= pluginState.highestStep) {
          pluginState.highestStep = pluginState.step;
        }
      }

      const activeMapName = ref(app.maps.activeMap.className);
      const activeObliqueCollectionName = ref(
        app.maps.activeMap.collection?.name,
      );

      /**
       * Creates dataSource items for the rendering in the vue component.
       * @param {Array<import("./dataSources/abstractDataSource").AbstractDataSourceOptions>} dataSourceOptionsList List of dataSources to be available.
       * @returns {Array<import("./dataSources/abstractDataSource.js").AbstractDataSourceOptions>} Array of dataSource items
       */
      const dataSourceItems = computed(() => {
        return pluginConfig.dataSourceOptionsList
          .filter(validateDataSourceOptions.bind(null, app))
          .map((dataSourceOption) => {
            let title;
            if (dataSourceOption.type === DataSourceOptions.CITY_MODEL) {
              title = dataSourceOption.title || 'export.dataSources.cityModel';
            } else if (dataSourceOption.type === DataSourceOptions.OBLIQUE) {
              title = dataSourceOption.title || 'export.dataSources.oblique';
            } else if (dataSourceOption.type === DataSourceOptions.GEOJSON) {
              ({ title } = dataSourceOption);
            } else {
              throw new Error(
                `The following datasource type is not supported: "${dataSourceOption.type}"`,
              );
            }
            return { ...dataSourceOption, title };
          });
      });

      function isObjectSelectionDisabled() {
        return ![...app.layers].some(
          (layer) =>
            layer instanceof CesiumTilesetLayer &&
            layer.properties.exportWorkbench ===
              pluginConfig.settingsCityModel.fmeServerUrl,
        );
      }

      /**
       * Preprocessed selection types for the use in VcsSelect with value and i18n string/title.
       */
      const selectionTypeItems = computed(() => {
        const items = [
          {
            value: SelectionTypes.AREA_SELECTION,
            title: 'export.selectionTypes.areaSelection',
          },
        ];
        if (
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.CITY_MODEL
        ) {
          if (!isObjectSelectionDisabled()) {
            items.push({
              value: SelectionTypes.OBJECT_SELECTION,
              title: 'export.selectionTypes.objectSelection',
              props: {
                disabled: activeMapName.value !== 'CesiumMap',
              },
            });
          }
        }
        if (
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.OBLIQUE
        ) {
          items.push({
            value: SelectionTypes.CURRENT_IMAGE,
            title: 'export.selectionTypes.currentImage',
            props: {
              disabled:
                activeMapName.value !== 'ObliqueMap' ||
                activeObliqueCollectionName.value !==
                  pluginState.selectedDataSourceOptions.obliqueCollectionName,
            },
          });
        }
        return items;
      });

      let obliqueCollectionListener;
      const listeners = [
        app.maps.mapActivated.addEventListener((map) => {
          activeMapName.value = map.className;
          activeObliqueCollectionName.value = map.collection?.name;
          // map specific changes
          if (
            (pluginState.selectedSelectionType ===
              SelectionTypes.OBJECT_SELECTION &&
              map.className !== 'CesiumMap') ||
            (pluginState.selectedSelectionType ===
              SelectionTypes.CURRENT_IMAGE &&
              map.className !== 'ObliqueMap')
          ) {
            pluginState.selectedSelectionType = undefined;
          }
          if (map instanceof ObliqueMap) {
            obliqueCollectionListener = map.collectionChanged.addEventListener(
              (collection) => {
                activeObliqueCollectionName.value = collection.name;
                if (
                  SelectionTypes.CURRENT_IMAGE &&
                  collection.name !==
                    pluginState.selectedDataSourceOptions.obliqueCollectionName
                ) {
                  pluginState.selectedSelectionType = undefined;
                }
              },
            );
          } else {
            obliqueCollectionListener?.();
          }
        }),
        app.layers.added.addEventListener(() => {
          const objSelectionItem = selectionTypeItems.value.find(
            (i) => i.value === SelectionTypes.OBJECT_SELECTION,
          );
          if (objSelectionItem) {
            objSelectionItem.disabled = activeMapName.value !== 'CesiumMap';
          }
          if (isObjectSelectionDisabled()) {
            const index = selectionTypeItems.value.findIndex(
              (i) => i.value === SelectionTypes.OBJECT_SELECTION,
            );

            if (index !== -1) {
              selectionTypeItems.value.splice(index, 1);
            }
          }
        }),
        app.layers.removed.addEventListener(() => {
          const objSelectionItem = selectionTypeItems.value.find(
            (i) => i.value === SelectionTypes.OBJECT_SELECTION,
          );

          if (objSelectionItem) {
            objSelectionItem.disabled = activeMapName.value !== 'CesiumMap';
          }
          if (isObjectSelectionDisabled()) {
            const index = selectionTypeItems.value.findIndex(
              (i) => i.value === SelectionTypes.OBJECT_SELECTION,
            );

            if (index !== -1) {
              selectionTypeItems.value.splice(index, 1);
            }
          }
        }),
      ];

      watch(
        () => selectionTypeItems.value,
        (items) => {
          if (items.length === 1) {
            pluginState.selectedSelectionType = items[0].value;
          }
        },
        { deep: true },
      );

      /**
       * @param {string} value
       * @returns {boolean}
       */
      function isValidEmail(value) {
        const pattern =
          /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return pattern.test(value);
      }
      /**
       * If the request button is enabled or disabled.
       */
      const requestEnabled = computed(() => {
        const termsAccepted = pluginConfig.termsOfUse
          ? pluginState.termsConsented
          : true;
        if (
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.CITY_MODEL
        ) {
          if (pluginConfig.allowEmail) {
            // Check if email is provided
            return termsAccepted && isValidEmail(pluginState.email);
          } else if (pluginConfig.allowExportName) {
            // Check if exportName is provided
            return termsAccepted && !!pluginState.exportName;
          }
        } else if (
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.OBLIQUE
        ) {
          if (
            pluginState.selectedSelectionType === SelectionTypes.AREA_SELECTION
          ) {
            return termsAccepted && pluginState.selectedResultItems.length > 0;
          } else if (
            pluginState.selectedSelectionType === SelectionTypes.CURRENT_IMAGE
            // &&
            // activeMapName === 'ObliqueMap'
          ) {
            return termsAccepted;
          }
        } else if (
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.GEOJSON
        ) {
          return termsAccepted && pluginState.selectedResultItems.length > 0;
        }
        return false;
      });

      /** Makes sure that area selections and object selections are removed when changing the selection type. */
      watch(
        () => pluginState.selectedSelectionType,
        (selectedSelectionType, prevSelectionType) => {
          if (prevSelectionType === SelectionTypes.AREA_SELECTION) {
            app.layers
              .getByKey(String(areaSelectionLayerName))
              ?.removeAllFeatures();
          } else if (prevSelectionType === SelectionTypes.OBJECT_SELECTION) {
            pluginState.selectedObjects = [];
          }
          if (selectedSelectionType === SelectionTypes.CURRENT_IMAGE) {
            pluginState.highestStep = 1;
            if (formSettings.value) {
              formSettings.value.reset();
            }
          }
        },
      );

      /**
       * Increases the step of VcsWizard if the feature create session was successful.
       * @param {Promise<import("ol").Feature<import("ol/geom/Geometry").default> | null>} session The result of the area selection create feature session.
       * @param {number} currentStep The current step of the VcsWizard.
       */
      async function handleSession(session, currentStep) {
        const feature = await session;
        if (feature) {
          // if datasource is geojson no settings are availabe therefore this step has to be skipped.
          const increaseBy =
            pluginState.selectedDataSourceOptions.type ===
            DataSourceOptions.GEOJSON
              ? currentStep + 1
              : currentStep;
          increaseStep(increaseBy);
        }
      }

      /** Resets the state and all form validations. */
      function resetExportWizard() {
        plugin.resetState();
        formSelectionMode.value?.resetValidation();
        formSettings.value?.resetValidation();
        formExportDestination.value?.resetValidation();
      }

      /**
       * Resets plugin in case datasource is changed.
       * @param {import("./dataSources/abstractDataSource.js").AbstractDataSourceOptions} selectedDataSourceOptions The selected data source option.
       */
      function updateDataSource(selectedDataSourceOptions) {
        // if there was a previsouly selected datasource -> reset export wizard
        if (pluginState.selectedDataSourceOptions) {
          resetExportWizard();
        }
        plugin.dataSource?.clear();
        pluginState.selectedDataSourceOptions = selectedDataSourceOptions;
        plugin.updateDataSource(
          app,
          selectedDataSourceOptions,
          obliqueDownload,
        );
        increaseStep(stepOrder.DATASOURCE);
      }

      /**
       * Sends the request with all the selected parameters.
       */

      async function sendRequest() {
        if (
          (stepValid.settings &&
            stepValid.exportDestination &&
            stepValid.selectionMode) ||
          (pluginState.selectedDataSourceOptions.type ===
            DataSourceOptions.GEOJSON &&
            stepValid.exportDestination &&
            stepValid.selectionMode) ||
          (pluginState.selectedSelectionType === SelectionTypes.CURRENT_IMAGE &&
            stepValid.selectionMode)
        ) {
          let promise;
          running.value = true;
          if (
            pluginState.selectedDataSourceOptions.type ===
            DataSourceOptions.CITY_MODEL
          ) {
            promise = prepareQueryAndSend(
              pluginConfig,
              pluginState,
              String(areaSelectionLayerName),
              app,
              plugin.additionalParams,
            );
          } else if (
            pluginState.selectedDataSourceOptions.type ===
              DataSourceOptions.OBLIQUE ||
            pluginState.selectedDataSourceOptions.type ===
              DataSourceOptions.GEOJSON
          ) {
            obliqueDownload.running = true;
            // Ensures that ui does not freeze.
            await new Promise((resolve) => {
              setTimeout(resolve, 0);
            });

            if (
              pluginState.selectedSelectionType === SelectionTypes.CURRENT_IMAGE
            ) {
              if (plugin.dataSource instanceof ObliqueDataSource) {
                promise = downloadCurrentImage(
                  app,
                  plugin.dataSource,
                  obliqueDownload,
                ).catch((error) => {
                  app.notifier.add({
                    type: NotificationType.ERROR,
                    message: error,
                    timeout: 5000,
                  });
                });
              } else {
                throw new Error(
                  'AbstractDataSource is not instance of ObliqueDataSource',
                );
              }
            } else if (
              pluginState.selectedSelectionType ===
              SelectionTypes.AREA_SELECTION
            ) {
              const resultsToDownload = plugin.dataSource.results.flatMap(
                (result) =>
                  pluginState.selectedResultItems.some(
                    (item) => item.title === result.title,
                  )
                    ? [result]
                    : [],
              );
              obliqueDownload.queue[1] = resultsToDownload.length;
              for (let index = 0; index < resultsToDownload.length; index++) {
                obliqueDownload.queue[0] = index + 1;
                const result = resultsToDownload[index];
                // eslint-disable-next-line no-await-in-loop
                await result.download().catch((error) => {
                  app.notifier.add({
                    type: NotificationType.ERROR,
                    message: error,
                    timeout: 5000,
                  });
                });
              }
              promise = Promise.resolve();
            } else {
              throw new Error(
                `Selected SelectionType is not supported for ${pluginState.selectedDataSourceOptions.type} export.`,
              );
            }
          } else {
            promise = Promise.reject(new Error('No valid dataSource set.'));
          }

          promise
            .then(() => {
              if (
                pluginState.selectedDataSourceOptions.type ===
                DataSourceOptions.CITY_MODEL
              ) {
                // assigns the default state to the actual state to achieve a reset.
                app.notifier.add({
                  type: NotificationType.SUCCESS,
                  message: 'export.notification.success',
                  timeout: 5000,
                });
              }
            })
            .finally(() => {
              running.value = false;
              obliqueDownload.running = false;
              obliqueDownload.queue = [1, 1];
            })
            .catch(() => {
              app.notifier.add({
                type: NotificationType.ERROR,
                message: 'export.notification.error.standard',
                timeout: 5000,
              });
            });
        } else {
          app.notifier.add({
            type: NotificationType.ERROR,
            message: 'export.notification.error.validation',
            timeout: 5000,
          });
        }
      }

      onUnmounted(() => {
        obliqueCollectionListener?.();
        listeners.forEach((listener) => listener());
      });
      const isReset = ref(false);
      const resetActions = {
        settingsCityModel: {
          name: 'resetSettingsCityModel',
          title: 'export.resetButtons.settingsCityModel',
          icon: '$vcsReturn',
          callback() {
            const copy = JSON.parse(
              JSON.stringify(plugin.defaultState.settingsCityModel),
            );
            Object.assign(pluginState.settingsCityModel, copy);
          },
        },
        objectSelection: {
          name: 'resetObjectSelection',
          title: 'export.resetButtons.objectSelection',
          icon: '$vcsReturn',
          callback() {
            isReset.value = true;
            pluginState.selectedObjects = [];
          },
        },
        exportDestination: {
          name: 'resetExportDestination',
          title: 'export.resetButtons.userData',
          icon: '$vcsReturn',
          callback() {
            formExportDestination.value.reset();
          },
        },
      };

      const lastStep = computed(() => {
        if (
          pluginState.selectedDataSourceOptions?.type ===
            DataSourceOptions.CITY_MODEL &&
          pluginConfig.allowEmail === false &&
          pluginConfig.allowExportName === true
        ) {
          return 'exportName';
        } else if (
          pluginState.selectedDataSourceOptions?.type ===
            DataSourceOptions.CITY_MODEL &&
          pluginConfig.allowEmail === true
        ) {
          return 'exportDestination';
        } else if (
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.OBLIQUE
        ) {
          return 'selectImages';
        } else if (
          pluginState.selectedDataSourceOptions?.type ===
          DataSourceOptions.GEOJSON
        ) {
          return 'selectFiles';
        } else {
          return ''; // Default case if none of the conditions match
        }
      });

      const heading = computed(() =>
        lastStep.value ? `export.stepTitles.${lastStep.value}` : '',
      );
      const help = computed(() => {
        if (lastStep.value === 'exportDestination') {
          return 'export.help.email';
        } else if (
          lastStep.value === 'selectFiles' ||
          lastStep.value === 'selectImages'
        ) {
          return 'export.help.select';
        }
        return '';
      });

      return {
        stepOrder,
        increaseStep,
        requestEnabled,
        handleSession,
        areaSelectionLayerName,
        pluginConfig,
        pluginState,
        dataSourceItems,
        selectionTypeItems,
        SelectionTypes,
        DataSourceOptions,
        isValidEmail,
        sendRequest,
        stepValid,
        formSelectionMode,
        formSettings,
        formExportDestination,
        running,
        obliqueDownload,
        updateDataSource,
        resetActions,
        isReset,
        heading,
        help,
        geoJsonItem: dataSourceItems.value.find(
          (item) => item.type === DataSourceOptions.GEOJSON,
        ),
      };
    },
  };
</script>
