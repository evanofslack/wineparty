package handlers

import (
	"log/slog"
	"net/http"

	"github.com/gorilla/websocket"

	"wineparty/internal/ws"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func WSHandler(hub *ws.Hub) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			slog.Error("ws upgrade", "err", err)
			return
		}
		client := ws.NewClient(hub, conn)
		hub.RegisterClient(client)
		go client.WritePump()
		go client.ReadPump()
	}
}
