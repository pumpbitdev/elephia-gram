import {Telegraf} from 'telegraf';

const bot = new Telegraf('7817083650:AAGLRq3XrpeJ5oOuv9aa0GcWzrQvUsUl6ac');

bot.launch();

bot.hears('hi', async (ctx) => await ctx.reply('Hey there'));

console.log('Bot is running...');