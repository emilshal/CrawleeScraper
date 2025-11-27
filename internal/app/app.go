package app

import (
	"log"

	"realtorcrawler/internal/crawler"
)

func Run() {
	log.Println("Realtor.com scraper starting (Go orchestration layer)")

	if err := crawler.Run(); err != nil {
		log.Fatalf("crawler failed: %v", err)
	}
}

