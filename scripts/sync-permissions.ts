import { createClient } from '@supabase/supabase-js';
import { ALL_PERMISSION_KEYS } from '../artifacts/umrah-haji/src/lib/permissions';
import { RECOMMENDED_MENUS } from '../artifacts/umrah-haji/src/lib/admin-menu-registry';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function syncPermissions() {
  console.log('Starting permission sync...');

  // 1. Get current permissions from DB
  const { data: existingPermissions, error: fetchError } = await supabase
    .from('permissions_list')
    .select('key');

  if (fetchError) {
    console.error('Error fetching permissions:', fetchError);
    return;
  }

  const existingKeys = new Set(existingPermissions?.map(p => p.key) || []);
  
  // 2. Prepare permissions to insert/update
  // We use RECOMMENDED_MENUS to get labels and group names
  const permissionData = RECOMMENDED_MENUS.map(menu => ({
    key: menu.required_permission,
    label: menu.label,
    group_name: menu.group_name,
    description: `Access to ${menu.label}`
  }));

  // Add any permissions from ALL_PERMISSION_KEYS that might not be in RECOMMENDED_MENUS
  const menuPermissionKeys = new Set(permissionData.map(p => p.key));
  ALL_PERMISSION_KEYS.forEach(key => {
    if (!menuPermissionKeys.has(key)) {
      permissionData.push({
        key,
        label: key.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        group_name: 'Lainnya',
        description: `Permission for ${key}`
      });
    }
  });

  // 3. Upsert permissions
  console.log(`Upserting ${permissionData.length} permissions...`);
  const { error: upsertError } = await supabase
    .from('permissions_list')
    .upsert(permissionData, { onConflict: 'key' });

  if (upsertError) {
    console.error('Error upserting permissions:', upsertError);
  } else {
    console.log('Permissions synced successfully!');
  }
}

syncPermissions().catch(console.error);
