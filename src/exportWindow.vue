<template>
  <v-sheet>
    <VcsWizard v-model.number="pluginState.step">
      <VcsWizardStep
        :step="stepOrder.DATASOURCE"
        editable
        :complete="!!pluginState.selectedDataSource"
        heading="export.stepTitles.dataSources"
        v-model.number="pluginState.step"
      >
        <template #help>
          <ul>
            <li
              v-if="
                dataSourceItems.some(
                  (item) => item.options.type === DataSourceOptions.CITY_MODEL,
                )
              "
            >
              {{ $t('export.dataSources.cityModel') }}:
              {{ $t('export.help.dataSources.cityModel') }}
            </li>
            <li
              v-if="
                dataSourceItems.some(
                  (item) => item.options.type === DataSourceOptions.OBLIQUE,
                )
              "
            >
              {{ $t('export.dataSources.oblique') }}:
              {{ $t('export.help.dataSources.oblique') }}
            </li>
            <li
              v-if="
                dataSourceItems.some(
                  (item) => item.options.type === DataSourceOptions.GEOJSON,
                )
              "
              :set="
                (geojsonItem = dataSourceItems.find(
                  (item) => item.options.type === DataSourceOptions.GEOJSON,
                ))
              "
            >
              {{ $t(geojsonItem.text) }}: {{ $t(geojsonItem.options.help) }}
            </li>
          </ul>
        </template>
        <template #content>
          <VcsSelect
            class="px-1 pb-3"
            :items="dataSourceItems"
            :item-value="(item) => item.options.type"
            :placeholder="$t('export.select')"
            :value="pluginState.selectedDataSource"
            @input="
              (selectedDataSource) => updateDataSource(selectedDataSource)
            "
          />
        </template>
      </VcsWizardStep>
      <VcsWizardStep
        v-show="pluginState.highestStep >= stepOrder.SELECTION_MODE"
        :step="stepOrder.SELECTION_MODE"
        editable
        :complete="!!pluginState.selectedSelectionType"
        :rules="[(v) => !!stepValid.selectionMode]"
        heading="export.stepTitles.selectionType"
        v-model.number="pluginState.step"
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
              {{ $t('export.selectionTypes.' + selectionType.value) }}:
              {{ $t('export.help.selectionTypes.' + selectionType.value) }}
            </li>
          </ul>
        </template>
        <template #content>
          <div class="px-1">
            <v-form
              v-model="stepValid.selectionMode"
              ref="formSelectionMode"
              lazy-validation
            >
              <VcsSelect
                :items="selectionTypeItems"
                :placeholder="$t('export.select')"
                v-model="pluginState.selectedSelectionType"
                :rules="[(v) => !!v || $t('export.validation.selectField')]"
                class="pb-2"
              />
              <SelectionObjects
                v-if="
                  pluginState.selectedSelectionType ===
                  SelectionTypes.OBJECT_SELECTION
                "
                v-model="pluginState.selectedObjects"
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
              <!-- XXX checkbox is duplicate, but not sure how to avoid that. -->
              <VcsCheckbox
                v-else-if="
                  pluginState.selectedSelectionType ===
                  SelectionTypes.CURRENT_IMAGE
                "
                v-model="pluginState.termsConsented"
                :rules="[(v) => !!v || $t('export.validation.termsOfUse')]"
              >
                <template #label>
                  {{ $t('export.userData.accept') }}
                  <a
                    target="_blank"
                    :href="pluginSetup.termsOfUse"
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
          pluginState.selectedDataSource !== DataSourceOptions.GEOJSON
        "
        :step="stepOrder.SETTINGS"
        editable
        :complete="pluginState.highestStep >= stepOrder.SETTINGS"
        :rules="[(v) => !!stepValid.settings]"
        heading="export.stepTitles.settings"
        v-model="pluginState.step"
        :header-actions="
          pluginState.selectedDataSource === DataSourceOptions.CITY_MODEL
            ? [resetActions.settingsCityModel]
            : []
        "
      >
        <template #content>
          <div class="px-1">
            <v-form
              v-model="stepValid.settings"
              ref="formSettings"
              lazy-validation
            >
              <SettingsCityModel
                v-if="
                  pluginState.selectedDataSource ===
                  DataSourceOptions.CITY_MODEL
                "
                :setup="pluginSetup.settingsCityModel"
                v-model="pluginState.settingsCityModel"
                :button-disabled="!stepValid.settings"
                :button-show="pluginState.highestStep <= stepOrder.SETTINGS"
                @continue="increaseStep(stepOrder.SETTINGS)"
              />
              <SettingsOblique
                v-else-if="
                  pluginState.selectedDataSource ===
                    DataSourceOptions.OBLIQUE &&
                  pluginState.selectedSelectionType ===
                    SelectionTypes.AREA_SELECTION
                "
                v-model="pluginState.settingsOblique"
                @change="increaseStep(stepOrder.SETTINGS)"
              />
            </v-form>
          </div>
        </template>
      </VcsWizardStep>
      <VcsWizardStep
        v-show="pluginState.highestStep >= stepOrder.EXPORT_DESTINATION"
        :step="stepOrder.EXPORT_DESTINATION"
        editable
        :complete="pluginState.highestStep >= stepOrder.EXPORT_DESTINATION"
        :rules="[(v) => !!stepValid.exportDestination]"
        v-model="pluginState.step"
        :header-actions="
          pluginState.selectedDataSource === DataSourceOptions.CITY_MODEL
            ? [resetActions.exportDestination]
            : []
        "
      >
        <template #header>
          <span
            class="py-3"
            v-if="
              pluginState.selectedDataSource === DataSourceOptions.CITY_MODEL
            "
          >
            {{ $t('export.stepTitles.exportDestination') }}</span
          >
          <span
            class="py-3"
            v-else-if="
              pluginState.selectedDataSource === DataSourceOptions.OBLIQUE
            "
          >
            {{ $t('export.stepTitles.selectImages') }}</span
          >
          <span
            class="py-3"
            v-else-if="
              pluginState.selectedDataSource === DataSourceOptions.GEOJSON
            "
          >
            {{ $t('export.stepTitles.selectFiles') }}</span
          >
        </template>
        <template #content>
          <div class="px-1">
            <v-form
              v-model="stepValid.exportDestination"
              ref="formExportDestination"
              lazy-validation
            >
              <div
                v-if="
                  pluginState.selectedDataSource ===
                  DataSourceOptions.CITY_MODEL
                "
              >
                <VcsTextField
                  :dense="true"
                  :label="undefined"
                  :placeholder="$t('export.userData.enterMail')"
                  v-model="pluginState.email"
                  :rules="[
                    (v) =>
                      isValidEmail(v) || $t('export.validation.provideEmail'),
                  ]"
                />
                <VcsTextArea
                  :placeholder="$t('export.userData.descriptionPlaceholder')"
                  class="pb-2"
                  rows="2"
                  v-model="pluginState.description"
                  v-if="pluginSetup.allowDescription"
                />
              </div>
              <ResultList
                v-else-if="
                  pluginState.selectedDataSource ===
                    DataSourceOptions.OBLIQUE ||
                  pluginState.selectedDataSource === DataSourceOptions.GEOJSON
                "
                :selection-layer-name="areaSelectionLayerName"
                :selected-data-source="pluginState.selectedDataSource"
                v-model="pluginState.selectedResultItems"
                :active="pluginState.step === stepOrder.EXPORT_DESTINATION"
                :max-selection-area="pluginSetup.maxSelectionArea"
              />
              <VcsCheckbox
                v-if="pluginSetup.termsOfUse"
                v-model="pluginState.termsConsented"
                :rules="[(v) => !!v || $t('export.validation.termsOfUse')]"
              >
                <template #label>
                  {{ $t('export.userData.accept') }}
                  <a
                    target="_blank"
                    :href="pluginSetup.termsOfUse"
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
        :step="stepOrder.SEND_REQUEST"
        :complete="pluginState.step > stepOrder.SEND_REQUEST"
        v-model="pluginState.step"
      >
        <template #header>
          <div class="d-flex flex-grow-1 flex-row-reverse">
            <VcsButton
              :disabled="!requestEnabled || running"
              @click="sendRequest()"
              :loading="running"
            >
              {{ $t('export.sendRequest') }}
            </VcsButton>
          </div>
        </template>
      </VcsWizardStep>
    </VcsWizard>
    <v-overlay v-if="obliqueDownload.running" absolute :opacity="0.8">
      <v-progress-linear
        :value="obliqueDownload.progress"
        height="20"
        style="width: 200px"
      >
        <strong>{{ obliqueDownload.progress }} %</strong>
      </v-progress-linear>
      <span
        >{{ obliqueDownload.queue[0] }} / {{ obliqueDownload.queue[1] }}</span
      >
    </v-overlay>
  </v-sheet>
</template>

<style>
  .bck-clr-gray {
    background-color: #e8e8e8;
  }

  .v-stepper-step .step-padding {
    padding: 12px 12px 12px 24px;
  }
</style>
<script>
  // @ts-check
  import { computed, inject, onUnmounted, reactive, ref, watch } from 'vue';
  import { VSheet, VForm, VOverlay, VProgressLinear } from 'vuetify/lib';
  import {
    VcsButton,
    VcsSelect,
    VcsTextField,
    VcsCheckbox,
    VcsTextArea,
    VcsWizard,
    VcsWizardStep,
    NotificationType,
  } from '@vcmap/ui';
  import { CesiumTilesetLayer } from '@vcmap/core';
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

  /**
   * @description Main window of the export plugin. Base component is the VcsWizard wich guides through the different steps.
   */
  export default {
    name: 'ExportWindow',
    components: {
      VSheet,
      VForm,
      VOverlay,
      VProgressLinear,
      VcsButton,
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
      const app = inject('vcsApp');

      const plugin = app.plugins.getByKey(name);

      /** @type import("./configManager").ExportState */
      const pluginState = plugin.state;
      /** @type import("./configManager").ExportSetup */
      const pluginSetup = plugin.config;

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
        DATASOURCE: 1,
        SELECTION_MODE: 2,
        SETTINGS: 3,
        EXPORT_DESTINATION: 4,
        SEND_REQUEST: 5,
      };

      const stepValid = reactive({
        selectionMode: false,
        settings: false,
        exportDestination: false,
      });

      const formSelectionMode = ref();
      const formSettings = ref();
      const formExportDestination = ref();

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

      /**
       * Creates dataSource items for the rendering in the vue component.
       * @param {Array<import("./dataSources/abstractDataSource").AbstractDataSourceOptions>} dataSourceOptionsList List of dataSources to be available.
       * @returns {Array<{options: import("./dataSources/abstractDataSource").AbstractDataSourceOptions, text: string }>} Array of dataSource items
       */
      const dataSourceItems = computed(() => {
        return pluginSetup.dataSourceOptionsList.map((dataSourceOption) => {
          let text;
          if (dataSourceOption.type === DataSourceOptions.CITY_MODEL) {
            text = 'export.dataSources.cityModel';
          } else if (dataSourceOption.type === DataSourceOptions.OBLIQUE) {
            text = 'export.dataSources.oblique';
          } else if (dataSourceOption.type === DataSourceOptions.GEOJSON) {
            text = dataSourceOption.title;
          } else {
            throw new Error(
              `The following datasource type is not supported: "${dataSourceOption.type}"`,
            );
          }
          return {
            options: dataSourceOption,
            text,
          };
        });
      });

      function isObjectSelectionDisabled() {
        return ![...app.layers].some(
          (layer) =>
            layer instanceof CesiumTilesetLayer &&
            layer.properties.exportWorkbench ===
              pluginSetup.settingsCityModel.fmeServerUrl,
        );
      }

      /**
       * Preprocessed selection types for the use in VcsSelect with value and i18n string/text.
       */
      const selectionTypeItems = computed(() => {
        const items = [
          {
            value: SelectionTypes.AREA_SELECTION,
            text: 'export.selectionTypes.areaSelection',
          },
        ];
        if (pluginState.selectedDataSource === DataSourceOptions.CITY_MODEL) {
          items.push({
            value: SelectionTypes.OBJECT_SELECTION,
            text: 'export.selectionTypes.objectSelection',
            disabled:
              activeMapName.value !== 'CesiumMap' || isObjectSelectionDisabled,
          });
        }
        if (pluginState.selectedDataSource === DataSourceOptions.OBLIQUE) {
          items.push({
            value: SelectionTypes.CURRENT_IMAGE,
            text: 'export.selectionTypes.currentImage',
            disabled: activeMapName.value !== 'ObliqueMap',
          });
        }
        return items;
      });

      const listeners = [
        app.maps.mapActivated.addEventListener((map) => {
          activeMapName.value = map.className;
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
        }),
        app.layers.added.addEventListener(() => {
          const objSelectionItem = selectionTypeItems.value.find(
            (i) => i.value === SelectionTypes.OBJECT_SELECTION,
          );
          if (objSelectionItem) {
            objSelectionItem.disabled =
              activeMapName.value !== 'CesiumMap' ||
              isObjectSelectionDisabled();
          }
        }),
        app.layers.removed.addEventListener(() => {
          const objSelectionItem = selectionTypeItems.value.find(
            (i) => i.value === SelectionTypes.OBJECT_SELECTION,
          );
          if (objSelectionItem) {
            objSelectionItem.disabled =
              activeMapName.value !== 'CesiumMap' ||
              isObjectSelectionDisabled();
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
       * If the request button is enabled or disabled.
       */
      const requestEnabled = computed(() => {
        const termsAccepted = pluginSetup.termsOfUse
          ? pluginState.termsConsented
          : true;
        if (pluginState.selectedDataSource === DataSourceOptions.CITY_MODEL) {
          return termsAccepted && !!pluginState.email;
        } else if (
          pluginState.selectedDataSource === DataSourceOptions.OBLIQUE
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
          pluginState.selectedDataSource === DataSourceOptions.GEOJSON
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
            pluginState.highestStep = 2;
            formSettings.value.reset();
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
            pluginState.selectedDataSource === DataSourceOptions.GEOJSON
              ? currentStep + 1
              : currentStep;
          increaseStep(increaseBy);
        }
      }

      /** Resets the state and all form validations. */
      function resetExportWizard() {
        plugin.resetState();
        formSelectionMode.value.resetValidation();
        formSettings.value.resetValidation();
        formExportDestination.value.resetValidation();
      }

      /**
       * Resets plugin in case datasource is changed.
       * @param {import("./configManager").DataSourceOptions} selectedDataSource The selected data source option.
       */
      function updateDataSource(selectedDataSource) {
        // if there was a previsouly selected datasource -> reset export wizard
        if (pluginState.selectedDataSource) {
          resetExportWizard();
        }
        plugin.dataSource?.clear();
        pluginState.selectedDataSource = selectedDataSource;
        plugin.updateDataSource(app, obliqueDownload);
        increaseStep(stepOrder.DATASOURCE);
      }

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
       * Sends the request with all the selected parameters.
       */
      async function sendRequest() {
        if (
          formSelectionMode.value.validate() &&
          formSettings.value.validate() &&
          formExportDestination.value.validate()
        ) {
          let promise;
          running.value = true;
          if (pluginState.selectedDataSource === DataSourceOptions.CITY_MODEL) {
            promise = prepareQueryAndSend(
              pluginSetup,
              pluginState,
              String(areaSelectionLayerName),
              app,
            );
          } else if (
            pluginState.selectedDataSource === DataSourceOptions.OBLIQUE ||
            pluginState.selectedDataSource === DataSourceOptions.GEOJSON
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
                `Selected SelectionType is not supported for ${pluginState.selectedDataSource} export.`,
              );
            }
          } else {
            promise = Promise.reject(new Error('No valid dataSource set.'));
          }

          promise
            .then(() => {
              if (
                pluginState.selectedDataSource === DataSourceOptions.CITY_MODEL
              ) {
                // assigns the default state to the actual state to achieve a reset.
                app.notifier.add({
                  type: NotificationType.SUCCESS,
                  message: 'export.notification.success',
                  timeout: 5000,
                });
              }
            })
            .catch(() => {
              app.notifier.add({
                type: NotificationType.ERROR,
                message: 'export.notification.error.standard',
                timeout: 5000,
              });
            })
            .finally(() => {
              running.value = false;
              obliqueDownload.running = false;
              obliqueDownload.queue = [1, 1];
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
        listeners.forEach((listener) => listener());
      });

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

      return {
        stepOrder,
        increaseStep,
        requestEnabled,
        handleSession,
        areaSelectionLayerName,
        pluginSetup,
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
      };
    },
  };
</script>
