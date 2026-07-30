import { supabase } from "./supabase";

const PLAYER_PHOTOS_BUCKET = "player-photos";

function createSafeFileName(playerName: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

  const safeName = playerName
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const uniquePart = crypto.randomUUID();

  return `${safeName || "speler"}-${uniquePart}.${extension}`;
}

export async function uploadPlayerPhoto({
  file,
  playerName,
}: {
  file: File;
  playerName: string;
}) {
  if (!file.type.startsWith("image/")) {
    throw new Error("Je kunt alleen een afbeelding uploaden.");
  }

  const maximumFileSize = 5 * 1024 * 1024;

  if (file.size > maximumFileSize) {
    throw new Error("De afbeelding mag maximaal 5 MB groot zijn.");
  }

  const fileName = createSafeFileName(playerName, file);
  const filePath = `players/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .getPublicUrl(filePath);

  if (!data.publicUrl) {
    await supabase.storage
      .from(PLAYER_PHOTOS_BUCKET)
      .remove([filePath]);

    throw new Error("De publieke URL van de afbeelding kon niet worden gemaakt.");
  }

  return {
    publicUrl: data.publicUrl,
    filePath,
  };
}

export async function deletePlayerPhoto(filePath: string) {
  if (!filePath) {
    return;
  }

  const { error } = await supabase.storage
    .from(PLAYER_PHOTOS_BUCKET)
    .remove([filePath]);

  if (error) {
    throw new Error(error.message);
  }
}

export function getPlayerPhotoPath(photoUrl: string | null | undefined) {
  if (!photoUrl) {
    return null;
  }

  const marker = `/storage/v1/object/public/${PLAYER_PHOTOS_BUCKET}/`;
  const markerIndex = photoUrl.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(
    photoUrl.substring(markerIndex + marker.length)
  );
}