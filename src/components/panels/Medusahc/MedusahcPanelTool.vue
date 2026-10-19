<template>
    <div class="grey medusahc-tool d-flex flex-column pa-2" :class="toolClasses">
        <div class="d-flex align-center">
            <v-btn dense small class="flex-grow-1 elevation-0" :disabled="selectDisabled" @click="selectTool">
                {{ toolName }}
            </v-btn>
            <span class="ml-2 text-caption text-no-wrap tool-temperature" :class="temperatureClasses">
                {{ temperatureOutput }}
            </span>
        </div>
        <div class="d-flex align-center mt-2">
            <v-tooltip top>
                <template #activator="{ on, attrs }">
                    <span class="d-flex align-center" v-bind="attrs" v-on="on">
                        <afc-filament-reel
                            :percent="spoolPercent"
                            :color="spoolColor"
                            class="filament-spool"
                            :class="{ 'cursor-pointer': medusahcExistsSpoolman }"
                            @click-spool="onSpoolClick" />
                    </span>
                </template>
                <span>
                    <template v-if="spool">
                        <div class="font-weight-bold">{{ spoolHeadline }}</div>
                        <div>{{ filamentName }}</div>
                        <div>{{ spoolWeightsOutput }}</div>
                    </template>
                    <div v-else>{{ $t('Panels.MedusahcPanel.NoSpoolAssigned') }}</div>
                </span>
            </v-tooltip>
            <spoolman-change-spool-dialog v-if="medusahcExistsSpoolman" v-model="showSpoolmanDialog" :tool="toolName" />
            <div class="d-flex flex-column ml-2 tool-filament">
                <span class="text-body-2 text-truncate" :class="{ 'text--disabled': !spool }">{{ filamentName }}</span>
                <span class="text-caption text--secondary text-no-wrap">
                    <span class="font-weight-bold mr-1">{{ materialOutput }}</span>
                    {{ remainingWeightOutput }}
                </span>
            </div>
        </div>
        <div class="d-flex mt-2 heat-group">
            <v-btn
                v-for="preset in presets"
                :key="preset.name"
                x-small
                text
                class="flex-grow-1 px-0"
                :class="{ 'heat-active': isActivePreset(preset) }"
                @click="heat(preset.temperature)">
                <span class="text-truncate">{{ preset.name }}</span>
            </v-btn>
            <v-btn x-small text class="flex-grow-1 px-0" @click="heat(0)">
                {{ $t('Panels.MedusahcPanel.Off') }}
            </v-btn>
        </div>
    </div>
</template>

<script lang="ts">
import { Component, Mixins, Prop } from 'vue-property-decorator'
import BaseMixin from '@/components/mixins/base'
import MedusahcMixin, { MedusahcToolPreset } from '@/components/mixins/medusahc'
import { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'

@Component
export default class MedusahcPanelTool extends Mixins(BaseMixin, MedusahcMixin) {
    @Prop({ type: Number, required: true }) readonly tool!: number

    showSpoolmanDialog = false

    get toolName(): string {
        return `T${this.tool}`
    }

    get selected(): boolean {
        return this.medusahcHighlight.selected === this.tool
    }

    get hasError(): boolean {
        return this.medusahcHighlight.errors.includes(this.tool)
    }

    get toolClasses() {
        return {
            'darken-3': this.$vuetify.theme.dark,
            'lighten-2': !this.$vuetify.theme.dark,
            'border-primary': this.selected,
            'border-error': this.hasError,
        }
    }

    get selectDisabled(): boolean {
        return (
            this.selected ||
            this.medusahcCurrentTool === this.tool ||
            this.printerIsPrinting ||
            this.medusahcOperation !== 'idle'
        )
    }

    get spool(): ServerSpoolmanStateSpool | null {
        return this.getMedusahcSpool(this.tool)
    }

    get spoolColor(): string {
        const hex = this.spool?.filament?.color_hex ?? this.getMedusahcToolMacro(this.tool).color ?? null
        if (!hex) return 'transparent'

        return hex.startsWith('#') ? hex : `#${hex}`
    }

    get spoolPercent(): number {
        const remaining = this.spool?.remaining_weight
        const initial = this.spool?.initial_weight ?? this.spool?.filament?.weight
        if (this.spool === null) return 0
        if (remaining === undefined || !initial) return 100

        return Math.round((remaining / initial) * 100)
    }

    get spoolHeadline(): string {
        const parts = [`#${this.spool?.id}`]
        const vendor = this.spool?.filament?.vendor?.name
        if (vendor) parts.push(vendor)

        return parts.join(' | ')
    }

    get filamentName(): string {
        return this.spool?.filament?.name ?? this.$t('Panels.MedusahcPanel.NoSpool').toString()
    }

    get materialOutput(): string {
        return this.spool?.filament?.material ?? '--'
    }

    get remainingWeightOutput(): string {
        const remaining = this.spool?.remaining_weight
        if (remaining === undefined) return ''

        return `${Math.round(remaining)} g`
    }

    get spoolWeightsOutput(): string {
        const remaining = Math.round(this.spool?.remaining_weight ?? 0)
        const used = Math.round(this.spool?.used_weight ?? 0)

        return this.$t('Panels.MedusahcPanel.WeightRemainingUsed', { remaining, used }).toString()
    }

    get extruderName(): string {
        return this.getMedusahcExtruderName(this.tool)
    }

    get extruder() {
        return this.$store.state.printer[this.extruderName] ?? {}
    }

    get target(): number {
        return Math.round(this.extruder.target ?? 0)
    }

    get temperatureOutput(): string {
        const temperature = this.extruder.temperature
        if (temperature === undefined) return '--'

        if (this.target > 0) return `${Math.round(temperature)} / ${this.target}°C`

        return `${Math.round(temperature)}°C`
    }

    get temperatureClasses() {
        return {
            'warning--text': this.target > 0,
            'text--secondary': this.target === 0,
        }
    }

    get presets(): MedusahcToolPreset[] {
        return this.getMedusahcToolPresets(this.tool)
    }

    isActivePreset(preset: MedusahcToolPreset): boolean {
        return this.target > 0 && this.target === Math.round(preset.temperature)
    }

    heat(temperature: number) {
        this.medusahcSend(`SET_HEATER_TEMPERATURE HEATER=${this.extruderName} TARGET=${temperature}`)
    }

    selectTool() {
        this.medusahcSend(this.toolName)
    }

    onSpoolClick() {
        if (!this.medusahcExistsSpoolman) return

        this.showSpoolmanDialog = true
    }
}
</script>

<style scoped>
.medusahc-tool {
    border-radius: 8px;
    box-sizing: border-box !important;
    border: 1px solid transparent;
    min-width: 0;
}

.filament-spool {
    max-width: 26px;
}

.tool-filament {
    min-width: 0;
    line-height: 1.3;
}

.tool-temperature {
    font-variant-numeric: tabular-nums;
}

.heat-group {
    border: thin solid rgba(255, 255, 255, 0.12);
    border-radius: 4px;
    overflow: hidden;
}

html.theme--light .heat-group {
    border-color: rgba(0, 0, 0, 0.12);
}

.heat-group .v-btn {
    border-radius: 0;
    min-width: 0 !important;
}

.heat-group .v-btn + .v-btn {
    border-left: thin solid rgba(255, 255, 255, 0.12);
}

html.theme--light .heat-group .v-btn + .v-btn {
    border-left-color: rgba(0, 0, 0, 0.12);
}

.heat-group .heat-active {
    color: var(--v-warning-base);
    background-color: rgba(255, 152, 0, 0.16);
}

.v-application .border-primary {
    border-color: var(--v-primary-base) !important;
}

.v-application .border-error {
    border-color: var(--v-error-base) !important;
}
</style>
