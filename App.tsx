
import React, { useState } from 'react';
import { UploadedFile } from './types';
import ImageUploader from './components/ImageUploader';
import { SparkleIcon, LoadingSpinner, LightbulbIcon, WarningIcon } from './components/IconComponents';
import { generateNailDesign } from './services/geminiService';

const App: React.FC = () => {
  const [handImage, setHandImage] = useState<UploadedFile | null>(null);
  const [nailDesignImage, setNailDesignImage] = useState<UploadedFile | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileToUploadedFile = (file: File): Promise<UploadedFile> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const MAX_WIDTH = 512;
                const MAX_HEIGHT = 512;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  return reject(new Error('Nie udało się uzyskać kontekstu canvas'));
                }
                ctx.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                const base64 = dataUrl.split(',')[1];

                resolve({
                    name: file.name,
                    type: 'image/jpeg',
                    size: base64.length,
                    dataUrl: dataUrl,
                    base64: base64,
                });
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
  };

  const handleFileUpload = async (file: File, type: 'hand' | 'design') => {
    try {
      const uploadedFile = await fileToUploadedFile(file);
      if (type === 'hand') {
        setHandImage(uploadedFile);
      } else {
        setNailDesignImage(uploadedFile);
      }
      setError(null);
    } catch (err) {
      setError('Nie udało się wczytać pliku. Spróbuj z innym zdjęciem.');
    }
  };
  
  const handleFileRemove = (type: 'hand' | 'design') => {
    if (type === 'hand') {
      setHandImage(null);
    } else {
      setNailDesignImage(null);
    }
  };

  const handleGenerateClick = async () => {
    if (!handImage || !nailDesignImage) {
      setError('Proszę wgrać oba zdjęcia przed rozpoczęciem.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateNailDesign(handImage, nailDesignImage);
      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message || 'Wystąpił nieznany błąd.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleStartOver = () => {
    setHandImage(null);
    setNailDesignImage(null);
    setGeneratedImage(null);
    setError(null);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 text-gray-800 font-sans p-4 sm:p-6 md:p-8">
      <main className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3">
            <SparkleIcon className="w-8 h-8 text-pink-400" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-700 tracking-tight">
              Wirtualna Stylistka Paznokci
            </h1>
            <SparkleIcon className="w-8 h-8 text-pink-400" />
          </div>
        </header>

        {!generatedImage ? (
          <div className="bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-xl border border-white/50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-8">
              <ImageUploader
                id="hand-uploader"
                title="1. Wgraj Zdjęcie Dłoni"
                description="Kliknij, aby wgrać zdjęcie"
                uploadedFile={handImage}
                onFileUpload={(file) => handleFileUpload(file, 'hand')}
                onFileRemove={() => handleFileRemove('hand')}
              />
              <ImageUploader
                id="design-uploader"
                title="2. Wgraj Wzór Paznokci"
                description="Kliknij, aby wgrać inspirację"
                uploadedFile={nailDesignImage}
                onFileUpload={(file) => handleFileUpload(file, 'design')}
                onFileRemove={() => handleFileRemove('design')}
              />
            </div>

            <div className="flex flex-col items-center">
              <button
                onClick={handleGenerateClick}
                disabled={!handImage || !nailDesignImage || isLoading}
                className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-br from-pink-500 to-rose-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-300 ease-in-out transform hover:scale-105"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner className="w-6 h-6" />
                    <span>Generowanie...</span>
                  </>
                ) : (
                  <>
                    <SparkleIcon className="w-6 h-6" />
                    <span>Przymierz Teraz!</span>
                  </>
                )}
              </button>
              {error && (
                <div className="mt-4 w-full max-w-md p-4 bg-red-100 border-l-4 border-red-500 rounded-lg">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                       <WarningIcon className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="ml-3">
                       <p className="text-sm font-medium text-red-800">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center bg-white/60 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-xl border border-white/50 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Twój Wirtualny Manicure!</h2>
            <div className="max-w-lg mx-auto aspect-square rounded-2xl overflow-hidden shadow-lg border border-pink-100">
                <img src={generatedImage} alt="Wygenerowany wzór paznokci na dłoni" className="w-full h-full object-contain"/>
            </div>
            <button
                onClick={handleStartOver}
                className="mt-8 px-8 py-3 bg-white text-gray-700 font-semibold rounded-full shadow-md hover:bg-gray-100 border border-gray-200 transition-all duration-300 ease-in-out transform hover:scale-105"
              >
                Zacznij od Nowa
            </button>
          </div>
        )}
      </main>
      <footer className="text-center mt-12 text-sm text-gray-400">
          <p>Działa dzięki Gemini. Stworzone dla kreatywnej inspiracji.</p>
      </footer>
      <div className="fixed bottom-4 right-4 text-xs text-gray-400 font-mono">
        tori.tr4sh
      </div>
    </div>
  );
};

export default App;