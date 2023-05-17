import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
import { pinecone } from '@/utils/pinecone-client';
import { PDFLoader } from 'langchain/document_loaders';
import {
  PINECONE_INDEX_NAME,
  PINECONE_NAME_SPACE,
  TEST_PINECONE_NAME_SPACE,
} from '@/config/pinecone';
import { supabase } from '@/utils/supabase-client';
import insertFile from '@/utils/insert-file';
import download from '@/utils/download';
import fs, { rm } from 'fs/promises';

type Content = {
  id: number;
  title: string;
  summary: string;
  url: string;
  file_path: string;
  file_type: 'pdf' | 'web';
  published_at: Date;
  vector_upload: boolean;
  tags: string[];
  faq: string[];
};
// TODO: summary, faq, tags gpt로 추가

const FILE_STORAGE_BUCKET = 'docs';
const downloadPath = '/home/changmin/다운로드/pdf-test';
const namespace = PINECONE_NAME_SPACE;
// const FILE_STORAGE_BUCKET = 'test';
// const downloadPath = '/home/changmin/Downloads/pdf-test';
// const namespace = TEST_PINECONE_NAME_SPACE

type InsertFileProps = {
  filePath: string;
  metadata: {
    source: string;
    media: string;
    title: string;
  };
  originalPath: string;
};

async function insertDoc({
  filePath,
  metadata,
  originalPath,
}: InsertFileProps) {
  // 다운로드한 파일 text로 변환하고, 목차별로 요약하기
  const loader = new PDFLoader(originalPath);
  const rawDocs = await loader.load();

  // TODO: 목차별로 요약
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  const docs = await textSplitter.splitDocuments(rawDocs);
  // 요약한 내용을 pincone에 저장하기
  const embeddings = new OpenAIEmbeddings();
  const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name
  // console.log(docs);
  const metadataDocs = docs.map((doc) => ({
    pageContent: doc.pageContent,
    metadata,
  }));
  //embed the PDF documents
  await PineconeStore.fromDocuments(metadataDocs, embeddings, {
    pineconeIndex: index,
    textKey: 'text',
    namespace,
  });

  // 파일들 file storage에 저장하기
  const originalFile = await fs.readFile(originalPath);
  await insertFile({
    filePath,
    file: originalFile,
    bucket: FILE_STORAGE_BUCKET,
  });

  // local에 저장된 파일 삭제하기
  rm(originalPath);

  return {
    file_path: filePath as string,
    vector_upload: true,
  };
}

async function useSupabase() {
  // 새로 추가된 콘텐츠들 pdf 경로 파싱하기
  const { data: contentData, error: contentError } = await supabase
    .from('content')
    .select('id,title,url,content_source(media(id,name))')
    .eq('vector_upload', false);
  if (contentError) {
    throw new Error(contentError.message);
  }
  if (!contentData) return;
  console.log(contentData);
  const updateContentData: Partial<Content>[] = [];

  for (const { url, content_source, ...content } of contentData) {
    const { id: mediaId, name: mediaName } = (content_source as any[])[0].media;
    const filePath = `${mediaId}/${content.id}.pdf`;
    const metadata = {
      source: `${mediaName}/${content.title}`,
      media: mediaName,
      title: content.title,
    };
    // pdf 경로에서 파일 다운로드하기
    const originalPath = `${downloadPath}/${content.title}.pdf`;
    const result = await insertDoc({ filePath, metadata, originalPath });

    updateContentData.push({
      ...content,
      ...result,
    });
  }
  console.log(updateContentData);
  // file storage에 저장된 파일 경로를 content 테이블에 업데이트하기
  const { error: contentUpdateError } = await supabase
    .from('content')
    .upsert(updateContentData);
  if (contentUpdateError) {
    throw new Error(contentUpdateError.message);
  }
}

export const run = async () => {
  try {
    // case1: used supabase data
    await useSupabase();
  } catch (error: any) {
    console.log('error', error);
    // TODO: db, store rollback
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
