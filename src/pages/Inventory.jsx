import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ingredients, Recipes, InventoryMovements, Products } from '../api/entities'
import { toast } from 'sonner'
import { useTranslation } from '../i18n/useTranslation'

const UNITS = ['unidad', 'kg', 'g', 'litro', 'ml', 'lb', 'oz', 'taza', 'cucharada', 'paquete', 'caja', 'botella', 'lata']

const consumedPct = (ing) => {
  if (!ing.opening_stock || ing.opening_stock === 0) return 0
  return Math.max(0, Math.min(100, ((ing.opening_stock - ing.stock) / ing.opening_stock) * 100))
}

const getTodayLocal = () => new Date().toLocaleDateString('en-CA')

const stockAlert = (ing) => {
  const today = getTodayLocal()
  if (!ing.opening_stock || ing.opening_stock === 0 || ing.opening_date !== today) return false
  return consumedPct(ing) >= 80
}

const stockWarning = (ing) => {
  const today = getTodayLocal()
  if (!ing.opening_stock || ing.opening_stock === 0 || ing.opening_date !== today) return false
  const pct = consumedPct(ing)
  return pct >= 60 && pct < 80
}

function IngredientModal({ open, onClose, ingredient }) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const isEdit = !!ingredient

  const [name, setName]   = useState(ingredient?.name || '')
  const [unit, setUnit]   = useState(ingredient?.unit || 'unidad')
  const [stock, setStock] = useState(ingredient?.stock?.toString() || '0')
  const [cost, setCost]   = useState(ingredient?.cost_per_unit?.toString() || '0')

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? Ingredients.update(ingredient.id, data) : Ingredients.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      toast.success(isEdit ? 'Updated' : 'Created')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (!name.trim()) return toast.error('Name is required')
    saveMutation.mutate({ name: name.trim(), unit, stock: parseFloat(stock) || 0, cost_per_unit: parseFloat(cost) || 0 })
  }

  if (!open) return null
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>{isEdit ? t('inventory_modal_edit') : t('inventory_modal_new')}</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={fieldWrap}>
          <label style={lbl}>{t('inventory_name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('inventory_name_ph')} style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>{t('inventory_unit')}</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={inp}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>{t('inventory_cost')}</label>
            <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={fieldWrap}>
          <label style={lbl}>{t('inventory_stock_lbl')}</label>
          <input type="number" min="0" step="0.01" value={stock} onChange={e => setStock(e.target.value)} style={inp} />
          <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>💡 {t('inventory_hint')}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>{t('inventory_cancel')}</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={saveBtn}>
            {saveMutation.isPending ? t('inventory_saving') : t('save')}
          </button>
        </div>
      </div>
    </div>
  )
}

function StockAdjustModal({ open, onClose, ingredient }) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [type, setType]   = useState('purchase')
  const [qty, setQty]     = useState('')
  const [notes, setNotes] = useState('')

  const adjMutation = useMutation({
    mutationFn: async () => {
      const delta    = type === 'purchase' ? Math.abs(parseFloat(qty)) : -Math.abs(parseFloat(qty))
      const newStock = Math.max(0, (ingredient.stock || 0) + delta)
      await Ingredients.update(ingredient.id, { stock: newStock })
      await InventoryMovements.create({
        ingredient_id: ingredient.id,
        type,
        quantity: parseFloat(qty),
        notes: notes || (type === 'purchase' ? 'Purchase / restock' : 'Manual adjustment'),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] })
      toast.success('Stock updated')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  if (!open || !ingredient) return null
  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 400 }}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>{t('inventory_adjust_title')} — {ingredient.name}</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { value: 'purchase',   label: t('inventory_purchase') },
            { value: 'adjustment', label: t('inventory_adjustment') },
          ].map(tp => (
            <button key={tp.value} onClick={() => setType(tp.value)} style={{
              flex: 1, padding: '8px', borderRadius: 8,
              border: `2px solid ${type === tp.value ? '#1d9e75' : '#e5e7eb'}`,
              background: type === tp.value ? '#f0fdf4' : 'white',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              color: type === tp.value ? '#166534' : '#374151',
            }}>{tp.label}</button>
          ))}
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#374151' }}>
          {t('inventory_current')} <strong>{ingredient.stock} {ingredient.unit}</strong>
          {parseFloat(qty) > 0 && (
            <span style={{ marginLeft: 10, color: '#1d9e75', fontWeight: 600 }}>
              → {type === 'purchase'
                ? (ingredient.stock + parseFloat(qty)).toFixed(2)
                : Math.max(0, ingredient.stock - parseFloat(qty)).toFixed(2)
              } {ingredient.unit}
            </span>
          )}
        </div>
        <div style={fieldWrap}>
          <label style={lbl}>{t('inventory_qty')} ({ingredient.unit})</label>
          <input type="number" min="0" step="0.01" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.00" style={inp} autoFocus />
        </div>
        <div style={fieldWrap}>
          <label style={lbl}>{t('inventory_notes')}</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('inventory_notes_ph')} style={inp} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>{t('inventory_cancel')}</button>
          <button onClick={() => adjMutation.mutate()} disabled={!qty || adjMutation.isPending} style={saveBtn}>
            {adjMutation.isPending ? t('inventory_saving') : t('inventory_apply')}
          </button>
        </div>
      </div>
    </div>
  )
}

function RecipeModal({ open, onClose, product, ingredients }) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [newIngId, setNewIngId] = useState('')
  const [newQty, setNewQty]     = useState('')

  const { data: recipeItems = [] } = useQuery({
    queryKey: ['recipes', product?.id],
    queryFn: async () => {
      if (!product?.id) return []
      const { data } = await Recipes.byProduct(product.id)
      return data || []
    },
    enabled: !!product?.id,
  })

  const addMutation = useMutation({
    mutationFn: () => Recipes.create({ product_id: product.id, ingredient_id: newIngId, quantity: parseFloat(newQty) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', product?.id] })
      setNewIngId(''); setNewQty('')
      toast.success('Added to recipe')
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const removeMutation = useMutation({
    mutationFn: (id) => Recipes.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes', product?.id] }),
  })

  if (!open || !product) return null

  const usedIds   = recipeItems.map(r => r.ingredient_id)
  const available = ingredients.filter(i => !usedIds.includes(i.id))

  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 520 }}>
        <div style={modalHeader}>
          <div>
            <h2 style={modalTitle}>Recipe — {product.name}</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Ingredients per serving</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        {recipeItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
            {t('inventory_no_recipe')}
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            {recipeItems.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 6, background: '#f8fafc' }}>
                <div>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{r.ingredients?.name}</span>
                  <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>{r.quantity} {r.ingredients?.unit}</span>
                </div>
                <button onClick={() => removeMutation.mutate(r.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}>✕</button>
              </div>
            ))}
          </div>
        )}
        {available.length > 0 ? (
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#166534' }}>{t('inventory_add_ing')}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, alignItems: 'end' }}>
              <div>
                <label style={lbl}>{t('inventory_ingredient')}</label>
                <select value={newIngId} onChange={e => setNewIngId(e.target.value)} style={inp}>
                  <option value="">{t('inventory_select_ing')}</option>
                  {available.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>{t('inventory_quantity')}</label>
                <input type="number" min="0" step="0.01" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="0.00" style={inp} />
              </div>
              <button onClick={() => addMutation.mutate()} disabled={!newIngId || !newQty || addMutation.isPending}
                style={{ ...saveBtn, padding: '9px 14px' }}>{t('inventory_add_btn')}</button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>{t('inventory_all_added')}</p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={saveBtn}>{t('inventory_done')}</button>
        </div>
      </div>
    </div>
  )
}

export default function InventoryPage() {
  const { t } = useTranslation()
  const [tab, setTab]               = useState('ingredients')
  const [ingModalOpen, setIngModal] = useState(false)
  const [editIng, setEditIng]       = useState(null)
  const [adjustIng, setAdjustIng]   = useState(null)
  const [recipeProduct, setRecipeProd] = useState(null)
  const [search, setSearch]         = useState('')
  const queryClient = useQueryClient()

  const today = getTodayLocal()

  const { data: ingredients = [], isLoading: loadIng } = useQuery({
    queryKey: ['ingredients'],
    queryFn: async () => { const { data } = await Ingredients.list(); return data || [] },
  })
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await Products.list(); return data || [] },
  })
  const { data: movements = [], isLoading: loadMov } = useQuery({
    queryKey: ['inventory_movements'],
    queryFn: async () => { const { data } = await InventoryMovements.list(); return data || [] },
    enabled: tab === 'history',
  })

  const aperturaHecha = ingredients.length > 0 && ingredients.every(i => i.opening_date === today)

  const aperturaMutation = useMutation({
    mutationFn: async () => {
      for (const ing of ingredients) {
        await Ingredients.update(ing.id, { opening_stock: ing.stock, opening_date: today })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      toast.success(t('inventory_apertura_ok'))
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const deleteIng = useMutation({
    mutationFn: (id) => Ingredients.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredients'] }); toast.success('Deleted') },
  })

  const alerts      = ingredients.filter(stockAlert)
  const warnings    = ingredients.filter(stockWarning)
  const filteredIng = ingredients.filter(i => i.name?.toLowerCase().includes(search.toLowerCase()))

  const openNewIng  = () => { setEditIng(null); setIngModal(true) }
  const openEditIng = (i) => { setEditIng(i);   setIngModal(true) }

  const tabs = [
    { value: 'ingredients', label: t('inventory_tab_ing') },
    { value: 'recipes',     label: t('inventory_tab_recipes') },
    { value: 'history',     label: t('inventory_tab_history') },
  ]

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>{t('inventory_title')}</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
            {ingredients.length} {t('inventory_subtitle_a')} · {products.length} {t('inventory_subtitle_b')}
          </p>
        </div>
        {tab === 'ingredients' && (
          <button onClick={openNewIng} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {t('inventory_new')}
          </button>
        )}
      </div>

      {/* Apertura banner */}
      {tab === 'ingredients' && ingredients.length > 0 && (
        aperturaHecha ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#166534' }}>{t('inventory_apertura_ok')}</span>
            <button onClick={() => aperturaMutation.mutate()} disabled={aperturaMutation.isPending}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #1d9e75', background: 'white', color: '#166634', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
              {aperturaMutation.isPending ? t('saving') : t('inventory_reregister')}
            </button>
          </div>
        ) : (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#1e40af', fontSize: 14 }}>{t('inventory_apertura')}</p>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#3b82f6' }}>{t('inventory_apertura_sub')}</p>
            </div>
            <button onClick={() => aperturaMutation.mutate()} disabled={aperturaMutation.isPending}
              style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
              {aperturaMutation.isPending ? t('saving') : t('inventory_apertura_btn')}
            </button>
          </div>
        )
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#991b1b', fontSize: 14 }}>
            🚨 {alerts.length} {alerts.length !== 1 ? t('inventory_alert_critical_pl') : t('inventory_alert_critical')}
          </p>
          {alerts.map(a => (
            <p key={a.id} style={{ margin: '2px 0', fontSize: 13, color: '#ef4444' }}>
              • <strong>{a.name}</strong>: {a.stock} {a.unit} / {a.opening_stock} ({Math.round(consumedPct(a))}% {t('inventory_consumed')})
            </p>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#92400e', fontSize: 14 }}>
            ⚠️ {warnings.length} {warnings.length !== 1 ? t('inventory_alert_warn_pl') : t('inventory_alert_warn')}
          </p>
          {warnings.map(w => (
            <p key={w.id} style={{ margin: '2px 0', fontSize: 13, color: '#d97706' }}>
              • <strong>{w.name}</strong>: {w.stock} {w.unit} / {w.opening_stock} ({Math.round(consumedPct(w))}% {t('inventory_consumed')})
            </p>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {tabs.map(tb => (
          <button key={tb.value} onClick={() => setTab(tb.value)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === tb.value ? 'white' : 'transparent',
            color: tab === tb.value ? '#111' : '#6b7280',
            boxShadow: tab === tb.value ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
          }}>{tb.label}</button>
        ))}
      </div>

      {/* Ingredients tab */}
      {tab === 'ingredients' && (
        <>
          <input placeholder={t('inventory_search')} value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inp, marginBottom: 16, maxWidth: 400 }} />
          {loadIng ? <p style={{ color: '#6b7280' }}>{t('loading')}</p> :
           filteredIng.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🥩</p>
              <p style={{ margin: 0 }}>{ingredients.length === 0 ? t('inventory_no_ing') : t('inventory_no_results')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filteredIng.map(ing => {
                const isAlert    = stockAlert(ing)
                const isWarning  = stockWarning(ing)
                const pct        = consumedPct(ing)
                const barColor   = isAlert ? '#ef4444' : isWarning ? '#f59e0b' : '#1d9e75'
                const hasOpening = ing.opening_stock > 0 && ing.opening_date === today
                return (
                  <div key={ing.id} style={{ background: 'white', borderRadius: 14, border: `1px solid ${isAlert ? '#fecaca' : isWarning ? '#fde68a' : '#e5e7eb'}`, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>{ing.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{ing.unit} · ${ing.cost_per_unit?.toFixed(2)}/unit</p>
                      </div>
                      {isAlert   && <span style={{ fontSize: 18 }}>🚨</span>}
                      {isWarning && !isAlert && <span style={{ fontSize: 18 }}>⚠️</span>}
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                        <span>{t('inventory_stock')} <strong style={{ color: isAlert ? '#ef4444' : isWarning ? '#f59e0b' : '#111' }}>{ing.stock} {ing.unit}</strong></span>
                        {hasOpening
                          ? <span style={{ color: barColor, fontWeight: 600 }}>{Math.round(pct)}% {t('inventory_consumed')}</span>
                          : <span style={{ color: '#9ca3af' }}>{t('inventory_no_apertura')}</span>
                        }
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width .3s' }} />
                      </div>
                      {hasOpening && (
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>
                          {t('inventory_opening')} {ing.opening_stock} {ing.unit}
                        </p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setAdjustIng(ing)} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #1d9e75', background: '#f0fdf4', color: '#166534', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        {t('inventory_adjust')}
                      </button>
                      <button onClick={() => openEditIng(ing)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                      <button onClick={() => { if (confirm(`${t('inventory_delete_q')} ${ing.name}?`)) deleteIng.mutate(ing.id) }}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Recipes tab */}
      {tab === 'recipes' && (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>{t('inventory_recipes_sub')}</p>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🍽️</p>
              <p>{t('inventory_no_products')}</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
              {products.map(p => (
                <div key={p.id}
                  style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px', cursor: 'pointer', transition: 'box-shadow .2s' }}
                  onClick={() => setRecipeProd(p)}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,.08)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
                >
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>{p.name}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#1d9e75', fontWeight: 600 }}>${p.price?.toFixed(2)}</p>
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>{t('inventory_click_recipe') || 'Click to define recipe →'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* History tab */}
      {tab === 'history' && (
        <div>
          {loadMov ? <p style={{ color: '#6b7280' }}>{t('loading')}</p> :
           movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>📦</p>
              <p>{t('inventory_no_moves')}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {movements.map(m => {
                const isSale     = m.type === 'sale'
                const isPurchase = m.type === 'purchase'
                return (
                  <div key={m.id} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ fontSize: 20 }}>{isSale ? '🍽️' : isPurchase ? '📦' : '✏️'}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: '#111' }}>{m.ingredients?.name}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>
                          {m.notes || (isSale ? t('inventory_sale') : isPurchase ? t('inventory_buy') : t('inventory_adj'))}
                          {' · '}{new Date(m.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: isSale ? '#ef4444' : '#1d9e75' }}>
                      {isSale ? '-' : '+'}{m.quantity} {m.ingredients?.unit}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      <IngredientModal open={ingModalOpen} onClose={() => { setIngModal(false); setEditIng(null) }} ingredient={editIng} />
      {adjustIng && <StockAdjustModal open={!!adjustIng} onClose={() => setAdjustIng(null)} ingredient={adjustIng} />}
      {recipeProduct && <RecipeModal open={!!recipeProduct} onClose={() => setRecipeProd(null)} product={recipeProduct} ingredients={ingredients} />}
    </div>
  )
}

const overlay     = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }
const modal       = { background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }
const modalHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }
const modalTitle  = { margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }
const inp         = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', background: 'white' }
const lbl         = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const fieldWrap   = { marginBottom: 16 }
const closeBtn    = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }
const cancelBtn   = { padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const saveBtn     = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }