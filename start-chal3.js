import { browser } from 'k6/browser';
import { Trend } from 'k6/metrics';

// --- KHAI BÁO CHỈ SỐ ĐO LƯỜNG ---
const loginTrend = new Trend('thoi_gian_login');
const createTicketTrend = new Trend('thoi_gian_tao_ticket');
const scoreboardTrend = new Trend('thoi_gian_load_scoreboard');
const instancesTrend = new Trend('thoi_gian_load_instances');
const actionLogsTrend = new Trend('thoi_gian_load_action_logs');
const getTokenTrend = new Trend('thoi_gian_cho_token');

export const options = {
    scenarios: {
        challenge_test: {
            executor: 'constant-vus',
            // Lấy VUS từ Docker Compose, mặc định là 1 nếu không có
            vus: parseInt(__ENV.VUS) || 1, 
            // Lấy DURATION từ Docker Compose, mặc định 1m
            duration: __ENV.DURATION || '1m',
            exec: 'browserTest',
            options: {
                browser: {
                    type: 'chromium'
                }
            },
        },
    },
};

async function waitAndClick(page, xpath, description, vuId) {
    const selector = `xpath=${xpath}`;
    try {
        await page.waitForSelector(selector, { state: 'visible', timeout: 30000 });
        // Nghỉ một chút để giả lập người dùng thật
        await new Promise(r => setTimeout(r, 500));
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
    
    // Sử dụng VU_OFFSET từ môi trường để tránh trùng lặp username nếu chạy nhiều cụm
    const vuOffset = parseInt(__ENV.VU_OFFSET) || 0;
    const vuId = __VU + vuOffset;
    const userName = `user${vuId}`;

    const logResult = (startTime, trend) => {
        const duration = Date.now() - startTime;
        trend.add(duration, { user: userName });
    };

    try {
        // Điều hướng đến trang login
        await page.goto('https://contestant.fctf.mnhduc.site/login', { waitUntil: 'networkidle' });

        // --- 1. LOGIN ---
        const startLogin = Date.now();
        await page.locator("input[placeholder='input username...']").fill(userName);
        await page.locator("input[placeholder='enter_password']").fill("1");
        await page.locator("//button[@type='submit']").click();
        await page.waitForSelector('xpath=//button[contains(., "Tickets")]', { timeout: 60000 });
        logResult(startLogin, loginTrend);

        // --- 2. TẠO TICKET ---
        await waitAndClick(page, '//button[contains(., "Tickets")]', "Chuyển sang Tickets", vuId);
        await waitAndClick(page, '//button[contains(., "NEW TICKET")]', "Mở Modal Ticket", vuId);

        const startTicket = Date.now();
        await page.locator('input#title').fill(`Auto Ticket ${vuId}`);
        await page.locator('select#type').selectOption('Question');
        await page.locator('textarea#description').fill(`Mô tả tự động từ VU ${vuId}`);
        await page.locator('xpath=//button[contains(., "CREATE TICKET") and @type="submit"]').click();
        // Chờ modal đóng hoặc ticket xuất hiện
        await new Promise(r => setTimeout(r, 2000)); 
        logResult(startTicket, createTicketTrend);

        // --- 3. SCOREBOARD ---
        const startScore = Date.now();
        await waitAndClick(page, '//button[contains(., "Scoreboard")]', "Mở Scoreboard", vuId);
        await page.waitForSelector('xpath=//table', { timeout: 30000 });
        logResult(startScore, scoreboardTrend);

        // --- 4. INSTANCES ---
        const startInst = Date.now();
        await waitAndClick(page, '//button[contains(., "Instances")]', "Mở Instances", vuId);
        logResult(startInst, instancesTrend);

        // --- 5. ACTION LOGS ---
        const startLogs = Date.now();
        await waitAndClick(page, '//button[contains(., "Action Logs")]', "Mở Action Logs", vuId);
        logResult(startLogs, actionLogsTrend);

        // --- 6. CHALLENGES & TOKEN ---
        await waitAndClick(page, '//button[contains(., "Challenges")]', "Vào Challenges", vuId);
        
        // Chọn Category đầu tiên
        await waitAndClick(page, '(//button[contains(@class, "category")])[1]', "Chọn Category", vuId);
        
        // Chọn Challenge đầu tiên
        await waitAndClick(page, '(//div[contains(@class, "challenge-card")])[1]', "Chọn Challenge", vuId);

        const startToken = Date.now();
        const startBtnXpath = '//button[contains(., "Start")]';
        if (await waitAndClick(page, startBtnXpath, "Bấm Start Challenge", vuId)) {
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
        }

    } catch (e) {
        console.log(`[VU ${vuId}] Lỗi: ${e.message}`);
    } finally {
        await page.close();
        await context.close();
    }
}