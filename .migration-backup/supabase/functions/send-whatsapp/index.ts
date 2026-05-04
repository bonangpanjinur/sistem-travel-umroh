import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppRequest {
  phone: string;
  template_code: string;
  variables?: Record<string, string>;
  custom_message?: string;
}

interface WhatsAppConfig {
  provider: string;
  api_key: string;
  sender_number: string;
  is_active: boolean;
}

interface WhatsAppTemplate {
  id: string;
  message_template: string;
  variables: string[];
}

// Send message via Fonnte
async function sendViaFonnte(apiKey: string, phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target: phone,
        message: message,
        countryCode: "62",
      }),
    });

    const data = await response.json();
    
    if (data.status === true || data.status === "true") {
      return { success: true };
    }
    return { success: false, error: data.reason || data.message || "Unknown error" };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Send message via Wablas
async function sendViaWablas(apiKey: string, phone: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch("https://console.wablas.com/api/send-message", {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: phone,
        message: message,
      }),
    });

    const data = await response.json();
    
    if (data.status === true) {
      return { success: true };
    }
    return { success: false, error: data.message || "Unknown error" };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Replace template variables
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { phone, template_code, variables, custom_message }: WhatsAppRequest = await req.json();

    if (!phone) {
      throw new Error("Phone number is required");
    }

    // Get WhatsApp config
    const { data: configData, error: configError } = await supabase
      .from("whatsapp_config")
      .select("*")
      .single();

    if (configError || !configData) {
      throw new Error("WhatsApp not configured");
    }

    const config = configData as WhatsAppConfig;

    if (!config.is_active) {
      throw new Error("WhatsApp integration is disabled");
    }

    if (!config.api_key) {
      throw new Error("WhatsApp API key not set");
    }

    // Get message content
    let message = custom_message || "";
    let templateId: string | null = null;

    if (template_code && !custom_message) {
      const { data: templateData, error: templateError } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .eq("code", template_code)
        .eq("is_active", true)
        .single();

      if (templateError || !templateData) {
        throw new Error(`Template '${template_code}' not found or inactive`);
      }

      const template = templateData as WhatsAppTemplate;
      templateId = template.id;
      message = replaceVariables(template.message_template, variables || {});
    }

    if (!message) {
      throw new Error("Message content is required");
    }

    // Format phone number (remove leading 0, add 62)
    let formattedPhone = phone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('62')) {
      formattedPhone = '62' + formattedPhone;
    }

    // Send message based on provider
    let result: { success: boolean; error?: string };

    switch (config.provider) {
      case 'fonnte':
        result = await sendViaFonnte(config.api_key, formattedPhone, message);
        break;
      case 'wablas':
        result = await sendViaWablas(config.api_key, formattedPhone, message);
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }

    // Log the message
    await supabase.from("whatsapp_logs").insert({
      template_id: templateId,
      recipient_phone: formattedPhone,
      message_content: message,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
      sent_at: result.success ? new Date().toISOString() : null,
    });

    if (!result.success) {
      throw new Error(result.error || "Failed to send message");
    }

    return new Response(
      JSON.stringify({ success: true, message: "WhatsApp message sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("WhatsApp send error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});