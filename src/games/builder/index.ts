import type { Cartridge } from '../../engine/cartridge'
import { mountBuilder } from './game'
import { builderRules, type BuilderRules } from './rules'

export const builder: Cartridge<BuilderRules> = {
  id: 'builder',
  title: 'Bond Builder',
  tagline: 'Part, part, whole. Fill every blank from the tray so each triangle adds up.',
  skill: 'number-bonds',
  rules: builderRules,
  prompt: (r) => (r.triangles === 1 ? 'Drag the tile that completes the triangle.' : 'Drag every tile into a blank so each triangle adds up.'),
  mount: mountBuilder,
}
