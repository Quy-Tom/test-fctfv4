
import { browser } from 'k6/browser';
import { Trend } from 'k6/metrics';

// --- KHAI BÁO CÁC CHỈ SỐ ĐO LƯỜNG TÙY CHỈNH ---
const loginTrend = new Trend('thoi_gian_login');
const createTicketTrend = new Trend('thoi_gian_tao_ticket');
const scoreboardTrend = new Trend('thoi_gian_load_scoreboard');
const instancesTrend = new Trend('thoi_gian_load_instances');
const actionLogsTrend = new Trend('thoi_gian_load_action_logs');
const getTokenTrend = new Trend('thoi_gian_cho_token');

// Mảng lưu trữ dữ liệu thô để xuất CSV
let rawData = [];

// Read VUS and DURATION from environment (fallbacks)
const VUS = parseInt(__ENV.VUS || '1', 10) || 20;
const DURATION = __ENV.DURATION || '15m';

export const options = {
    scenarios: {
        challenge_test: {
            executor: 'constant-vus',
            vus: VUS, // from ENV: VUS
            duration: DURATION, // from ENV: DURATION
            exec: 'browserTest',
            options: {
                browser: {
                    type: 'chromium',
                    headless: false,
                    args: ['--no-sandbox', '--window-size=1280,800'],
                }
            },
        },
    },
};

async function waitAndClick(page, xpath, description, vuId) {
    const selector = `xpath=${xpath}`;
    try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 60000 });
        await new Promise(r => setTimeout(r, 1000));
        await page.locator(selector).click({ force: true });
        return true;
    } catch (err) {
        console.log(`[VU ${vuId}] Lỗi click ${description}: ${err.message}`);
        return false;
    }
}

export async function browserTest() {
    const context = await browser.newContext();
    const page = await context.newPage();
    // Read VU_OFFSET from environment (fallback to 0) to avoid ReferenceError
    const vuOffset = parseInt(__ENV.VU_OFFSET || '0', 10) || 0;
    const vuId = __VU + vuOffset + 1;
    const userName = `user${vuId}`;
    console.log(`Starting VU ${__VU} with offset ${vuOffset} => ${userName}`);


    const logResult = (startTime, trend) => {
    const duration = Date.now() - startTime;
    
    trend.add(duration, { 
        user: userName
    });
    };

    try {
        await page.goto('https://contestant.fctf.mnhduc.site/login', { waitUntil: 'networkidle' });

        // --- 1. ĐO THỜI GIAN LOGIN ---
        const startLogin = Date.now();
        await page.locator("input[placeholder='input username...']").fill(userName);
        await page.locator("input[placeholder='enter_password']").fill("1");
        await page.locator("//button[@type='submit']").click();
        await page.waitForSelector('xpath=//button[contains(., "Tickets")]', { timeout: 60000 });
        logResult(startLogin, loginTrend);

        // --- 2. ĐO THỜI GIAN TẠO TICKET ---

        // --- 3. ĐO THỜI GIAN LOAD SCOREBOARD ---
        const startScore = Date.now();
        await waitAndClick(page, '//button[contains(., "Scoreboard")]', "Mở Scoreboard", vuId);
        await page.waitForSelector('xpath=//table | //div[contains(@class, "table")]', { timeout: 30000 });
        logResult(startScore, scoreboardTrend);

        // --- 4. ĐO THỜI GIAN LOAD INSTANCES ---
        const startInst = Date.now();
        await waitAndClick(page, '//button[contains(., "Instances")]', "Mở Instances", vuId);
        await new Promise(r => setTimeout(r, 2000)); 
        logResult(startInst, instancesTrend);

        // --- 5. ĐO THỜI GIAN LOAD ACTION LOGS ---
        const startLogs = Date.now();
        await waitAndClick(page, '//button[contains(., "Action Logs")]', "Mở Action Logs", vuId);
        await new Promise(r => setTimeout(r, 2000)); 
        logResult(startLogs, actionLogsTrend);

        // --- 6. ĐO THỜI GIAN CHỜ TOKEN ---
        await waitAndClick(page, '//button[contains(., "Challenges")]', "Vào Challenges", vuId);
        const categoryXpath = '//*[@id="root"]/div/div/div/div/div[1]/div/div[2]/button[1]';
        await waitAndClick(page, categoryXpath, "Chọn Category", vuId);
        const exactXpath = '//*[@id="root"]/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div/div';
        await waitAndClick(page, exactXpath, "Chọn Challenge", vuId);
        const startToken = Date.now();
        const startBtnXpath = '//*[@id="root"]/div/div/div/div/div[2]/div/div[2]/div/div[2]/div[4]/button';
        await waitAndClick(page, startBtnXpath, "Bấm Start Challenge", vuId);

        const tokenSelector = 'div.text-orange-600';
        await page.waitForFunction(
            (sel) => {
                const el = document.querySelector(sel);
                return el && el.innerText.trim().startsWith('ey');
            },
            { timeout: 300000 },
            tokenSelector
        );
        logResult(startToken, getTokenTrend);

        let count = 1; 
 
    while (true) {

    await waitAndClick(page, '//button[contains(., "Scoreboard")]', "Lặp: Scoreboard", vuId);
    await new Promise(r => setTimeout(r, 2000)); 
    
    await waitAndClick(page, '//button[contains(., "Tickets")]', "Lặp: Tickets", vuId);
    await new Promise(r => setTimeout(r, 2000));
    
    await waitAndClick(page, '//button[contains(., "Action Logs")]', "Lặp: Action Logs", vuId);
    await new Promise(r => setTimeout(r, 2000));
    
    await waitAndClick(page, '//button[contains(., "Instances")]', "Lặp: Instances", vuId);
    await new Promise(r => setTimeout(r, 2000));

    if (count > 22) {
        
        await waitAndClick(page, '//button[contains(., "Challenges")]', "Vào Challenges", vuId);
        
        const categoryXpath = '//*[@id="root"]/div/div/div/div/div[1]/div/div[2]/button[1]';
        await waitAndClick(page, categoryXpath, "Chọn Category", vuId);
        
        const exactXpath = '//*[@id="root"]/div/div/div/div/div/div[2]/div[2]/div/div/div/div/div/div';
        await waitAndClick(page, exactXpath, "Chọn Challenge", vuId);
        
        const startBtnXpath = '//*[@id="root"]/div/div/div/div/div[2]/div/div[2]/div/div[2]/div[4]/button';
        await waitAndClick(page, startBtnXpath, "Bấm Start Challenge", vuId);
        
        const tokenSelector = 'div.text-orange-600';
        await page.waitForFunction(
            (sel) => {
                const el = document.querySelector(sel);
                return el && el.innerText.trim().startsWith('ey');
            },
            { timeout: 300000 },
            tokenSelector
        );
        count = 0; 
    }

    count++; 
    }   

    } catch (e) {
        console.log(`[VU ${vuId}] Lỗi: ${e.message}`);
    } finally {
        await page.close();
        await context.close();
    }
}
