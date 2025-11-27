package crawler

import "log"

// Run is the main entry point from Go into the crawling layer.
// In a later step this will invoke the Crawlee (Node.js) project,
// for example via an HTTP API or by spawning a Node process.
func Run() error {
	log.Println("Crawler stub: wire up Crawlee integration here")
	return nil
}

