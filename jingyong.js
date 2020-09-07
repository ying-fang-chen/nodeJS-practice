const Nightmare = require('nightmare');
const nightmare = Nightmare({ show: true, width: 480, height: 960 });
const fs = require('fs');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

//引入 jQuery 機制
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { window } = new JSDOM();
const $ = require('jquery')(window);

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
    'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
};
//初始化設定
async function init() {
    if (!await fs.existsSync(`downloads/jingyong`)) {
        await fs.mkdirSync(`downloads/jingyong`, { recursive: true });
    }
}

let bookWormUrl = 'https://www.bookwormzz.com/';
let jingyongUrl = 'zh/';
let arrBookName = [];

//獲得書名以建立網址
async function getBookName() {
    console.log('goto homepage');
    await nightmare
        .goto(bookWormUrl + jingyongUrl, headers)
        .wait(2000);

    let html = await nightmare.evaluate(function() {
        return document.documentElement.innerHTML;
    });

    $(html)
        .find('a.ui-btn.ui-btn-icon-right.ui-icon-carat-r')
        .each(function(index, element) {
            arrBookName.push($(element).text());
        });
}

let arrBookTocLink = [];
let regex = /\/(.*)\.php\/([0-9]*)\.xhtml/g;
let arrchapLink = [];
let arrEachChapName = [];

//走訪書目錄並取得各回連結
async function gotoBookToc() {
    for (let i = 0; i < arrBookName.length; i++) {
        arrBookTocLink.push(bookWormUrl + arrBookName[i] + '.php/0.xhtml#book_toc');
    }
    //進到目錄中
    for (let j = 0; j < arrBookTocLink.length; j++) {
        let html = await nightmare
            .goto(arrBookTocLink[j])
            .wait(1000)
            .evaluate(function() {
                return document.documentElement.innerHTML;
            });
        $(html)
            .find('div.ui-content a.ui-link')
            .each(function(index, element) {
                let chapName = $(element).text();
                let chapLink = $(element).attr('href');
                let Match = regex.exec(chapLink);
                let Match2 = regex.exec(chapLink);
                //console.log(Match[1]);
                arrEachChapName.push(Match[1] + chapName);
                //console.log(Match[1] + chapName);
                arrchapLink.push('https://www.bookwormzz.com' + chapLink);
            })

    }
}

async function gotoEachChap() {
    for (let i = 0; i < arrchapLink.length; i++) {
        let html = await nightmare
            .goto(arrchapLink[i], headers)
            .wait(1000).evaluate(function() {
                return document.documentElement.innerHTML;
            });
        let bookText = $(html).find("div.ui-content div[style='height: auto !important;']").text();
        await fs.writeFileSync(`downloads/jingyong/${arrEachChapName[i]}.txt`, bookText);
    }
}

//關閉 nightmare
async function close() {
    await nightmare.end(function() {
        console.log(`close nightmare`);
    });
}

//透過迴圈特性，將陣列中的各個 function 透過 await 逐一執行
async function asyncArray(functionList) {
    for (let func of functionList) {
        await func();
    }
}

(
    async function() {
        await asyncArray([
            init,
            getBookName,
            gotoBookToc,
            gotoEachChap,
            //writeFile,
            //downloader,
            close
        ])
    }
)();