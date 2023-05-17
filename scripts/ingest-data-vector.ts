import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
import { pinecone } from '@/utils/pinecone-client';
import { PDFLoader } from 'langchain/document_loaders';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
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
};

export const run = async () => {
  try {
    // 새로 추가된 콘텐츠들 pdf 경로 파싱하기
    const { data: contentData, error: contentError } = await supabase
      .from('content')
      .select('id,title,url,content_source(media(id,name))')
      .eq('vector_upload', false)
      .limit(5);
    if (contentError) {
      throw new Error(contentError.message);
    }
    if (!contentData) return;
    console.log(contentData);
    const updateContentData: Partial<Content>[] = [];

    for (const { url, content_source, ...content } of contentData) {
      const { id: mediaId, name: mediaName } = (content_source as any[])[0]
        .media;
      const filePath = `${mediaId}/${content.id}.pdf`;
      console.log(filePath);

      // pdf 경로에서 파일 다운로드하기
      const downloadPath = '/home/changmin/다운로드/pdf-test';
      const fileName = await download(downloadPath, url);
      if (!fileName) continue;
      const originalPath = `${downloadPath}/${fileName}`;
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
        metadata: {
          source: `${mediaName}/${content.title}`,
          media: mediaName,
          title: content.title,
        },
      }));
      //embed the PDF documents
      await PineconeStore.fromDocuments(metadataDocs, embeddings, {
        pineconeIndex: index,
        textKey: 'text',
        namespace: PINECONE_NAME_SPACE,
      });

      // 파일들 file storage에 저장하기
      const originalFile = await fs.readFile(originalPath);
      await insertFile({ filePath, file: originalFile });

      updateContentData.push({
        ...content,
        file_path: filePath as string,
        vector_upload: true,
      });

      // local에 저장된 파일 삭제하기
      rm(originalPath);
    }
    console.log(updateContentData);
    // file storage에 저장된 파일 경로를 content 테이블에 업데이트하기
    const { error: contentUpdateError } = await supabase
      .from('content')
      .upsert(updateContentData);
    if (contentUpdateError) {
      throw new Error(contentUpdateError.message);
    }
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
