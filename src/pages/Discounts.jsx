import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Discounts } from '../api/entities'
import { toast } from 'sonner'
import { useTranslation } from '../i18n/useTranslation'

function DiscountModal({ open, onClose, discount }) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const isEdit = !!discount

  const [name, setName]       = useState(discount?.name || '')
  const [percentage, setPerc] = useState(discount?.percentage?.toString() || '')
  const [active, setActive]   = useState(discount?.active ?? true)

  const saveMutation = useMutation({
    mutationFn: (data) => isEdit ? Discounts.update(discount.id, data) : Discounts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] })
      toast.success(isEdit ? 'Updated' : 'Created')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (!name.trim()) return toast.error('Name is required')
    const pct = parseFloat(percentage)
    if (isNaN(pct) || pct <= 0 || pct > 100) return toast.error('Percentage must be between 1 and 100')
    saveMutation.mutate({ name: name.trim(), percentage: pct, active })
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {isEdit ? t('discounts_modal_edit') : t('discounts_modal_new')}
          </h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={fieldWrap}>
          <label style={lbl}>{t('discounts_name')}</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('discounts_name_ph')} style={inp} />
        </div>
        <div style={fieldWrap}>
          <label style={lbl}>{t('discounts_pct')}</label>
          <div style={{ position: 'relative' }}>
            <input type="number" min="1" max="100" step="0.1" value={percentage} onChange={e => setPerc(e.target.value)}
              placeholder="15" style={{ ...inp, paddingRight: 36 }} />
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontWeight: 600 }}>%</span>
          </div>
          {percentage && !isNaN(parseFloat(percentage)) && (
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#1d9e75' }}>
              {t('discounts_example')} ${(50 * parseFloat(percentage) / 100).toFixed(2)} {t('discounts_pays')} ${(50 * (1 - parseFloat(percentage) / 100)).toFixed(2)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div onClick={() => setActive(!active)}
            style={{ width: 44, height: 24, borderRadius: 12, background: active ? '#1d9e75' : '#d1d5db', cursor: 'pointer', position: 'relative', transition: 'background .2s' }}>
            <div style={{ width: 18, height: 18, borderRadius: 9, background: 'white', position: 'absolute', top: 3, left: active ? 23 : 3, transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
          </div>
          <span style={{ fontSize: 14, color: '#374151' }}>
            {active ? t('discounts_active_lbl') : t('discounts_inactive_lbl')}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>{t('discounts_cancel')}</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={saveBtn}>
            {saveMutation.isPending ? t('saving') : t('discounts_save')}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ discount, onConfirm, onCancel }) {
  const { t } = useTranslation()
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 360, width: '100%', padding: 28, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 26, background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>🗑</div>
        <h3 style={{ margin: '0 0 8px', fontSize: 17, fontWeight: 700 }}>{t('discounts_delete_q')}</h3>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: '#6b7280' }}>
          <strong>{discount?.name}</strong> — {t('discounts_delete_msg')}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={cancelBtn}>{t('cancel')}</button>
          <button onClick={onConfirm} style={{ ...saveBtn, background: '#ef4444' }}>{t('yes_delete')}</button>
        </div>
      </div>
    </div>
  )
}

export default function DiscountsPage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [modalOpen, setModalOpen]       = useState(false)
  const [editDiscount, setEditDiscount] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const { data: discounts = [], isLoading } = useQuery({
    queryKey: ['discounts'],
    queryFn: async () => { const { data } = await Discounts.list(); return data || [] },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => Discounts.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['discounts'] }); toast.success('Deleted'); setDeleteTarget(null) },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>{t('discounts_title')}</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>
            {active.length} {t('discounts_active')} · {inactive.length} {t('discounts_inactive')}
          </p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {t('discounts_new')}
        </button>
      </div>
      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', marginBottom: 28, fontSize: 13, color: '#166534' }}>
        💡 {t('discounts_info')}
      </div>
      {isLoading ? (
        <p style={{ color: '#6b7280' }}>{t('loading')}</p>
      ) : discounts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>🏷️</p>
          <p style={{ margin: 0 }}>{t('discounts_no')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {discounts.map(d => (
            <div key={d.id} style={{ background: 'white', borderRadius: 14, border: `1px solid ${d.active ? '#e5e7eb' : '#f3f4f6'}`, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, opacity: d.active ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: d.active ? '#f0fdf4' : '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: d.active ? '#1d9e75' : '#9ca3af', lineHeight: 1 }}>{d.percentage}%</span>
                  <span style={{ fontSize: 9, color: '#9ca3af', letterSpacing: 0.5 }}>DISC.</span>
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: '#111' }}>{d.name}</p>
                  <p style={{ margin: '3px 0 0', fontSize: 13, color: '#6b7280' }}>
                    {t('discounts_example')} ${d.percentage.toFixed(2)} {t('discounts_pays')} ${(100 - d.percentage).toFixed(2)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
                  onClick={() => toggleActive.mutate({ id: d.id, active: !d.active })}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: d.active ? '#1d9e75' : '#d1d5db', position: 'relative', transition: 'background .2s' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 7, background: 'white', position: 'absolute', top: 3, left: d.active ? 19 : 3, transition: 'left .2s', boxShadow: '0 1px 2px rgba(0,0,0,.2)' }} />
                  </div>
                  <span style={{ fontSize: 12, color: d.active ? '#1d9e75' : '#9ca3af', fontWeight: 600 }}>
                    {d.active ? t('discounts_active_toggle') : t('discounts_inactive_toggle')}
                  </span>
                </div>
                <button onClick={() => openEdit(d)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 15 }}>✏️</button>
                <button onClick={() => setDeleteTarget(d)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', fontSize: 15 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <DiscountModal open={modalOpen} onClose={() => { setModalOpen(false); setEditDiscount(null) }} discount={editDiscount} />
      {deleteTarget && <DeleteModal discount={deleteTarget} onConfirm={() => deleteMutation.mutate(deleteTarget.id)} onCancel={() => setDeleteTarget(null)} />}
    </div>
  )
}

const inp       = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box' }
const lbl       = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const fieldWrap = { marginBottom: 16 }
const closeBtn  = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }
const cancelBtn = { padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const saveBtn   = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }