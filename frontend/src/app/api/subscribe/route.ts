import { NextRequest, NextResponse } from "next/server";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const BREVO_LIST_ID = process.env.BREVO_LIST_ID || "2"; // Default list ID

interface SubscribeRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  // Honeypot field - should be empty
  website?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json();
    const { email, firstName, lastName, website } = body;

    // Honeypot check - reject if filled
    if (website && website.trim() !== "") {
      // Silent fail for bots
      return NextResponse.json(
        { success: true, message: "Inscription reussie" },
        { status: 200 }
      );
    }

    // Validate email
    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Adresse email invalide" },
        { status: 400 }
      );
    }

    // Check Brevo API key
    if (!BREVO_API_KEY) {
      console.error("BREVO_API_KEY not configured");
      return NextResponse.json(
        { error: "Service non configure" },
        { status: 500 }
      );
    }

    // Call Brevo API
    const brevoResponse = await fetch(
      "https://api.brevo.com/v3/contacts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": BREVO_API_KEY,
        },
        body: JSON.stringify({
          email,
          attributes: {
            PRENOM: firstName || "",
            NOM: lastName || "",
          },
          listIds: [parseInt(BREVO_LIST_ID)],
          updateEnabled: true, // Update if exists
        }),
      }
    );

    if (!brevoResponse.ok) {
      const errorData = await brevoResponse.json();
      console.error("Brevo API error:", errorData);

      // Check if contact already exists
      if (errorData.code === "duplicate_parameter") {
        return NextResponse.json(
          { success: true, message: "Vous etes deja inscrit !" },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: "Erreur lors de l'inscription" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Inscription reussie" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Subscribe error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
