import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, editImageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!prompt || typeof prompt !== "string") {
      throw new Error("Prompt is required and must be a string");
    }

    console.log("Generating image with prompt:", prompt);
    console.log("Edit mode:", !!editImageBase64);

    const messages = editImageBase64
      ? [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: editImageBase64 },
              },
            ],
          },
        ]
      : [{ role: "user", content: prompt }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages,
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Full AI response:", JSON.stringify(data, null, 2));

    // Try multiple paths to extract the image
    let imageUrl = null;
    
    // Path 1: Standard image array
    if (data.choices?.[0]?.message?.images?.[0]?.image_url?.url) {
      imageUrl = data.choices[0].message.images[0].image_url.url;
      console.log("Found image via path 1 (images array)");
    }
    
    // Path 2: Direct image_url in message
    if (!imageUrl && data.choices?.[0]?.message?.image_url?.url) {
      imageUrl = data.choices[0].message.image_url.url;
      console.log("Found image via path 2 (direct image_url)");
    }
    
    // Path 3: Content array with image
    if (!imageUrl && Array.isArray(data.choices?.[0]?.message?.content)) {
      const imageContent = data.choices[0].message.content.find(
        (c: any) => c.type === "image_url" || c.type === "image"
      );
      if (imageContent?.image_url?.url) {
        imageUrl = imageContent.image_url.url;
        console.log("Found image via path 3 (content array)");
      } else if (imageContent?.url) {
        imageUrl = imageContent.url;
        console.log("Found image via path 3b (content array direct url)");
      }
    }

    // Path 4: Base64 in content
    if (!imageUrl && typeof data.choices?.[0]?.message?.content === "string") {
      const content = data.choices[0].message.content;
      const base64Match = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (base64Match) {
        imageUrl = base64Match[0];
        console.log("Found image via path 4 (base64 in content)");
      }
    }

    const textContent = typeof data.choices?.[0]?.message?.content === "string" 
      ? data.choices[0].message.content 
      : "";

    if (!imageUrl) {
      console.error("No image found in response. Response structure:", Object.keys(data));
      console.error("Choices structure:", data.choices?.[0] ? Object.keys(data.choices[0]) : "no choices");
      console.error("Message structure:", data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : "no message");
      throw new Error("No image was generated. The AI model might be experiencing issues.");
    }

    console.log("Successfully extracted image URL");

    return new Response(
      JSON.stringify({ 
        imageUrl, 
        textContent,
        success: true 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
