import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FaceVerificationRequest {
  employee_id: string;
  captured_image: string; // Base64 encoded image
  stored_photo_url?: string; // URL of stored employee photo
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { employee_id, captured_image, stored_photo_url }: FaceVerificationRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Prepare prompt for face verification
    const systemPrompt = `You are a face verification assistant. Your job is to compare two face images and determine if they belong to the same person.

IMPORTANT RULES:
1. If both images clearly show faces of the same person, respond with: {"match": true, "confidence": 0.85-1.0, "reason": "brief explanation"}
2. If faces are different people, respond with: {"match": false, "confidence": 0.0-0.5, "reason": "brief explanation"}
3. If image quality is poor or face is not visible, respond with: {"match": false, "confidence": 0.0, "reason": "Image quality issue or face not detected"}
4. Always respond with valid JSON only, no other text.`;

    const userPrompt = stored_photo_url 
      ? `Compare the captured face image with the stored employee photo. Determine if they are the same person.

Employee ID: ${employee_id}
Stored Photo URL: ${stored_photo_url}
Captured Image: [Image provided in base64]

Analyze and provide your verification result in JSON format.`
      : `Analyze the captured face image and verify if it's a valid, clear face photo suitable for attendance verification.

Employee ID: ${employee_id}
Captured Image: [Image provided in base64]

Provide verification result in JSON format.`;

    // Call Lovable AI for face analysis
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: userPrompt },
              { 
                type: "image_url", 
                image_url: { 
                  url: captured_image.startsWith("data:") 
                    ? captured_image 
                    : `data:image/jpeg;base64,${captured_image}` 
                }
              }
            ]
          },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            error: "Rate limit exceeded. Please try again later.",
            confidence: 0
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            verified: false, 
            error: "AI credits exhausted. Please contact admin.",
            confidence: 0
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to verify face with AI");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    // Parse AI response
    let verificationResult;
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        verificationResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      verificationResult = {
        match: false,
        confidence: 0,
        reason: "Failed to process verification response"
      };
    }

    return new Response(
      JSON.stringify({
        verified: verificationResult.match === true,
        confidence: verificationResult.confidence || 0,
        reason: verificationResult.reason || "Verification completed",
        employee_id,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Face verification error:", errorMessage);
    return new Response(
      JSON.stringify({ 
        verified: false, 
        error: errorMessage,
        confidence: 0 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
