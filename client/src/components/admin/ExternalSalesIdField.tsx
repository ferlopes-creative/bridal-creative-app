import { useId, useState } from "react";
import { AdminFieldHelpButton, AdminFieldHelpPanel } from "@/components/admin/AdminFieldHelp";

type ExternalSalesIdFieldProps = {
  hotmartValue: string;
  caktoValue: string;
  onHotmartChange: (value: string) => void;
  onCaktoChange: (value: string) => void;
  /** ID legado único (ainda ativo no matching dos webhooks). */
  legacyExternalSalesId?: string | null;
  disabled?: boolean;
};

const HOTMART_HELP = "Como encontrar o ID na Hotmart";
const CAKTO_HELP = "Como encontrar o ID na Cakto";

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60";

export default function ExternalSalesIdField({
  hotmartValue,
  caktoValue,
  onHotmartChange,
  onCaktoChange,
  legacyExternalSalesId = null,
  disabled = false,
}: ExternalSalesIdFieldProps) {
  const hotmartId = useId();
  const caktoId = useId();
  const hotmartHelpId = useId();
  const caktoHelpId = useId();
  const hotmartDescribedBy = `${hotmartId}-hint`;
  const caktoDescribedBy = `${caktoId}-hint`;

  const [hotmartHelpOpen, setHotmartHelpOpen] = useState(false);
  const [caktoHelpOpen, setCaktoHelpOpen] = useState(false);

  const legacy = legacyExternalSalesId?.trim() || "";
  const showLegacyHint =
    legacy.length > 0 && !hotmartValue.trim() && !caktoValue.trim();

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label htmlFor={hotmartId} className="text-sm text-zinc-700">
            ID Hotmart
          </label>
          <AdminFieldHelpButton
            label={HOTMART_HELP}
            open={hotmartHelpOpen}
            onOpenChange={setHotmartHelpOpen}
          />
        </div>

        <AdminFieldHelpPanel
          label={HOTMART_HELP}
          open={hotmartHelpOpen}
          onOpenChange={setHotmartHelpOpen}
        >
          <div id={hotmartHelpId} className="space-y-2">
            <ol className="list-decimal space-y-1 pl-4">
              <li>
                Entre em <strong>Produtos</strong> no painel da Hotmart e abra o produto desejado.
              </li>
              <li>
                O número do produto costuma aparecer na URL ou nos detalhes — é um número como{" "}
                <code className="rounded bg-white px-1 py-0.5 text-[11px] text-zinc-700">123456</code>.
                Esse é o valor de{" "}
                <code className="rounded bg-white px-1 py-0.5 text-[11px] text-zinc-700">product.id</code>{" "}
                no webhook.
              </li>
              <li>
                Se você vende por <strong>oferta</strong> (e não pelo produto principal), use o{" "}
                <strong>código da oferta</strong> — o mesmo que a Hotmart envia em{" "}
                <code className="rounded bg-white px-1 py-0.5 text-[11px] text-zinc-700">
                  purchase.offer.code
                </code>
                .
              </li>
              <li>Cole exatamente o valor recebido no webhook (número ou código), sem espaços extras.</li>
            </ol>
            <p className="rounded-md border border-[#6B705C]/15 bg-white px-2.5 py-2 text-[11px] text-zinc-700">
              Dica: faça uma compra de teste e confira o webhook em{" "}
              <strong>Ferramentas → Webhooks (API 2.0)</strong>. O campo{" "}
              <code className="rounded bg-zinc-100 px-1">data.product.id</code> é o mais comum.
            </p>
          </div>
        </AdminFieldHelpPanel>

        <input
          id={hotmartId}
          type="text"
          value={hotmartValue}
          onChange={(e) => onHotmartChange(e.target.value)}
          placeholder="Ex.: 123456 ou código da oferta"
          disabled={disabled}
          aria-describedby={hotmartDescribedBy}
          className={inputClass}
        />
        <p id={hotmartDescribedBy} className="text-[11px] text-zinc-500">
          Opcional. Quando preenchido, compras via Hotmart liberam este produto automaticamente.
        </p>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <label htmlFor={caktoId} className="text-sm text-zinc-700">
            ID Cakto
          </label>
          <AdminFieldHelpButton
            label={CAKTO_HELP}
            open={caktoHelpOpen}
            onOpenChange={setCaktoHelpOpen}
          />
        </div>

        <AdminFieldHelpPanel
          label={CAKTO_HELP}
          open={caktoHelpOpen}
          onOpenChange={setCaktoHelpOpen}
        >
          <div id={caktoHelpId}>
            <p>
              Use o mesmo ID que aparece no webhook da Cakto, geralmente em{" "}
              <code className="rounded bg-white px-1 py-0.5 text-[11px] text-zinc-700">product.id</code>{" "}
              ou{" "}
              <code className="rounded bg-white px-1 py-0.5 text-[11px] text-zinc-700">product_id</code>.
              Cole esse valor aqui para a compra liberar o produto certo automaticamente.
            </p>
          </div>
        </AdminFieldHelpPanel>

        <input
          id={caktoId}
          type="text"
          value={caktoValue}
          onChange={(e) => onCaktoChange(e.target.value)}
          placeholder="Ex.: UUID ou código do produto na Cakto"
          disabled={disabled}
          aria-describedby={caktoDescribedBy}
          className={inputClass}
        />
        <p id={caktoDescribedBy} className="text-[11px] text-zinc-500">
          Opcional. Quando preenchido, compras via Cakto liberam este produto automaticamente.
        </p>
      </div>

      {showLegacyHint ? (
        <p className="rounded-md border border-amber-200/80 bg-amber-50/70 px-2.5 py-2 text-[11px] leading-relaxed text-amber-900/90">
          ID legado ainda ativo no matching:{" "}
          <code className="rounded bg-white/80 px-1">{legacy}</code>. Informe o valor no campo Hotmart
          ou Cakto correspondente para organizar por plataforma.
        </p>
      ) : null}
    </div>
  );
}
