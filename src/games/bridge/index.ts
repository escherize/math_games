import type { Cartridge } from '../../engine/cartridge'
import { mountBridge } from './game'
import { bridgeRules, type BridgeRules } from './rules'

export const bridge: Cartridge<BridgeRules> = {
  id: 'bridge',
  title: 'Bridge to Ten',
  tagline: 'Slide dots across until the first ten-frame is full: 8 + 6 becomes 10 + 4.',
  skill: 'number-bonds',
  rules: bridgeRules,
  prompt: (r) =>
    r.askTotal ? 'Fill the first ten-frame, then tap how many there are in all.' : 'Slide dots across until the first ten-frame is full.',
  mount: mountBridge,
}
