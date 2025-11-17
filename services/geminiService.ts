import { UploadedFile } from '../types';

export const generateNailDesign = async (handImage: UploadedFile, nailDesignImage: UploadedFile): Promise<string> => {
    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ handImage, nailDesignImage }),
        });

        if (!response.body) {
            throw new Error('Brak odpowiedzi z serwera.');
        }

        // Odpowiedź jest strumieniem, musimy go odczytać w całości
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let resultText = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            resultText += decoder.decode(value, { stream: true });
        }
        
        // Gdy mamy już cały tekst, parsujemy go jako JSON
        const data = JSON.parse(resultText);

        if (!response.ok || data.error) {
            throw new Error(data.error || `Błąd serwera: ${response.status}`);
        }

        if (data.imageUrl) {
            return data.imageUrl;
        }

        throw new Error('Nie otrzymano obrazu w odpowiedzi z serwera.');

    } catch (error) {
        console.error("Błąd podczas komunikacji z funkcją serwerową:", error);
        if (error instanceof SyntaxError) {
             throw new Error('Otrzymano nieprawidłową odpowiedź od serwera. Być może przekroczono limit czasu.');
        }
        if (error instanceof Error) {
            throw new Error(`Nie udało się wygenerować wzoru: ${error.message}`);
        }
        throw new Error("Wystąpił nieznany błąd podczas generowania wzoru paznokci.");
    }
};
