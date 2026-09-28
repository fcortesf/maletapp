import type { components as Trips } from './generated/trip'
import type { components as Items } from './generated/item'
export type Trip = Trips['schemas']['Trip']
export type NewTrip = Omit<Trips['schemas']['NewTrip'], 'id' | 'isFinished'>
export type Item = Items['schemas']['Item']
export type NewItem = Items['schemas']['NewItem']
export type PatchItem = Items['schemas']['PatchItem']
export type Category = Item['category']
export const categories: Category[] = ['documents', 'clothing', 'toiletries', 'electronics', 'health', 'accessories', 'other']
