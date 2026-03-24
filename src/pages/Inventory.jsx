import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ingredients, Recipes, InventoryMovements, Products } from '../api/entities'
import { toast } from 'sonner'

const UNITS = ['unidad', 'kg', 'g', 'litro', 'ml', 'lb', 'oz', 'taza', 'cucharada', 'paquete', 'caja', 'botella', 'lata']

const today = new Date().toISOString().split('T')[0]

// % consumido — siempre entre 0 y 100, nunca negativo
const consumedPct = (ing) => {
  if (!ing.opening_stock || ing.opening_stock === 0) return 0
  const pct = ((ing.opening_stock - ing.stock) / ing.opening_stock) * 100
  return Math.max(0, Math.min(100, pct))
}

// Alertas basadas en consumo del día
const stockAlert = (ing) => {
  if (!ing.opening_stock || ing.opening_stock === 0 || ing.opening_date !== today) return false
  const pct = consumedPct(ing)
  return pct >= 80
}

const stockWarning = (ing) => {
  if (!ing.opening_stock || ing.opening_stock === 0 || ing.opening_date !== today) return false
  const pct = consumedPct(ing)
  return pct >= 60 && pct < 80
}

// ─── Modal ingrediente ────────────────────────────────────────────────────────
function IngredientModal({ open, onClose, ingredient }) {
  const queryClient = useQueryClient()
  const isEdit = !!ingredient

  const [name, setName]   = useState(ingredient?.name || '')
  const [unit, setUnit]   = useState(ingredient?.unit || 'unidad')
  const [stock, setStock] = useState(ingredient?.stock?.toString() || '0')
  const [cost, setCost]   = useState(ingredient?.cost_per_unit?.toString() || '0')

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit ? Ingredients.update(ingredient.id, data) : Ingredients.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      toast.success(isEdit ? 'Ingrediente actualizado' : 'Ingrediente creado')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    saveMutation.mutate({
      name: name.trim(),
      unit,
      stock: parseFloat(stock) || 0,
      cost_per_unit: parseFloat(cost) || 0,
    })
  }

  if (!open) return null
  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>{isEdit ? 'Editar Ingrediente' : 'Nuevo Ingrediente'}</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={fieldWrap}>
          <label style={lbl}>Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Tomate, Pollo, Aceite..." style={inp} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Unidad de medida</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={inp}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Costo por unidad ($)</label>
            <input type="number" min="0" step="0.01" value={cost} onChange={e => setCost(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={fieldWrap}>
          <label style={lbl}>Stock actual</label>
          <input type="number" min="0" step="0.01" value={stock} onChange={e => setStock(e.target.value)} style={inp} />
          <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>
            💡 Cada mañana el chef registra la apertura del día para monitorear el consumo.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>Cancelar</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={saveBtn}>
            {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal ajuste de stock ────────────────────────────────────────────────────
function StockAdjustModal({ open, onClose, ingredient }) {
  const queryClient = useQueryClient()
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
        notes: notes || (type === 'purchase' ? 'Compra / reposición' : 'Ajuste manual'),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] })
      toast.success('Stock actualizado')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  if (!open || !ingredient) return null
  return (
    <div style={overlay}>
      <div style={{ ...modal, maxWidth: 400 }}>
        <div style={modalHeader}>
          <h2 style={modalTitle}>Ajustar Stock — {ingredient.name}</h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[
            { value: 'purchase',   label: '📦 Compra / entrada' },
            { value: 'adjustment', label: '✏️ Ajuste manual' },
          ].map(t => (
            <button key={t.value} onClick={() => setType(t.value)} style={{
              flex: 1, padding: '8px', borderRadius: 8,
              border: `2px solid ${type === t.value ? '#1d9e75' : '#e5e7eb'}`,
              background: type === t.value ? '#f0fdf4' : 'white',
              cursor: 'pointer', fontSize: 13, fontWeight: 500,
              color: type === t.value ? '#166534' : '#374151',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#374151' }}>
          Stock actual: <strong>{ingredient.stock} {ingredient.unit}</strong>
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
          <label style={lbl}>Cantidad ({ingredient.unit})</label>
          <input type="number" min="0" step="0.01" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.00" style={inp} autoFocus />
        </div>

        <div style={fieldWrap}>
          <label style={lbl}>Notas</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Proveedor, razón del ajuste..." style={inp} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>Cancelar</button>
          <button onClick={() => adjMutation.mutate()} disabled={!qty || adjMutation.isPending} style={saveBtn}>
            {adjMutation.isPending ? 'Guardando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal recetas de un producto ─────────────────────────────────────────────
function RecipeModal({ open, onClose, product, ingredients }) {
  const queryClient = useQueryClient()
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
    mutationFn: () => Recipes.create({
      product_id:    product.id,
      ingredient_id: newIngId,
      quantity:      parseFloat(newQty),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes', product?.id] })
      setNewIngId(''); setNewQty('')
      toast.success('Ingrediente agregado a la receta')
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
            <h2 style={modalTitle}>Receta — {product.name}</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Ingredientes necesarios por porción</p>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {recipeItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#9ca3af', fontSize: 13 }}>
            Sin ingredientes definidos aún
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
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#166534' }}>+ Agregar ingrediente</p>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: 8, alignItems: 'end' }}>
              <div>
                <label style={lbl}>Ingrediente</label>
                <select value={newIngId} onChange={e => setNewIngId(e.target.value)} style={inp}>
                  <option value="">Seleccionar...</option>
                  {available.map(i => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Cantidad</label>
                <input type="number" min="0" step="0.01" value={newQty} onChange={e => setNewQty(e.target.value)} placeholder="0.00" style={inp} />
              </div>
              <button
                onClick={() => addMutation.mutate()}
                disabled={!newIngId || !newQty || addMutation.isPending}
                style={{ ...saveBtn, padding: '9px 14px' }}
              >
                Agregar
              </button>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>Todos los ingredientes ya están en la receta</p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={saveBtn}>Listo</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function InventoryPage() {
  const [tab, setTab]               = useState('ingredients')
  const [ingModalOpen, setIngModal] = useState(false)
  const [editIng, setEditIng]       = useState(null)
  const [adjustIng, setAdjustIng]   = useState(null)
  const [recipeProduct, setRecipeProd] = useState(null)
  const [search, setSearch]         = useState('')

  const queryClient = useQueryClient()

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

  // ── Apertura del día ──────────────────────────────────────────────────────
  const aperturaHecha = ingredients.length > 0 && ingredients.every(i => i.opening_date === today)

  const aperturaMutation = useMutation({
    mutationFn: async () => {
      for (const ing of ingredients) {
        await Ingredients.update(ing.id, {
          opening_stock: ing.stock,
          opening_date:  today,
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      toast.success('✅ Apertura registrada con stock actual')
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const deleteIng = useMutation({
    mutationFn: (id) => Ingredients.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      toast.success('Ingrediente eliminado')
    },
  })

  const alerts   = ingredients.filter(stockAlert)
  const warnings = ingredients.filter(stockWarning)

  const filteredIng = ingredients.filter(i =>
    i.name?.toLowerCase().includes(search.toLowerCase())
  )

  const openNewIng  = () => { setEditIng(null); setIngModal(true) }
  const openEditIng = (i) => { setEditIng(i);   setIngModal(true) }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>Inventario</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
            {ingredients.length} ingredientes · {products.length} productos en menú
          </p>
        </div>
        {tab === 'ingredients' && (
          <button onClick={openNewIng} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            + Nuevo Ingrediente
          </button>
        )}
      </div>

      {/* ── Banner apertura del día ── */}
      {tab === 'ingredients' && ingredients.length > 0 && (
        aperturaHecha ? (
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <span style={{ fontSize: 13, color: '#166534' }}>✅ Apertura del día registrada — monitoreando consumo en tiempo real</span>
            <button
              onClick={() => aperturaMutation.mutate()}
              disabled={aperturaMutation.isPending}
              style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #1d9e75', background: 'white', color: '#166534', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {aperturaMutation.isPending ? 'Actualizando...' : '🔄 Re-registrar con stock actual'}
            </button>
          </div>
        ) : (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '14px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#1e40af', fontSize: 14 }}>📋 Registrar apertura del día</p>
              <p style={{ margin: '3px 0 0', fontSize: 13, color: '#3b82f6' }}>
                Guarda el stock actual como referencia. Alertará al consumir el 60% (⚠️) y 80% (🚨).
              </p>
            </div>
            <button
              onClick={() => aperturaMutation.mutate()}
              disabled={aperturaMutation.isPending}
              style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}
            >
              {aperturaMutation.isPending ? 'Guardando...' : '✓ Registrar apertura'}
            </button>
          </div>
        )
      )}

      {/* ── Alertas de consumo ── */}
      {alerts.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#991b1b', fontSize: 14 }}>
            🚨 {alerts.length} ingrediente{alerts.length !== 1 ? 's' : ''} — consumo crítico (80%+)
          </p>
          {alerts.map(a => (
            <p key={a.id} style={{ margin: '2px 0', fontSize: 13, color: '#ef4444' }}>
              • <strong>{a.name}</strong>: quedan {a.stock} {a.unit} de {a.opening_stock} iniciales ({Math.round(consumedPct(a))}% consumido)
            </p>
          ))}
        </div>
      )}
      {warnings.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#92400e', fontSize: 14 }}>
            ⚠️ {warnings.length} ingrediente{warnings.length !== 1 ? 's' : ''} — consumo elevado (60–80%)
          </p>
          {warnings.map(w => (
            <p key={w.id} style={{ margin: '2px 0', fontSize: 13, color: '#d97706' }}>
              • <strong>{w.name}</strong>: quedan {w.stock} {w.unit} de {w.opening_stock} iniciales ({Math.round(consumedPct(w))}% consumido)
            </p>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#f3f4f6', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { value: 'ingredients', label: '🥩 Ingredientes' },
          { value: 'recipes',     label: '📋 Recetas' },
          { value: 'history',     label: '📦 Historial' },
        ].map(t => (
          <button key={t.value} onClick={() => setTab(t.value)} style={{
            padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t.value ? 'white' : 'transparent',
            color: tab === t.value ? '#111' : '#6b7280',
            boxShadow: tab === t.value ? '0 1px 4px rgba(0,0,0,.1)' : 'none',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB: INGREDIENTES ── */}
      {tab === 'ingredients' && (
        <>
          <input
            placeholder="🔍 Buscar ingrediente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, marginBottom: 16, maxWidth: 400 }}
          />
          {loadIng ? <p style={{ color: '#6b7280' }}>Cargando...</p> :
           filteredIng.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🥩</p>
              <p style={{ margin: 0 }}>{ingredients.length === 0 ? 'No hay ingredientes. ¡Agrega el primero!' : 'Sin resultados'}</p>
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
                        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#6b7280' }}>{ing.unit} · ${ing.cost_per_unit?.toFixed(2)}/und</p>
                      </div>
                      {isAlert   && <span style={{ fontSize: 18 }}>🚨</span>}
                      {isWarning && !isAlert && <span style={{ fontSize: 18 }}>⚠️</span>}
                    </div>

                    {/* Barra de consumo */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                        <span>Stock: <strong style={{ color: isAlert ? '#ef4444' : isWarning ? '#f59e0b' : '#111' }}>{ing.stock} {ing.unit}</strong></span>
                        {hasOpening
                          ? <span style={{ color: barColor, fontWeight: 600 }}>{Math.round(pct)}% consumido hoy</span>
                          : <span style={{ color: '#9ca3af' }}>Sin apertura hoy</span>
                        }
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width .3s' }} />
                      </div>
                      {hasOpening && (
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>
                          Apertura: {ing.opening_stock} {ing.unit}
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setAdjustIng(ing)} style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: '1px solid #1d9e75', background: '#f0fdf4', color: '#166534', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        📦 Ajustar stock
                      </button>
                      <button onClick={() => openEditIng(ing)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                      <button onClick={() => { if (confirm(`¿Eliminar ${ing.name}?`)) deleteIng.mutate(ing.id) }} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── TAB: RECETAS ── */}
      {tab === 'recipes' && (
        <div>
          <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 16 }}>
            Haz clic en un producto para definir qué ingredientes y cantidades usa por porción. Al crearse una orden, el stock se descontará automáticamente.
          </p>
          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>🍽️</p>
              <p>Agrega productos en el Menú primero</p>
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
                  <p style={{ margin: '8px 0 0', fontSize: 12, color: '#6b7280' }}>Clic para definir receta →</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: HISTORIAL ── */}
      {tab === 'history' && (
        <div>
          {loadMov ? <p style={{ color: '#6b7280' }}>Cargando...</p> :
           movements.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: 32, margin: '0 0 8px' }}>📦</p>
              <p>No hay movimientos registrados aún</p>
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
                          {m.notes || (isSale ? 'Venta' : isPurchase ? 'Compra' : 'Ajuste')}
                          {' · '}{new Date(m.created_at).toLocaleDateString('es-PA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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

      {/* Modales */}
      <IngredientModal
        open={ingModalOpen}
        onClose={() => { setIngModal(false); setEditIng(null) }}
        ingredient={editIng}
      />
      {adjustIng && (
        <StockAdjustModal
          open={!!adjustIng}
          onClose={() => setAdjustIng(null)}
          ingredient={adjustIng}
        />
      )}
      {recipeProduct && (
        <RecipeModal
          open={!!recipeProduct}
          onClose={() => setRecipeProd(null)}
          product={recipeProduct}
          ingredients={ingredients}
        />
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
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