/** Saudação + "Grande dia!" + countdown de dias — abre a aba "Meus produtos". */
export default function WeddingGreeting({
  weddingName,
  weddingDaysLeft,
  onPlanning,
}: {
  weddingName: string | null;
  weddingDaysLeft: number | null;
  onPlanning: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:pt-7">
      <div className="border-b border-bc-primary/15 pb-3">
        <p
          className="text-sm font-bold tracking-[0.06em] text-bc-primary sm:text-base sm:tracking-[0.1em]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Bem-vinda(o){weddingName ? `, ${weddingName}` : ""}!
        </p>
      </div>
      <div className="mt-4 flex items-start justify-between gap-4">
        <h1
          className="text-base leading-snug text-bc-primary sm:text-xl"
          style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
        >
          Um grande amor,
          <br />
          merece um
          <br />
          <span className="text-4xl leading-tight sm:text-6xl" style={{ fontFamily: "var(--font-script)" }}>
            Grande dia!
          </span>
        </h1>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div
            className="rounded-[3px] px-4 py-2 text-center text-white sm:px-6 sm:py-2.5"
            style={{ backgroundColor: "var(--bc-primary)" }}
          >
            <p className="text-[9px] uppercase tracking-[0.1em] text-white/75 sm:text-[10px]">Faltam</p>
            <p className="text-base font-semibold whitespace-nowrap sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>
              {weddingDaysLeft !== null ? `${weddingDaysLeft} dias` : "--"}
            </p>
          </div>
          <button
            type="button"
            onClick={onPlanning}
            className="text-[10px] font-normal text-bc-primary hover:underline sm:text-xs"
          >
            Ver planejamento →
          </button>
        </div>
      </div>
    </div>
  );
}
