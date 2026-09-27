import { useState } from 'react'
import Icon from './Icon.jsx'
import RangePicker, { defaultRange } from './RangePicker.jsx'
import { fetchOrders } from '../services/orderStore.js'
import { downloadOrdersCsv, resolveRange } from '../utils/reports.js'

/**
 * "Export orders" button. Without `range` it shows its own range picker (Orders page);
 * with `range` it exports that range (Reports page, which has its own picker).
 */
export default function ExportOrders({ range: fixedRange, compact = false }) {
  const [own, setOwn] = useState(() => defaultRange('yesterday'))
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState({ text: '', error: false })
  const selection = fixedRange ?? own

  const run = async () => {
    setBusy(true)
    setMsg({ text: '', error: false })
    try {
      const range = resolveRange(selection)
      const orders = await fetchOrders(range.from, range.to)
      if (!orders.length) {
        setMsg({ text: `No orders for ${range.label.toLowerCase()}.`, error: true })
        return
      }
      downloadOrdersCsv(orders, range)
      setMsg({ text: `Downloaded ${orders.length} order${orders.length > 1 ? 's' : ''} ✓`, error: false })
    } catch (err) {
      setMsg({ text: err.message, error: true })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`export-orders ${compact ? 'compact' : ''}`}>
      {!fixedRange && <RangePicker value={own} onChange={(v) => { setOwn(v); setMsg({ text: '', error: false }) }} />}
      <button type="button" className="btn secondary" onClick={run} disabled={busy}>
        <Icon name="download" size={16} /> {busy ? 'Preparing…' : 'Export orders (Excel/CSV)'}
      </button>
      {msg.text && <span className={`small ${msg.error ? 'muted' : 'saved'}`}>{msg.text}</span>}
    </div>
  )
}
