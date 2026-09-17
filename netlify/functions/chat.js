exports.handler = async (event) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Méthode non autorisée" }),
    };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Clé API manquante. Ajoute GROQ_API_KEY dans Site configuration > Environment variables." }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Corps de requête invalide" }),
    };
  }

  const payload = {
    model: body.model || "llama-3.3-70b-versatile",
    messages: Array.isArray(body.messages) ? body.messages : [],
    temperature: typeof body.temperature === "number" ? body.temperature : 0.4,
  };

  try {
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await groqResponse.json();

    return {
      statusCode: groqResponse.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json", ...corsHeaders },
      body: JSON.stringify({ error: "Erreur lors de l'appel à l'API Groq", details: String(err) }),
    };
  }
};
