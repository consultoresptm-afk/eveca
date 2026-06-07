import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { Resend } from "resend";
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Init Resend. 
  // IMPORTANT: The user MUST provide RESEND_API_KEY in their .env
  const resend = new Resend(process.env.RESEND_API_KEY || "missing-key");

  // API Routes
  app.post("/api/notify-login", async (req, res) => {
    try {
      const { email, name } = req.body;
      
      if (!process.env.RESEND_API_KEY) {
        console.warn("No RESEND_API_KEY found, skipping email notification.");
        return res.status(200).json({ success: true, message: "Skipped email" });
      }

      console.log(`Sending email notification for login: ${name} (${email})`);
      
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Eveca System <onboarding@resend.dev>";
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: "wmartinezm360@gmail.com",
        subject: "Alerta de Ingreso al Sistema - Jefatura de Sostenibilidad",
        html: `
          <h2>Nueva Alerta de Ingreso al Sistema</h2>
          <p>Un usuario acaba de ingresar al sistema Eveca - Jefatura de Sostenibilidad.</p>
          <ul>
            <li><strong>Nombre:</strong> ${name || "No proporcionado"}</li>
            <li><strong>Correo:</strong> ${email}</li>
          </ul>
          <p><small>Este es un mensaje automático del sistema. La hora de acceso fue: ${new Date().toLocaleString()}</small></p>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return res.status(400).json({ error });
      }

      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.post("/api/request-access", async (req, res) => {
    try {
      const { userId, userName, userEmail } = req.body;

      if (!process.env.RESEND_API_KEY) {
        console.warn("No RESEND_API_KEY found, skipping email notification.");
        return res.status(200).json({ success: true, message: "Skipped email because key is missing" });
      }

      console.log(`Sending email notification for access request: ${userName} (${userEmail})`);

      const appUrl = req.headers.origin || process.env.APP_URL || "https://ais-dev-24q7edlfjh3p2ksro6ao62-440695687751.us-east1.run.app";
      const fromEmail = process.env.RESEND_FROM_EMAIL || "Eveca Sistema <onboarding@resend.dev>";

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: "wmartinezm360@gmail.com",
        subject: `🔔 Nueva solicitud de acceso — ${userName}`,
        html: `
          <h2>Nueva solicitud de acceso al sistema Eveca</h2>
          <p><strong>Nombre completo del usuario:</strong> ${userName}</p>
          <p><strong>Email del usuario:</strong> ${userEmail}</p>
          <p><strong>Fecha y hora de la solicitud:</strong> ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
          <p>
            <a href="${appUrl}/admin" style="background-color: #00c5dc; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-family: sans-serif;">
              Ir al módulo de Administración
            </a>
          </p>
        `,
      });

      if (error) {
        console.error("Resend error:", error);
        return res.status(400).json({ error });
      }

      res.status(200).json({ success: true, data });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
