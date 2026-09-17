// netlify/functions/chat.js
//
// Relais entre les modules (navigateur, sans clé visible) et l'API Groq.
// La clé reste côté serveur, dans la variable d'environnement Netlify
// GROQ_API_KEY (jamais exposée au navigateur).
//
// Les modules appellent /.netlify/functions/chat au lieu d'appeler
// directement https://api.groq.com/... (bloqué par CORS depuis un
// navigateur, comme la plupart des API d'IA).

export default async (req) => {
  // En-têtes CORS : nécessaires car les modules vivent sur un autre
  // domaine (claude.ai / claudeusercontent.com) que ce relais.
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Requête de pré-vérification CORS (le navigateur l'envoie avant le vrai POST)
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Méthode non autorisée" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "Clé API manquante. Ajoute la variable d'environnement GROQ_API_KEY dans les paramètres du site Netlify (Site configuration > Environment variables).",
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Corps de requête invalide" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // On ne relaie que ce qui est nécessaire, pour éviter qu'un appel
  // malveillant n'injecte d'autres paramètres.
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

    return new Response(JSON.stringify(data), {
      status: groqResponse.status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Erreur lors de l'appel à l'API Groq", details: String(err) }),
      { status: 502, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

export const config = {
  path: "/.netlify/functions/chat",
};
