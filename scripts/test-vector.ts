import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
import { pinecone } from '@/utils/pinecone-client';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';
import { OpenAI } from 'langchain';
import { VectorDBQAChain } from 'langchain/chains';
import { VectorOperationsApi } from '@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch';

const pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);

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

async function metaDataQuery() {
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    {
      pineconeIndex,
      namespace: PINECONE_NAME_SPACE,
      filter: { source: { $eq: '2023 외국투자가를 위한 비자가이드' } },
    },
  );
  // 2023 외국투자가를 위한 비자가이드
  // 2023 외국투자가를 위한 환경정책 가이드
  const model = new OpenAI({
    temperature: 0,
    modelName: 'gpt-4',
  });
  const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
    k: 1,
    returnSourceDocuments: true,
  });
  const response = await chain.call({
    query:
      "Generation of unreferenced answers is prohibited. If you can't find the answer in the document below, just say 'null'. 안전확인대상생활화학제품이란?",
  });
  console.log(response);
}

async function deleteIndex() {
  pinecone.deleteIndex({ indexName: PINECONE_INDEX_NAME });
}

async function deleteNamespace() {
  const result = await pinecone.Index(PINECONE_INDEX_NAME).delete1({
    namespace: PINECONE_NAME_SPACE,
    deleteAll: true,
  });
  console.log(result);
}

async function retriever() {
  const vectorStore = await PineconeStore.fromExistingIndex(
    new OpenAIEmbeddings(),
    {
      pineconeIndex,
      namespace: 'docs',
      // namespace: 'test',
      // filter: { media: { $eq: '우리금융경영연구소' } },
    },
  );

  // const query2 = await vectorStore.similaritySearch(
  //   '기업의 벨류체인이 어떻게 변했어?',
  //   1,
  // );
  // console.log(query2);

  const model = new OpenAI({
    temperature: 0.3,
    modelName: 'gpt-3.5-turbo',
    // maxTokens: 4096,
  });
  const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
    k: 5,
    returnSourceDocuments: true,
  });
  const response = await chain.call({
    query: '한국 주가 지수는 어떻게 전망돼?',
  });
  console.log(response);
}

export const run = async () => {
  try {
    // await metaDataQuery(pineconeIndex);
    // await retriever();
    await deleteNamespace();
    // NOTE: dangerously delete index
    // await deleteIndex(pineconeIndex);
  } catch (error: any) {
    console.log('error', error);
    console.log(error.response.data.error);
    throw new Error('Failed to test your vector');
  }
};

(async () => {
  await run();
  console.log('test complete');
})();
