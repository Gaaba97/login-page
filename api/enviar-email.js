export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método não permitido."
    });
  }

  try {
    // =========================================================
    // 1. VERIFICA O LOGIN DO FIREBASE
    // =========================================================

    const authorization = req.headers.authorization || "";

    if (!authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        ok: false,
        error: "Usuário não autenticado."
      });
    }

    const idToken = authorization.substring(7);

    const firebaseResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          idToken: idToken
        })
      }
    );

    const firebaseData = await firebaseResponse.json();

    if (
      !firebaseResponse.ok ||
      !firebaseData.users ||
      !firebaseData.users[0]
    ) {
      return res.status(401).json({
        ok: false,
        error: "Sessão Firebase inválida."
      });
    }

    const usuario = firebaseData.users[0];

    // SOMENTE GABRIEL PODE ENVIAR
    if (usuario.email !== "gabrielssimon7@gmail.com") {
      return res.status(403).json({
        ok: false,
        error: "Você não tem autorização para enviar e-mails."
      });
    }

    // =========================================================
    // 2. RECEBE OS DADOS DO ADMIN.HTML
    // =========================================================

    const { destinatarios, mensagem, assunto } = req.body;

    if (!Array.isArray(destinatarios) || destinatarios.length === 0) {
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

    // =========================================================
    // 3. ENVIA INDIVIDUALMENTE PELO RESEND
    // =========================================================

    const resultados = [];

    for (const destinatario of destinatarios) {
      if (!destinatario.email) continue;

      const nome = destinatario.nome || "cotista";

      const mensagemHTML = `
        <p>Olá ${escapeHtml(nome)}, tudo bem?</p>

        ${mensagem
          .split("\n")
          .map(linha => `<p>${escapeHtml(linha)}</p>`)
          .join("")}

        <br>

        <p>
          <a
            href="https://www.clubemorpheus.com"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#164CAD;
              color:#ffffff;
              text-decoration:none;
              border-radius:6px;
              font-family:Arial,sans-serif;
            "
          >
            Acessar o Clube Morpheus
          </a>
        </p>
      `;

      const resendResponse = await fetch(
        "https://api.resend.com/emails",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            from: "Clube Morpheus <conteudo@clubemorpheus.com>",
            to: [destinatario.email],
            subject: assunto || "Novo conteúdo — Clube Morpheus",
            html: mensagemHTML
          })
        }
      );

      const resendData = await resendResponse.json();

      resultados.push({
        email: destinatario.email,
        ok: resendResponse.ok,
        data: resendData
      });
    }

    const falhas = resultados.filter(item => !item.ok);

    return res.status(falhas.length > 0 ? 207 : 200).json({
      ok: falhas.length === 0,
      enviados: resultados.filter(item => item.ok).length,
      falhas: falhas.length,
      resultados
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
}


// =========================================================
// PROTEÇÃO CONTRA HTML INJETADO NA MENSAGEM
// =========================================================

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
