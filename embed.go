package wineparty

import (
	"embed"
	"io/fs"
	"net/http"
)

//go:embed web/dist
var embeddedFS embed.FS

func GetFrontendFS() http.FileSystem {
	sub, err := fs.Sub(embeddedFS, "web/dist")
	if err != nil {
		panic(err)
	}
	return http.FS(sub)
}
