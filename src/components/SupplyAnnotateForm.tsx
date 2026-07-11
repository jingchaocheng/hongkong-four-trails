import { FormEvent, useState } from 'react'
import { SUPPLY_TYPES, SupplyType, supplyTypeLabelKey } from '../utils/supplyPoints'
import { useLocale } from '../i18n/LocaleContext'

export interface SupplyAnnotateDraft {
  lat: number
  lng: number
  nearMarker?: string
  /** 进入表单时预勾选的类型（可选） */
  initialTypes?: SupplyType[]
}

interface SupplyAnnotateFormProps {
  draft: SupplyAnnotateDraft
  onCancel: () => void
  onSave: (data: {
    name: string
    note: string
    nearMarker: string
    types: SupplyType[]
  }) => void
}

export default function SupplyAnnotateForm({ draft, onCancel, onSave }: SupplyAnnotateFormProps) {
  const { t } = useLocale()
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [nearMarker, setNearMarker] = useState(draft.nearMarker ?? '')
  const [types, setTypes] = useState<SupplyType[]>(
    draft.initialTypes?.length ? draft.initialTypes : ['store']
  )

  const toggleType = (type: SupplyType) => {
    setTypes((prev) => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev
        return prev.filter((t) => t !== type)
      }
      return [...prev, type]
    })
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || types.length === 0) return
    onSave({
      name: trimmed,
      note: note.trim(),
      nearMarker: nearMarker.trim(),
      types,
    })
  }

  return (
    <div className="supply-annotate-modal" role="dialog" aria-modal="true">
      <form className="supply-annotate-card" onSubmit={handleSubmit}>
        <h3 className="supply-annotate-title">{t('supply.annotateTitle')}</h3>
        <p className="supply-annotate-coords">
          {draft.lat.toFixed(5)}, {draft.lng.toFixed(5)}
        </p>
        <fieldset className="supply-annotate-field">
          <legend>{t('supply.facilities')}</legend>
          <div className="supply-type-checks">
            {SUPPLY_TYPES.map((type) => (
              <label key={type} className="supply-type-check">
                <input
                  type="checkbox"
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                />
                <span>{t(supplyTypeLabelKey(type))}</span>
              </label>
            ))}
          </div>
          <p className="map-campsite-toggle-hint">{t('supply.facilitiesHint')}</p>
        </fieldset>
        <label className="supply-annotate-field">
          <span>{t('supply.name')}</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('supply.namePlaceholder')}
            required
          />
        </label>
        <label className="supply-annotate-field">
          <span>{t('supply.nearMarker')}</span>
          <input
            value={nearMarker}
            onChange={(e) => setNearMarker(e.target.value)}
            placeholder="M030"
          />
        </label>
        <label className="supply-annotate-field">
          <span>{t('supply.note')}</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('supply.notePlaceholder')}
          />
        </label>
        <div className="supply-annotate-actions">
          <button type="button" onClick={onCancel} className="supply-annotate-btn-secondary">
            {t('supply.cancel')}
          </button>
          <button type="submit" className="supply-annotate-btn-primary" disabled={types.length === 0}>
            {t('supply.save')}
          </button>
        </div>
      </form>
    </div>
  )
}
