<template>
  <v-container class="pa-0">
    <!-- main settings -->
    <v-row
      v-for="(mainSetting, name) in mainSettingsSetup"
      :key="name"
      no-gutters
    >
      <v-col class="pa-0" cols="6">
        <VcsLabel :html-for="name + 'Select'" :dense="true">
          {{ $st(mainSetting.i18n) }}
        </VcsLabel>
      </v-col>
      <v-col class="pa-0" cols="6">
        <VcsSelect
          :id="name + 'Select'"
          :items="mainSetting.items"
          :item-text="
            (item) => {
              if (item.text) {
                return item.text;
              } else {
                return item;
              }
            }
          "
          v-model="settingsState[mainSetting.stateName]"
          :dense="true"
          :multiple="mainSetting.multiple"
          :rules="[
            (v) => !!v.length || $t('export.validation.selectFieldMultiple'),
          ]"
        />
      </v-col>
    </v-row>
    <!-- settings that depend on the selected formats -->
    <div v-for="(formatSetting, name) in formatSettingsSetup" :key="name">
      <v-row no-gutters>
        <v-col class="pa-0">
          <VcsCheckbox
            :label="formatSetting.i18n"
            v-model="settingsState[formatSetting.stateName]"
            dense
          />
        </v-col>
      </v-row>
      <template v-if="settingsState[formatSetting.stateName]">
        <v-row
          v-for="selectField in formatSetting.selectFields"
          no-gutter
          :key="selectField.name"
          class="ma-0 pl-6"
        >
          <v-col class="pa-0" cols="6">
            <VcsLabel :html-for="selectField.name + 'Select'" :dense="true">
              {{ $st(selectField.i18n) }}
            </VcsLabel>
          </v-col>
          <v-col class="pa-0" cols="6">
            <VcsSelect
              :id="selectField.name + 'Select'"
              :items="selectField.items"
              v-model="settingsState[selectField.stateName]"
              :dense="true"
            />
          </v-col>
        </v-row>
      </template>
    </div>

    <v-row v-if="showHeightMode" no-gutters>
      <v-col class="pa-0" cols="6">
        <VcsLabel html-for="height-mode-select" :dense="true">
          {{ $t('export.settingsCityModel.heightMode') }}
        </VcsLabel>
      </v-col>
      <v-col class="pa-0" cols="6">
        <VcsSelect
          id="height-mode-select"
          v-model="settingsState.selectedHeightMode"
          :dense="true"
          :items="[
            {
              value: 'absolute',
              text: $t('export.settingsCityModel.absolute'),
            },
            {
              value: 'ellipsoid',
              text: $t('export.settingsCityModel.ellipsoid'),
            },
          ]"
        />
      </v-col>
    </v-row>
    <v-row v-if="showCrsInput" no-gutters>
      <v-col class="pa-0" cols="6">
        <VcsLabel html-for="crs-input" :dense="true">
          {{ $t('export.settingsCityModel.coordinateSystem') }}
        </VcsLabel>
      </v-col>
      <v-col class="pa-0" cols="6">
        <VcsSelect
          id="crs-input"
          v-model="settingsState.selectedCrs"
          :dense="true"
          :items="setup.crs"
        />
      </v-col>
    </v-row>
    <v-row v-if="buttonShow" no-gutters>
      <v-col cols="12" class="px-1 d-flex flex-row-reverse">
        <VcsFormButton @click="$emit('continue')" :disabled="buttonDisabled">
          {{ $t('export.continue') }}
        </VcsFormButton>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped></style>

<script>
  // @ts-check
  import { TMSLayer, WMSLayer } from '@vcmap/core';
  import { VContainer, VRow, VCol } from 'vuetify/components';
  import {
    VcsLabel,
    VcsSelect,
    VcsCheckbox,
    VcsFormButton,
    useProxiedComplexModel,
  } from '@vcmap/ui';
  import { computed, inject, onBeforeMount } from 'vue';
  import { exportFormats, mapThematicClasses } from './configManager.js';

  /**
   * @description Component with the settings for the city model export.
   * @vue-prop {import("./configManager.js").SettingsCityModelSetup} setup - The initial values and configurations.
   * @vue-prop {import("./configManager.js").SettingsCityModelState} value - The settings state.
   * @vue-prop {boolean} buttonDisabled - If the continue button is disabled or not.
   * @vue-prop {boolean} [buttonShow=true] - If the continue button is shown or not.
   */
  export default {
    name: 'SettingsCityModel',
    components: {
      VContainer,
      VRow,
      VCol,
      VcsLabel,
      VcsSelect,
      VcsCheckbox,
      VcsFormButton,
    },
    props: {
      setup: {
        type: Object,
        required: true,
      },
      modelValue: {
        type: Object,
        required: true,
      },
      buttonDisabled: {
        type: Boolean,
        required: true,
      },
      buttonShow: {
        type: Boolean,
        required: false,
        default: true,
      },
    },
    setup(props, { emit }) {
      /** State object of the city model export settings. */
      const settingsState = useProxiedComplexModel(props, 'modelValue', emit);

      /** Setup for the main settings. */
      const mainSettingsSetup = {
        exportFormat: {
          items: props.setup.exportFormatList,
          i18n: 'export.settingsCityModel.exportFormat',
          multiple: true,
          stateName: 'selectedExportFormats',
        },
        lod: {
          items: props.setup.lodList,
          i18n: 'export.settingsCityModel.lod',
          multiple: false,
          stateName: 'selectedLod',
        },
        thematicClassList: {
          items: mapThematicClasses(props.setup.thematicClassList),
          i18n: 'export.settingsCityModel.thematicClasses',
          multiple: true,
          stateName: 'selectedThematicClasses',
        },
      };

      const terrainAppearanceOptions = {};

      /** Adds available TMS and WMS layers to terrainAppearanceOptions and makes them available for selection. */
      function fillTerrainAppearences() {
        if (Object.keys(props.setup.terrainAppearanceOptions).length === 0) {
          const app = inject('vcsApp');
          [...app.layers]
            .filter(
              (layer) => layer instanceof TMSLayer || layer instanceof WMSLayer,
            )
            .forEach((layer) => {
              const { name, maxLevel } = layer;
              terrainAppearanceOptions[name] = maxLevel;
            });
          const layerNames = Object.keys(terrainAppearanceOptions);
          if (layerNames.length > 0) {
            settingsState.value.selectedTerrainAppearanceLayer = layerNames[0];
          }
        }
      }

      onBeforeMount(() => {
        fillTerrainAppearences();
      });

      /** Setup for the settings that depend on the selected export format. */
      const formatSettingsSetup = computed(() => {
        const settings = {
          showTerrainExport: {
            render:
              props.setup.allowTerrainExport &&
              settingsState.value.selectedExportFormats.some(
                (formatType) => formatType !== '2D Shape',
              ),
            i18n: 'export.settingsCityModel.terrainExport',
            stateName: 'terrainExport',
          },
          showAddGenericAttr: {
            render:
              props.setup.allowAddGenericAttrs &&
              settingsState.value.selectedExportFormats.some(
                (formatType) => exportFormats[formatType].genericAttributes,
              ),
            i18n: 'export.settingsCityModel.genericAttrs',
            stateName: 'genericAttributes',
          },
          showTextureExport: {
            render:
              props.setup.allowTextureExport &&
              settingsState.value.selectedExportFormats.some(
                (formatType) => exportFormats[formatType].texture,
              ),
            i18n: 'export.settingsCityModel.textureExport',
            stateName: 'textureExport',
            selectFields: [
              {
                name: 'appearanceThemeOptions',
                render: props.setup.appearanceThemeList.length > 0,
                i18n: 'export.settingsCityModel.appearanceTheme',
                items: props.setup.appearanceThemeList,
                stateName: 'selectedAppearanceTheme',
              },
              {
                name: 'terrainAppearanceOptions',
                render:
                  Object.keys(terrainAppearanceOptions).length > 0 &&
                  settingsState.value.terrainExport,
                i18n: 'export.settingsCityModel.terrainTexture',
                items: Object.keys(terrainAppearanceOptions),
                stateName: 'selectedTerrainAppearanceLayer',
              },
            ],
          },
          showUseLocalCoors: {
            render: settingsState.value.selectedExportFormats.some(
              (formatType) => exportFormats[formatType].localCoordinates,
            ),
            i18n: 'export.settingsCityModel.localCoordinates',
            stateName: 'localCoordinates',
          },
          // TODO: replace by setup prop
          showTiledExport: {
            render: props.setup.allowTiledExport,
            i18n: 'export.settingsCityModel.tiledExport',
            stateName: 'tiledExport',
          },
        };
        // remove all format specific settings that should not be rendered.
        Object.keys(settings)
          .filter((key) => !settings[key].render)
          .forEach((falsyKey) => delete settings[falsyKey]);
        // remove all select fields of a format specific setting that are empty or should not be rendered.
        Object.keys(settings)
          .filter((key) => settings[key].selectFields)
          .forEach((key) => {
            const filteredFields = settings[key].selectFields.filter(
              (selectField) => selectField.render,
            );
            if (filteredFields.length === 0) {
              delete settings[key].selectFields;
            } else {
              settings[key].selectFields = filteredFields;
            }
          });

        return settings;
      });

      /** If heightmode should be displayed. */
      const showHeightMode = computed(() => {
        return (
          !settingsState.value.terrainExport &&
          props.setup.allowHeightMode &&
          settingsState.value.selectedExportFormats.some(
            (formatType) => exportFormats[formatType].heightMode,
          )
        );
      });

      /** Manages crs input options. */
      const showCrsInput = computed(
        () =>
          !settingsState.value.localCoordinates &&
          Array.isArray(props.setup.crs),
      );

      return {
        settingsState,
        mainSettingsSetup,
        formatSettingsSetup,
        showHeightMode,
        showCrsInput,
      };
    },
  };
</script>
