import { describe, expect, it } from 'vitest'
import { computeMedusahcHighlight } from '@/components/mixins/medusahc'

const TOOLS = [0, 1, 2, 3, 4, 5]
const allDocked = { t0: 1, t1: 1, t2: 1, t3: 1, t4: 1, t5: 1 }

describe('computeMedusahcHighlight', () => {
    it('selects the one tool out of its dock when the toolhead detects it', () => {
        expect(computeMedusahcHighlight(TOOLS, { ...allDocked, t0: 0, e: 1 }, 0)).toEqual({
            selected: 0,
            errors: [],
        })
    })

    it('flags every tool out of its dock when more than one is out', () => {
        expect(computeMedusahcHighlight(TOOLS, { ...allDocked, t1: 0, t3: 0, e: 1 }, -2)).toEqual({
            selected: null,
            errors: [1, 3],
        })
    })

    it('flags a tool that is out of its dock while the toolhead is empty', () => {
        expect(computeMedusahcHighlight(TOOLS, { ...allDocked, t2: 0, e: 0 }, -2)).toEqual({
            selected: null,
            errors: [2],
        })
    })

    it('highlights nothing when every tool is docked', () => {
        expect(computeMedusahcHighlight(TOOLS, { ...allDocked, e: 0 }, -1)).toEqual({ selected: null, errors: [] })
    })

    it('trusts the dock sensor alone when there is no toolhead sensor', () => {
        expect(computeMedusahcHighlight(TOOLS, { ...allDocked, t4: 0 }, 4)).toEqual({ selected: 4, errors: [] })
    })

    it('falls back to the mounted tool when no dock sensors are configured', () => {
        expect(computeMedusahcHighlight(TOOLS, {}, 1)).toEqual({ selected: 1, errors: [] })
        expect(computeMedusahcHighlight(TOOLS, {}, -1)).toEqual({ selected: null, errors: [] })
    })
})
