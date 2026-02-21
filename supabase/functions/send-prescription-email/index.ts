import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PrescriptionEmailRequest {
  prescriptionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { prescriptionId }: PrescriptionEmailRequest = await req.json();

    // Obtener los datos de la receta con información del paciente y médico
    const { data: prescription, error: prescriptionError } = await supabase
      .from("prescriptions")
      .select(`
        *,
        patients (
          first_name,
          last_name,
          email,
          document_number
        ),
        profiles!prescriptions_doctor_id_fkey (
          full_name,
          license_number,
          specialty
        )
      `)
      .eq("id", prescriptionId)
      .single();

    if (prescriptionError || !prescription) {
      throw new Error("Receta no encontrada");
    }

    if (!prescription.patients.email) {
      throw new Error("El paciente no tiene email registrado");
    }

    // Generar HTML del email
    const medicationsHtml = Array.isArray(prescription.medications)
      ? prescription.medications
          .map(
            (med: any) => `
          <div style="margin: 12px 0; padding: 12px; background-color: #f8f9fa; border-radius: 6px;">
            <p style="margin: 4px 0; font-weight: 600; color: #0066cc;">${med.name}</p>
            <p style="margin: 4px 0; color: #495057;">Dosis: ${med.dosage}</p>
            ${med.frequency ? `<p style="margin: 4px 0; color: #495057;">Frecuencia: ${med.frequency}</p>` : ""}
            ${med.duration ? `<p style="margin: 4px 0; color: #495057;">Duración: ${med.duration}</p>` : ""}
          </div>
        `
          )
          .join("")
      : "";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #0066cc 0%, #0080e6 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="margin: 0; font-size: 28px;">MediCloud</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px;">Receta Médica Electrónica</p>
          </div>
          
          <div style="background-color: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <h2 style="color: #0066cc; margin-top: 0;">Estimado/a ${prescription.patients.first_name} ${prescription.patients.last_name}</h2>
            
            <p>Se ha generado una nueva receta médica electrónica para usted.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Paciente:</strong> ${prescription.patients.first_name} ${prescription.patients.last_name}</p>
              <p style="margin: 5px 0;"><strong>DNI:</strong> ${prescription.patients.document_number}</p>
              <p style="margin: 5px 0;"><strong>Fecha de emisión:</strong> ${new Date(prescription.created_at).toLocaleDateString("es-ES")}</p>
              <p style="margin: 5px 0;"><strong>Válida hasta:</strong> ${new Date(prescription.valid_until).toLocaleDateString("es-ES")}</p>
            </div>

            ${prescription.diagnosis ? `
              <div style="margin: 20px 0;">
                <h3 style="color: #0066cc; margin-bottom: 10px;">Diagnóstico</h3>
                <p style="margin: 5px 0;">${prescription.diagnosis}</p>
              </div>
            ` : ""}

            <div style="margin: 20px 0;">
              <h3 style="color: #0066cc; margin-bottom: 10px;">Medicamentos Prescriptos</h3>
              ${medicationsHtml}
            </div>

            ${prescription.instructions ? `
              <div style="margin: 20px 0;">
                <h3 style="color: #0066cc; margin-bottom: 10px;">Instrucciones Adicionales</h3>
                <p style="background-color: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107;">
                  ${prescription.instructions}
                </p>
              </div>
            ` : ""}

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
              <p style="margin: 5px 0;"><strong>Médico:</strong> ${prescription.profiles?.full_name || "No especificado"}</p>
              ${prescription.profiles?.license_number ? `<p style="margin: 5px 0;"><strong>Matrícula:</strong> ${prescription.profiles.license_number}</p>` : ""}
              ${prescription.profiles?.specialty ? `<p style="margin: 5px 0;"><strong>Especialidad:</strong> ${prescription.profiles.specialty}</p>` : ""}
            </div>

            <div style="margin-top: 30px; padding: 15px; background-color: #e7f3ff; border-radius: 6px; border-left: 4px solid #0066cc;">
              <p style="margin: 0; font-size: 14px; color: #004085;">
                <strong>Importante:</strong> Esta receta es válida hasta el ${new Date(prescription.valid_until).toLocaleDateString("es-ES")}. 
                Consulte con su farmacéutico o médico si tiene alguna duda sobre la medicación prescripta.
              </p>
            </div>
          </div>

          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6c757d;">
            <p style="margin: 0;">Este es un correo automático, por favor no responder.</p>
            <p style="margin: 5px 0;">MediCloud - Sistema de Gestión Médica</p>
          </div>
        </body>
      </html>
    `;

    // Enviar email usando Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: "MediCloud <onboarding@resend.dev>",
        to: [prescription.patients.email],
        subject: `Receta Médica - ${prescription.patients.first_name} ${prescription.patients.last_name}`,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      throw new Error(`Error al enviar email: ${error}`);
    }

    const emailData = await resendResponse.json();

    return new Response(
      JSON.stringify({ success: true, emailId: emailData.id }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-prescription-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
