import dayjs from 'dayjs';
import { Telegraf } from 'telegraf';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

const { Telegraf: TelegrafBot } = Telegraf;

const bot = new TelegrafBot(process.env.TOKEN);

async function sendTgMessage(channelId, title, messages, imageUrl) {
  const message = messages.join('\n');
  try {
    await bot.telegram.sendPhoto(channelId, { url: imageUrl }, {
      caption: `*${title}*\n\n${message}`,
      parse_mode: 'Markdown'
    });
    console.log(`Message sent successfully to Telegram channel ${channelId}.`);
  } catch (err) {
    console.error(`Error sending message to Telegram channel ${channelId}:`, err);
  }
}

async function fetchAppleNewsRss() {
  try {
    const res = await fetch('https://developer.apple.com/news/releases/rss/releases.rss');
    const xmlText = await res.text();
    const $ = cheerio.load(xmlText, { xmlMode: true });

    const lastBuildDateString = $('channel > lastBuildDate').text();
    const lastBuildDate = dayjs(lastBuildDateString, 'ddd, DD MMM YYYY HH:mm:ss ZZ');

    const messages = [];

    $('item').each((index, element) => {
      const title = $(element).find('title').text();
      const link = $(element).find('link').text();
      const pubDateString = $(element).find('pubDate').text();
      const pubDate = dayjs(pubDateString, 'ddd, DD MMM YYYY HH:mm:ss ZZ');

      if (lastBuildDate.isAfter(dayjs().subtract(1, 'days')) && pubDate.isAfter(dayjs().subtract(1, 'days'))) {
        messages.push(`[${title}](${link}) - ${pubDate.format('YYYY-MM-DD')}`);
      }
    });

    if (messages.length > 0) {
      const imageUrl = 'https://app.iwanshare.club/uploads/20240809/e0eb992abff3daa8fe192de457a8039c.jpg';
      const title = 'Apple发布系统更新';
      await sendTgMessage(process.env.CHANNEL_ID_3, title, messages, imageUrl);
    } else {
      console.log('No new items found in the last 7 days.');
    }
  } catch (err) {
    console.error('Error fetching Apple News RSS:', err);
  }
}

async function fetchWeiboTrending() {
  try {
    // Your code to fetch Weibo trending topics and send to CHANNEL_ID_1 and CHANNEL_ID_2
  } catch (err) {
    console.error('Error fetching Weibo trending topics:', err);
  }
}

async function bootstrap() {
  try {
    await Promise.all([fetchAppleNewsRss(), fetchWeiboTrending()]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1); // 出错时退出进程
  }
}

bootstrap();
