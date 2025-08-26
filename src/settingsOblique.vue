<template>
  <v-sheet>
    <v-container>
      <v-row no-gutters>
        <v-col cols="7">
          <VcsLabel>
            {{ $t('export.settingsOblique.directionFilter') }}
          </VcsLabel>
        </v-col>
        <v-col cols="5">
          <VcsSelect
            v-model="settingsState.directionFilter"
            :items="directionFilterItems"
            :rules="[
              (v: string) => !!v || 'Please select at least one option.',
            ]"
            :placeholder="$t('export.settingsOblique.directionPlaceholder')"
          />
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
</template>

<script lang="ts">
  import { obliqueViewDirectionNames } from '@vcmap/core';
  import { VSheet, VContainer, VRow, VCol } from 'vuetify/components';
  import { useProxiedComplexModel, VcsLabel, VcsSelect } from '@vcmap/ui';
  import type { PropType } from 'vue';
  import { defineComponent } from 'vue';
  import type { SettingsObliqueState } from './configManager.js';

  /**
   * @description Component with the settings for the oblique export.
   * @vue-prop {SettingsObliqueState} value - The oblique settings state.
   */
  export default defineComponent({
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
        type: Object as PropType<SettingsObliqueState>,
        required: true,
      },
    },
    setup(props, { emit }) {
      const settingsState = useProxiedComplexModel(props, 'modelValue', emit);

      const { nadir, ...dirs } = obliqueViewDirectionNames;
      const directionFilterItems = Object.keys({ nadir, ...dirs }).map(
        (dir) => {
          return {
            value:
              obliqueViewDirectionNames[
                dir as keyof typeof obliqueViewDirectionNames
              ],
            title: `export.settingsOblique.${dir}`,
          };
        },
      );

      return {
        settingsState,
        directionFilterItems,
      };
    },
  });
</script>

<style scoped lang="scss">
  :deep(.v-field__input) {
    padding-right: 0 !important;
  }
  :deep(.v-container) {
    padding: 0 !important;
  }
</style>
