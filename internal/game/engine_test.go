package game

import (
	"testing"
)

func testWines() []WineConfig {
	return []WineConfig{
		{ID: 1, Name: "Wine A", Variety: "Cabernet Sauvignon", Region: "Napa", Year: 2020},
		{ID: 2, Name: "Wine B", Variety: "Chardonnay", Region: "Burgundy", Year: 2021},
	}
}

func newTestEngine() *Engine {
	return NewEngine(NewGameState(testWines()))
}

func TestInitialPhase(t *testing.T) {
	e := newTestEngine()
	if e.State().Phase != PhaseLobby {
		t.Fatalf("expected PhaseLobby, got %v", e.State().Phase)
	}
}

func TestStartGame(t *testing.T) {
	e := newTestEngine()
	if err := e.StartGame(); err != nil {
		t.Fatal(err)
	}
	if e.State().Phase != PhaseGuessing {
		t.Fatalf("expected PhaseGuessing, got %v", e.State().Phase)
	}
	if e.State().StartedAt == nil {
		t.Fatal("StartedAt should be set")
	}
}

func TestStartGameWrongPhase(t *testing.T) {
	e := newTestEngine()
	e.StartGame()
	err := e.StartGame()
	if err != ErrWrongPhase {
		t.Fatalf("expected ErrWrongPhase, got %v", err)
	}
}

func TestSubmitGuess(t *testing.T) {
	e := newTestEngine()
	e.StartGame()
	e.AddPlayer("p1", "Alice", RolePlayer)

	g := Guess{PlayerID: "p1", Variety: "Cabernet Sauvignon", Region: "Napa", Year: 2020}
	if err := e.SubmitGuess(g); err != nil {
		t.Fatal(err)
	}
	if len(e.State().Rounds[0].Guesses) != 1 {
		t.Fatal("guess not recorded")
	}
}

func TestDuplicateGuessRejected(t *testing.T) {
	e := newTestEngine()
	e.StartGame()
	e.AddPlayer("p1", "Alice", RolePlayer)

	g := Guess{PlayerID: "p1", Variety: "Chardonnay", Region: "Napa", Year: 2020}
	e.SubmitGuess(g)
	err := e.SubmitGuess(g)
	if err != ErrAlreadySubmitted {
		t.Fatalf("expected ErrAlreadySubmitted, got %v", err)
	}
}

func TestTooManyFlavors(t *testing.T) {
	e := newTestEngine()
	e.StartGame()
	e.AddPlayer("p1", "Alice", RolePlayer)

	g := Guess{
		PlayerID: "p1",
		Flavors:  []FlavorNote{"a", "b", "c", "d"},
	}
	err := e.SubmitGuess(g)
	if err != ErrTooManyFlavors {
		t.Fatalf("expected ErrTooManyFlavors, got %v", err)
	}
}

func TestCloseGuessing(t *testing.T) {
	e := newTestEngine()
	e.StartGame()
	e.AddPlayer("p1", "Alice", RolePlayer)
	e.SubmitGuess(Guess{PlayerID: "p1", Variety: "Cabernet Sauvignon", Region: "Napa", Year: 2020})

	if err := e.CloseGuessing(); err != nil {
		t.Fatal(err)
	}
	if e.State().Phase != PhaseScoring {
		t.Fatalf("expected PhaseScoring, got %v", e.State().Phase)
	}
}

func TestNextRoundAdvances(t *testing.T) {
	e := newTestEngine()
	e.StartGame()
	e.CloseGuessing()
	if err := e.NextRound(); err != nil {
		t.Fatal(err)
	}
	if e.State().CurrentRound != 1 {
		t.Fatalf("expected round 1, got %d", e.State().CurrentRound)
	}
	if e.State().Phase != PhaseGuessing {
		t.Fatalf("expected PhaseGuessing, got %v", e.State().Phase)
	}
}

func TestGameComplete(t *testing.T) {
	e := newTestEngine()
	e.StartGame()
	e.CloseGuessing()
	e.NextRound() // round 1
	e.CloseGuessing()
	e.NextRound() // should trigger complete (2 wines total)

	if e.State().Phase != PhaseComplete {
		t.Fatalf("expected PhaseComplete, got %v", e.State().Phase)
	}
	if e.State().CompletedAt == nil {
		t.Fatal("CompletedAt should be set")
	}
}

func TestReconnect(t *testing.T) {
	e := newTestEngine()
	e.AddPlayer("p1", "Alice", RolePlayer)
	e.SetPlayerDisconnected("p1")
	if e.State().Players["p1"].Connected {
		t.Fatal("should be disconnected")
	}
	e.AddPlayer("p1", "Alice", RolePlayer)
	if !e.State().Players["p1"].Connected {
		t.Fatal("should be reconnected")
	}
}

func TestSetPlayerScore(t *testing.T) {
	e := newTestEngine()
	e.AddPlayer("p1", "Alice", RolePlayer)
	if err := e.SetPlayerScore("p1", 42); err != nil {
		t.Fatal(err)
	}
	if e.State().Players["p1"].TotalScore != 42 {
		t.Fatalf("expected 42, got %d", e.State().Players["p1"].TotalScore)
	}
}
