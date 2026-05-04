-- Update menu structure to move 'Kamar' to 'Produk & Operasional' and remove 'Operasional' group
-- First, ensure 'Kamar' is in 'Produk & Operasional'
UPDATE menu_items 
SET group_name = 'Produk & Operasional', 
    sort_order = 4 
WHERE key = 'room-assignments';

-- Adjust other items in 'Produk & Operasional' to make room and maintain order
UPDATE menu_items SET sort_order = 1 WHERE key = 'packages';
UPDATE menu_items SET sort_order = 2 WHERE key = 'departures';
UPDATE menu_items SET sort_order = 3 WHERE key = 'bookings';
UPDATE menu_items SET sort_order = 5 WHERE key = 'equipment';
UPDATE menu_items SET sort_order = 6 WHERE key = 'itinerary-templates';
UPDATE menu_items SET sort_order = 7 WHERE key = 'savings';

-- If there are any other items in 'Operasional' group, move them or delete the group
-- Based on the registry, there shouldn't be any, but we can check and clean up
UPDATE menu_items 
SET group_name = 'Produk & Operasional' 
WHERE group_name = 'Operasional';
