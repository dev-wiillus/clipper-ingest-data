import { supabase } from './supabase-client';

type IputProps = {
  filePath: string;
  file:
    | ArrayBuffer
    | ArrayBufferView
    | Blob
    | Buffer
    | File
    | FormData
    | NodeJS.ReadableStream
    | ReadableStream<Uint8Array>
    | URLSearchParams
    | string;
  bucket?: string;
};
export default async function insertFile({
  file,
  filePath,
  bucket = 'docs',
}: IputProps) {
  const { error } = await supabase.storage.from(bucket).upload(filePath, file, {
    contentType: 'application/pdf',
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }
}
