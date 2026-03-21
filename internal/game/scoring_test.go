package game

import (
	"math"
	"testing"
)

var testWine = WineConfig{
	ID:      1,
	Variety: "Cabernet Sauvignon",
	Region:  "Napa Valley",
	Year:    2020,
	Flavors: []string{"cherry", "oak", "vanilla"},
	Price:   40,
}

func TestScoreExactMatch(t *testing.T) {
	g := Guess{
		PlayerID: "p1",
		Variety:  "Cabernet Sauvignon",
		Region:   "Napa Valley",
		Year:     2020,
		Flavors:  []FlavorNote{"cherry", "oak", "vanilla"},
	}
	rs := ScoreGuess(g, testWine, 1, 2, 0, 0)
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
	rs := ScoreGuess(g, testWine, 1, 2, 0, 0)
	if rs.YearPoints != pointsYearMid {
		t.Fatalf("expected %d for 1yr off, got %d", pointsYearMid, rs.YearPoints)
	}

	g2 := Guess{PlayerID: "p1", Year: 2015}
	rs2 := ScoreGuess(g2, testWine, 1, 2, 0, 0)
	if rs2.YearPoints != 0 {
		t.Fatalf("expected 0 for 5yr+ off, got %d", rs2.YearPoints)
	}
}

func TestScoreYearTwoOff(t *testing.T) {
	g := Guess{PlayerID: "p1", Year: 2022}
	rs := ScoreGuess(g, testWine, 1, 2, 0, 0)
	if rs.YearPoints != pointsYearFar {
		t.Fatalf("expected %d for 2yr off, got %d", pointsYearFar, rs.YearPoints)
	}
}

func TestScoreCaseInsensitive(t *testing.T) {
	g := Guess{PlayerID: "p1", Variety: "cabernet sauvignon", Region: "napa valley"}
	rs := ScoreGuess(g, testWine, 1, 2, 0, 0)
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
		Flavors:  []FlavorNote{"cherry", "oak", "vanilla", "pepper", "spice"},
	}
	rs := ScoreGuess(g, testWine, 1, 2, 0, 0)
	// Only 3 should count (maxFlavors cap) and all 3 match
	if rs.FlavorPoints != 3*pointsFlavor {
		t.Fatalf("expected %d flavor points, got %d", 3*pointsFlavor, rs.FlavorPoints)
	}
}

func TestScoreNoMatch(t *testing.T) {
	g := Guess{PlayerID: "p1", Variety: "Merlot", Region: "Bordeaux", Year: 2010}
	rs := ScoreGuess(g, testWine, 1, 2, 0, 0)
	if rs.VarietyHit || rs.RegionHit {
		t.Fatal("expected no hits")
	}
	if rs.YearPoints != 0 {
		t.Fatalf("expected 0 year points, got %d", rs.YearPoints)
	}
}

func makeState(rounds []Round, players map[string]*Player) *GameState {
	return &GameState{
		Phase:   PhaseComplete,
		Rounds:  rounds,
		Players: players,
	}
}

func TestComputeSummaryAllRated(t *testing.T) {
	state := makeState([]Round{
		{
			Index: 0,
			Wine:  WineConfig{Name: "Red A"},
			Guesses: []Guess{
				{PlayerID: "p1", Rating: 8},
				{PlayerID: "p2", Rating: 6},
			},
		},
		{
			Index: 1,
			Wine:  WineConfig{Name: "White B"},
			Guesses: []Guess{
				{PlayerID: "p1", Rating: 4},
				{PlayerID: "p2", Rating: 10},
			},
		},
	}, map[string]*Player{
		"p1": {ID: "p1", Role: RolePlayer},
		"p2": {ID: "p2", Role: RolePlayer},
	})

	gs, _ := computeSummary(state)

	if gs.WineRatings[0].AvgRating != 7.0 {
		t.Fatalf("expected avg 7.0 for round 0, got %v", gs.WineRatings[0].AvgRating)
	}
	if gs.WineRatings[1].AvgRating != 7.0 {
		t.Fatalf("expected avg 7.0 for round 1, got %v", gs.WineRatings[1].AvgRating)
	}
	if gs.WineRatings[0].RatedCount != 2 {
		t.Fatalf("expected 2 raters, got %d", gs.WineRatings[0].RatedCount)
	}
	// round 1 has higher variance: [(4-7)^2 + (10-7)^2]/2 = 9
	if gs.MostContested == nil {
		t.Fatal("expected MostContested to be set")
	}
	if gs.MostContested.WineName != "White B" {
		t.Fatalf("expected White B as most contested, got %s", gs.MostContested.WineName)
	}
}

func TestComputeSummaryNoneRated(t *testing.T) {
	state := makeState([]Round{
		{
			Index: 0,
			Wine:  WineConfig{Name: "Red A"},
			Guesses: []Guess{
				{PlayerID: "p1", Rating: 0},
			},
		},
	}, map[string]*Player{
		"p1": {ID: "p1", Role: RolePlayer},
	})

	gs, _ := computeSummary(state)

	if gs.MostPopular != nil || gs.LeastLiked != nil || gs.MostContested != nil {
		t.Fatal("expected all highlights nil when no ratings")
	}
	if gs.WineRatings[0].RatedCount != 0 {
		t.Fatalf("expected 0 rated count, got %d", gs.WineRatings[0].RatedCount)
	}
}

func TestComputeSummaryVariance(t *testing.T) {
	state := makeState([]Round{
		{
			Index: 0,
			Wine:  WineConfig{Name: "R"},
			Guesses: []Guess{
				{PlayerID: "p1", Rating: 2},
				{PlayerID: "p2", Rating: 8},
			},
		},
	}, map[string]*Player{
		"p1": {ID: "p1", Role: RolePlayer},
		"p2": {ID: "p2", Role: RolePlayer},
	})

	gs, _ := computeSummary(state)

	// avg=5, variance = [(2-5)^2 + (8-5)^2]/2 = 9
	wantVariance := 9.0
	if math.Abs(gs.WineRatings[0].Variance-wantVariance) > 1e-9 {
		t.Fatalf("expected variance %v, got %v", wantVariance, gs.WineRatings[0].Variance)
	}
}

func TestComputeSummaryFavoriteWineTieBreak(t *testing.T) {
	// Tie on rating: first encountered should win
	state := makeState([]Round{
		{
			Index:   0,
			Wine:    WineConfig{Name: "First"},
			Guesses: []Guess{{PlayerID: "p1", Rating: 9}},
		},
		{
			Index:   1,
			Wine:    WineConfig{Name: "Second"},
			Guesses: []Guess{{PlayerID: "p1", Rating: 9}},
		},
	}, map[string]*Player{
		"p1": {ID: "p1", Role: RolePlayer},
	})

	_, ps := computeSummary(state)
	if ps["p1"].FavoriteWine != "First" {
		t.Fatalf("expected First as favorite (tie-break first encountered), got %s", ps["p1"].FavoriteWine)
	}
}

func TestComputeSummaryBestRound(t *testing.T) {
	state := makeState([]Round{
		{
			Index:  0,
			Wine:   WineConfig{Name: "R1"},
			Scores: []RoundScore{{PlayerID: "p1", Points: 3}},
		},
		{
			Index:  1,
			Wine:   WineConfig{Name: "R2"},
			Scores: []RoundScore{{PlayerID: "p1", Points: 8, VarietyHit: true, YearPoints: 2}},
		},
	}, map[string]*Player{
		"p1": {ID: "p1", Role: RolePlayer},
	})

	_, ps := computeSummary(state)
	if ps["p1"].BestRound != 1 {
		t.Fatalf("expected best round 1, got %d", ps["p1"].BestRound)
	}
	if ps["p1"].BestRoundPoints != 8 {
		t.Fatalf("expected best round points 8, got %d", ps["p1"].BestRoundPoints)
	}
	if ps["p1"].VarietyHits != 1 {
		t.Fatalf("expected 1 variety hit, got %d", ps["p1"].VarietyHits)
	}
	if ps["p1"].TotalYearPoints != 2 {
		t.Fatalf("expected 2 total year points, got %d", ps["p1"].TotalYearPoints)
	}
}

func TestScorePrice(t *testing.T) {
	cases := []struct {
		guessPrice int
		tier1      int
		tier2      int
		want       int
	}{
		{40, 3, 6, pointsPriceExact},
		{43, 3, 6, pointsPriceMid},
		{46, 3, 6, pointsPriceFar},
		{47, 3, 6, 0},
		{0, 3, 6, 0},
	}
	for _, tc := range cases {
		g := Guess{PlayerID: "p1", Price: tc.guessPrice}
		rs := ScoreGuess(g, testWine, 1, 2, tc.tier1, tc.tier2)
		if rs.PricePoints != tc.want {
			t.Fatalf("price %d tier1=%d tier2=%d: expected %d, got %d", tc.guessPrice, tc.tier1, tc.tier2, tc.want, rs.PricePoints)
		}
	}
}

func TestScoreFlavorIntersection(t *testing.T) {
	g := Guess{
		PlayerID: "p1",
		Flavors:  []FlavorNote{"cherry", "pepper", "vanilla"},
	}
	rs := ScoreGuess(g, testWine, 1, 2, 0, 0)
	// cherry and vanilla match; pepper does not
	if rs.FlavorPoints != 2*pointsFlavor {
		t.Fatalf("expected 2 flavor points, got %d", rs.FlavorPoints)
	}
	if len(rs.FlavorMatches) != 2 {
		t.Fatalf("expected 2 flavor matches, got %v", rs.FlavorMatches)
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
