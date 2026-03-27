import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DayPasses } from '../api/entities'
import { toast } from 'sonner'
import { useTranslation } from '../i18n/useTranslation'

const PRICE_PER_PERSON = 15.00

function DayPassModal({ open, onClose, dayPass }) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const isEdit = !!dayPass

  const STATUS_CONFIG = {
    active:    { label: t('daypass_active'),    color: '#10b981', bg: '#d1fae5' },
    completed: { label: t('daypass_completed'), color: '#8b5cf6', bg: '#ede9fe' },
    cancelled: { label: t('daypass_cancelled'), color: '#ef4444', bg: '#fee2e2' },
  }

  const PAYMENT_METHODS = [
    { value: 'cash',     label: t('pay_cash') },
    { value: 'card',     label: t('pay_card') },
    { value: 'transfer', label: t('pay_transfer') },
  ]

  const today = new Date().toLocaleDateString('en-CA')

  const [guestName, setGuestName]   = useState(dayPass?.guest_name || '')
  const [persons, setPersons]       = useState(dayPass?.persons?.toString() || '1')
  const [date, setDate]             = useState(dayPass?.date || today)
  const [paymentMethod, setPayment] = useState(dayPass?.payment_method || 'cash')
  const [status, setStatus]         = useState(dayPass?.status || 'active')
  const [notes, setNotes]           = useState(dayPass?.notes || '')

  const numPersons = parseInt(persons) || 1
  const total      = numPersons * PRICE_PER_PERSON

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const result = isEdit
        ? await DayPasses.update(dayPass.id, data)
        : await DayPasses.create(data)
      if (result.error) throw new Error(result.error.message)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['day_passes'] })
      toast.success(isEdit ? 'Updated' : 'Registered')
      onClose()
    },
    onError: (e) => toast.error('Error: ' + e.message),
  })

  const handleSave = () => {
    if (!guestName.trim()) return toast.error('Name is required')
    if (numPersons < 1)    return toast.error('Minimum 1 person')
    if (!date)             return toast.error('Select a date')
    saveMutation.mutate({ guest_name: guestName.trim(), persons: numPersons, date, payment_method: paymentMethod, total, status, notes: notes.trim() || null })
  }

  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 460, padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111' }}>
            {isEdit ? t('daypasses_modal_edit') : t('daypasses_modal_new')}
          </h2>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13, color: '#166534' }}>
          {t('daypasses_info')} · <strong>${PRICE_PER_PERSON.toFixed(2)}{t('per_person')}</strong>
        </div>
        <div style={fieldWrap}>
          <label style={lbl}>{t('daypasses_name')}</label>
          <input value={guestName} onChange={e => setGuestName(e.target.value)} placeholder={t('daypasses_name_ph')} style={inp} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <label style={lbl}>{t('daypasses_persons_lbl')}</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button onClick={() => setPersons(String(Math.max(1, numPersons - 1)))}
                style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>−</button>
              <input type="number" min="1" value={persons} onChange={e => setPersons(e.target.value)}
                style={{ ...inp, textAlign: 'center', fontWeight: 700, fontSize: 18 }} />
              <button onClick={() => setPersons(String(numPersons + 1))}
                style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>+</button>
            </div>
          </div>
          <div>
            <label style={lbl}>{t('daypasses_date')}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
        </div>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280', marginBottom: 6 }}>
            <span>{numPersons} {numPersons !== 1 ? 'persons' : 'person'} × ${PRICE_PER_PERSON.toFixed(2)}</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#111', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}>
            <span>{t('daypasses_total')}</span>
            <span style={{ color: '#1d9e75' }}>${total.toFixed(2)}</span>
          </div>
        </div>
        <div style={fieldWrap}>
          <label style={lbl}>{t('daypasses_payment')}</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {PAYMENT_METHODS.map(m => (
              <button key={m.value} onClick={() => setPayment(m.value)} style={{
                flex: 1, padding: '8px 0', borderRadius: 8,
                border: `2px solid ${paymentMethod === m.value ? '#1d9e75' : '#e5e7eb'}`,
                background: paymentMethod === m.value ? '#f0fdf4' : 'white',
                cursor: 'pointer', fontSize: 12, fontWeight: paymentMethod === m.value ? 600 : 400,
                color: paymentMethod === m.value ? '#166534' : '#374151',
              }}>{m.label}</button>
            ))}
          </div>
        </div>
        {isEdit && (
          <div style={fieldWrap}>
            <label style={lbl}>{t('daypasses_status_lbl')}</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={inp}>
              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => <option key={val} value={val}>{cfg.label}</option>)}
            </select>
          </div>
        )}
        <div style={fieldWrap}>
          <label style={lbl}>{t('daypasses_notes')}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('daypasses_notes_ph')} rows={2}
            style={{ ...inp, resize: 'vertical', height: 'auto' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={cancelBtn}>{t('daypasses_cancel')}</button>
          <button onClick={handleSave} disabled={saveMutation.isPending} style={saveBtn}>
            {saveMutation.isPending ? t('saving') : isEdit ? t('daypasses_update') : t('daypasses_save')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DayPassesPage() {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const [modalOpen, setModalOpen]       = useState(false)
  const [editPass, setEditPass]         = useState(null)
  const [filterDate, setFilterDate]     = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const STATUS_CONFIG = {
    active:    { label: t('daypass_active'),    color: '#10b981', bg: '#d1fae5' },
    completed: { label: t('daypass_completed'), color: '#8b5cf6', bg: '#ede9fe' },
    cancelled: { label: t('daypass_cancelled'), color: '#ef4444', bg: '#fee2e2' },
  }

  const PAYMENT_METHODS = [
    { value: 'cash',     label: t('pay_cash') },
    { value: 'card',     label: t('pay_card') },
    { value: 'transfer', label: t('pay_transfer') },
  ]

  const today = new Date().toLocaleDateString('en-CA')

  const { data: passes = [], isLoading } = useQuery({
    queryKey: ['day_passes'],
    queryFn: async () => { const { data } = await DayPasses.list(); return data || [] },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => DayPasses.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['day_passes'] }); toast.success('Deleted') },
  })

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => DayPasses.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['day_passes'] }),
  })

  let filtered = passes
  if (filterStatus !== 'all') filtered = filtered.filter(p => p.status === filterStatus)
  if (filterDate)             filtered = filtered.filter(p => p.date === filterDate)

  const todayPasses  = passes.filter(p => p.date === today && p.status !== 'cancelled')
  const todayPersons = todayPasses.reduce((s, p) => s + (p.persons || 0), 0)
  const todayRevenue = todayPasses.reduce((s, p) => s + (p.total || 0), 0)
  const totalRevenue = passes.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.total || 0), 0)

  const openNew  = () => { setEditPass(null); setModalOpen(true) }
  const openEdit = (p) => { setEditPass(p);   setModalOpen(true) }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: '#111' }}>{t('daypasses_title')}</h1>
          <p style={{ fontSize: 14, color: '#6b7280', margin: '4px 0 0' }}>{t('daypasses_subtitle')} · ${PRICE_PER_PERSON.toFixed(2)}{t('per_person')}</p>
        </div>
        <button onClick={openNew} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          {t('daypasses_new')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('daypasses_persons'), value: todayPersons,                       icon: '👥', color: '#3b82f6' },
          { label: t('daypasses_income'),  value: `$${todayRevenue.toFixed(2)}`,       icon: '💰', color: '#10b981' },
          { label: t('daypasses_today'),   value: todayPasses.length,                  icon: '🏊', color: '#8b5cf6' },
          { label: t('daypasses_total_rev'), value: `$${totalRevenue.toFixed(2)}`,     icon: '📊', color: '#f59e0b' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', padding: '14px 16px' }}>
            <p style={{ margin: 0, fontSize: 22 }}>{card.icon}</p>
            <p style={{ margin: '6px 0 2px', fontSize: 20, fontWeight: 800, color: card.color }}>{card.value}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{card.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[{ value: 'all', label: t('daypasses_all') }, ...Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))].map(s => (
            <button key={s.value} onClick={() => setFilterStatus(s.value)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13,
              background: filterStatus === s.value ? '#1d9e75' : '#f3f4f6',
              color: filterStatus === s.value ? 'white' : '#374151', fontWeight: 500,
            }}>{s.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <label style={{ fontSize: 13, color: '#6b7280' }}>{t('daypasses_date_lbl')}</label>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13 }} />
          {filterDate && (
            <button onClick={() => setFilterDate('')} style={{ fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>{t('daypasses_clear')}</button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: '#6b7280' }}>{t('loading')}</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
          <p style={{ fontSize: 36, margin: '0 0 8px' }}>🏊</p>
          <p style={{ margin: 0 }}>{passes.length === 0 ? t('daypasses_no') : t('daypasses_no_results')}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(pass => {
            const sc = STATUS_CONFIG[pass.status] || STATUS_CONFIG.active
            const pm = PAYMENT_METHODS.find(m => m.value === pass.payment_method)
            return (
              <div key={pass.id} style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 22, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏊</div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111' }}>{pass.guest_name}</p>
                    <p style={{ margin: '2px 0', fontSize: 13, color: '#6b7280' }}>
                      👥 {pass.persons} {pass.persons !== 1 ? 'people' : 'person'} · 📅 {pass.date} · {pm?.label || pass.payment_method}
                    </p>
                    {pass.notes && <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>💬 {pass.notes}</p>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#1d9e75' }}>${pass.total?.toFixed(2)}</span>
                  <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color }}>{sc.label}</span>
                  {pass.status === 'active' && (
                    <button onClick={() => updateStatus.mutate({ id: pass.id, status: 'completed' })}
                      style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: '#ede9fe', color: '#5b21b6', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      {t('daypasses_complete')}
                    </button>
                  )}
                  <button onClick={() => openEdit(pass)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontSize: 14 }}>✏️</button>
                  <button onClick={() => { if (confirm(t('daypasses_delete_q'))) deleteMutation.mutate(pass.id) }}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff5f5', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                </div>
              </div>
            )
          })}
          {filtered.length > 0 && (
            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {filtered.length} {filtered.length !== 1 ? t('daypasses_records_pl') : t('daypasses_records')} · {filtered.reduce((s, p) => s + (p.persons || 0), 0)} people
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>
                {t('total')}: ${filtered.filter(p => p.status !== 'cancelled').reduce((s, p) => s + (p.total || 0), 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      )}

      <DayPassModal open={modalOpen} onClose={() => { setModalOpen(false); setEditPass(null) }} dayPass={editPass} />
    </div>
  )
}

const inp       = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, color: '#111', outline: 'none', boxSizing: 'border-box', background: 'white' }
const lbl       = { display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 5 }
const fieldWrap = { marginBottom: 16 }
const closeBtn  = { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#9ca3af', padding: 4 }
const cancelBtn = { padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', color: '#374151', fontSize: 14, cursor: 'pointer', fontWeight: 500 }
const saveBtn   = { padding: '9px 18px', borderRadius: 8, border: 'none', background: '#1d9e75', color: 'white', fontSize: 14, cursor: 'pointer', fontWeight: 600 }