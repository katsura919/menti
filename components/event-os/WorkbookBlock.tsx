interface Props {
  text: string
}

export default function WorkbookBlock({ text }: Props) {
  const clean = text.replace(/^WORKBOOK\s*[~—\-]?\s*/i, '')

  return (
    <div className="rounded-xl border-2 border-dashed border-clay-500 bg-beige-100 p-5">
      <p className="mb-2 font-mono text-xs font-bold uppercase tracking-widest text-clay-500">
        Poll / Question Slot
      </p>
      <p
        className="text-sm leading-relaxed text-charcoal-900"
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  )
}
