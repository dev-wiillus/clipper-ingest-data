import { Builder, By, WebDriver } from 'selenium-webdriver';
import chrome, { ServiceBuilder } from 'selenium-webdriver/chrome';
import chromedriver from 'chromedriver';
import path from 'path';
import fs from 'fs';

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
      return mostRecentFile.name;
    } else {
      lastModifiedTime = mostRecentFile.time.getTime();
    }
  }
};

async function downloadFromATag(driver: WebDriver, downloadPath: string) {
  const aTags = await driver.findElements(By.tagName('a'));
  for (const aTag of aTags) {
    const text = await aTag.getText();
    if (text.toLowerCase().includes('pdf') || text.includes('다운로드')) {
      await aTag.click();
      await driver.sleep(2000);
      await driver.manage().setTimeouts({ implicit: 10000 });

      const fileName = await isDownloadComplete(downloadPath);
      await driver.sleep(1000);
      console.log('Download completed:', aTag);
      return fileName;
    }
  }
  return false;
}

async function downloadPDF(driver: WebDriver, downloadPath: string) {
  const result = await downloadFromATag(driver, downloadPath);
  if (result) return result;

  const buttonTags = await driver.findElements(By.tagName('button'));
  for (const buttonTag of buttonTags) {
    const text = await buttonTag.getText();
    if (text.toLowerCase().includes('pdf') || text.includes('다운로드')) {
      await buttonTag.click();
      await driver.sleep(1000);
      await driver.manage().setTimeouts({ implicit: 10000 });

      const result = await downloadFromATag(driver, downloadPath);
      return result;
    }
  }
}

export const download = async (_downloadPath: string, url: string) => {
  const downloadPath = path.resolve(_downloadPath); // 절대 경로로 변경
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
    await driver.get(url);
    await driver.sleep(1000);

    // if (url.includes('kdi.re.kr')) {
    //   const aTags = await driver.findElements(By.tagName('a'));
    //   for (const aTag of aTags) {
    //     const text = await aTag.getText();
    //     if (text.includes('원문보기')) {
    //       await aTag.click(); // Click the "원문보기" button to open the new tab
    //       break;
    //     }
    //   }
    //   // Switch to the newly opened tab
    //   const allWindowHandles = await driver.getAllWindowHandles();
    //   const newTabWindowHandle = allWindowHandles[allWindowHandles.length - 1];
    //   await driver.switchTo().window(newTabWindowHandle);

    //   // Click the a tag button in the new tab
    //   const result = await downloadPDF(driver, downloadPath);
    //   return result;
    // } else {
    const result = await downloadPDF(driver, downloadPath);
    return result;
    // }
  } finally {
    await driver.quit();
  }
};

export default download;
