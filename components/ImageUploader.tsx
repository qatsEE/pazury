
import React, { useRef } from 'react';
import { UploadedFile } from '../types';
import { UploadIcon, CloseIcon } from './IconComponents';

interface ImageUploaderProps {
  id: string;
  onFileUpload: (file: File) => void;
  onFileRemove: () => void;
  uploadedFile: UploadedFile | null;
  title: string;
  description: string;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, onFileUpload, onFileRemove, uploadedFile, title, description }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileUpload(event.target.files[0]);
    }
  };

  const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    onFileRemove();
    if (inputRef.current) {
        inputRef.current.value = "";
    }
  };

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <div className="relative w-full aspect-square bg-white rounded-xl border-2 border-dashed border-pink-200 p-4 flex justify-center items-center text-center transition-all duration-300 hover:border-pink-400 hover:bg-pink-50 cursor-pointer group">
        {!uploadedFile ? (
          <label htmlFor={id} className="flex flex-col items-center cursor-pointer">
            <UploadIcon className="w-12 h-12 text-pink-300 group-hover:text-pink-500 transition-colors" />
            <span className="mt-2 text-sm font-medium text-gray-500">{description}</span>
            <span className="text-xs text-gray-400">PNG, JPG, WEBP</span>
            <input
              id={id}
              ref={inputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        ) : (
          <div className="w-full h-full relative">
            <img src={uploadedFile.dataUrl} alt={uploadedFile.name} className="w-full h-full object-contain rounded-lg" />
            <button
              onClick={handleRemoveClick}
              className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md text-gray-600 hover:text-red-500 hover:bg-gray-100 transition-all"
              aria-label="Remove image"
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploader;