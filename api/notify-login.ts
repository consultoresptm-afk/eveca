import { Resend } from "resend";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, name } = req.body;
    
    if (!process.env.RESEND_API_KEY) {
      console.warn("No RESEND_API_KEY found, skipping email notification.");
      return res.status(200).json({ success: true, message: "Skipped email" });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    console.log(`Sending email notification for login: ${name} (${email})`);
    
    const { data, error } = await resend.emails.send({
      from: "Eveca System <onboarding@resend.dev>",
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
}
