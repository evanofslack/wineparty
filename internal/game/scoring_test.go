package game

import (
	"testing"
)

var testWine = WineConfig{
	ID:      1,
	Variety: "Cabernet Sauvignon",
	Region:  "Napa Valley",
	Year:    2020,
}

func TestScoreExactMatch(t *testing.T) {
	g := Guess{
		PlayerID: "p1",
		Variety:  "Cabernet Sauvignon",
		Region:   "Napa Valley",
		Year:     2020,
		Flavors:  []FlavorNote{"cherry", "oak", "vanilla"},
	}
	rs := ScoreGuess(g, testWine)
	expected := pointsVariety + pointsRegion + pointsYearExact + 3*pointsFlavor
	if rs.Points != expected {
		t.Fatalf("expected %d, got %d", expected, rs.Points)
	}
	if !rs.VarietyHit {
		t.Fatal("expected variety hit")
	}
	if !rs.RegionHit {
		t.Fatal("expected region hit")
	}
	if rs.YearPoints != pointsYearExact {
		t.Fatalf("expected year exact %d, got %d", pointsYearExact, rs.YearPoints)
	}
}

func TestScoreYearOff(t *testing.T) {
	g := Guess{PlayerID: "p1", Year: 2021}
	rs := ScoreGuess(g, testWine)
	if rs.YearPoints != pointsYearOne {
		t.Fatalf("expected %d for 1yr off, got %d", pointsYearOne, rs.YearPoints)
	}

	g2 := Guess{PlayerID: "p1", Year: 2015}
	rs2 := ScoreGuess(g2, testWine)
	if rs2.YearPoints != 0 {
		t.Fatalf("expected 0 for 5yr+ off, got %d", rs2.YearPoints)
	}
}

func TestScoreYearTwoOff(t *testing.T) {
	g := Guess{PlayerID: "p1", Year: 2022}
	rs := ScoreGuess(g, testWine)
	if rs.YearPoints != pointsYearTwo {
		t.Fatalf("expected %d for 2yr off, got %d", pointsYearTwo, rs.YearPoints)
	}
}

func TestScoreCaseInsensitive(t *testing.T) {
	g := Guess{PlayerID: "p1", Variety: "cabernet sauvignon", Region: "napa valley"}
	rs := ScoreGuess(g, testWine)
	if !rs.VarietyHit {
		t.Fatal("variety should be case-insensitive")
	}
	if !rs.RegionHit {
		t.Fatal("region should be case-insensitive")
	}
}

func TestScoreMaxFlavors(t *testing.T) {
	g := Guess{
		PlayerID: "p1",
		Flavors:  []FlavorNote{"a", "b", "c", "d", "e"},
	}
	rs := ScoreGuess(g, testWine)
	// Only 3 should count
	if rs.FlavorPoints != 3*pointsFlavor {
		t.Fatalf("expected %d flavor points, got %d", 3*pointsFlavor, rs.FlavorPoints)
	}
}

func TestScoreNoMatch(t *testing.T) {
	g := Guess{PlayerID: "p1", Variety: "Merlot", Region: "Bordeaux", Year: 2010}
	rs := ScoreGuess(g, testWine)
	if rs.VarietyHit || rs.RegionHit {
		t.Fatal("expected no hits")
	}
	if rs.YearPoints != 0 {
		t.Fatalf("expected 0 year points, got %d", rs.YearPoints)
	}
}

func TestLeaderboard(t *testing.T) {
	players := map[string]*Player{
		"p1": {ID: "p1", Name: "Alice", Role: RolePlayer, TotalScore: 10},
		"p2": {ID: "p2", Name: "Bob", Role: RolePlayer, TotalScore: 20},
		"a1": {ID: "a1", Name: "Admin", Role: RoleAdmin, TotalScore: 99},
	}
	lb := BuildLeaderboard(players)
	if len(lb) != 2 {
		t.Fatalf("expected 2 entries (admin excluded), got %d", len(lb))
	}
	if lb[0].PlayerName != "Bob" || lb[0].Score != 20 || lb[0].Rank != 1 {
		t.Fatalf("Bob should be rank 1: %+v", lb[0])
	}
	if lb[1].PlayerName != "Alice" || lb[1].Rank != 2 {
		t.Fatalf("Alice should be rank 2: %+v", lb[1])
	}
}
