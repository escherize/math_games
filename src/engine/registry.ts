import type { GameDefinition } from './types'
import { kakooma } from '../games/kakooma'

export const games: GameDefinition[] = [kakooma]

export function findGame(id: string): GameDefinition | undefined {
  return games.find((g) => g.id === id)
}
