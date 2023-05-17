import Parser from 'rss-parser';
import { Agent } from 'https';
import { supabase } from '@/utils/supabase-client';

type Content = {
  id: number;
  title: string;
  summary: string;
  url: string;
  file_path: string;
  file_type: 'pdf' | 'web';
  published_at: Date;
};

function convertPubDate(pubDate: string) {
  const pubDateString = pubDate.toString();
  const year = parseInt(pubDateString.slice(0, 4), 10);
  const month = parseInt(pubDateString.slice(4, 6), 10) - 1; // 0부터 시작하는 월
  const day = parseInt(pubDateString.slice(6, 8), 10);

  return new Date(year, month, day);
}

function extractBetweenBrackets(input: string): string {
  const start = input.indexOf('「');
  const end = input.indexOf('」');

  if (start !== -1 && end !== -1) {
    return input.substring(start + 1, end);
  }

  return '';
}

const todayRssFeeds = (feeds: Parser.Output<{ [key: string]: any }>) => {
  return feeds.items.reduce<Array<Partial<Content>>>((acc, cur, i, arr) => {
    if (!cur.pubDate) return acc;
    const pubDate =
      cur.pubDate?.length === 8
        ? convertPubDate(cur.pubDate)
        : new Date(cur.pubDate!);
    // 하루 이내에 발간된 글만 가져오기
    if (pubDate > new Date(Date.now() - 1000 * 60 * 60 * 24 * 6)) {
      const title = !cur.title
        ? extractBetweenBrackets(cur.contentSnippet!)
        : cur.title;
      acc.push({
        title, // KDI 예외 발생
        url: cur.link,
        file_type: 'pdf',
        published_at: pubDate, // KDI 예외 발생
        summary: cur.contentSnippet,
      });
    } else {
      // 하루 이내에 발간된 글이 아니면, 함수 종료
      arr.splice(i);
    }
    return acc;
  }, []);
};

const agent = new Agent({
  rejectUnauthorized: false, // 인증서를 검증하지 않음
});

// TODO: KDI rss 파싱 에러
export const run = async () => {
  try {
    // TODO: 하위 rss_url 있는 row만 가져오기
    //  media 테이블에서 rss url 가져오기
    const { data: mediaData, error: mediaError } = await supabase
      .from('media')
      .select('id,rss_url')
      .in('id', [5]);
    if (mediaError) {
      throw new Error(mediaError.message);
    }
    if (!mediaData) return;
    console.log('prepared media list');

    // url로 콘텐츠 메타데이터 가져오기(todayFeeds)
    const parser = new Parser({
      requestOptions: { agent },
    });
    for (const { id, rss_url } of mediaData) {
      // 하루 이내 발간된 콘텐츠만 가져오기
      const todayFeeds: Partial<Content>[] = [];
      for (const url of rss_url) {
        const parsed = await parser.parseURL(url);
        // console.log(parsed);
        todayFeeds.push(...todayRssFeeds(parsed));
      }
      console.log(todayFeeds);
      if (!todayFeeds.length) {
        console.log('no today feeds');
        continue;
      }
      console.log('todayFeeds', todayFeeds);
      console.log('prepared today feeds');

      // 콘텐츠 메타데이터 저장
      const { data: contentData, error: contentError } = await supabase
        .from('content')
        .insert(todayFeeds)
        .select('id');
      console.log(contentData);
      if (contentError) {
        throw new Error(contentError.message);
      }
      console.log('contentData', contentData);
      console.log('inserted today content');

      if (!contentData) {
        throw new Error('no content result');
      }
      // 콘텐츠, 미디어 매핑
      const contentDataValues = contentData.map((content) => ({
        content_id: content.id,
        media_id: id,
      }));
      const { data: contentSourceData, error: contentSourceError } =
        await supabase
          .from('content_source')
          .insert(contentDataValues)
          .select('*');
      console.log('contentSourceData', contentSourceData);
      if (contentSourceError) {
        throw new Error(contentSourceError.message);
      }
      if (!contentData) {
        throw new Error('no content_source result');
      }
      console.log('inserted content source');
    }
  } catch (error: any) {
    console.log('error');
    console.log(error);
    // TODO: db, store rollback
    throw new Error('Failed to ingest your data');
  }
};

(async () => {
  await run();
  console.log('ingestion complete');
})();

// // 크롬 드라이버 경로 설정
// const chromedriverPath = chromedriver.path;

// // 크롬 드라이버 서비스 설정
// const serviceBuilder = new ServiceBuilder(chromedriverPath);

// // 크롬 브라우저 옵션 설정
// const chromeOptions = new Options();

// // 크롬 브라우저 열기
// const driver = await new Builder()
//   .forBrowser('chrome')
//   .setChromeOptions(chromeOptions)
//   .setChromeService(serviceBuilder)
//   .build();

// try {
//   // 크롤링할 페이지 URL 설정
//   const rssUrl = 'https://rss.app/feeds/xT6gnMiVSRLrvGwM.xml';
//   const url = `https://blog.opensurvey.co.kr/trendreport/burger-2023/`;

//   // 페이지 열기
//   await driver.get(url);

//   // 페이지 로딩 대기
//   await driver.sleep(3000);

//   // PDF 파일 링크 추출
//   const pdfLinks: string[] = [];
//   const links = await driver.findElements(By.xpath('//a'));

//   for (const link of links) {
//     const url = await link.getAttribute('href');
//     if (url.endsWith('.pdf')) {
//       pdfLinks.push(url);
//     }
//   }

//   // 결과 출력
//   console.log(pdfLinks);
// } finally {
//   // 브라우저 닫기
//   await driver.quit();
