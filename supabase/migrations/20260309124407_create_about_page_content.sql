CREATE TABLE about_page_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settings_id UUID REFERENCES website_settings(id) ON DELETE CASCADE,
  mission_text TEXT,
  vision_text TEXT,
  values JSONB,
  milestones JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE about_page_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public about_page_content are viewable by everyone." ON about_page_content FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert about_page_content." ON about_page_content FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update their own about_page_content." ON about_page_content FOR UPDATE USING (auth.uid() = (SELECT user_id FROM website_settings WHERE id = settings_id));
CREATE POLICY "Authenticated users can delete their own about_page_content." ON about_page_content FOR DELETE USING (auth.uid() = (SELECT user_id FROM website_settings WHERE id = settings_id));
