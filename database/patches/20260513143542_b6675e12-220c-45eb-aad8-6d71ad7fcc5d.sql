
REVOKE ALL ON FUNCTION public.receive_purchase_order(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.generate_po_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_po_number() TO authenticated;

REVOKE ALL ON FUNCTION public.is_store_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_admin(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.apply_stock_movement() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_store_order_sale_out() FROM PUBLIC, anon;
