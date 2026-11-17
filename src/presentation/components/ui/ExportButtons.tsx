import { useState } from 'react'
import { Button } from './Button'
import { IconDownload } from './Icons'
import { exportTable, type ExportData, type ExportFormat } from '../../lib/exportTable'

/** Botones "Excel" y "PDF": descargan lo que se está viendo en la tabla */
export function ExportButtons({ title, data, className = '' }: { title: string; data: () => ExportData; className?: string }) {
  const [busy, setBusy] = useState<ExportFormat | null>(null)
  const run = async (f: ExportFormat) => {
    setBusy(f)
    try { await exportTable(title, data(), f) }
    catch (e) { alert('No se pudo exportar: ' + (e instanceof Error ? e.message : String(e))) }
    finally { setBusy(null) }
  }
  return (
    <div className={'flex items-center gap-1.5 ' + className}>
      <Button size="sm" onClick={() => run('xlsx')} disabled={!!busy} title={'Descargar ' + title + ' en Excel'}>
        <IconDownload size={14} />{busy === 'xlsx' ? 'Generando…' : 'Excel'}
      </Button>
      <Button size="sm" onClick={() => run('pdf')} disabled={!!busy} title={'Descargar ' + title + ' en PDF'}>
        <IconDownload size={14} />{busy === 'pdf' ? 'Generando…' : 'PDF'}
      </Button>
    </div>
  )
}
