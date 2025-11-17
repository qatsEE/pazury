import { GoogleGenAI, Modality } from "@google/genai";

// By exporting runtime, we can instruct Vercel to use the Edge Runtime,
// which has a longer execution timeout. This is crucial for AI image generation
// which can sometimes take longer than the default 10-second limit.
export const runtime = 'edge';

// Funkcja pomocnicza do tworzenia odpowiedzi strumieniowej
function createStreamingResponse(iterator: AsyncGenerator<any>) {
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            for await (const chunk of iterator) {
                // Zakładamy, że stream zwraca obiekty, które można przekonwertować na JSON.
                // W przypadku generateContentStream, każdy chunk ma `text` lub inne pola.
                // Składamy pełną odpowiedź.
                const fullResponse = {
                    candidates: chunk.candidates,
                    // ... inne pola, które mogą być potrzebne
                };
                // Dla uproszczenia, w tym przypadku poczekamy na całość, ale w streamie.
            }
        },
        async pull(controller) {
            const encoder = new TextEncoder();
            try {
                let fullResponseText = "";
                for await (const chunk of iterator) {
                    // Gemini API zwraca pełną odpowiedź w ostatnim chunku strumienia.
                    // Możemy złożyć tekst, ale dla obrazów potrzebujemy całego obiektu na końcu.
                    // Najprostszym podejściem jest złożenie pełnego obiektu.
                    const text = chunk.text;
                    if (text) {
                        fullResponseText += text;
                    }
                }
                
                // Zmieniona logika - czekamy na cały stream i zwracamy kompletną odpowiedź.
                // To jest kompromis - połączenie jest otwarte, ale przetwarzamy dane na końcu.
                // Poprawne strumieniowanie obrazu wymagałoby bardziej złożonej obsługi.
                // W tym przypadku, rozwiązujemy problem timeoutu przez utrzymanie połączenia.
                // Gemini Vision API (dla obrazów) zwraca cały obraz w jednym kawałku na końcu strumienia.
                
                // Znajdźmy pełną odpowiedź po zakończeniu strumienia.
                // Niestety, SDK v1 nie ułatwia pobrania pełnej odpowiedzi ze strumienia.
                // Musimy złożyć ją ręcznie, co jest skomplikowane.
                // Lepsze podejście: Użyjmy metody niestrumieniowej, ale wewnątrz odpowiedzi strumieniowej,
                // aby Vercel nie zabił procesu.

                // Wracamy do prostszego podejścia, które powinno działać na Edge.
                controller.close();

            } catch (e) {
                controller.error(e);
            }
        },
        cancel() {
            // Handle cancellation
        },
    });

    return new Response(stream, {
        headers: { 'Content-Type': 'application/json' },
    });
}


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
        
        // Strumieniujemy odpowiedź, aby uniknąć timeoutu Vercela
        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();
                try {
                    const handImagePart = { inlineData: { mimeType: handImage.type, data: handImage.base64 } };
                    const nailDesignImagePart = { inlineData: { mimeType: nailDesignImage.type, data: nailDesignImage.base64 } };
                    const textPart = { text: "Użyj pierwszego zdjęcia jako bazy. Nałóż wzór paznokci z drugiego zdjęcia na paznokcie widoczne na pierwszym zdjęciu. Zachowaj oryginalną dłoń, odcień skóry i tło. Rezultatem powinno być wyłącznie ostateczne, edytowane zdjęcie." };

                    const responseStream = await ai.models.generateContentStream({
                        model: 'gemini-2.5-flash-image',
                        contents: { parts: [handImagePart, nailDesignImagePart, textPart] },
                        config: { responseModalities: [Modality.IMAGE] },
                    });

                    // Składamy odpowiedź ze strumienia
                    let aggregatedResponse: any = null;
                    for await (const chunk of responseStream) {
                        aggregatedResponse = chunk;
                    }

                    if (aggregatedResponse) {
                        const imagePart = aggregatedResponse.candidates?.[0]?.content?.parts?.find((part: any) => part.inlineData);
                        if (imagePart && imagePart.inlineData) {
                            const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                            controller.enqueue(encoder.encode(JSON.stringify({ imageUrl })));
                        } else {
                             const safetyError = aggregatedResponse.candidates?.[0]?.finishReason;
                             const errorMessage = safetyError === 'SAFETY' 
                                ? 'Wygenerowanie obrazu nie było możliwe z powodu ustawień bezpieczeństwa. Spróbuj użyć innych zdjęć.'
                                : 'AI nie udało się wygenerować obrazu. Proszę spróbować ponownie.';
                            controller.enqueue(encoder.encode(JSON.stringify({ error: errorMessage })));
                        }
                    } else {
                        throw new Error("Pusty strumień odpowiedzi z API Gemini.");
                    }

                } catch (error) {
                    console.error("Błąd podczas strumieniowania z API Gemini:", error);
                    const errorMessage = error instanceof Error ? error.message : 'Wystąpił nieznany błąd serwera';
                    controller.enqueue(encoder.encode(JSON.stringify({ error: `Błąd serwera: ${errorMessage}` })));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            status: 200,
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
