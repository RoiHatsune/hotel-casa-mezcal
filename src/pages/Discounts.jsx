import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Discounts } from '../api/entities'
import { toast } from 'sonner'

// ─── Modal crear / editar ─────────────────────────────────────────────────────
function DiscountModal({ open, onClose, discount }) {
  const queryClient = useQueryClient()
  const isEdit = !!discount

  const [name, setName]           = useState(discount?.name || '')
  const [percentage, setPerc]     = useState(discount?.percentage?.toString() || '')
  const [active, setActive]       = useState(discount?.active ?? true)

  const saveMutation = useMutation({
    mutationFn: (data) =>
      isEdit ? Discounts.update(discount.id, data) : Discounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] })
      toast.success(isEdit ? 'Descuento actualizado' : 'Descuento creado')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (!name.trim()) return toast.error('El nombre es obligatorio')
    const pct = parseFloat(percentage)
    if (isNaN(pct) || pct <= 0 || pct > 100) return toast.error('El porcentaje debe ser entre 1 y 100')
    saveMutation.mutate({ name: name.trim(), percentage: pct, active })
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {isEdit ? 'Editar Descuento' : 'Nuevo Descuento'}
          </h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        {/* Nombre */}
        <div style={fieldWrap}>
          <label style={lbl}>Nombre *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Jubilados, Empleados, Promoción..."
            style={inp}
          />
        </div>

        {/* Porcentaje */}
        <div style={fieldWrap}>
          <label style={lbl}>Porcentaje de descuento *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number" min="1" max="100" step="0.1"
              value={percentage}
              onChange={e => setPerc(e.target.value)}
              placeholder="Ej: 15"
              style={{ ...inp, paddingRight: 36 }}
            />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontWeight: 600 }}>%</span>
          </div>
          {percentage && !isNaN(parseFloat(percentage)) && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#1d9e75' }}>
              Ejemplo: $50.00 → ${(50 * (1 - parseFloat(percentage) / 100)).toFixed(2)} (ahorro ${(50 * parseFloat(percentage) / 100).toFixed(2)})
            </p>
          )}
        </div>

        {/* Activo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div
            onClick={() => setActive(!active)}
            style={{ width: 44, height: 24, borderRadius: 12, background: active ? '#1d9e75' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}
          >
            <div style={{ width: 18, height: 18, borderRadius: 9, background: 'white', position: 'absolute', top: 3, left: active ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </div>
          <span style={{ fontSize: 14, color: '#374151' }}>
            {active ? 'Activo — aparece al crear órdenes' : 'Inactivo — no aparece en órdenes'}
          </span>
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

// ─── Modal confirmar eliminar ─────────────────────────────────────────────────
function DeleteModal({ discount, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 360, width: '100%', padding: 28, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>🗑</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>¿Eliminar descuento?</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
          Se eliminará <strong>{discount?.name}</strong>. Las órdenes existentes no se verán afectadas.
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
export default function DiscountsPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen]       = useState(false)
  const [editDiscount, setEditDiscount] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['discounts'],
    queryFn: async () => { const { data } = await Discounts.list(); return data || [] },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => Discounts.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] })
      toast.success('Descuento eliminado')
      setDeleteTarget(null)
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }) => Discounts.update(id, { active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discounts'] }),
  })

  const openNew  = () => { setEditDiscount(null); setModalOpen(true) }
  const openEdit = (d) => { setEditDiscount(d);   setModalOpen(true) }

  const active   = discounts.filter(d => d.active)
  const inactive = discounts.filter(d => !d.active)

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 700 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>Descuentos</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
            {active.length} activos · {inactive.length} inactivos
          </p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          + Nuevo Descuento
        </button>
      </div>

      {/* Info */}
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', marginBottom: 28, fontSize: 13, color: '#166534' }}>
        💡 Los descuentos activos aparecen al crear una orden y se aplican por ítem individual (ej: solo al plato del jubilado, no a toda la mesa).
      </div>

      {isLoading ? (
        <p style={{ color: '#6b7280' }}>Cargando...</p>
      ) : discounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>🏷️</p>
          <p style={{ margin: 0 }}>No hay descuentos. ¡Crea el primero!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {discounts.map(d => (
            <div key={d.id} style={{
              background: 'white', borderRadius: 14, border: `1px solid ${d.active ? '#e5e7eb' : '#f3f4f6'}`,
              padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 16, opacity: d.active ? 1 : 0.6,
            }}>

              {/* Izquierda: info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Badge porcentaje */}
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: d.active ? '#f0fdf4' : '#f9fafb',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: d.active ? '#1d9e75' : '#9ca3af', lineHeight: 1 }}>
                    {d.percentage}%
                  </span>
                  <span style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 0.5 }}>DESC.</span>
                </div>

                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111' }}>{d.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6b7280' }}>
                    Ejemplo sobre $100 → ahorro ${d.percentage.toFixed(2)} → paga ${(100 - d.percentage).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Derecha: toggle + acciones */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {/* Toggle activo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  onClick={() => toggleActive.mutate({ id: d.id, active: !d.active })}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: d.active ? '#1d9e75' : '#d1d5db', position: 'relative', transition: 'background .2s' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 7, background: 'white', position: 'absolute', top: 3, left: d.active ? 19 : 3, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
                  </div>
                  <span style={{ fontSize: 12, color: d.active ? '#1d9e75' : '#9ca3af', fontWeight: 600 }}>
                    {d.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <button onClick={() => openEdit(d)} title="Editar"
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 15 }}>
                  ✏️
                </button>
                <button onClick={() => setDeleteTarget(d)} title="Eliminar"
                  style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', fontSize: 15 }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DiscountModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditDiscount(null) }}
        discount={editDiscount}
      />

      {deleteTarget && (
        <DeleteModal
          discount={deleteTarget}
          onConfirm={() => deleteMutation.mutate(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const inp       = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box' }
const lbl       = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const fieldWrap = { marginBottom: 16 }
const closeBtn  = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }
const cancelBtn = { padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const saveBtn   = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }