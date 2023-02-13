<template>
  <v-sheet>
    <v-container>
      <v-row>
        <v-col cols="8">
          <VcsLabel>
            {{ $t('export.settingsOblique.directionFilter') }}
          </VcsLabel>
        </v-col>
        <v-col cols="4">
          <VcsSelect
            :items="directionFilterItems"
            v-model="settingsState.directionFilter"
            dense
            :rules="[v => !!v || 'Please select at least one option.']"
            :placeholder="$t('export.settingsOblique.directionPlaceholder')"
            @change="$emit('change')"
          />
        </v-col>
      </v-row>
    </v-container>
  </v-sheet>
</template>

<script>
  import { obliqueViewDirectionNames } from '@vcmap/core';
  import { VSheet, VContainer, VRow, VCol } from 'vuetify/lib';
  import { VcsLabel, VcsSelect } from '@vcmap/ui';
  import { reactive, watch } from 'vue';

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
      value: {
        type: Object,
        required: true,
      },
    },
    setup(props, { emit }) {
      const settingsState = reactive(props.value);

      const { nadir, ...dirs } = obliqueViewDirectionNames;
      const directionFilterItems = Object.keys({ nadir, ...dirs }).map((dir) => {
        return {
          value: obliqueViewDirectionNames[dir],
          text: `export.settingsOblique.${dir}`,
        };
      });

      watch(settingsState, () => {
        emit('input', settingsState);
      });

      return {
        settingsState,
        directionFilterItems,
      };
    },
  };
</script>
