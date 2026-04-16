-- Fix get_user_all_permissions to correctly handle multiple roles by aggregating is_enabled with OR logic
CREATE OR REPLACE FUNCTION public.get_user_all_permissions(_user_id UUID)
RETURNS TABLE(permission_key VARCHAR, label VARCHAR, group_name VARCHAR, is_enabled BOOLEAN, source TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH combined_permissions AS (
    -- Get user-level permissions
    SELECT 
      pl.key,
      pl.label,
      pl.group_name,
      up.is_enabled,
      'user'::TEXT as source,
      1 as priority -- User level has highest priority
    FROM public.user_permissions up
    JOIN public.permissions_list pl ON up.permission_key = pl.key
    WHERE up.user_id = _user_id
    
    UNION ALL
    
    -- Get role-based permissions from ALL roles
    SELECT 
      pl.key,
      pl.label,
      pl.group_name,
      rp.is_enabled,
      'role'::TEXT as source,
      2 as priority
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions_list pl ON rp.permission_key = pl.key
    WHERE ur.user_id = _user_id
  ),
  aggregated_permissions AS (
    -- Group by permission key and take the best result
    -- If any role enables it, it should be enabled (bool_or)
    -- But user-level override still takes precedence
    SELECT 
      cp.key,
      cp.label,
      cp.group_name,
      -- Logic: if user level exists, use it. Otherwise, OR all role results.
      CASE 
        WHEN bool_or(cp.priority = 1) THEN 
          bool_or(cp.priority = 1 AND cp.is_enabled)
        ELSE 
          bool_or(cp.is_enabled)
      END as final_is_enabled,
      CASE 
        WHEN bool_or(cp.priority = 1) THEN 'user'::TEXT
        ELSE 'role'::TEXT
      END as final_source
    FROM combined_permissions cp
    GROUP BY cp.key, cp.label, cp.group_name
  )
  SELECT 
    key,
    label,
    group_name,
    final_is_enabled,
    final_source
  FROM aggregated_permissions;
END;
$$;
