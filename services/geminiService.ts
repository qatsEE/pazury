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

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Błąd serwera: ${response.status}`);
        }

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
