import { FileSpreadsheet, ExternalLink, Folder } from 'lucide-react'

export default function ExcelLink({ config = {} }) {
  const { titolo = 'Link Excel / File', links = [] } = config

  if (links.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow p-4 h-full flex flex-col items-center justify-center text-gray-400">
        <FileSpreadsheet size={32} className="mb-2" />
        <p className="text-sm text-center">Configura i link a file/Excel/rete</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow h-full flex flex-col overflow-hidden">
      {titolo && <div className="px-4 py-2 border-b font-bold text-sm">{titolo}</div>}
      <div className="p-3 overflow-auto flex-1 space-y-2">
        {links.map((link, i) => (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg border hover:bg-gray-50 hover:border-primary transition-colors group"
          >
            {link.url?.endsWith('.xlsx') || link.url?.endsWith('.xls') || link.url?.includes('excel') ? (
              <FileSpreadsheet size={18} className="text-green-600 shrink-0" />
            ) : link.url?.startsWith('\\\\') || link.url?.includes('sharepoint') ? (
              <Folder size={18} className="text-blue-600 shrink-0" />
            ) : (
              <ExternalLink size={18} className="text-gray-600 shrink-0" />
            )}
            <span className="text-sm truncate flex-1">{link.label || link.url}</span>
            <ExternalLink size={12} className="text-gray-400 group-hover:text-primary shrink-0" />
          </a>
        ))}
      </div>
    </div>
  )
}
