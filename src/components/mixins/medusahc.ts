import Vue from 'vue'
import Component from 'vue-class-component'
import { ServerSpoolmanStateSpool } from '@/store/server/spoolman/types'
import { GuiPresetsStatePreset } from '@/store/gui/presets/types'

// medusahc.current_tool uses -1 for "no hotend mounted" and -2 for "the dock
// sensors disagree", see klippy/extras/medusahc.py in the MedusaHC repository.
export const MEDUSAHC_NO_TOOL = -1
export const MEDUSAHC_SENSOR_ERROR = -2

export interface MedusahcHighlight {
    selected: number | null
    errors: number[]
}

// Exactly one hotend out of its dock with the toolhead sensor seeing it is the
// normal state. More than one out of the docks, or one out while the toolhead is
// empty, means a hotend is somewhere it should not be. Without dock sensors the
// mounted tool reported by MedusaHC is used instead.
export function computeMedusahcHighlight(
    tools: number[],
    sensors: Record<string, number>,
    currentTool: number
): MedusahcHighlight {
    const read = (name: string): number | null => (sensors[name] === undefined ? null : Number(sensors[name]))

    const hasDockSensors = tools.some((tool) => read(`t${tool}`) !== null)
    if (!hasDockSensors) return { selected: currentTool >= 0 ? currentTool : null, errors: [] }

    const out = tools.filter((tool) => read(`t${tool}`) === 0)
    if (out.length > 1) return { selected: null, errors: out }
    if (out.length === 0) return { selected: null, errors: [] }
    if (read('e') === 0) return { selected: null, errors: out }

    return { selected: out[0], errors: [] }
}

export interface MedusahcToolPreset {
    name: string
    temperature: number
}

@Component
export default class MedusahcMixin extends Vue {
    get medusahcExists(): boolean {
        return 'medusahc' in this.$store.state.printer
    }

    get medusahc() {
        return this.$store.state.printer.medusahc ?? {}
    }

    get medusahcCurrentTool(): number {
        const tool = Number(this.medusahc.current_tool ?? MEDUSAHC_NO_TOOL)

        return Number.isNaN(tool) ? MEDUSAHC_NO_TOOL : tool
    }

    get medusahcOperation(): string {
        return this.medusahc.operation ?? 'idle'
    }

    get medusahcLastError(): string {
        return this.medusahc.last_error ?? ''
    }

    get medusahcToolchanges(): number {
        return Number(this.medusahc.toolchanges ?? 0)
    }

    // Slicer's "total filament change" for the file being printed (Moonraker
    // metadata), or null when unknown.
    get medusahcToolchangesTotal(): number | null {
        const printer = this.$store.state.printer
        const file = printer.current_file ?? {}
        if (!file.filename || file.filename !== printer.print_stats?.filename) return null

        const total = file.filament_change_count
        return typeof total === 'number' ? total : null
    }

    get medusahcSensors(): Record<string, number> {
        return this.medusahc.sensors ?? {}
    }

    get medusahcTools(): number[] {
        const count = Number(this.medusahc.tool_count ?? 0)

        return [...Array(count).keys()]
    }

    // Hall sensor value, or null when that sensor is not configured.
    getMedusahcSensor(name: string): number | null {
        const value = this.medusahcSensors[name]

        return value === undefined ? null : Number(value)
    }

    get medusahcHighlight(): MedusahcHighlight {
        return computeMedusahcHighlight(this.medusahcTools, this.medusahcSensors, this.medusahcCurrentTool)
    }

    get medusahcExistsSpoolman(): boolean {
        return this.$store.state.server.components.includes('spoolman')
    }

    getMedusahcToolMacro(tool: number) {
        return this.$store.state.printer[`gcode_macro T${tool}`] ?? {}
    }

    getMedusahcExtruderName(tool: number): string {
        return tool === 0 ? 'extruder' : `extruder${tool}`
    }

    getMedusahcSpool(tool: number): ServerSpoolmanStateSpool | null {
        const spoolId = this.getMedusahcToolMacro(tool).spool_id ?? null
        if (spoolId === null) return null

        // active_spool is kept live via websocket, unlike the static spools list
        const activeSpool = this.$store.state.server.spoolman?.active_spool
        if (activeSpool?.id === spoolId) return activeSpool

        const spools: ServerSpoolmanStateSpool[] = this.$store.state.server.spoolman?.spools ?? []

        return spools.find((spool) => spool.id === spoolId) ?? null
    }

    // Mainsail temperature presets that set a nozzle temperature for this tool:
    // its own extruder entry when the preset has one, otherwise the generic one.
    getMedusahcToolPresets(tool: number): MedusahcToolPreset[] {
        const presets: GuiPresetsStatePreset[] = this.$store.getters['gui/presets/getPresets'] ?? []
        const extruder = this.getMedusahcExtruderName(tool)

        return presets.flatMap((preset) => {
            const entry = preset.values[extruder]?.bool ? preset.values[extruder] : preset.values.extruder
            if (!entry?.bool) return []

            return [{ name: preset.name, temperature: Number(entry.value) }]
        })
    }

    medusahcSend(gcode: string) {
        this.$store.dispatch('server/addEvent', { message: gcode, type: 'command' })
        this.$socket.emit('printer.gcode.script', { script: gcode })
    }
}
