import { GoogleGenAI, Modality } from "@google/genai";

// Ustawienie Vercela na dłuższy czas działania funkcji jest kluczowe
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
        
        const handImagePart = { inlineData: { mimeType: handImage.type, data: handImage.base64 } };
        const nailDesignImagePart = { inlineData: { mimeType: nailDesignImage.type, data: nailDesignImage.base64 } };
        const textPart = { text: "Użyj pierwszego zdjęcia jako bazy. Nałóż wzór paznokci z drugiego zdjęcia na paznokcie widoczne na pierwszym zdjęciu. Zachowaj oryginalną dłoń, odcień skóry i tło. Rezultatem powinno być wyłącznie ostateczne, edytowane zdjęcie." };

        const geminiStream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [handImagePart, nailDesignImagePart, textPart] },
            config: { responseModalities: [Modality.IMAGE] },
        });

        // Tworzymy nowy strumień, który będzie wysłany do przeglądarki
        const readableStream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                for await (const chunk of geminiStream) {
                    const imagePart = chunk.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData);
                    
                    if (imagePart && imagePart.inlineData) {
                        const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        controller.enqueue(encoder.encode(JSON.stringify({ imageUrl })));
                        break; 
                    }
                    
                    const finishReason = chunk.candidates?.[0]?.finishReason;
                    if (finishReason && finishReason !== 'STOP') {
                         const errorMessage = finishReason === 'SAFETY' 
                            ? 'Wygenerowanie obrazu nie było możliwe z powodu ustawień bezpieczeństwa. Spróbuj użyć innych zdjęć.'
                            : `AI zakończyło z powodem: ${finishReason}`;
                        controller.enqueue(encoder.encode(JSON.stringify({ error: errorMessage })));
                        break;
                    }
                }
                controller.close();
            }
        });

        return new Response(readableStream, {
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
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
