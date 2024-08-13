import dayjs from 'dayjs';
import Telegraf from 'telegraf';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

const { Telegraf } = Telegraf;

const TOKEN = process.env.TOKEN;
const CHANNEL_ID_1 = process.env.CHANNEL_ID_1;
const CHANNEL_ID_2 = process.env.CHANNEL_ID_2;
const CHANNEL_ID_3 = process.env.CHANNEL_ID_3;

const bot = new Telegraf(TOKEN);

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
      await sendTgMessage(CHANNEL_ID_3, title, messages, imageUrl);
    } else {
      console.log('No new items found in the last 7 days in Apple News RSS.');
    }
  } catch (err) {
    console.error('Error fetching Apple News RSS:', err);
  }
}

async function fetchWeiboTrending() {
  const TRENDING_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

  try {
    const res = await fetch(TRENDING_URL);
    const data = await res.json();
    if (data.ok === 1) {
      const items = data.data.cards[0]?.card_group;
      if (items) {
        const filteredItems = items.filter(o => !o.promotion);
        const messages = filteredItems.slice(0, 10).map((o, i) => {
          const containerid = encodeURIComponent(new URL(o.scheme).searchParams.get('containerid'));
          const url = `https://m.weibo.cn/search?containerid=${containerid}`;
          const hotValue = parseFloat(o.desc_extr);
          const hotText = isNaN(hotValue) ? '' : `| ${(hotValue / 10000).toFixed(2)} 万`;
          return `${i + 1}. [${o.desc}](${url}) ${hotText}`;
        });

        if (messages.length > 0) {
          await sendTgMessage(CHANNEL_ID_1, '微博实时热搜', messages, '');
          await sendTgMessage(CHANNEL_ID_2, '微博实时热搜', messages, '');
        } else {
          console.log('No trending items found in Weibo.');
        }
      }
    }
  } catch (err) {
    console.error('Error fetching Weibo trending:', err);
  }
}

async function bootstrap() {
  await Promise.all([
    fetchAppleNewsRss(),
    fetchWeiboTrending()
  ]);
  process.exit(0);
}

bot.launch();
bootstrap();
