import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
import { pinecone } from '@/utils/pinecone-client';
import { PDFLoader, CheerioWebBaseLoader } from 'langchain/document_loaders';
import { PINECONE_INDEX_NAME } from '@/config/pinecone';
// import { supabase } from '@/utils/supabase-client';
import fetch from 'node-fetch';
import cheerio from 'cheerio';
import Parser from 'rss-parser';
import { generatePdf } from 'html-pdf-node';

export const run = async () => {
  try {
    /* Get the list of pdf files not uploaded vector_store from the pdf_meta table */
    // const { data: pdfMetaData, error: pdfMetaError } = await supabase
    // 	.from('pdf_meta')
    // 	.select('id,title,from,url')
    // 	.not('vector_upload', 'is', true);
    // if (pdfMetaError) {
    // 	throw new Error(pdfMetaError.message);
    // }
    // console.log(
    // 	'pdfMetaData',
    // 	pdfMetaData.map((d) => d.title),
    // );

    // /* Loop through the list of pdf files and upload the vector_store */
    // pdfMetaData?.forEach(async ({ id, title, from, url }) => {
    // const { id, title, from, url, is_file } = {
    //   id: '1',
    //   title: '우크라이나 사태 이후 러시아의 대외경제 현황 및 대안정책 분석',
    //   from: 'kotra',
    //   url: 'https://dream.kotra.or.kr/kotranews/cms/indReport/actionIndReportDetail.do?SITE_NO=3&MENU_ID=280&CONTENTS_NO=1&pRptNo=13550&pHotClipTyName=DEEP',
    //   is_file: true,
    // };
    // const { id, title, from, url, is_file } = {
    //   id: '2',
    //   title:
    //     'Korean companies need bolder transformation to survive post-pandemic world',
    //   from: 'McKinsey&Company',
    //   url: 'https://www.mckinsey.com/kr/our-insights/korean-companies-need-bolder-transformation-to-survive-post-pandemic-world',
    //   is_file: false,
    // };
    // const { id, title, from, url, is_file } = {
    //   id: '3',
    //   title: '포스트 팬데믹 시대의 신세대',
    //   from: 'lgbr',
    //   url: 'https://www.lgbr.co.kr/insight/insight_view.asp?idx=10000000000',
    //   is_file: true,
    // };
    // const { id, title, from, url, is_file } = {
    //   id: '4',
    //   title: 'OECD Economic Outlook, Interim Report 2023',
    //   from: 'oecd',
    //   url: 'https://www.oecd-ilibrary.org/economics/oecd-economic-outlook-interim-report-2023_9789264350001-en',
    //   is_file: true,
    // };
    const { id, title, from, url, is_file } = {
      id: '5',
      title: '자기계발 및 취미 트렌드 리포트',
      from: 'open-survey',
      url: 'https://www.surveymonkey.com/r/3QZQZ7S',
      is_file: true,
    };

    // TODO: cloud file storage
    // TODO: 웹 긁어올 때, 콘텐츠만. 현재 스크립트도 같이 됨
    /*load raw docs from the pdf file in the directory */
    // const loader: CheerioWebBaseLoader = new CheerioWebBaseLoader(
    //   'https://www.nielsen.com/ko/news-center/2023/the-gauge-poland-february/',
    // );

    // const rawDocs = await loader.load();
    // console.log(rawDocs);

    const parser = new Parser();
    const feeds = await parser.parseURL(
      'http://feeds.feedburner.com/entrepreneur/latest',
    );
    const article = feeds.items[1];
    console.log(article.link);
    generatePdf(
      { url: article.link },
      { format: 'A4', path: `${article.title}.pdf` },
      // { format: 'A4', path: `docs/${feeds.title}/${article.title}.pdf` },
    );

    // const web_url =
    //   'https://www.bcg.com/publications/2023/ceo-guide-to-ai-revolution';
    // const response = await fetch(web_url);
    // const html = await response.text();
    // const $ = cheerio.load(html);
    // const docs = [];
    // $('p').each((i, el) => {
    //   const text = $(el).text().trim();
    //   if (text.length > 0) {
    //     docs.push({
    //       id: i.toString(),
    //       text: text,
    //     });
    //   }
    // });
    // console.log('docs', docs);

    /* Split text into chunks */
    // const textSplitter = new RecursiveCharacterTextSplitter({
    //   chunkSize: 1000,
    //   chunkOverlap: 200,
    // });
    // const docs = await textSplitter.splitDocuments(rawDocs);
    // console.log('creating vector store...');
    // /*create and store the embeddings in the vectorStore*/
    // const embeddings = new OpenAIEmbeddings();
    // const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name
    // //embed the PDF documents
    // await PineconeStore.fromDocuments(index, docs, embeddings, 'text', id);
    // await PineconeStore.fromDocuments(docs, embeddings, {
    //   pineconeIndex: index,
    //   textKey: 'text',
    //   namespace: id,
    // });
    // });
  } catch (error) {
    console.log('error', error);
    // TODO: db, store rollback
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();
