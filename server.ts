import express from 'express';
import cors from 'cors';
import { Resend } from 'resend';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Resend
const resendApiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY || '';
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.VITE_RESEND_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || 'notificaciones@evecasas.onmicrosoft.com';

// Endpoint to send approval emails
app.post('/api/request-access', async (req, res) => {
  const { userName, userEmail, appUrl } = req.body;

  if (!userName || !userEmail) {
    return res.status(400).json({ error: 'Faltan campos requeridos: userName, userEmail.' });
  }

  if (!resend) {
    console.error('RESEND_API_KEY is not configured in environment variables.');
    return res.status(500).json({ error: 'El servidor de correo no está configurado.' });
  }

  try {
    const timestamp = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
    const directUrl = `${appUrl || 'https://ais-dev-24q7edlfjh3p2ksro6ao62-440695687751.us-east1.run.app'}/administracion`;

    const response = await resend.emails.send({
      from: `Eveca Sistema <${fromEmail}>`,
      to: 'wmartinezm360@gmail.com',
      subject: `🔔 Nueva solicitud de acceso — ${userName}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1f2937; border-radius: 8px; background-color: #0b0f19; color: #fff;">
          <h2 style="color: #00c5dc; border-bottom: 1px solid #1f2937; padding-bottom: 10px;">Nueva Solicitud de Acceso</h2>
          <p style="font-size: 16px;">Se ha registrado un usuario solicitando acceso al sistema de gestión de sostenibilidad <strong>Eveca S.A.S.</strong></p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #8b92a9; width: 140px;">Nombre:</td>
              <td style="padding: 8px; color: #fff;">${userName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #8b92a9;">Email:</td>
              <td style="padding: 8px; color: #fff;">${userEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px; font-weight: bold; color: #8b92a9;">Fecha / Hora:</td>
              <td style="padding: 8px; color: #fff;">${timestamp} (CO)</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 30px;">
            <a href="${directUrl}" style="background-color: #00c5dc; color: #0b0f19; font-weight: bold; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Ir al Panel de Administración
            </a>
          </div>
        </div>
      `
    });

    if (response.error) {
      console.error('Error from Resend SDK:', response.error);
      return res.status(400).json({ error: response.error });
    }

    return res.status(200).json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('Request Access Server error:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
});

// Serve frontend assets
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// For SPA routing
app.get('*', (req, res, next) => {
  // Pass API routes
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Configure standard server startup
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Base server is serving fine on port ${PORT}`);
});
