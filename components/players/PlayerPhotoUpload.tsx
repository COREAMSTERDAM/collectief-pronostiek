"use client";

import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type PlayerPhotoUploadProps = {
  value: File | null;
  existingPhotoUrl?: string | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
};

export default function PlayerPhotoUpload({
  value,
  existingPhotoUrl = null,
  disabled = false,
  onChange,
}: PlayerPhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    existingPhotoUrl
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!value) {
      setPreviewUrl(existingPhotoUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [value, existingPhotoUrl]);

  function openFilePicker() {
    if (!disabled) {
      inputRef.current?.click();
    }
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(
        "Kies een JPG-, PNG- of WebP-afbeelding."
      );

      event.target.value = "";
      return;
    }

    const maximumFileSize = 5 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      setErrorMessage(
        "De afbeelding mag maximaal 5 MB groot zijn."
      );

      event.target.value = "";
      return;
    }

    onChange(file);
  }

  function removeSelectedPhoto() {
    onChange(null);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-200">
        Spelersfoto
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      <button
        type="button"
        onClick={openFilePicker}
        disabled={disabled}
        className="group flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-white/5 px-5 py-7 text-center transition hover:border-blue-400/70 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {previewUrl ? (
          <>
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white/10 bg-slate-900 shadow-xl">
              <img
                src={previewUrl}
                alt="Voorbeeld van de spelersfoto"
                className="h-full w-full object-cover"
              />
            </div>

            <span className="mt-4 text-sm font-black text-white">
              Klik om een andere foto te kiezen
            </span>
          </>
        ) : (
          <>
            <span className="text-4xl" aria-hidden="true">
              📷
            </span>

            <span className="mt-3 text-sm font-black text-white">
              Klik om een foto te kiezen
            </span>

            <span className="mt-1 text-xs text-slate-400">
              JPG, PNG of WebP · maximaal 5 MB
            </span>
          </>
        )}
      </button>

      {value && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {value.name}
            </p>

            <p className="text-xs text-slate-400">
              {(value.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>

          <button
            type="button"
            onClick={removeSelectedPhoto}
            disabled={disabled}
            className="shrink-0 text-sm font-bold text-red-300 transition hover:text-red-200 disabled:opacity-60"
          >
            Verwijderen
          </button>
        </div>
      )}

      {errorMessage && (
        <p className="mt-3 text-sm font-bold text-red-300">
          {errorMessage}
        </p>
      )}
    </div>
  );
}