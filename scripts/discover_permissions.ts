import * as fs from 'fs';
import * as path from 'path';

interface PermissionEntry {
  key: string;
  label: string;
  group_name: string;
  description: string;
  type: 'UI_COMPONENT' | 'API_ENDPOINT' | 'DATA_FIELD' | 'ACTION';
  resource_identifier: string;
}

const DISCOVERY_DIR = path.join(__dirname, '../src');
const PERMISSION_REGEX = /@withPermission\(\s*["']([^"']+)["']\s*,\s*{\s*label:\s*["']([^"']+)["']\s*,\s*group:\s*["']([^"']+)["']\s*,\s*description:\s*["']([^"']+)["']\s*,\s*type:\s*["']([^"']+)["']\s*,\s*resource:\s*["']([^"']+)["']\s*}\s*\)/g;

function scanFiles(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      scanFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

function discoverPermissions() {
  const allFiles = scanFiles(DISCOVERY_DIR);
  const discovered: PermissionEntry[] = [];

  allFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = PERMISSION_REGEX.exec(content)) !== null) {
      discovered.push({
        key: match[1],
        label: match[2],
        group_name: match[3],
        description: match[4],
        type: match[5] as any,
        resource_identifier: match[6]
      });
    }
  });

  console.log(`Discovered ${discovered.length} permissions.`);
  
  // Output ke SQL format untuk migrasi atau integrasi API
  const sql = discovered.map(p => 
    `INSERT INTO public.permissions_list (key, label, group_name, description, type, resource_identifier)
     VALUES ('${p.key}', '${p.label}', '${p.group_name}', '${p.description}', '${p.type}', '${p.resource_identifier}')
     ON CONFLICT (key) DO UPDATE SET
       label = EXCLUDED.label,
       group_name = EXCLUDED.group_name,
       description = EXCLUDED.description,
       type = EXCLUDED.type,
       resource_identifier = EXCLUDED.resource_identifier;`
  ).join('\n');

  fs.writeFileSync(path.join(__dirname, '../supabase/migrations/20260415000001_discovered_permissions.sql'), sql);
  console.log('SQL migration generated: 20260415000001_discovered_permissions.sql');
}

discoverPermissions();
