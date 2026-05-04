-- =============================================
-- FIX RLS POLICIES - Make them role-based
-- =============================================

-- Drop overly permissive policies for bus tables
DROP POLICY IF EXISTS "Staff can manage bus assignments" ON bus_assignments;
DROP POLICY IF EXISTS "Staff can manage bus passengers" ON bus_passengers;
DROP POLICY IF EXISTS "Staff can manage offline content" ON offline_content;

-- Create proper role-based policies for bus_assignments
CREATE POLICY "Authenticated users can view bus assignments" ON bus_assignments
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert bus assignments" ON bus_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
  );

CREATE POLICY "Admin can update bus assignments" ON bus_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
  );

CREATE POLICY "Admin can delete bus assignments" ON bus_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
  );

-- Create proper role-based policies for bus_passengers
CREATE POLICY "Authenticated users can view bus passengers" ON bus_passengers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admin can insert bus passengers" ON bus_passengers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
  );

CREATE POLICY "Admin can update bus passengers" ON bus_passengers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
  );

CREATE POLICY "Admin can delete bus passengers" ON bus_passengers
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
  );

-- Create proper role-based policies for offline_content (admin manage)
CREATE POLICY "Admin can insert offline content" ON offline_content
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'marketing')
    )
  );

CREATE POLICY "Admin can update offline content" ON offline_content
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'marketing')
    )
  );

CREATE POLICY "Admin can delete offline content" ON offline_content
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'owner', 'marketing')
    )
  );