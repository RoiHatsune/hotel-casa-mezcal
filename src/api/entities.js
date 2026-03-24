import { supabase } from './supabase'

export const Products = {
  list: () => supabase.from('products').select('*').order('name'),
  create: (data) => supabase.from('products').insert(data).select().single(),
  update: (id, data) => supabase.from('products').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('products').delete().eq('id', id),
  filter: (filters) => supabase.from('products').select('*').match(filters),
}

export const Orders = {
  list: () => supabase.from('orders').select('*').order('created_at', { ascending: false }),
  create: (data) => supabase.from('orders').insert(data).select().single(),
  update: (id, data) => supabase.from('orders').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('orders').delete().eq('id', id),
  filter: (filters) => supabase.from('orders').select('*').match(filters),
}

export const Rooms = {
  list: () => supabase.from('rooms').select('*').order('room_number'),
  create: (data) => supabase.from('rooms').insert(data).select().single(),
  update: (id, data) => supabase.from('rooms').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('rooms').delete().eq('id', id),
  filter: (filters) => supabase.from('rooms').select('*').match(filters),
}

export const Reservations = {
  list: () => supabase.from('reservations').select('*').order('check_in'),
  create: (data) => supabase.from('reservations').insert(data).select().single(),
  update: (id, data) => supabase.from('reservations').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('reservations').delete().eq('id', id),
}

export const Discounts = {
  list: () => supabase.from('discounts').select('*').order('name'),
  create: (data) => supabase.from('discounts').insert(data).select().single(),
  update: (id, data) => supabase.from('discounts').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('discounts').delete().eq('id', id),
  filter: (filters) => supabase.from('discounts').select('*').match(filters),
}

export const AppUsers = {
  list: () => supabase.from('app_users').select('*').order('full_name'),
  create: (data) => supabase.from('app_users').insert(data).select().single(),
  update: (id, data) => supabase.from('app_users').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('app_users').delete().eq('id', id),
}

export const DayPasses = {
  list: () => supabase.from('day_passes').select('*').order('created_at', { ascending: false }),
  create: (data) => supabase.from('day_passes').insert(data).select().single(),
  update: (id, data) => supabase.from('day_passes').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('day_passes').delete().eq('id', id),
  filter: (filters) => supabase.from('day_passes').select('*').match(filters),
}

export const Ingredients = {
  list: () => supabase.from('ingredients').select('*').order('name'),
  create: (data) => supabase.from('ingredients').insert(data).select().single(),
  update: (id, data) => supabase.from('ingredients').update(data).eq('id', id).select().single(),
  delete: (id) => supabase.from('ingredients').delete().eq('id', id),
}

export const Recipes = {
  list: () => supabase.from('recipes').select('*, ingredients(*), products(*)').order('created_at'),
  byProduct: (productId) => supabase.from('recipes').select('*, ingredients(*)').eq('product_id', productId),
  create: (data) => supabase.from('recipes').insert(data).select().single(),
  delete: (id) => supabase.from('recipes').delete().eq('id', id),
}

export const InventoryMovements = {
  list: () => supabase.from('inventory_movements').select('*, ingredients(name, unit)').order('created_at', { ascending: false }),
  create: (data) => supabase.from('inventory_movements').insert(data).select().single(),
}