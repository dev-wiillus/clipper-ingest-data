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
import { openai } from '@/utils/openai';
import { Document } from 'langchain/document';
import { TokenTextSplitter } from 'langchain/text_splitter';

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

// const downloadPath = '/home/changmin/Downloads/reports/리포트_pdf';
// const downloadPath = '/home/changmin/Downloads/reports/리포트_pdf';
// const downloadPath = '/home/changmin/Downloads/pdf-test';

// async function useSupabase() {
//   // 새로 추가된 콘텐츠들 pdf 경로 파싱하기
//   const { data: contentData, error: contentError } = await supabase
//     .from('content')
//     .select('id,title,url,content_source(media(id,name))')
//     .eq('vector_upload', false);
//   if (contentError) {
//     throw new Error(contentError.message);
//   }
//   if (!contentData) return;
//   console.log(contentData);
//   const updateContentData: Partial<Content>[] = [];

//   for (const { url, content_source, ...content } of contentData) {
//     const { id: mediaId, name: mediaName } = (content_source as any[])[0].media;
//     const filePath = `${mediaId}/${content.id}.pdf`;
//     const metadata = {
//       source: `${mediaName}/${content.title}`,
//       media: mediaName,
//       title: content.title,
//     };
//     // pdf 경로에서 파일 다운로드하기
//     const originalPath = `${downloadPath}/${content.title}.pdf`;
//     const result = await insertDoc({ filePath, metadata, originalPath });

//     updateContentData.push({
//       ...content,
//       ...result,
//     });
//   }
//   console.log(updateContentData);
//   // file storage에 저장된 파일 경로를 content 테이블에 업데이트하기
//   const { error: contentUpdateError } = await supabase
//     .from('content')
//     .upsert(updateContentData);
//   if (contentUpdateError) {
//     throw new Error(contentUpdateError.message);
//   }
// }

const downloadPath = '/home/changmin/다운로드/pdf-test';
async function useLocalFile(i?: number) {
  // const fileTitle = '67';
  // pdf 경로에서 파일 다운로드하기
  const originalPath = `${downloadPath}/${i}.pdf`;
  // 다운로드한 파일 text로 변환하고, 목차별로 요약하기
  const loader = new PDFLoader(originalPath);
  const rawDocs = await loader.load();
  console.log(rawDocs);

  const splitter = new TokenTextSplitter({
    encodingName: 'gpt2',
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const docs = await splitter.createDocuments(
    rawDocs.map((raw) => raw.pageContent),
  );
  let docLength = 0;
  docs.forEach((doc) => (docLength = docLength + doc.pageContent.length));

  // const docs = await textSplitter.splitDocuments(rawDocs);
  // console.log(docs);
  const summarizedDocs = [];
  for (const [index, doc] of docs.entries()) {
    const ratio = Math.floor((doc.pageContent.length / docLength) * 100) / 100;
    const avaialbleToken = 2500 * ratio;
    const normalizedToken = avaialbleToken < 20 ? 20 : avaialbleToken;
    console.log(index, docLength, ratio, normalizedToken);
    // await fs.writeFile(
    //   `/home/changmin/Downloads/reports/${fileTitle}_${index}.txt`,
    //   doc.pageContent,
    // );

    // 각 파트 요약
    const result = await openai.createChatCompletion({
      messages: [
        {
          role: 'user',
          content: `
    			I'll give you the document, remember this.
          ${doc.pageContent}
    			`,
        },
        {
          role: 'user',
          content: `
    			Please summarize the document into ${normalizedToken} characters in korean.
          You should only reply that reference the document.
          Generation of unreferenced answers is prohibited.
    			`,
        },
      ],
      temperature: 0.7,
      model: 'gpt-3.5-turbo',
    });
    summarizedDocs.push(result.data.choices[0].message?.content);
    // 취합
    // token 6000 이하면 저장
    // 아니면 다시 요약
  }

  await fs.writeFile(
    // `/home/changmin/Downloads/exist_reports/${fileTitle.slice(0, 12)}.txt`,
    `/home/changmin/다운로드/pdf-test/${i}.txt`,
    summarizedDocs.join('\n'),
  );

  // db에 저장

  // file storage에 저장된 파일 경로를 content 테이블에 업데이트하기
  // const { error: contentUpdateError } = await supabase
  //   .from('content')
  //   .upsert({ ...result, id, title });
  // if (contentUpdateError) {
  //   throw new Error(contentUpdateError.message);
  // }
}

export const run = async () => {
  try {
    // case1: used supabase data
    // await useSupabase();

    // case2: used local data
    // await useLocalFile();

    for (let i = 1; i < 2; i++) {
      await useLocalFile(i);
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
