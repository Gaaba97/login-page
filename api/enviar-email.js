export default async function handler(req, res) {

  // =========================================================
  // CORS
  // =========================================================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://www.clubemorpheus.com"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );


  // Responde ao preflight do navegador
  if (req.method === "OPTIONS") {

    return res.status(204).end();

  }


  // =========================================================
  // MÉTODO
  // =========================================================

  if (req.method !== "POST") {

    return res.status(405).json({
      ok: false,
      error: "Método não permitido."
    });

  }


  try {

    // =======================================================
    // AUTENTICAÇÃO FIREBASE
    // =======================================================

    const authorization =
      req.headers.authorization || "";


    if (!authorization.startsWith("Bearer ")) {

      return res.status(401).json({
        ok: false,
        error: "Usuário não autenticado."
      });

    }


    const idToken =
      authorization.substring(7);


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


    const firebaseData =
      await firebaseResponse.json();


if (
  !firebaseResponse.ok ||
  !firebaseData.users ||
  !firebaseData.users[0]
) {

  return res.status(401).json({
    ok: false,
    error:
      "Firebase: " +
      (
        firebaseData?.error?.message ||
        "token inválido ou não foi possível validar."
      )
  });

}


    const usuario =
      firebaseData.users[0];


    // =======================================================
    // AUTORIZAÇÃO DO ADMINISTRADOR
    // =======================================================

    if (
      usuario.email !==
      "gabrielssimon7@gmail.com"
    ) {

      return res.status(403).json({
        ok: false,
        error:
          "Você não tem autorização para enviar e-mails."
      });

    }


    // =======================================================
    // DADOS RECEBIDOS
    // =======================================================

    const {
      destinatarios,
      mensagem,
      assunto
    } = req.body;


    if (
      !Array.isArray(destinatarios) ||
      destinatarios.length === 0
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "Nenhum destinatário selecionado."
      });

    }


    if (
      !mensagem ||
      !mensagem.trim()
    ) {

      return res.status(400).json({
        ok: false,
        error:
          "A mensagem está vazia."
      });

    }


    // =======================================================
    // ENVIO
    // =======================================================

    const resultados = [];


    for (
      const destinatario
      of destinatarios
    ) {

      if (!destinatario.email) {
        continue;
      }


      const nome =
        destinatario.nome ||
        "cotista";


      const mensagemHTML = `
        <p>
          Olá ${escapeHtml(nome)}, tudo bem?
        </p>

        ${mensagem
          .split("\n")
          .map(
            linha =>
              `<p>${escapeHtml(linha)}</p>`
          )
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


      const resendResponse =
        await fetch(
          "https://api.resend.com/emails",
          {
            method: "POST",

            headers: {
              "Authorization":
                `Bearer ${process.env.RESEND_API_KEY}`,

              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              from:
                "Clube Morpheus <conteudo@clubemorpheus.com>",

              to: [
                destinatario.email
              ],

              subject:
                assunto ||
                "Novo conteúdo — Clube Morpheus",

              html:
                mensagemHTML

            })
          }
        );


      const resendData =
        await resendResponse.json();


      resultados.push({

        email:
          destinatario.email,

        ok:
          resendResponse.ok,

        data:
          resendData

      });

    }


    // =======================================================
    // RESULTADO
    // =======================================================

    const falhas =
      resultados.filter(
        item => !item.ok
      );


    return res.status(
      falhas.length > 0
        ? 207
        : 200
    ).json({

      ok:
        falhas.length === 0,

      enviados:
        resultados.filter(
          item => item.ok
        ).length,

      falhas:
        falhas.length,

      resultados

    });


  } catch (error) {

    console.error(error);


    return res.status(500).json({

      ok: false,

      error:
        error.message

    });

  }

}


// =========================================================
// SEGURANÇA HTML
// =========================================================

function escapeHtml(text) {

  return String(text)

    .replace(
      /&/g,
      "&amp;"
    )

    .replace(
      /</g,
      "&lt;"
    )

    .replace(
      />/g,
      "&gt;"
    )

    .replace(
      /"/g,
      "&quot;"
    )

    .replace(
      /'/g,
      "&#039;"
    );

}
