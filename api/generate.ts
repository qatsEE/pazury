import { GoogleGenAI, Modality } from "@google/genai";

// By exporting runtime, we can instruct Vercel to use the Edge Runtime,
// which has a longer execution timeout. This is crucial for AI image generation
// which can sometimes take longer than the default 10-second limit.
export const runtime = 'edge';

export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Metoda niedozwolona' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return new Response(JSON.stringify({ error: 'Brak klucza API na serwerze' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { handImage, nailDesignImage } = await request.json();

        if (!handImage || !nailDesignImage) {
            return new Response(JSON.stringify({ error: 'Brakujące dane obrazów' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const ai = new GoogleGenAI({ apiKey });

        const handImagePart = {
            inlineData: {
                mimeType: handImage.type,
                data: handImage.base64,
            },
        };

        const nailDesignImagePart = {
            inlineData: {
                mimeType: nailDesignImage.type,
                data: nailDesignImage.base64,
            },
        };
        
        const textPart = {
            text: "Użyj pierwszego zdjęcia jako bazy. Nałóż wzór paznokci z drugiego zdjęcia na paznokcie widoczne na pierwszym zdjęciu. Zachowaj oryginalną dłoń, odcień skóry i tło. Rezultatem powinno być wyłącznie ostateczne, edytowane zdjęcie.",
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [handImagePart, nailDesignImagePart, textPart],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });
        
        // Robustly find the image part in the response, instead of assuming its position.
        const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);

        if (imagePart && imagePart.inlineData) {
            const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
            return new Response(JSON.stringify({ imageUrl }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        console.error("Błąd API Gemini - brak obrazu w odpowiedzi:", JSON.stringify(response, null, 2));
        const safetyError = response.candidates?.[0]?.finishReason;
        const errorMessage = safetyError === 'SAFETY' 
            ? 'Wygenerowanie obrazu nie było możliwe z powodu ustawień bezpieczeństwa. Spróbuj użyć innych zdjęć.'
            : 'AI nie udało się wygenerować obrazu. Proszę spróbować ponownie.';
            
        return new Response(JSON.stringify({ error: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
        
    } catch (error) {
        console.error("Błąd wykonania funkcji serwerowej:", error);
        const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieznany błąd serwera';
        return new Response(JSON.stringify({ error: `Błąd serwera: ${errorMessage}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}