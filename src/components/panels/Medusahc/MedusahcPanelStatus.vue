<template>
    <div>
        <div class="rounded-lg grey border-1 d-flex align-center px-4 py-3" :class="containerClasses">
            <div class="flex-1 text-no-wrap">
                <v-tooltip top>
                    <template #activator="{ on, attrs }">
                        <span
                            v-bind="attrs"
                            class="sensor-status rounded-circle d-inline-block mr-2"
                            :class="headSensorClasses"
                            v-on="on" />
                    </template>
                    <span>{{ headSensorOutput }}</span>
                </v-tooltip>
                <span>{{ $t('Panels.MedusahcPanel.Toolhead') }}</span>
            </div>
            <div class="flex-1 text-center">{{ operationOutput }}</div>
            <div class="flex-1 text-right text-no-wrap">
                {{ $t('Panels.MedusahcPanel.Mounted') }}:
                <span :class="mountedClasses">{{ mountedOutput }}</span>
            </div>
        </div>
        <v-alert v-if="dockErrorOutput" :icon="mdiAlert" type="error" class="mt-3 mb-0" dense text>
            {{ dockErrorOutput }}
        </v-alert>
        <v-alert v-if="medusahcLastError" :icon="mdiAlert" type="error" class="mt-3 mb-0" dense text>
            {{ medusahcLastError }}
        </v-alert>
    </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import MedusahcMixin, { MEDUSAHC_SENSOR_ERROR } from '@/components/mixins/medusahc'
import { mdiAlert } from '@mdi/js'

@Component
export default class MedusahcPanelStatus extends Mixins(BaseMixin, MedusahcMixin) {
    mdiAlert = mdiAlert

    get dockErrors(): number[] {
        return this.medusahcHighlight.errors
    }

    get hasError(): boolean {
        return (
            this.dockErrors.length > 0 ||
            this.medusahcCurrentTool === MEDUSAHC_SENSOR_ERROR ||
            this.medusahcLastError !== ''
        )
    }

    get containerClasses() {
        return {
            'border-primary': this.medusahcHighlight.selected !== null && !this.hasError,
            'border-error': this.hasError,
            'darken-3': this.$vuetify.theme.dark,
            'lighten-2': !this.$vuetify.theme.dark,
        }
    }

    get dockErrorOutput(): string {
        if (this.dockErrors.length === 0) return ''

        const tools = this.dockErrors.map((tool) => `T${tool}`).join(', ')
        if (this.dockErrors.length > 1) return this.$t('Panels.MedusahcPanel.ToolsOutOfDock', { tools }).toString()

        return this.$t('Panels.MedusahcPanel.ToolLost', { tool: tools }).toString()
    }

    // Toolhead hall sensor; only present when pin_watch has a pin_e configured.
    get headSensor(): number | null {
        return this.getMedusahcSensor('e')
    }

    get headSensorClasses() {
        return {
            success: this.headSensor === 1,
            'grey lighten-1': this.headSensor !== 1,
        }
    }

    get headSensorOutput(): string {
        if (this.headSensor === null) return this.$t('Panels.MedusahcPanel.NoHeadSensor').toString()

        const status =
            this.headSensor === 1 ? this.$t('Panels.MedusahcPanel.Detected') : this.$t('Panels.MedusahcPanel.Empty')

        return `${this.$t('Panels.MedusahcPanel.HeadSensor')} - ${status}`
    }

    get operationOutput(): string {
        const key = `Panels.MedusahcPanel.Operations.${this.medusahcOperation}`

        return this.$te(key) ? this.$t(key).toString() : this.medusahcOperation
    }

    get mountedOutput(): string {
        if (this.dockErrors.length > 0 || this.medusahcCurrentTool === MEDUSAHC_SENSOR_ERROR)
            return this.$t('Panels.MedusahcPanel.Unknown').toString()

        const tool = this.medusahcHighlight.selected
        if (tool === null) return this.$t('Panels.MedusahcPanel.None').toString()

        return `T${tool}`
    }

    get mountedClasses() {
        return {
            'primary--text': this.medusahcHighlight.selected !== null && !this.hasError,
            'error--text': this.hasError,
        }
    }
}
</script>

<style scoped>
.flex-1 {
    flex: 1 1 0;
}

.sensor-status {
    width: 12px;
    height: 12px;
    vertical-align: middle;
}

.v-application .border-error {
    border-color: var(--v-error-base) !important;
}

.v-application .border-primary {
    border-color: var(--v-primary-base) !important;
}
</style>
