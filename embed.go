package main

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed web/dist
var embeddedFS embed.FS

func getFrontendFS() http.FileSystem {
	sub, err := fs.Sub(embeddedFS, "web/dist")
	if err != nil {
		panic(err)
	}
	return http.FS(sub)
}
