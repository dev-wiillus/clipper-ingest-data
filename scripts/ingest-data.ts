import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from 'langchain/embeddings';
import { PineconeStore } from 'langchain/vectorstores';
import { pinecone } from '@/utils/pinecone-client';
import { PDFLoader } from 'langchain/document_loaders';
import { PINECONE_INDEX_NAME, PINECONE_NAME_SPACE } from '@/config/pinecone';

/* Name of directory to retrieve files from. You can change this as required */
// const filePath = 'docs/text.pdf';
const filePath =
  'docs/지식서비스 플랫폼 전략 연구 - 플랫폼 사례분석을 중심으로.pdf';

import { Builder, By, Key, until, WebDriver } from 'selenium-webdriver';
import chrome, { ServiceBuilder } from 'selenium-webdriver/chrome';
import chromedriver from 'chromedriver';
import { watch, rm } from 'fs';
import path from 'path';
import fs from 'fs';

async function downloadFromATag(driver: WebDriver, downloadPath: string) {
  const aTags = await driver.findElements(By.tagName('a'));
  for (const aTag of aTags) {
    const text = await aTag.getText();
    if (text.toLowerCase().includes('pdf') || text.includes('다운로드')) {
      await aTag.click();
      await driver.sleep(1000);
      await driver.manage().setTimeouts({ implicit: 10000 });

      await isDownloadComplete(downloadPath);
      // rm(`${downloadPath}/${text}`, {}, (err) => {
      //   if (err) throw err;
      // });
      console.log('Download completed:', aTag);
      return true;
    }
  }
  return false;
}

async function downloadPDF(driver: WebDriver, downloadPath: string) {
  const result = await downloadFromATag(driver, downloadPath);
  if (!result) {
    const buttonTags = await driver.findElements(By.tagName('button'));
    for (const buttonTag of buttonTags) {
      const text = await buttonTag.getText();
      if (text.toLowerCase().includes('pdf') || text.includes('다운로드')) {
        await buttonTag.click();
        await driver.sleep(1000);
        await driver.manage().setTimeouts({ implicit: 10000 });

        await downloadFromATag(driver, downloadPath);
      }
    }
  }
}

const isDownloadComplete = async (downloadPath: string) => {
  let complete = false;
  let lastModifiedTime;

  while (!complete) {
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const files = fs.readdirSync(downloadPath);
    const mostRecentFile = files
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(downloadPath, file)).mtime,
      }))
      .sort((a, b) => (b as any).time - (a as any).time)[0];

    if (
      !mostRecentFile.name.endsWith('.crdownload') &&
      (!lastModifiedTime || mostRecentFile.time.getTime() > lastModifiedTime)
    ) {
      complete = true;
    } else {
      lastModifiedTime = mostRecentFile.time.getTime();
    }
  }
};
export const run = async () => {
  const downloadPath = path.resolve('/home/changmin/다운로드/pdf-test'); // 절대 경로로 변경
  const serviceBuilder = new ServiceBuilder(path.resolve(chromedriver.path));
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeService(serviceBuilder)
    .setChromeOptions(
      new chrome.Options().setUserPreferences({
        'download.default_directory': downloadPath,
      }),
    )
    .build();

  try {
    const url =
      'https://eiec.kdi.re.kr/policy/domesticView.do?ac=0000174365&pg=&pp=&search_txt=&issus=&type=&depth1=';
    await driver.get(url);
    await driver.sleep(1000);

    if (url.includes('kdi.re.kr')) {
      const aTags = await driver.findElements(By.tagName('a'));
      for (const aTag of aTags) {
        const text = await aTag.getText();
        if (text.includes('원문보기')) {
          await aTag.click(); // Click the "원문보기" button to open the new tab
          break;
        }
      }
      // Switch to the newly opened tab
      const allWindowHandles = await driver.getAllWindowHandles();
      const newTabWindowHandle = allWindowHandles[allWindowHandles.length - 1];
      await driver.switchTo().window(newTabWindowHandle);

      // Click the a tag button in the new tab
      await downloadPDF(driver, downloadPath);
    } else {
      await downloadPDF(driver, downloadPath);
    }
  } finally {
    await driver.quit();
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();

// try {
//   /*load raw docs from the pdf file in the directory */
//   const loader = new PDFLoader(filePath);
//   const rawDocs = await loader.load();
//   // console.log(rawDocs);
//   /* Split text into chunks */
//   const textSplitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 1000,
//     chunkOverlap: 200,
//   });
//   const docs = await textSplitter.splitDocuments(rawDocs);
//   console.log('split docs', docs);
//   console.log('creating vector store...');
//   /*create and store the embeddings in the vectorStore*/
//   // const embeddings = new OpenAIEmbeddings();
//   // const index = pinecone.Index(PINECONE_INDEX_NAME); //change to your own index name
//   // //embed the PDF documents
//   // await PineconeStore.fromDocuments(docs, embeddings, {
//   //   pineconeIndex: index,
//   //   textKey: 'text',
//   //   namespace: PINECONE_NAME_SPACE,
//   // });
// } catch (error) {
//   console.log('error', error);
//   throw new Error('Failed to ingest your data');
// }
