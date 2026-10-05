export default async function handler(req, res) {
  // Aceita somente POST
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido."
    });
  }

  try {
    const { emails, mensagem } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        ok: false,
        error: "Nenhum destinatário selecionado."
      });
    }

    if (!mensagem || !mensagem.trim()) {
      return res.status(400).json({
        ok: false,
        error: "A mensagem está vazia."
      });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Clube Morpheus <conteudo@clubemorpheus.com>",
        to: emails,
        subject: "Novo conteúdo — Clube Morpheus",
        html: mensagem.replace(/\n/g, "<br>")
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        ok: false,
        error: data
      });
    }

    return res.status(200).json({
      ok: true,
      message: "E-mail enviado com sucesso.",
      data
    });

  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}
