import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    const email = body.customer?.email || body.customer_email;
    const rawProductId = body.product?.id ?? body.product_id;
    const status = body.status || body.event;

    if (!email || rawProductId == null || rawProductId === "") {
      return res.status(400).json({ error: "Missing data" });
    }

    const pid = String(rawProductId);

    const { data: matchRows, error: matchError } = await supabase
      .from("products")
      .select("id")
      .or(`id.eq.${pid},external_sales_id.eq.${pid}`)
      .limit(1);

    if (matchError) {
      console.error("cakto-webhook product resolve:", matchError);
    }

    const productId = matchRows?.[0]?.id ?? pid;

    const { data: users } = await supabase.auth.admin.listUsers();

    const user = users?.users.find((u: any) => u.email === email);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { error } = await supabase.from("purchases").upsert({
      user_id: user.id,
      product_id: productId,
      status: status === "refunded" ? "refunded" : "active",
    });

    if (error) {
      console.log(error);
      return res.status(500).json({ error: "Database error" });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
}
