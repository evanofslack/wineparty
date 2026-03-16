package game

import (
	"math"
	"sort"
	"strings"
)

const (
	pointsVariety  = 3
	pointsRegion   = 2
	pointsYearExact = 3
	pointsYearOne  = 2
	pointsYearTwo  = 1
	pointsFlavor   = 1
	maxFlavors     = 3
)

func ScoreGuess(g Guess, wine WineConfig) RoundScore {
	rs := RoundScore{
		PlayerID:   g.PlayerID,
		RoundIndex: g.RoundIndex,
	}

	if strings.EqualFold(strings.TrimSpace(g.Variety), strings.TrimSpace(wine.Variety)) {
		rs.VarietyHit = true
		rs.Points += pointsVariety
	}

	if strings.EqualFold(strings.TrimSpace(g.Region), strings.TrimSpace(wine.Region)) {
		rs.RegionHit = true
		rs.Points += pointsRegion
	}

	diff := int(math.Abs(float64(g.Year - wine.Year)))
	switch {
	case diff == 0:
		rs.YearPoints = pointsYearExact
	case diff == 1:
		rs.YearPoints = pointsYearOne
	case diff == 2:
		rs.YearPoints = pointsYearTwo
	}
	rs.Points += rs.YearPoints

	flavors := g.Flavors
	if len(flavors) > maxFlavors {
		flavors = flavors[:maxFlavors]
	}
	rs.FlavorPoints = len(flavors) * pointsFlavor
	rs.Points += rs.FlavorPoints

	return rs
}

func BuildLeaderboard(players map[string]*Player) []LeaderboardEntry {
	entries := make([]LeaderboardEntry, 0, len(players))
	for _, p := range players {
		if p.Role == RoleAdmin {
			continue
		}
		entries = append(entries, LeaderboardEntry{
			PlayerID:   p.ID,
			PlayerName: p.Name,
			Score:      p.TotalScore,
		})
	}
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Score > entries[j].Score
	})
	for i := range entries {
		entries[i].Rank = i + 1
	}
	return entries
}
