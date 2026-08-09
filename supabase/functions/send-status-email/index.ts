import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const { email, complaintCode, status, message } = await req.json()

    if (!email || !complaintCode || !status) {
      return new Response(JSON.stringify({ error: "Missing email, complaintCode or status" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    const apiKey = Deno.env.get("RESEND_API_KEY")
    const from = Deno.env.get("RESEND_FROM_EMAIL")

    if (!apiKey || !from) {
      return new Response(JSON.stringify({ error: "Email service is not configured" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" }
      })
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: `CivicConnect update: ${complaintCode}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto">
            <h2 style="color:#0f766e">CivicConnect</h2>
            <p>Your civic complaint <strong>${complaintCode}</strong> has been updated.</p>
            <p><strong>Status:</strong> ${status.replaceAll("_", " ")}</p>
            ${message ? `<p><strong>Admin response:</strong> ${message}</p>` : ""}
            <p>Open CivicConnect to view the complete complaint timeline.</p>
          </div>
        `
      })
    })

    const result = await response.text()

    return new Response(result, {
      status: response.status,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" }
    })
  }
})