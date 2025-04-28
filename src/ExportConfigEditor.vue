<template>
  <AbstractConfigEditor
    v-if="localConfig"
    v-bind="{ ...$attrs, ...$props }"
    @submit="apply"
  >
    <VcsFormSection
      heading="export.editor.general"
      expandable
      :start-open="true"
      ><v-container class="py-0 px-1">
        <v-row no-gutters>
          <v-col cols="6">
            <VcsCheckbox
              id="general-has-terms-of-use"
              v-model="hasTermsOfUse"
              label="export.editor.termsOfUse"
            />
          </v-col>
          <v-col>
            <VcsTextField
              id="general-terms-of-use-url"
              ref="generalTermsOfUseUrl"
              v-model="localConfig.termsOfUse"
              clearable
              placeholder="https://linktoprivacy"
              :disabled="!hasTermsOfUse"
              :rules="[
                (v) => {
                  return (
                    !hasTermsOfUse || !!v || 'components.validation.required'
                  );
                },
              ]"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <VcsCheckbox
              id="general-allow-email"
              v-model="localConfig.allowEmail"
              label="export.editor.email"
              :true-value="true"
              :false-value="false"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <VcsCheckbox
              id="general-allow-description"
              v-model="localConfig.allowDescription"
              label="export.editor.allowDescription"
              :true-value="true"
              :false-value="false"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <VcsLabel html-for="general-max-selection-area" required>
              {{ $t('export.editor.maxSelectionArea') }}
            </VcsLabel>
          </v-col>
          <v-col cols="3">
            <VcsTextField
              id="general-max-selection-area"
              v-model.number="localConfig.maxSelectionArea"
              clearable
              type="number"
              unit="m²"
              :min="0"
              :rules="[
                (v) => !!v || 'components.validation.required',
                (v) => v > 0 || 'export.validation.negative',
              ]"
            />
          </v-col>
        </v-row>
      </v-container>
    </VcsFormSection>
    <VcsFormSection
      heading="export.editor.dataSources"
      expandable
      :start-open="true"
    >
      <v-container class="py-0 px-1">
        <v-row no-gutters>
          <v-col cols="6">
            <VcsCheckbox
              id="data-source-city-model"
              v-model="dataSourceList.cityModel.isSelected"
              label="export.dataSources.cityModel"
              :error-messages="errorMessageDataSource"
              @change="
                (value) =>
                  value || resetDataSourceOption(DataSourceOptions.CITY_MODEL)
              "
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <VcsCheckbox
              id="data-source-oblique"
              v-model="dataSourceList.oblique.isSelected"
              label="export.dataSources.oblique"
              :error-messages="errorMessageDataSource"
              @change="
                (value) =>
                  value || resetDataSourceOption(DataSourceOptions.OBLIQUE)
              "
            />
          </v-col>
          <v-col v-if="dataSourceList.oblique.isSelected">
            <v-row no-gutters>
              <v-col>
                <VcsLabel
                  html-for="data-source-oblique-name"
                  :required="dataSourceList.oblique.isSelected"
                  :disabled="!dataSourceList.oblique.isSelected"
                >
                  {{ $t('export.editor.obliqueName') }}
                </VcsLabel>
              </v-col>
              <v-col>
                <VcsTextField
                  id="data-source-oblique-name"
                  v-model="
                    dataSourceList.oblique.properties.obliqueCollectionName
                  "
                  :disabled="!dataSourceList.oblique.isSelected"
                  :rules="
                    dataSourceList.oblique.isSelected
                      ? [(v) => !!v || 'components.validation.required']
                      : []
                  "
                  placeholder="ObliqueCollection"
                />
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <VcsLabel
                  html-for="data-source-oblique-file-extension"
                  :disabled="!dataSourceList.oblique.isSelected"
                >
                  {{ $t('export.editor.fileExtension') }}
                </VcsLabel>
              </v-col>
              <v-col>
                <VcsTextField
                  id="data-source-oblique-file-extension"
                  v-model="dataSourceList.oblique.properties.fileExtension"
                  :disabled="!dataSourceList.oblique.isSelected"
                  placeholder="jpg"
                />
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <VcsLabel
                  html-for="data-source-oblique-resolution"
                  :disabled="!dataSourceList.oblique.isSelected"
                >
                  {{ $t('export.editor.resolution') }}
                </VcsLabel>
              </v-col>
              <v-col>
                <VcsTextField
                  id="data-source-oblique-resolution"
                  v-model.number="dataSourceList.oblique.properties.resolution"
                  type="number"
                  :min="0"
                  :disabled="!dataSourceList.oblique.isSelected"
                  placeholder="1"
                  :rules="[
                    (v) =>
                      v === undefined ||
                      v === null ||
                      v === '' ||
                      v > 0 ||
                      'export.validation.negative',
                  ]"
                />
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <VcsCheckbox
                  id="data-source-oblique-dedicated"
                  v-model="dataSourceList.oblique.properties.dedicatedSource"
                  label="export.editor.dedicatedSource"
                  :disabled="!dataSourceList.oblique.isSelected"
                />
              </v-col>
            </v-row>
            <v-row
              v-if="dataSourceList.oblique.properties.dedicatedSource"
              no-gutters
            >
              <v-col>
                <VcsLabel html-for="data-source-oblique-base-url" required>
                  {{ $t('export.editor.baseUrl') }}
                </VcsLabel>
              </v-col>
              <v-col>
                <VcsTextField
                  id="data-source-oblique-base-url"
                  v-model="dataSourceList.oblique.properties.baseUrl"
                  clearable
                  :rules="[(v) => !!v || 'components.validation.required']"
                  :placeholder="$t('export.editor.placeholder.baseUrl')"
                />
              </v-col>
            </v-row>
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="6">
            <VcsCheckbox
              id="data-source-geojson"
              v-model="dataSourceList.geojson.isSelected"
              label="export.dataSources.geojson"
              :error-messages="errorMessageDataSource"
              @change="
                (value) =>
                  value || resetDataSourceOption(DataSourceOptions.GEOJSON)
              "
            />
          </v-col>
          <v-col v-if="dataSourceList.geojson.isSelected">
            <v-row no-gutters>
              <v-col>
                <VcsLabel
                  html-for="data-source-geojson-title"
                  :required="dataSourceList.geojson.isSelected"
                >
                  {{ $t('export.editor.title') }}
                </VcsLabel>
              </v-col>
              <v-col>
                <VcsTextField
                  id="data-source-geojson-title"
                  v-model="dataSourceList.geojson.properties.title"
                  :disabled="!dataSourceList.geojson.isSelected"
                  :rules="
                    dataSourceList.geojson.isSelected
                      ? [(v) => !!v || 'components.validation.required']
                      : []
                  "
                  :placeholder="$t('export.editor.title')"
                />
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <VcsLabel
                  html-for="data-source-geojson-url"
                  :required="dataSourceList.geojson.isSelected"
                >
                  {{ $t('export.editor.geojsonUrl') }}
                </VcsLabel>
              </v-col>
              <v-col>
                <VcsTextField
                  id="data-source-geojson-url"
                  v-model="dataSourceList.geojson.properties.geojsonUrl"
                  :disabled="!dataSourceList.geojson.isSelected"
                  :rules="
                    dataSourceList.geojson.isSelected
                      ? [(v) => !!v || 'components.validation.required']
                      : []
                  "
                  :placeholder="$t('export.editor.placeholder.geojsonUrl')"
                />
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col>
                <VcsLabel
                  html-for="data-source-geojson-base-url"
                  :required="dataSourceList.geojson.isSelected"
                >
                  {{ $t('export.editor.baseUrl') }}
                </VcsLabel>
              </v-col>
              <v-col>
                <VcsTextField
                  id="data-source-geojson-base-url"
                  v-model="dataSourceList.geojson.properties.baseUrl"
                  :disabled="!dataSourceList.geojson.isSelected"
                  :rules="
                    dataSourceList.geojson.isSelected
                      ? [(v) => !!v || 'components.validation.required']
                      : []
                  "
                  :placeholder="$t('export.editor.placeholder.baseUrl')"
                />
              </v-col>
            </v-row>
          </v-col>
        </v-row>
      </v-container>
    </VcsFormSection>
    <VcsFormSection
      v-if="dataSourceList.cityModel.isSelected"
      heading="export.editor.cityModelSettings"
      expandable
      :start-open="true"
    >
      <v-container class="py-0 px-1">
        <v-row
          v-for="key in ['fmeSecurityToken', 'fmeServerUrl']"
          :key="key"
          no-gutters
        >
          <v-col>
            <VcsLabel :html-for="`settings-${key}`" required>
              {{ $st(`export.editor.${key}`) }}
            </VcsLabel>
          </v-col>
          <v-col>
            <VcsTextField
              :id="`settings-${key}`"
              v-model="localConfig[key]"
              :rules="[(v) => !!v || 'components.validation.required']"
              :placeholder="$st(`export.editor.${key}`)"
            />
          </v-col>
        </v-row>
        <div v-for="key in ['exportFormat', 'lod', 'thematicClass']" :key="key">
          <v-row no-gutters>
            <v-col cols="6">
              <VcsLabel :html-for="`settings-${key}-list`" required>
                {{ $st(`export.editor.${key}List`) }}
              </VcsLabel>
            </v-col>
            <v-col cols="2">
              <VcsSelect
                :id="`settings-${key}-list`"
                v-model="localConfig[`${key}List`]"
                multiple
                :items="
                  key === 'thematicClass'
                    ? mapThematicClasses(defaultOptions.thematicClassList)
                    : defaultOptions[`${key}List`]
                "
                :rules="[(v) => !!v.length || 'components.validation.required']"
                @input="(v) => updateDefault(`${key}Default`, key !== 'lod', v)"
              />
            </v-col>
            <v-col cols="2">
              <VcsLabel :html-for="`settings-${key}-default`">
                {{ $t(`export.editor.default`) }}
              </VcsLabel>
            </v-col>
            <v-col cols="2">
              <VcsSelect
                :id="`settings-${key}-default`"
                v-model="localConfig[`${key}Default`]"
                :multiple="key !== 'lod'"
                :items="
                  key === 'thematicClass'
                    ? mapThematicClasses(localConfig.thematicClassList)
                    : localConfig[`${key}List`]
                "
              />
            </v-col>
          </v-row>
        </div>
        <v-row no-gutters>
          <v-col cols="6">
            <VcsLabel html-for="settings-appearance-theme-list">
              {{ $t('export.settingsCityModel.appearanceTheme') }}
            </VcsLabel>
          </v-col>
          <v-col>
            <VcsChipArrayInput
              id="settings-appearance-theme-list"
              v-model="localConfig.appearanceThemeList"
              column
              placeholder="rgbTexture"
              :input-width="100"
              @input="(v) => updateDefault('appearanceThemeDefault', false, v)"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <VcsLabel html-for="settings-appearance-theme-default" required>
              {{ $t('export.editor.appearanceThemeDefault') }}
            </VcsLabel>
          </v-col>
          <v-col>
            <VcsSelect
              id="settings-appearance-theme-default"
              v-model="localConfig.appearanceThemeDefault"
              :items="localConfig.appearanceThemeList"
              :rules="[(v) => !!v || 'components.validation.required']"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="6">
            <VcsLabel html-for="settings-predefined-crs" required>
              {{ $t('export.editor.crsPredefined') }}
            </VcsLabel>
          </v-col>
          <v-col cols="6">
            <VcsChipArrayInput
              id="settings-predefined-crs"
              v-model="predefinedCrs"
              :input-width="100"
              :column="true"
              :rules="[!!predefinedCrs || 'components.validation.required']"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="6">
            <VcsCheckbox
              id="settings-allow-height-mode"
              v-model="localConfig.allowHeightMode"
              label="export.editor.allowHeightMode"
              :true-value="true"
              :false-value="false"
            />
          </v-col>
          <v-col>
            <VcsLabel html-for="settings-height-mode-default" required>
              {{ $t('export.editor.default') }}
            </VcsLabel>
          </v-col>
          <v-col>
            <VcsSelect
              id="settings-height-mode-default"
              v-model="localConfig.heightModeDefault"
              :items="heightModeItems"
              :rules="[(v) => !!v || 'components.validation.required']"
            />
          </v-col>
        </v-row>
        <v-row
          v-for="key in [
            'exportScene',
            'allowTextureExport',
            'allowAddGenericAttrs',
            'allowTiledExport',
            'allowTerrainExport',
          ]"
          :key="key"
          no-gutters
        >
          <v-col>
            <VcsCheckbox
              :id="`settings-${key}`"
              v-model="localConfig[key]"
              :label="`export.editor.${key}`"
              :true-value="true"
              :false-value="false"
            />
          </v-col>
        </v-row>
        <v-row v-if="localConfig.allowTerrainExport" no-gutters>
          <v-col>
            <VcsCheckbox
              id="settings-has-terrain-url"
              v-model="hasTerrainUrl"
              label="export.editor.terrainUrl"
            />
          </v-col>
          <v-col>
            <VcsTextField
              id="settings-terrain-url"
              v-model="localConfig.terrainUrl"
              clearable
              :disabled="!hasTerrainUrl"
              :placeholder="$t('export.editor.placeholder.terrainUrl')"
            />
          </v-col>
        </v-row>
        <v-row v-if="localConfig.allowTerrainExport" no-gutters>
          <v-col>
            <VcsLabel html-for="settings-terrain-zoom-level">
              {{ $t('export.editor.terrainZoomLevel') }}
            </VcsLabel>
          </v-col>
          <v-col cols="3">
            <VcsTextField
              id="settings-terrain-zoom-level"
              v-model.number="localConfig.terrainZoomLevel"
              clearable
              :min="-1"
              type="number"
              :rules="[
                (v) =>
                  Number.isInteger(Number(v)) || 'export.validation.integer',
                (v) => v >= -1 || 'export.validation.negativeOne',
              ]"
            />
          </v-col>
        </v-row>
      </v-container>
    </VcsFormSection>
  </AbstractConfigEditor>
</template>

<script>
  import { VContainer, VRow, VCol } from 'vuetify/components';
  import {
    AbstractConfigEditor,
    VcsFormSection,
    VcsLabel,
    VcsTextField,
    VcsSelect,
    VcsCheckbox,
    VcsChipArrayInput,
  } from '@vcmap/ui';
  import { computed, ref, toRaw, watch } from 'vue';
  import getDefaultOptions from './defaultOptions.js';
  import { DataSourceOptions, mapThematicClasses } from './configManager.js';

  export const defaultDataSourceOptions = {
    cityModel: { type: DataSourceOptions.CITY_MODEL },
    oblique: {
      type: DataSourceOptions.OBLIQUE,
      obliqueCollectionName: undefined, // XXX get first oblique collections name from VcsApp?
      fileExtension: 'jpg',
      dedicatedSource: false,
      resolution: null,
      baseUrl: undefined,
    },
    geojson: {
      type: DataSourceOptions.GEOJSON,
      geojsonUrl: undefined,
      baseUrl: undefined,
      title: '',
    },
  };

  export default {
    name: 'ExportConfigEditor',
    components: {
      VContainer,
      VRow,
      VCol,
      AbstractConfigEditor,
      VcsFormSection,
      VcsLabel,
      VcsSelect,
      VcsTextField,
      VcsCheckbox,
      VcsChipArrayInput,
    },
    props: {
      getConfig: {
        type: Function,
        required: true,
      },
      setConfig: {
        type: Function,
        required: true,
      },
    },
    setup(props) {
      const dataSourceList = ref({
        cityModel: {
          isSelected: false,
          properties: { ...defaultDataSourceOptions.cityModel },
        },
        oblique: {
          isSelected: false,
          properties: { ...defaultDataSourceOptions.oblique },
        },
        geojson: {
          isSelected: false,
          properties: { ...defaultDataSourceOptions.geojson },
        },
      });

      const errorMessageDataSource = ref(undefined);

      const defaultOptions = getDefaultOptions();
      /** @type {import("vue").Ref<import("./configManager").ExportOptions>} */
      const localConfig = ref({
        ...structuredClone(defaultOptions),
        ...props.getConfig(),
      });

      localConfig.value.dataSourceOptionsList.forEach((option) => {
        // only takes first entry of array for each type
        if (!dataSourceList.value[option.type].isSelected) {
          dataSourceList.value[option.type].isSelected = true;
          dataSourceList.value[option.type].properties = {
            ...defaultDataSourceOptions[option.type],
            ...option,
          };
        }
      });

      const heightModeItems = [
        {
          value: 'absolute',
          title: 'export.settingsCityModel.absolute',
        },
        {
          value: 'ellipsoid',
          title: 'export.settingsCityModel.ellipsoid',
        },
      ];

      function resetDataSourceOption(option) {
        dataSourceList.value[option].properties = {
          ...defaultDataSourceOptions[option],
        };
      }

      const generalTermsOfUseUrl = ref();

      function useHasKey(key, triggerValidation) {
        return computed({
          get() {
            return localConfig.value[key] !== null;
          },
          set(value) {
            if (value) {
              localConfig.value[key] = defaultOptions[key] || '';
              if (triggerValidation) {
                triggerValidation();
              }
            } else {
              localConfig.value[key] = null;
              if (triggerValidation) {
                triggerValidation();
              }
            }
          },
        });
      }

      function updateDefault(prop, isArray, array) {
        if (!array.includes(localConfig.value[prop])) {
          localConfig.value[prop] = isArray ? [array[0]] : array[0];
        }
      }

      const apply = () => {
        if (localConfig.value.crs.length === 1) {
          localConfig.value.crs = localConfig.value.crs[0];
        }
        localConfig.value.dataSourceOptionsList = Object.keys(
          dataSourceList.value,
        )
          .filter((key) => dataSourceList.value[key].isSelected)
          .map((type) => {
            const properties = toRaw(dataSourceList.value[type].properties);
            const listDataSourceItem = {};
            Object.keys(properties).forEach((key) => {
              if (properties[key] !== defaultDataSourceOptions[type][key]) {
                listDataSourceItem[key] = properties[key];
              }
            });
            listDataSourceItem.type = type;
            return listDataSourceItem;
          });
        props.setConfig(structuredClone(toRaw(localConfig.value)));
      };

      watch(
        dataSourceList,
        (newValue) => {
          if (
            Object.values(newValue).some((dataSource) => dataSource.isSelected)
          ) {
            errorMessageDataSource.value = undefined;
          } else {
            errorMessageDataSource.value = 'export.editor.dataSourceRequired';
          }
        },
        { deep: true },
      );

      return {
        generalTermsOfUseUrl,
        localConfig,
        dataSourceList,
        resetDataSourceOption,
        DataSourceOptions,
        defaultOptions,
        hasTermsOfUse: useHasKey('termsOfUse', () => {
          // XXX this is needed until vuetify fixes: https://github.com/vuetifyjs/vuetify/issues/20765
          generalTermsOfUseUrl.value?.$refs?.textFieldRef?.validate();
        }),
        hasTerrainUrl: useHasKey('terrainUrl'),
        mapThematicClasses,
        heightModeItems,
        updateDefault,
        predefinedCrs: computed({
          get() {
            return Array.isArray(localConfig.value.crs)
              ? localConfig.value.crs
              : [localConfig.value.crs];
          },
          set(value) {
            if (value.length > 1) {
              localConfig.value.crs = value;
            } else if (value.length === 1) {
              localConfig.value.crs = value[0];
            }
          },
        }),
        apply,
        errorMessageDataSource,
      };
    },
  };
</script>
