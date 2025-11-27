import { PlaywrightCrawler } from 'crawlee';

// Basic shape of the data we want per book.
export interface BookListing {
	title: string;
	price: number | null;
	availability: string | null;
	rating: string | null;
	url: string;
}

// Default target: a practice site explicitly built for scraping.
// Docs: https://books.toscrape.com/
const DEFAULT_START_URL = 'https://books.toscrape.com/';

// Selectors for books.toscrape.com
const SELECTORS = {
	card: '.product_pod',
	title: 'h3 a',
	price: '.price_color',
	availability: '.availability',
	rating: '.star-rating',
	link: 'h3 a',
} as const;

function parseNumber(text: string | null | undefined): number | null {
	if (!text) return null;
	const match = text.replace(/\s+/g, ' ').match(/[\d,]+/);
	if (!match) return null;
	const numeric = match[0].replace(/,/g, '');
	const value = Number.parseInt(numeric, 10);
	return Number.isNaN(value) ? null : value;
}

export async function runBookCrawler() {
	const startUrl = process.env.START_URL ?? DEFAULT_START_URL;

	const crawler = new PlaywrightCrawler({
		// Be very gentle: single request, no retries, single browser.
		maxRequestsPerCrawl: 1,
		maxConcurrency: 1,
		maxRequestRetries: 0,
		headless: true,

		async requestHandler({ request, page, log }) {
			log.info(`Visited ${request.url}`);

			// Wait a bit to ensure content is rendered (adjust as needed).
			await page.waitForTimeout(2000);

			const listings = await page.$$eval(
				SELECTORS.card,
				(cards: Element[], selectors: typeof SELECTORS) => {
					type RawBook = {
						title: string | null;
						price: string | null;
						availability: string | null;
						rating: string | null;
						url: string;
					};

					const extractText = (el: Element | null): string | null =>
						el?.textContent?.trim().replace(/\s+/g, ' ') ?? null;

					const results: RawBook[] = [];

					for (const card of cards) {
						const titleEl = card.querySelector(selectors.title) as
							| HTMLAnchorElement
							| null;
						const title = titleEl?.getAttribute('title') ?? titleEl?.textContent;

						const priceRaw = extractText(card.querySelector(selectors.price));
						const availabilityRaw = extractText(
							card.querySelector(selectors.availability),
						);

						const ratingEl = card.querySelector(selectors.rating);
						const ratingClass = ratingEl?.getAttribute('class') ?? '';
						// classes like "star-rating Three"
						const ratingMatch = ratingClass.match(
							/(One|Two|Three|Four|Five)/i,
						);
						const rating = ratingMatch ? ratingMatch[1] : null;

						const linkEl = card.querySelector<HTMLAnchorElement>(selectors.link);
						const href = linkEl?.getAttribute('href') ?? '';
						if (!href) continue;

						const absoluteUrl = new URL(href, document.baseURI).href;

						results.push({
							title: title?.trim() ?? null,
							price: priceRaw,
							availability: availabilityRaw,
							rating,
							url: absoluteUrl,
						});
					}

					return results;
				},
				SELECTORS,
			);

			// Convert raw string fields into structured BookListing objects and print NDJSON.
			for (const raw of listings) {
				const listing: BookListing = {
					title: raw.title ?? '',
					price: parseNumber(raw.price),
					availability: raw.availability,
					rating: raw.rating,
					url: raw.url,
				};

				// NDJSON: one JSON object per line.
				console.log(JSON.stringify(listing));
			}
		},
	});

	await crawler.run([startUrl]);
}

// Allow running directly via `node dist/main.js` or `ts-node src/main.ts`.
if (import.meta.url === `file://${process.argv[1]}`) {
	runBookCrawler().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
