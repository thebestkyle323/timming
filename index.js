import dayjs from 'dayjs';
import Telegraf from 'telegraf';
import fetch from 'node-fetch';
import cheerio from 'cheerio';

const { Telegraf } = telegraf;

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

async function fetchAppleNewsRss(channelId) {
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
      await sendTgMessage(channelId, 'Apple发布系统更新', messages, imageUrl);
    } else {
      console.log(`No new items found in the last 7 days for channel ${channelId}.`);
    }
  } catch (err) {
    console.error(`Error fetching Apple News RSS for channel ${channelId}:`, err);
  }
}

async function fetchWeiboTrending(channelId) {
  let RETRY_TIME = 5;
  const TRENDING_URL = 'https://m.weibo.cn/api/container/getIndex?containerid=106003type%3D25%26t%3D3%26disable_hot%3D1%26filter_type%3Drealtimehot';

  try {
    while (RETRY_TIME > 0) {
      const res = await fetch(TRENDING_URL);
      const data = await res.json();
      
      if (data.ok === 1) {
        const items = data.data.cards[0]?.card_group;
        
        if (items) {
          const filteredItems = items.filter(o => !o.promotion);
          const messages = filteredItems.splice(1, 50).map((o, i) => {
            const containerid = encodeURIComponent(new URL(o.scheme).searchParams.get('containerid'));
            const url = `https://m.weibo.cn/search?containerid=${containerid}`;
            const hotValue = parseFloat(o.desc_extr);
            const hotText = isNaN(hotValue) ? '' : `| ${(hotValue / 10000).toFixed(2)} 万`;

            const ranks = [
              '0️⃣1️⃣', '0️⃣2️⃣', '0️⃣3️⃣', '0️⃣4️⃣', '0️⃣5️⃣', '0️⃣6️⃣', '0️⃣7️⃣', '0️⃣8️⃣', '0️⃣9️⃣', '1️⃣0️⃣',
              '1️⃣1️⃣', '1️⃣2️⃣', '1️⃣3️⃣', '1️⃣4️⃣', '1️⃣5️⃣', '1️⃣6️⃣', '1️⃣7️⃣', '1️⃣8️⃣', '1️⃣9️⃣', '2️⃣0️⃣',
              '2️⃣1️⃣', '2️⃣2️⃣', '2️⃣3️⃣', '2️⃣4️⃣', '2️⃣5️⃣', '2️⃣6️⃣', '2️⃣7️⃣', '2️⃣8️⃣', '2️⃣9️⃣', '3️⃣0️⃣',
              '3️⃣1️⃣', '3️⃣2️⃣', '3️⃣3️⃣', '3️⃣4️⃣', '3️⃣5️⃣', '3️⃣6️⃣', '3️⃣7️⃣', '3️⃣8️⃣', '3️⃣9️⃣', '4️⃣0️⃣',
              '4️⃣1️⃣', '4️⃣2️⃣', '4️⃣3️⃣', '4️⃣4️⃣', '4️⃣5️⃣', '4️⃣6️⃣', '4️⃣7️⃣', '4️⃣8️⃣', '4️⃣9️⃣', '5️⃣0️⃣'
            ];

            if (ranks[i]) {
              return `${ranks[i]} [${o.desc}](${url}) ${hotText}`;
            }
          }).filter(Boolean);

          if (messages.length > 0) {
            await sendTgMessage(channelId, '微博实时热搜', messages);
          } else {
            console.log(`No trending items found for channel ${channelId}.`);
          }
        }
      }
      RETRY_TIME = 0;
    }
  } catch (err) {
    console.error(`Error fetching Weibo trending for channel ${channelId}:`, err);
  }
}

async function bootstrap() {
  try {
    await Promise.all([
      fetchWeiboTrending(CHANNEL_ID_1),
      fetchWeiboTrending(CHANNEL_ID_2),
      fetchAppleNewsRss(CHANNEL_ID_3)
    ]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

bootstrap();
