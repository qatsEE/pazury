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
            // Użyj komunikatu o błędzie z serwera, jeśli jest dostępny
            throw new Error(data.error || `Błąd serwera: ${response.status}`);
        }

        if (data.imageUrl) {
            return data.imageUrl;
        }

        // To jest mało prawdopodobne, jeśli serwer zwraca status 200, ale to dobre zabezpieczenie
        throw new Error('Nie otrzymano obrazu z serwera.');

    } catch (error) {
        console.error("Błąd podczas komunikacji z funkcją serwerową:", error);
        if (error instanceof Error) {
            // Rzuć błąd dalej, aby został przechwycony przez komponent
            throw new Error(`Nie udało się wygenerować wzoru: ${error.message}`);
        }
        throw new Error("Wystąpił nieznany błąd podczas generowania wzoru paznokci.");
    }
};
