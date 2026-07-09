import AdminFieldHelp from "@/components/admin/AdminFieldHelp";

type ExternalSalesIdFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export default function ExternalSalesIdField({
  value,
  onChange,
  disabled = false,
}: ExternalSalesIdFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-sm text-zinc-700">ID do produto na loja</label>
        <AdminFieldHelp label="Como encontrar o ID na Cakto e na Hotmart">
          <div className="space-y-3 text-xs leading-relaxed text-zinc-600">
            <div>
              <p className="font-medium text-zinc-800">Cakto</p>
              <p className="mt-1">
                Use o mesmo ID que aparece no webhook da Cakto, geralmente em{" "}
                <code className="rounded bg-zinc-100 px-1">product.id</code> ou{" "}
                <code className="rounded bg-zinc-100 px-1">product_id</code>. Cole esse valor aqui
                para a compra liberar o produto certo automaticamente.
              </p>
            </div>
            <div>
              <p className="font-medium text-zinc-800">Hotmart</p>
              <ol className="mt-1 list-decimal space-y-1 pl-4">
                <li>
                  Entre em <strong>Produtos</strong> no painel da Hotmart e abra o produto desejado.
                </li>
                <li>
                  O número do produto costuma aparecer na URL ou nos detalhes — é um número como{" "}
                  <code className="rounded bg-zinc-100 px-1">123456</code>. Esse é o valor de{" "}
                  <code className="rounded bg-zinc-100 px-1">product.id</code> no webhook.
                </li>
                <li>
                  Se você vende por <strong>oferta</strong> (e não pelo produto principal), use o{" "}
                  <strong>código da oferta</strong> — o mesmo que a Hotmart envia em{" "}
                  <code className="rounded bg-zinc-100 px-1">purchase.offer.code</code>.
                </li>
                <li>
                  Cole exatamente o valor recebido no webhook (número ou código), sem espaços extras.
                </li>
              </ol>
              <p className="mt-2 rounded-md bg-[#6B705C]/8 px-2.5 py-2 text-[11px] text-zinc-700">
                Dica: faça uma compra de teste e confira o webhook em{" "}
                <strong>Ferramentas → Webhooks (API 2.0)</strong>. O campo{" "}
                <code className="rounded bg-white/80 px-1">data.product.id</code> é o mais comum.
              </p>
            </div>
          </div>
        </AdminFieldHelp>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex.: 123456 ou código da oferta Hotmart"
        disabled={disabled}
        className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-800 outline-none transition focus:border-[#6B705C]/50 focus:ring-2 focus:ring-[#6B705C]/15 disabled:opacity-60"
      />
      <p className="text-[11px] text-zinc-500">
        Opcional. Quando preenchido, compras via Cakto ou Hotmart liberam este produto automaticamente
        para a cliente.
      </p>
    </div>
  );
}
