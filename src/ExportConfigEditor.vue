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
                (v: string) => {
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
                (v: number) => !!v || 'components.validation.required',
                (v: number) => v > 0 || 'export.validation.negative',
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
                (v: boolean) =>
                  v || resetDataSourceOption(DataSourceOptions.CITY_MODEL)
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
                (v: boolean) =>
                  v || resetDataSourceOption(DataSourceOptions.OBLIQUE)
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
                    (
                      dataSourceList.oblique
                        .properties as ObliqueDataSourceOptions
                    ).obliqueCollectionName
                  "
                  :disabled="!dataSourceList.oblique.isSelected"
                  :rules="
                    dataSourceList.oblique.isSelected
                      ? [(v: string) => !!v || 'components.validation.required']
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
                  v-model="
                    (
                      dataSourceList.oblique
                        .properties as ObliqueDataSourceOptions
                    ).fileExtension
                  "
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
                  v-model.number="
                    (
                      dataSourceList.oblique
                        .properties as ObliqueDataSourceOptions
                    ).resolution
                  "
                  type="number"
                  :min="0"
                  :disabled="!dataSourceList.oblique.isSelected"
                  placeholder="1"
                  :rules="[
                    (v: number) =>
                      v === undefined ||
                      v === null ||
                      v.toString() === '' ||
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
                  v-model="
                    (
                      dataSourceList.oblique
                        .properties as ObliqueDataSourceOptions
                    ).dedicatedSource
                  "
                  label="export.editor.dedicatedSource"
                  :disabled="!dataSourceList.oblique.isSelected"
                />
              </v-col>
            </v-row>
            <v-row
              v-if="
                (dataSourceList.oblique.properties as ObliqueDataSourceOptions)
                  .dedicatedSource
              "
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
                  :rules="[
                    (v: string) => !!v || 'components.validation.required',
                  ]"
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
                (v: boolean) =>
                  v || resetDataSourceOption(DataSourceOptions.GEOJSON)
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
                      ? [(v: string) => !!v || 'components.validation.required']
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
                  v-model="
                    (
                      dataSourceList.geojson
                        .properties as GeoJSONDataSourceOptions
                    ).geojsonUrl
                  "
                  :disabled="!dataSourceList.geojson.isSelected"
                  :rules="
                    dataSourceList.geojson.isSelected
                      ? [(v: string) => !!v || 'components.validation.required']
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
                      ? [(v: string) => !!v || 'components.validation.required']
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
        <v-row no-gutters>
          <v-col>
            <VcsLabel html-for="settings-fmeSecurityToken">
              {{ $st('export.editor.fmeSecurityToken') }}
            </VcsLabel>
          </v-col>
          <v-col>
            <VcsTextField
              id="settings-fmeSecurityToken"
              v-model="localConfig.fmeSecurityToken"
              :placeholder="$st('export.editor.fmeSecurityToken')"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col>
            <VcsLabel html-for="settings-fmeServerUrl" required>
              {{ $st('export.editor.fmeServerUrl') }}
            </VcsLabel>
          </v-col>
          <v-col>
            <VcsTextField
              id="settings-fmeServerUrl"
              v-model="localConfig.fmeServerUrl"
              :rules="[(v: string) => !!v || 'components.validation.required']"
              :placeholder="$st('export.editor.fmeServerUrl')"
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
                v-model="localConfig[`${key}List` as keyof typeof localConfig]"
                multiple
                :items="
                  key === 'thematicClass'
                    ? mapThematicClasses(defaultOptions.thematicClassList)
                    : defaultOptions[
                        `${key}List` as keyof typeof defaultOptions
                      ]
                "
                :rules="[
                  (v: string[]) =>
                    !!v.length || 'components.validation.required',
                ]"
                @update:model-value="
                  (v: string[]) =>
                    updateDefault(
                      `${key}Default` as keyof typeof localConfig,
                      key !== 'lod',
                      v,
                    )
                "
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
                v-model="
                  localConfig[`${key}Default` as keyof typeof localConfig]
                "
                :multiple="key !== 'lod'"
                :items="
                  key === 'thematicClass'
                    ? mapThematicClasses(localConfig.thematicClassList)
                    : localConfig[`${key}List` as keyof typeof localConfig]
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
              @update:model-value="
                (v: string[]) =>
                  updateDefault('appearanceThemeDefault', false, v)
              "
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
              :rules="[(v: string) => !!v || 'components.validation.required']"
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
              :rules="[(v: string) => !!v || 'components.validation.required']"
            />
          </v-col>
        </v-row>
        <v-row no-gutters>
          <v-col cols="12">
            <VcsCheckbox
              id="settings-data-projection"
              v-model="hasDataProjection"
              label="export.editor.overrideMapProjection"
              :true-value="true"
              :false-value="false"
            />
          </v-col>
          <VcsProjection
            v-if="hasDataProjection"
            id="settings-data-projection"
            v-model="localConfig.dataProjection"
            hide-alias
            required
          />
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
              v-model="localConfig[key as keyof typeof localConfig]"
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
                (v: string) =>
                  Number.isInteger(Number(v)) || 'export.validation.integer',
                (v: number) => v >= -1 || 'export.validation.negativeOne',
              ]"
            />
          </v-col>
        </v-row>
      </v-container>
    </VcsFormSection>
  </AbstractConfigEditor>
</template>

<script lang="ts">
  import { VContainer, VRow, VCol } from 'vuetify/components';
  import { getDefaultProjection } from '@vcmap/core';
  import {
    AbstractConfigEditor,
    VcsFormSection,
    VcsLabel,
    VcsTextField,
    VcsSelect,
    VcsCheckbox,
    VcsChipArrayInput,
    VcsProjection,
  } from '@vcmap/ui';
  import type { PropType, Ref, WritableComputedRef } from 'vue';
  import { computed, defineComponent, ref, toRaw, watch } from 'vue';
  import getDefaultOptions from './defaultOptions.js';
  import type { ExportOptions } from './configManager.js';
  import { DataSourceOptions, mapThematicClasses } from './configManager.js';
  import type {
    AbstractDataSourceOptions,
    OneOfDataSourceOptions,
  } from './dataSources/abstractDataSource.js';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  import type { ObliqueDataSourceOptions } from './dataSources/obliqueDataSource.js';
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  import type { GeoJSONDataSourceOptions } from './dataSources/geojsonDataSource.js';

  export const defaultDataSourceOptions: Record<
    DataSourceOptions,
    { type: DataSourceOptions } & OneOfDataSourceOptions
  > = {
    cityModel: { type: DataSourceOptions.CITY_MODEL },
    oblique: {
      type: DataSourceOptions.OBLIQUE,
      obliqueCollectionName: undefined, // XXX get first oblique collections name from VcsApp?
      fileExtension: 'jpg',
      dedicatedSource: false,
      resolution: undefined,
      baseUrl: undefined,
    },
    geojson: {
      type: DataSourceOptions.GEOJSON,
      geojsonUrl: undefined,
      baseUrl: undefined,
      title: '',
    },
  };

  export default defineComponent({
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
      VcsProjection,
    },
    props: {
      getConfig: {
        type: Function as PropType<() => ExportOptions>,
        required: true,
      },
      setConfig: {
        type: Function as PropType<(config: object) => void>,
        required: true,
      },
    },
    setup(props) {
      const dataSourceList: Ref<
        Record<
          DataSourceOptions,
          { isSelected: boolean; properties: AbstractDataSourceOptions }
        >
      > = ref({
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

      const errorMessageDataSource = ref<string | undefined>(undefined);

      const defaultOptions = getDefaultOptions();
      const localConfig: Ref<ExportOptions> = ref({
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

      function resetDataSourceOption(option: DataSourceOptions): void {
        dataSourceList.value[option].properties = {
          ...defaultDataSourceOptions[option],
        };
      }

      const generalTermsOfUseUrl = ref();
      const hasDataProjection = ref(
        props.getConfig().dataProjection &&
          props.getConfig().dataProjection?.epsg !==
            getDefaultProjection().epsg,
      );

      function useHasKey(
        key: keyof Pick<ExportOptions, 'termsOfUse' | 'terrainUrl'>,
        triggerValidation?: () => void,
      ): WritableComputedRef<boolean> {
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

      function updateDefault<K extends keyof ExportOptions>(
        prop: K,
        isArray: boolean,
        array: ExportOptions[K][],
      ): void {
        if (!array.includes(localConfig.value[prop])) {
          localConfig.value[prop] = (
            isArray ? [array[0]] : array[0]
          ) as ExportOptions[K];
        }
      }

      const apply = (): void => {
        if (localConfig.value.crs.length === 1) {
          localConfig.value.crs = localConfig.value.crs[0];
        }
        if (!hasDataProjection.value) {
          delete localConfig.value.dataProjection;
        }
        localConfig.value.dataSourceOptionsList = (
          Object.keys(dataSourceList.value) as DataSourceOptions[]
        )
          .filter((key) => dataSourceList.value[key]?.isSelected)
          .map((type) => {
            const properties = toRaw(dataSourceList.value[type].properties);
            const listDataSourceItem: AbstractDataSourceOptions = { type };
            (
              Object.keys(properties) as (keyof OneOfDataSourceOptions)[]
            ).forEach((key) => {
              if (
                properties[key] &&
                properties[key] !== defaultDataSourceOptions[type][key]
              ) {
                // @ts-expect-error type is not a string
                listDataSourceItem[key] = properties[key];
              }
            });
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
        hasDataProjection,
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
  });
</script>
