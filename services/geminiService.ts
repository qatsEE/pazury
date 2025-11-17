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

        if (!response.ok) {
            // Spróbuj odczytać treść błędu, nawet jeśli nie jest to JSON
            const errorText = await response.text();
            throw new Error(JSON.parse(errorText).error || `Błąd serwera: ${response.status} - ${errorText}`);
        }

        // Odczytywanie odpowiedzi strumieniowej
        if (!response.body) {
            throw new Error('Brak ciała odpowiedzi strumieniowej.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            result += decoder.decode(value, { stream: true });
        }
        
        const data = JSON.parse(result);

        if (data.imageUrl) {
            return data.imageUrl;
        }

        throw new Error(data.error || 'Nie otrzymano obrazu z serwera.');

    } catch (error) {
        console.error("Błąd podczas komunikacji z funkcją serwerową:", error);
        if (error instanceof Error) {
            throw new Error(`Nie udało się wygenerować wzoru: ${error.message}`);
        }
        throw new Error("Wystąpił nieznany błąd podczas generowania wzoru paznokci.");
    }
};
