import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Products } from '../api/entities'
import { toast } from 'sonner'

// ─── Categorías ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'appetizer',   label: 'Entradas' },
  { value: 'main_course', label: 'Platos Fuertes' },
  { value: 'dessert',     label: 'Postres' },
  { value: 'beverage',    label: 'Bebidas' },
  { value: 'cocktail',    label: 'Cócteles' },
  { value: 'wine',        label: 'Vinos' },
  { value: 'beer',        label: 'Cervezas' },
  { value: 'licor',       label: 'Licores' },
  { value: 'coffee',      label: 'Café' },
  { value: 'side',        label: 'Acompañamientos' },
  { value: 'special',     label: 'Especiales' },
]

const categoryLabel = (val) => CATEGORIES.find(c => c.value === val)?.label || val

// ─── Colores por categoría ────────────────────────────────────────────────────
const categoryColors = {
  appetizer:   { bg: '#fef3c7', text: '#92400e' },
  main_course: { bg: '#dbeafe', text: '#1e40af' },
  dessert:     { bg: '#fce7f3', text: '#9d174d' },
  beverage:    { bg: '#d1fae5', text: '#065f46' },
  cocktail:    { bg: '#ede9fe', text: '#5b21b6' },
  wine:        { bg: '#fee2e2', text: '#991b1b' },
  beer:        { bg: '#fef9c3', text: '#854d0e' },
  licor:       { bg: '#f3e8ff', text: '#6b21a8' },
  coffee:      { bg: '#fdf2e9', text: '#7b341e' },
  side:        { bg: '#f0fdf4', text: '#14532d' },
  special:     { bg: '#e0f2fe', text: '#0c4a6e' },
}

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function ProductModal({ open, onClose, product }) {
  const queryClient = useQueryClient()
  const isEdit = !!product

  const [name, setName]             = useState(product?.name || '')
  const [description, setDesc]      = useState(product?.description || '')
  const [price, setPrice]           = useState(product?.price?.toString() || '')
  const [category, setCategory]     = useState(product?.category || 'main_course')
  const [available, setAvailable]   = useState(product?.available ?? true)

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit ? Products.update(product.id, data) : Products.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    const parsedPrice = parseFloat(price)
    if (isNaN(parsedPrice) || parsedPrice < 0) return toast.error('Precio inválido')
    saveMutation.mutate({ name: name.trim(), description: description.trim(), price: parsedPrice, category, available })
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>

        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {isEdit ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Nombre */}
        <div style={fieldWrap}>
          <label style={lbl}>Nombre *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Arroz con Pollo" style={inp} />
        </div>

        {/* Descripción */}
        <div style={fieldWrap}>
          <label style={lbl}>Descripción</label>
          <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="Ingredientes o detalles..." rows={3}
            style={{ ...inp, resize: 'vertical', height: 'auto' }} />
        </div>

        {/* Precio + Categoría */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>Precio *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: 14 }}>$</span>
              <input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
                placeholder="0.00" style={{ ...inp, paddingLeft: 28 }} />
            </div>
          </div>
          <div>
            <label style={lbl}>Categoría</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inp}>
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
        </div>

        {/* Disponible */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div
            onClick={() => setAvailable(!available)}
            style={{ width: 44, height: 24, borderRadius: 12, background: available ? '#1d9e75' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 9, background: 'white', position: 'absolute', top: 3, left: available ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </div>
          <span style={{ fontSize: 14, color: '#374151' }}>Disponible</span>
        </div>

        {/* Botones */}
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

// ─── Modal confirmación eliminar ──────────────────────────────────────────────
function DeleteModal({ product, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 380, width: '100%', padding: 28, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>🗑</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700, color: '#111' }}>¿Eliminar producto?</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
          Se eliminará <strong>{product?.name}</strong> permanentemente. Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={cancelBtn}>Cancelar</button>
          <button onClick={onConfirm} style={{ ...saveBtn, background: '#ef4444' }}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function MenuPage() {
  const queryClient = useQueryClient()
  const [search, setSearch]             = useState('')
  const [filterCat, setFilterCat]       = useState('all')
  const [modalOpen, setModalOpen]       = useState(false)
  const [editProduct, setEditProduct]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => { const { data } = await Products.list(); return data || [] },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => Products.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto eliminado')
      setDeleteTarget(null)
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const toggleAvailable = useMutation({
    mutationFn: ({ id, available }) => Products.update(id, { available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
  })

  const filtered = products.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
                        p.description?.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'all' || p.category === filterCat
    return matchSearch && matchCat
  })

  const openNew  = () => { setEditProduct(null); setModalOpen(true) }
  const openEdit = (p)  => { setEditProduct(p);   setModalOpen(true) }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>Menú</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>{products.length} productos</p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          + Nuevo Producto
        </button>
      </div>

      {/* Búsqueda + filtro */}
      <div style={{ display: 'flex', gap: 12, margin: '20px 0 24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', fontSize: 15 }}>🔍</span>
          <input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, paddingLeft: 36, background: 'white', border: '1px solid #e5e7eb', width: '100%', boxSizing: 'border-box' }}
          />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          style={{ ...inp, background: 'white', border: '1px solid #e5e7eb', width: 'auto', minWidth: 160 }}>
          <option value="all">Todas las categorías</option>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      {/* Grid de productos */}
      {isLoading ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '60px 0' }}>Cargando productos...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>🍽️</p>
          <p style={{ margin: 0, fontSize: 15 }}>{products.length === 0 ? 'Aún no hay productos. ¡Agrega el primero!' : 'Sin resultados para tu búsqueda'}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(product => {
            const catColor = categoryColors[product.category] || { bg: '#f3f4f6', text: '#374151' }
            return (
              <div key={product.id} style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '18px 20px', position: 'relative', transition: 'box-shadow .2s' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.09)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
              >
                {/* Nombre + precio */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111', flex: 1, paddingRight: 10 }}>{product.name}</p>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#1d9e75', whiteSpace: 'nowrap' }}>${product.price?.toFixed(2)}</p>
                </div>

                {/* Badge categoría */}
                <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, background: catColor.bg, color: catColor.text, marginBottom: 8 }}>
                  {categoryLabel(product.category)}
                </span>

                {/* Descripción */}
                {product.description && (
                  <p style={{ margin: '0 0 12px', fontSize: 13, color: '#6b7280', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.description}
                  </p>
                )}

                {/* Pie: disponible + acciones */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  {/* Toggle disponible */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                    onClick={() => toggleAvailable.mutate({ id: product.id, available: !product.available })}>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: product.available ? '#1d9e75' : '#d1d5db', position: 'relative', transition: 'background .2s' }}>
                      <div style={{ width: 14, height: 14, borderRadius: 7, background: 'white', position: 'absolute', top: 3, left: product.available ? 19 : 3, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: product.available ? '#1d9e75' : '#9ca3af' }}>
                      {product.available ? 'Disponible' : 'No disponible'}
                    </span>
                  </div>

                  {/* Editar / Eliminar */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(product)} title="Editar"
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ✏️
                    </button>
                    <button onClick={() => setDeleteTarget(product)} title="Eliminar"
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      🗑
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal crear/editar */}
      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProduct(null) }}
        product={editProduct}
      />

      {/* Modal eliminar */}
      {deleteTarget && (
        <DeleteModal
          product={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Estilos compartidos ──────────────────────────────────────────────────────
const inp = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #d1d5db', fontSize: 14, color: '#111',
  outline: 'none', boxSizing: 'border-box', background: 'white',
}
const lbl       = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const fieldWrap = { marginBottom: 16 }
const closeBtn  = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4, lineHeight: 1 }
const cancelBtn = { padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const saveBtn   = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }