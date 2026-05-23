export function ClimateLegend() {
  return (
    <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-200/90 bg-white px-4 py-2.5 text-[11px] text-zinc-600 shadow-sm">
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
        Clădire rece (AC)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-orange-600" />
        Clădire caldă (fără AC)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded border border-emerald-200 bg-white" />
        Liberă la data aleasă
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded status-occupied-swatch" />
        Ocupată (confirmată)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-3 rounded bg-amber-300" />
        Cerere (nealocată / în așteptare)
      </span>
    </div>
  );
}
