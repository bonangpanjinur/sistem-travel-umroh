-- =====================================================
-- ABAC ENGINE (Attribute-Based Access Control)
-- =====================================================

-- 1. Helper function to evaluate conditions in JSONB policy
-- This is a simple implementation that checks if attributes match the condition.
-- Example policy: { "field": "branch_id", "operator": "eq", "value": "user.branch_id" }
CREATE OR REPLACE FUNCTION public.evaluate_abac_condition(_condition JSONB, _user_attrs JSONB, _resource_attrs JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  _field TEXT;
  _op TEXT;
  _val_raw JSONB;
  _val_resolved TEXT;
  _attr_val TEXT;
BEGIN
  _field := _condition->>'field';
  _op := _condition->>'operator';
  _val_raw := _condition->'value';

  -- Resolve value (e.g., if it starts with 'user.' or 'resource.')
  IF _val_raw::TEXT LIKE '"user.%' THEN
    _val_resolved := _user_attrs->>(_val_raw->>0);
  ELSIF _val_raw::TEXT LIKE '"resource.%' THEN
    _val_resolved := _resource_attrs->>(_val_raw->>0);
  ELSE
    _val_resolved := _val_raw->>0;
  END IF;

  -- Get actual attribute value from resource or user
  IF _field LIKE 'user.%' THEN
    _attr_val := _user_attrs->>(substring(_field from 6));
  ELSE
    _attr_val := _resource_attrs->>_field;
  END IF;

  -- Evaluate operator
  CASE _op
    WHEN 'eq' THEN RETURN _attr_val = _val_resolved;
    WHEN 'neq' THEN RETURN _attr_val <> _val_resolved;
    WHEN 'gt' THEN RETURN _attr_val::NUMERIC > _val_resolved::NUMERIC;
    WHEN 'lt' THEN RETURN _attr_val::NUMERIC < _val_resolved::NUMERIC;
    WHEN 'in' THEN RETURN _val_raw->'list' @> jsonb_build_array(_attr_val);
    ELSE RETURN FALSE;
  END CASE;
EXCEPTION
  WHEN OTHERS THEN RETURN FALSE;
END;
$$;

-- 2. Final check_permission_v3 with ABAC integration
CREATE OR REPLACE FUNCTION public.check_permission_v3(_user_id UUID, _permission_key TEXT, _resource_attrs JSONB DEFAULT '{}')
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _user_attrs JSONB;
  _policy RECORD;
  _policy_match BOOLEAN;
  _user_permission_status BOOLEAN;
  _found_user_override BOOLEAN;
  _role_permission_status BOOLEAN;
BEGIN
  -- 1. Super Admin & Owner bypass
  SELECT public.is_admin(_user_id) INTO _is_admin;
  IF _is_admin THEN RETURN TRUE; END IF;

  -- Get user attributes for ABAC
  SELECT jsonb_build_object(
    'id', id,
    'branch_id', branch_id,
    'role', (SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1)
  ) INTO _user_attrs
  FROM public.profiles
  WHERE id = _user_id;

  -- 2. User-Level Override (Highest Priority)
  SELECT is_enabled, TRUE INTO _user_permission_status, _found_user_override
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission_key;

  IF _found_user_override THEN RETURN _user_permission_status; END IF;

  -- 3. ABAC Policies Evaluation
  FOR _policy IN 
    SELECT policy_definition 
    FROM public.access_policies 
    WHERE is_active = TRUE AND (policy_definition->>'permission_key' = _permission_key OR policy_definition->>'permission_key' = '*')
  LOOP
    IF public.evaluate_abac_condition(_policy.policy_definition->'condition', _user_attrs, _resource_attrs) THEN
      IF _policy.policy_definition->>'effect' = 'deny' THEN
        RETURN FALSE;
      ELSIF _policy.policy_definition->>'effect' = 'permit' THEN
        _policy_match := TRUE;
      END IF;
    END IF;
  END LOOP;

  IF _policy_match THEN RETURN TRUE; END IF;

  -- 4. Role-Based Permissions (including Hierarchy)
  WITH RECURSIVE user_all_roles AS (
    SELECT role FROM public.user_roles WHERE user_id = _user_id
    UNION
    SELECT rh.child_role
    FROM public.role_hierarchy rh
    JOIN user_all_roles uar ON rh.parent_role = uar.role
  )
  SELECT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role IN (SELECT role FROM user_all_roles)
      AND rp.permission_key = _permission_key
      AND rp.is_enabled = TRUE
  ) INTO _role_permission_status;

  RETURN _role_permission_status;
END;
$$;
