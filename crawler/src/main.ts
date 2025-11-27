import { PlaywrightCrawler } from 'crawlee';

// Basic shape of the data we want per listing.
export interface Listing {
	address: string;
	city: string;
	state: string;
	zip: string;
	price: number | null;
	beds: number | null;
	baths: number | null;
	sqft: number | null;
	url: string;
}

// NOTE: Please confirm this URL by performing a search on Realtor.com
// for Fairfax, VA single-family homes and copying the URL from your browser,
// then optionally overriding via the REALTOR_START_URL env var.
const DEFAULT_START_URL =
	'https://www.realtor.com/realestateandhomes-search/Fairfax_VA/type-single-family-home';

// Selectors are educated guesses and may need tweaking based on the live site.
// Inspect the listing cards in your browser devtools and adjust as needed.
const SELECTORS = {
	card: '[data-testid="property-card"], article', // fallback to <article> if data-testid changes
	address: '[data-testid="property-address"]',
	price: '[data-testid="property-price"]',
	beds: '[data-testid="property-beds"]',
	baths: '[data-testid="property-baths"]',
	sqft: '[data-testid="property-sqft"]',
	link: 'a[href*="/realestateandhomes-detail/"]',
} as const;

function parseNumber(text: string | null | undefined): number | null {
	if (!text) return null;
	const match = text.replace(/\s+/g, ' ').match(/[\d,]+/);
	if (!match) return null;
	const numeric = match[0].replace(/,/g, '');
	const value = Number.parseInt(numeric, 10);
	return Number.isNaN(value) ? null : value;
}

export async function runRealtorCrawler() {
	const startUrl = process.env.REALTOR_START_URL ?? DEFAULT_START_URL;

	const crawler = new PlaywrightCrawler({
		maxRequestsPerCrawl: 5, // keep low while developing; increase carefully
		maxConcurrency: 2,
		headless: true,

		async requestHandler({ request, page, log }) {
			log.info(`Visited ${request.url}`);

			// Wait a bit to ensure content is rendered (adjust as needed).
			await page.waitForTimeout(2000);

			const listings = await page.$$eval(
				SELECTORS.card,
				(cards, selectors) => {
					type Listing = {
						address: string;
						city: string;
						state: string;
						zip: string;
						price: string | null;
						beds: string | null;
						baths: string | null;
						sqft: string | null;
						url: string;
					};

					const extractText = (el: Element | null): string | null =>
						el?.textContent?.trim().replace(/\s+/g, ' ') ?? null;

					const results: Listing[] = [];

					for (const card of cards) {
						const addressRaw = extractText(
							card.querySelector(selectors.address),
						);
						const priceRaw = extractText(card.querySelector(selectors.price));
						const bedsRaw = extractText(card.querySelector(selectors.beds));
						const bathsRaw = extractText(card.querySelector(selectors.baths));
						const sqftRaw = extractText(card.querySelector(selectors.sqft));

						// Attempt to parse city/state/zip from a combined address if present.
						let street = addressRaw ?? '';
						let city = 'Fairfax';
						let state = 'VA';
						let zip = '';

						if (addressRaw && addressRaw.includes(',')) {
							const parts = addressRaw.split(',');
							if (parts.length >= 3) {
								street = parts[0].trim();
								city = parts[1].trim() || city;
								const stateZipParts = parts[2].trim().split(/\s+/);
								if (stateZipParts[0]) state = stateZipParts[0];
								if (stateZipParts[1]) zip = stateZipParts[1];
							}
						}

						const linkEl = card.querySelector<HTMLAnchorElement>(selectors.link);
						const href = linkEl?.href ?? '';
						if (!href) continue;

						results.push({
							address: street,
							city,
							state,
							zip,
							price: priceRaw,
							beds: bedsRaw,
							baths: bathsRaw,
							sqft: sqftRaw,
							url: href,
						});
					}

					return results;
				},
				SELECTORS,
			);

			// Convert raw string fields into structured Listing objects and print NDJSON.
			for (const raw of listings) {
				const listing: Listing = {
					address: raw.address,
					city: raw.city,
					state: raw.state,
					zip: raw.zip,
					price: parseNumber(raw.price),
					beds: parseNumber(raw.beds),
					baths: parseNumber(raw.baths),
					sqft: parseNumber(raw.sqft),
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
	runRealtorCrawler().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}

