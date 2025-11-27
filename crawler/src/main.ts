import { PlaywrightCrawler } from 'crawlee';

export async function runRealtorCrawler() {
	const crawler = new PlaywrightCrawler({
		async requestHandler({ request, page, log }) {
			log.info(`Visited ${request.url}`);

			// TODO: Add Realtor.com extraction logic here.
			// Do not hit production too aggressively; add
			// proper rate limiting, robots.txt handling, etc.
			await page.waitForTimeout(1000);
		},
	});

	await crawler.run(['https://www.realtor.com/']);
}

// Allow running directly via `node dist/main.js` or `ts-node src/main.ts`.
if (import.meta.url === `file://${process.argv[1]}`) {
	runRealtorCrawler().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}

