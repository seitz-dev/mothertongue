package main

import (
	"bufio"
	"crypto/md5"
	"crypto/sha1"
	"encoding/hex"
	"flag"
	"fmt"
	"os"
)

// HashAlg defines the supported hashing algorithms.
type HashAlg int

const (
	MD5 HashAlg = iota
	SHA1
)

func main() {
	targetPath := flag.String("t", "", "Path to the file containing the target hash")
	wordlistPath := flag.String("l", "", "Path to the wordlist file")
	algName := flag.String("a", "md5", "Algorithm to use (md5, sha1)")
	debug := flag.Bool("d", false, "Enable debug logging")
	flag.Parse()

	if *targetPath == "" || *wordlistPath == "" {
		fmt.Fprintln(os.Stderr, "Error: target (-t) and wordlist (-l) paths are required")
		os.Exit(1)
	}

	var alg HashAlg
	switch *algName {
	case "md5":
		alg = MD5
	case "sha1":
		alg = SHA1
	default:
		fmt.Fprintf(os.Stderr, "Error: unsupported algorithm %s\n", *algName)
		os.Exit(1)
	}

	targetHash, err := os.ReadFile(*targetPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error reading target: %v\n", err)
		os.Exit(1)
	}
	targetStr := string(targetHash)

	file, err := os.Open(*wordlistPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error opening wordlist: %v\n", err)
		os.Exit(1)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		word := scanner.Text()
		var currentHash string

		switch alg {
		case MD5:
			h := md5.Sum([]byte(word))
			currentHash = hex.EncodeToString(h[:])
		case SHA1:
			h := sha1.Sum([]byte(word))
			currentHash = hex.EncodeToString(h[:])
		}

		if *debug {
			fmt.Printf("[DEBUG] Word: %s | Hash: %s\n", word, currentHash)
		}

		if currentHash == targetStr {
			fmt.Printf("Match found: %s\n", word)
			return
		}
	}

	if err := scanner.Err(); err != nil {
		fmt.Fprintf(os.Stderr, "Error reading wordlist: %v\n", err)
	}

	fmt.Println("No match found.")
}