<template>
  <v-sheet>
    <v-container>
      <v-row>
        <v-col cols="7">
          <VcsLabel>
            {{ $t('export.settingsOblique.directionFilter') }}
          </VcsLabel>
        </v-col>
        <v-col cols="5">
          <VcsSelect
            :items="directionFilterItems"
            v-model="settingsState.directionFilter"
            :item-text="(item) => item.text"
            :item-value="(item) => item.value"
            :rules="[(v) => !!v || 'Please select at least one option.']"
            :placeholder="$t('export.settingsOblique.directionPlaceholder')"
          />
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
</template>

<script>
  import { obliqueViewDirectionNames } from '@vcmap/core';
  import { VSheet, VContainer, VRow, VCol } from 'vuetify/components';
  import { useProxiedComplexModel, VcsLabel, VcsSelect } from '@vcmap/ui';

  /**
   * @description Component with the settings for the oblique export.
   * @vue-prop {import("./configManager").SettingsObliqueState} value - The oblique settings state.
   */
  export default {
    name: 'SettingsOblique',
    components: {
      VSheet,
      VContainer,
      VRow,
      VCol,
      VcsLabel,
      VcsSelect,
    },
    props: {
      modelValue: {
        type: Object,
        required: true,
      },
    },
    setup(props, { emit }) {
      const settingsState = useProxiedComplexModel(props, 'modelValue', emit);

      const { nadir, ...dirs } = obliqueViewDirectionNames;
      const directionFilterItems = Object.keys({ nadir, ...dirs }).map(
        (dir) => {
          return {
            value: obliqueViewDirectionNames[dir],
            text: `export.settingsOblique.${dir}`,
          };
        },
      );

      return {
        settingsState,
        directionFilterItems,
      };
    },
  };
</script>
<style scoped lang="scss">
  :deep(.v-field__input) {
    padding-right: 0 !important;
  }
  :deep(.v-container) {
    padding: 0 !important;
  }
</style>
