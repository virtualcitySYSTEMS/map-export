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
          {{ $t(mainSetting.i18n) }}
        </VcsLabel>
      </v-col>
      <v-col class="pa-0" cols="6">
        <VcsSelect
          :id="name + 'Select'"
          :items="mainSetting.items"
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
    <template v-for="(formatSetting, name) in formatSettingsSetup">
      <v-row no-gutters :key="name">
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
              {{ $t(selectField.i18n) }}
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
    </template>
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
    <v-row v-if="crsInput" no-gutters>
      <v-col class="pa-0" cols="6">
        <VcsLabel html-for="crs-input" :dense="true">
          {{ $t('export.settingsCityModel.coordinateSystem') }}
        </VcsLabel>
      </v-col>
      <v-col class="pa-0" v-if="setup.allowCrsTextInput" cols="6">
        <VcsTextField
          id="crs-input"
          clearable
          dense
          placeholder="EPSG Code"
          v-model="settingsState.selectedCrs"
          :rules="[
            (v) => /^(EPSG:)?\d{4,5}/.test(v) || $t('export.validation.epsg'),
          ]"
        />
      </v-col>
      <v-col class="pa-0" v-else cols="6">
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

<style scoped>
  /* .col {
    padding: 0;
  } */
</style>

<script>
  // @ts-check
  import { TMSLayer, WMSLayer } from '@vcmap/core';
  import { VContainer, VRow, VCol } from 'vuetify/lib';
  import {
    VcsLabel,
    VcsSelect,
    VcsCheckbox,
    VcsTextField,
    VcsFormButton,
  } from '@vcmap/ui';
  import { computed, inject, onBeforeMount, reactive, watch } from 'vue';
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
      VcsTextField,
      VcsFormButton,
    },
    props: {
      setup: {
        type: Object,
        required: true,
      },
      value: {
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
      const settingsState = reactive(props.value);

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

      // Emits the state when a change to the settings is made.
      watch(settingsState, () => {
        emit('input', settingsState);
      });

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
            settingsState.selectedTerrainAppearanceLayer = layerNames[0];
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
              settingsState.selectedExportFormats.some(
                (formatType) => formatType !== '2D Shape',
              ),
            i18n: 'export.settingsCityModel.terrainExport',
            stateName: 'terrainExport',
          },
          showAddGenericAttr: {
            render:
              props.setup.allowAddGenericAttrs &&
              settingsState.selectedExportFormats.some(
                (formatType) => exportFormats[formatType].genericAttributes,
              ),
            i18n: 'export.settingsCityModel.genericAttrs',
            stateName: 'genericAttributes',
          },
          showTextureExport: {
            render:
              props.setup.allowTextureExport &&
              settingsState.selectedExportFormats.some(
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
                  settingsState.terrainExport,
                i18n: 'export.settingsCityModel.terrainTexture',
                items: Object.keys(terrainAppearanceOptions),
                stateName: 'selectedTerrainAppearanceLayer',
              },
            ],
          },
          showUseLocalCoors: {
            render: settingsState.selectedExportFormats.some(
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
          !settingsState.terrainExport &&
          props.setup.allowHeightMode &&
          settingsState.selectedExportFormats.some(
            (formatType) => exportFormats[formatType].heightMode,
          )
        );
      });

      /** Manages crs input options. */
      const crsInput = computed(() => {
        return settingsState.localCoordinates
          ? false
          : props.setup.allowCrsTextInput || Array.isArray(props.setup.crs);
      });

      return {
        settingsState,
        mainSettingsSetup,
        formatSettingsSetup,
        showHeightMode,
        crsInput,
      };
    },
  };
</script>
