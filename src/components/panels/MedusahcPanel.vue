<template>
    <panel
        v-if="klipperReadyForGui && medusahcExists"
        :title="$t('Panels.MedusahcPanel.Headline')"
        :icon="mdiToolboxOutline"
        :collapsible="true"
        card-class="medusahc-panel">
        <template #buttons>
            <medusahc-panel-buttons />
        </template>
        <v-card-text class="pt-1">
            <medusahc-panel-status />
            <div class="mt-3 medusahc-tool-grid">
                <medusahc-panel-tool v-for="tool in medusahcTools" :key="tool" :tool="tool" />
            </div>
        </v-card-text>
    </panel>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import MedusahcMixin from '@/components/mixins/medusahc'
import { mdiToolboxOutline } from '@mdi/js'

@Component
export default class MedusahcPanel extends Mixins(BaseMixin, MedusahcMixin) {
    mdiToolboxOutline = mdiToolboxOutline
}
</script>

<style scoped>
/* Fixed three columns, so six tools always land as two rows of three */
.medusahc-tool-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}
</style>
