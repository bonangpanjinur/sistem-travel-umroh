-- =====================================================
-- FINAL UDAC AUDIT FIX: REMOVE SILENT ERRORS & ADD ACCESS LOGGING
-- =====================================================

-- 1. Improved Audit Trigger for role_permissions
CREATE OR REPLACE FUNCTION public.handle_role_permissions_audit()
RETURNS TRIGGER AS $$
DECLARE
    _user_id UUID;
BEGIN
    _user_id := auth.uid();
    NEW.updated_at = NOW();
    NEW.updated_by = _user_id;
    
    INSERT INTO public.audit_logs (
        user_id,
        table_name,
        record_id,
        action,
        action_type,
        old_data,
        new_data,
        severity,
        created_at
    ) VALUES (
        _user_id,
        'role_permissions',
        NEW.id,
        'Update role permission: ' || NEW.permission_key || ' for ' || NEW.role,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE TG_OP
        END,
        to_jsonb(OLD),
        to_jsonb(NEW),
        'warning',
        NOW()
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'UDAC Audit log failed for role_permissions: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Improved Audit Trigger for permissions_list
CREATE OR REPLACE FUNCTION public.handle_permissions_list_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        table_name,
        record_id,
        action,
        action_type,
        old_data,
        new_data,
        severity,
        created_at
    ) VALUES (
        auth.uid(),
        'permissions_list',
        NULL,
        'Modify permission definition: ' || COALESCE(NEW.key, OLD.key),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        'info',
        NOW()
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'UDAC Audit log failed for permissions_list: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Access Attempt Logging Implementation
CREATE OR REPLACE FUNCTION public.log_access_attempt(
    _user_id UUID, 
    _permission_key TEXT, 
    _is_granted BOOLEAN, 
    _context JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    _log_id UUID;
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        table_name,
        action,
        action_type,
        new_data,
        severity,
        metadata,
        created_at
    ) VALUES (
        _user_id,
        'access_control',
        CASE WHEN _is_granted THEN 'Access Granted' ELSE 'Access Denied' END || ': ' || _permission_key,
        'ACCESS_ATTEMPT',
        jsonb_build_object('is_granted', _is_granted, 'permission_key', _permission_key),
        CASE WHEN _is_granted THEN 'info' ELSE 'warning' END,
        _context,
        NOW()
    ) RETURNING id INTO _log_id;
    
    RETURN _log_id;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Failed to log access attempt: %', SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Clean Implementation of check_permission_v3 (No GOTO, No Labels)
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
  _policy_match BOOLEAN := FALSE;
  _user_permission_status BOOLEAN;
  _found_user_override BOOLEAN := FALSE;
  _role_permission_status BOOLEAN;
  _final_result BOOLEAN := FALSE;
BEGIN
  -- Step 1: Check Admin/Owner Status
  SELECT public.is_admin(_user_id) INTO _is_admin;
  
  IF _is_admin THEN 
    _final_result := TRUE;
  ELSE
    -- Step 2: Check User-Level Overrides
    SELECT is_enabled, TRUE INTO _user_permission_status, _found_user_override
    FROM public.user_permissions
    WHERE user_id = _user_id AND permission_key = _permission_key;

    IF _found_user_override THEN 
      _final_result := _user_permission_status;
    ELSE
      -- Step 3: Evaluate ABAC Policies
      SELECT jsonb_build_object(
        'id', id,
        'branch_id', branch_id,
        'role', (SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1)
      ) INTO _user_attrs
      FROM public.profiles
      WHERE id = _user_id;

      FOR _policy IN 
        SELECT policy_definition 
        FROM public.access_policies 
        WHERE is_active = TRUE AND (policy_definition->>'permission_key' = _permission_key OR policy_definition->>'permission_key' = '*')
      LOOP
        IF public.evaluate_abac_condition(_policy.policy_definition->'condition', _user_attrs, _resource_attrs) THEN
          IF _policy.policy_definition->>'effect' = 'deny' THEN
            _final_result := FALSE;
            _policy_match := FALSE;
            EXIT; -- Exit loop immediately on deny
          ELSIF _policy.policy_definition->>'effect' = 'permit' THEN
            _policy_match := TRUE;
          END IF;
        END IF;
      END LOOP;

      IF _policy_match THEN 
        _final_result := TRUE;
      ELSE
        -- Step 4: Role-Based Permissions
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

        _final_result := _role_permission_status;
      END IF;
    END IF;
  END IF;

  -- Always log the attempt before returning
  PERFORM public.log_access_attempt(_user_id, _permission_key, _final_result, _resource_attrs);
  
  RETURN _final_result;
END;
$$;
