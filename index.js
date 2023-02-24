const puppeteer = require("puppeteer");
const express = require("express");
const TOKEN = process.env.BOT_TOKEN || 'token'

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const port = Number(process.env.PORT) || 8090;

function sleep(ms) {
    return new Promise((res) => setTimeout(res, ms));
}

async function handler(browser, url, cookie){
    const page = await browser.newPage();
    await page.setCookie(cookie);
    await page.goto(url);
    console.log("Visit", url, cookie);
    await page.waitForNetworkIdle({
        timeout: 5000,
    });
    await page.close();
}

/*
Payload
{
    url: "https://eoici9tlus34ski.m.pipedream.net",
    cookie: {
        name: "flag",
        value: "le flag là",
        domain: "localhost"
    }
}


*/


async function start(){
    const browser = await puppeteer.launch({ pipe: true,  args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ], });

    app.post("/", async (req, res) => {
        const key = req.headers["bot-key"]
        if(key != TOKEN) return res.json({status: 'error', message: 'Invalid key'}
)
        const url = req.body.url;
        const cookie = req.body.cookie;
        if (!(/^https?:\/\//).test(url)) {
            return res.json({status: 'error', message: 'Invalid URL'})
        }
        if(!url || !cookie) return res.json({status: 'error', message: 'Missing "url" or "cookie" value'})
        
        let ctx;
        let ret = undefined;
        try {
            ctx = await browser.createIncognitoBrowserContext();
            const prom = Promise.race([
                handler(ctx, url, cookie),
                sleep(8000),
            ])
            ret = await prom;
        } catch (err) {
            console.error("Handler error", err);
            if (ctx) {
                try {
                    await ctx.close();
                } catch (e) {}
            }
            return res.json({status: 'error', message: 'Error visiting page'})
        }
        try {
            await ctx.close();
        } catch (e) {}
        if (typeof ret === "object" && ret !== null && "error" in ret) {
            return res.json({status: 'error', message: ret.error})
        }
        return res.json({status: 'success', message: "Visit successful"})
    });

    app.listen(port, () => {
        console.log(`Bot listening on port ${port}.`);
    });
}

start()